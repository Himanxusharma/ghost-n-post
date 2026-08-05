import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { posts, videos } from "@/db/schema";
import {
  authorizePostAccess,
  isAccessDenied,
} from "@/lib/auth/authorize";
import { z } from "zod";

export const runtime = "nodejs";

const postIdSchema = z.string().uuid();

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!postIdSchema.safeParse(id).success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_INPUT", message: "Invalid post id" },
        },
        { status: 400 },
      );
    }

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

    const access = await authorizePostAccess(post, request);
    if (isAccessDenied(access)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: access.code, message: access.message },
        },
        { status: access.status },
      );
    }

    const video = await db.query.videos.findFirst({
      where: eq(videos.id, post.videoId),
    });

    return NextResponse.json({
      success: true,
      data: {
        id: post.id,
        linkedinDraft: post.linkedinDraft,
        xDraft: post.xDraft,
        xThread: post.xThread,
        platforms: post.platforms ?? ["linkedin", "x"],
        regenerateCount: post.regenerateCount,
        carouselSlides: post.carouselSlides,
        carouselGeneratedAt: post.carouselGeneratedAt,
        language: post.language,
        customThumbnailUrl: post.customThumbnailUrl,
        customThumbnailHeadline: post.customThumbnailHeadline,
        customThumbnailGeneratedAt: post.customThumbnailGeneratedAt,
        createdAt: post.createdAt,
        video: video
          ? {
              id: video.id,
              title: video.title,
              channelName: video.channelName,
              durationSeconds: video.durationSeconds,
              thumbnailUrl: video.thumbnailBlobUrl ?? video.thumbnailUrl,
              youtubeId: video.youtubeId,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("[GET /api/posts/:id]", error);
    const { publicErrorMessage } = await import("@/lib/errors");
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: publicErrorMessage(error, "Failed to load post"),
        },
      },
      { status: 500 },
    );
  }
}
