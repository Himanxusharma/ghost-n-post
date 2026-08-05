import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { jobs, videos } from "@/db/schema";
import {
  authorizeJobAccess,
  isAccessDenied,
} from "@/lib/auth/authorize";
import { z } from "zod";

export const runtime = "nodejs";

const jobIdSchema = z.string().uuid();

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!jobIdSchema.safeParse(id).success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_INPUT", message: "Invalid job id" },
        },
        { status: 400 },
      );
    }

    const db = getDb();
    const job = await db.query.jobs.findFirst({
      where: eq(jobs.id, id),
    });

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Job not found" },
        },
        { status: 404 },
      );
    }

    const access = await authorizeJobAccess(job, request);
    if (isAccessDenied(access)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: access.code, message: access.message },
        },
        { status: access.status },
      );
    }

    let video = null;
    if (job.videoId) {
      video = await db.query.videos.findFirst({
        where: eq(videos.id, job.videoId),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: job.id,
        status: job.status,
        stageLabel: job.stageLabel,
        errorMessage: job.errorMessage,
        postId: job.postId,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        video: video
          ? {
              id: video.id,
              title: video.title,
              channelName: video.channelName,
              durationSeconds: video.durationSeconds,
              thumbnailUrl: video.thumbnailBlobUrl ?? video.thumbnailUrl,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("[GET /api/jobs/:id]", error);
    const { publicErrorMessage } = await import("@/lib/errors");
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: publicErrorMessage(error, "Failed to load job status"),
        },
      },
      { status: 500 },
    );
  }
}
