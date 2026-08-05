import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { posts, publications, videos } from "@/db/schema";
import { events, inngest } from "@/inngest/client";
import { publishRequestSchema } from "@/lib/social/validations";

export const runtime = "nodejs";

export async function POST(
  request: Request,
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
            message: "Sign in to publish",
          },
        },
        { status: 401 },
      );
    }

    const { id: postId } = await context.params;
    const body = await request.json();
    const parsed = publishRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: parsed.error.issues[0]?.message ?? "Invalid publish request",
          },
        },
        { status: 400 },
      );
    }

    const db = getDb();
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
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

    // Allow owner or anonymous-origin posts claimed by signing in later
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
      await db.update(posts).set({ userId }).where(eq(posts.id, postId));
    }

    const {
      platform,
      includeCarousel,
      includeCustomThumbnail,
      scheduledFor,
    } = parsed.data;
    let content =
      parsed.data.content ||
      (platform === "linkedin" ? post.linkedinDraft : post.xDraft);
    const threadParts =
      parsed.data.threadParts ||
      (platform === "x" && post.xThread.length > 0 ? post.xThread : []);

    if (platform === "x" && threadParts.length > 0) {
      content = threadParts[0];
    }

    const mediaUrls =
      includeCarousel && post.carouselSlides.length > 0
        ? post.carouselSlides.map((slide) => slide.imageUrl)
        : [];

    // Prefer custom branded thumbnail when requested (and no carousel).
    if (
      mediaUrls.length === 0 &&
      includeCustomThumbnail &&
      post.customThumbnailUrl
    ) {
      mediaUrls.push(post.customThumbnailUrl);
    }

    // If no carousel/custom thumb but video thumbnail exists, attach it for LinkedIn
    if (mediaUrls.length === 0 && platform === "linkedin") {
      const video = await db.query.videos.findFirst({
        where: eq(videos.id, post.videoId),
      });
      const thumb = video?.thumbnailBlobUrl ?? video?.thumbnailUrl;
      if (thumb) mediaUrls.push(thumb);
    }

    let scheduledDate: Date | null = null;
    if (scheduledFor) {
      scheduledDate = new Date(scheduledFor);
      if (Number.isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_SCHEDULE",
              message: "scheduledFor must be a future ISO datetime",
            },
          },
          { status: 400 },
        );
      }
    }

    const [publication] = await db
      .insert(publications)
      .values({
        userId,
        postId,
        platform,
        status: scheduledDate ? "scheduled" : "pending",
        content,
        threadParts,
        mediaUrls,
        includeCarousel: Boolean(includeCarousel),
        scheduledFor: scheduledDate,
      })
      .returning();

    if (scheduledDate) {
      await inngest.send({
        name: events.publishScheduled,
        data: {
          publicationId: publication.id,
          scheduledFor: scheduledDate.toISOString(),
        },
      });
    } else {
      await inngest.send({
        name: events.publishRequested,
        data: { publicationId: publication.id },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: publication.id,
        status: publication.status,
        platform: publication.platform,
        scheduledFor: publication.scheduledFor,
      },
    });
  } catch (error) {
    console.error("[POST /api/posts/:id/publish]", error);
    const { publicErrorMessage } = await import("@/lib/errors");
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: publicErrorMessage(error, "Failed to start publish"),
        },
      },
      { status: 500 },
    );
  }
}
