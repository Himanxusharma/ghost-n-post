import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { posts, videos } from "@/db/schema";
import { generateCustomThumbnail } from "@/lib/custom-thumbnail";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Sign in to generate a custom thumbnail",
          },
        },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const db = getDb();
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, id),
    });

    if (!post) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Post not found" },
        },
        { status: 404 },
      );
    }

    if (post.userId && post.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "Not your post" },
        },
        { status: 403 },
      );
    }

    if (!post.userId) {
      await db.update(posts).set({ userId }).where(eq(posts.id, id));
    }

    const video = await db.query.videos.findFirst({
      where: eq(videos.id, post.videoId),
    });

    const result = await generateCustomThumbnail({
      postId: id,
      title: video?.title ?? "Video insights",
      linkedinDraft: post.linkedinDraft,
      language: post.language,
    });

    const [updated] = await db
      .update(posts)
      .set({
        customThumbnailUrl: result.imageUrl,
        customThumbnailHeadline: result.headline,
        customThumbnailGeneratedAt: new Date(),
      })
      .where(eq(posts.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        customThumbnailUrl: updated.customThumbnailUrl,
        customThumbnailHeadline: updated.customThumbnailHeadline,
        customThumbnailGeneratedAt: updated.customThumbnailGeneratedAt,
        subtext: result.subtext,
      },
    });
  } catch (error) {
    console.error("[POST /api/posts/:id/thumbnail]", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to generate custom thumbnail",
        },
      },
      { status: 500 },
    );
  }
}
