import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { posts, videos } from "@/db/schema";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Sign in to view history" },
        },
        { status: 401 },
      );
    }

    const db = getDb();
    const rows = await db
      .select({
        id: posts.id,
        linkedinDraft: posts.linkedinDraft,
        xDraft: posts.xDraft,
        createdAt: posts.createdAt,
        videoTitle: videos.title,
        thumbnailUrl: videos.thumbnailBlobUrl,
        fallbackThumb: videos.thumbnailUrl,
        channelName: videos.channelName,
      })
      .from(posts)
      .leftJoin(videos, eq(posts.videoId, videos.id))
      .where(eq(posts.userId, userId))
      .orderBy(desc(posts.createdAt))
      .limit(50);

    return NextResponse.json({
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        snippet: (row.linkedinDraft || row.xDraft).slice(0, 160),
        createdAt: row.createdAt,
        videoTitle: row.videoTitle,
        channelName: row.channelName,
        thumbnailUrl: row.thumbnailUrl ?? row.fallbackThumb,
      })),
    });
  } catch (error) {
    console.error("[GET /api/history]", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to load history" },
      },
      { status: 500 },
    );
  }
}
