import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { batches, jobs, videos } from "@/db/schema";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Sign in required" },
        },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const db = getDb();
    const batch = await db.query.batches.findFirst({
      where: and(eq(batches.id, id), eq(batches.userId, userId)),
    });

    if (!batch) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Batch not found" },
        },
        { status: 404 },
      );
    }

    const childJobs = await db
      .select({
        id: jobs.id,
        status: jobs.status,
        stageLabel: jobs.stageLabel,
        errorMessage: jobs.errorMessage,
        youtubeUrl: jobs.youtubeUrl,
        postId: jobs.postId,
        videoTitle: videos.title,
        thumbnailUrl: videos.thumbnailBlobUrl,
      })
      .from(jobs)
      .leftJoin(videos, eq(jobs.videoId, videos.id))
      .where(eq(jobs.batchId, id))
      .orderBy(desc(jobs.createdAt));

    return NextResponse.json({
      success: true,
      data: {
        ...batch,
        jobs: childJobs,
      },
    });
  } catch (error) {
    console.error("[GET /api/batch/:id]", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to load batch" },
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Sign in required" },
        },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const db = getDb();
    const [updated] = await db
      .update(batches)
      .set({
        status: "cancelled",
        stageLabel: "Cancelled",
        updatedAt: new Date(),
      })
      .where(and(eq(batches.id, id), eq(batches.userId, userId)))
      .returning();

    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Batch not found" },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[DELETE /api/batch/:id]", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to cancel batch" },
      },
      { status: 500 },
    );
  }
}
