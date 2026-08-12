import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { posts, styleProfiles, videos } from "@/db/schema";
import {
  authorizePostMutation,
  isAccessDenied,
} from "@/lib/auth/authorize";
import { generateSocialPosts } from "@/lib/generation";
import { resolveFormatId } from "@/lib/post-formats";
import { regenerateRequestSchema } from "@/lib/validations";
import { z } from "zod";

export const runtime = "nodejs";

const MAX_REGENERATES = 3;
const postIdSchema = z.string().uuid();

/**
 * Regenerate LinkedIn/X drafts for an existing post (up to 3 times per MVP).
 * Optional body.formatId switches the LinkedIn structure template.
 */
export async function POST(
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

    let formatIdFromBody: string | undefined;
    try {
      const body = await request.json();
      const parsed = regenerateRequestSchema.safeParse(body ?? {});
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_INPUT",
              message: parsed.error.issues[0]?.message ?? "Invalid request",
            },
          },
          { status: 400 },
        );
      }
      formatIdFromBody = parsed.data.formatId;
    } catch {
      // Empty body is fine: keep the post's existing format.
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

    const access = await authorizePostMutation(post, request, {
      allowAnonymousCapability: true,
    });
    if (isAccessDenied(access)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: access.code, message: access.message },
        },
        { status: access.status },
      );
    }

    if (!post.userId && access.userId) {
      await db.update(posts).set({ userId: access.userId }).where(eq(posts.id, id));
    }

    if (post.regenerateCount >= MAX_REGENERATES) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "LIMIT_REACHED",
            message: `You can regenerate up to ${MAX_REGENERATES} times per post in MVP.`,
          },
        },
        { status: 400 },
      );
    }

    const video = await db.query.videos.findFirst({
      where: eq(videos.id, post.videoId),
    });

    if (!video?.transcriptBlobUrl) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NO_TRANSCRIPT",
            message: "Transcript is no longer available for regeneration.",
          },
        },
        { status: 400 },
      );
    }

    const transcriptResponse = await fetch(video.transcriptBlobUrl);
    if (!transcriptResponse.ok) {
      throw new Error("Failed to load stored transcript");
    }
    const transcriptJson = (await transcriptResponse.json()) as {
      text?: string;
    };
    const transcript = transcriptJson.text?.trim();
    if (!transcript) {
      throw new Error("Stored transcript is empty");
    }

    let styleProfile: string | null = null;
    if (access.userId) {
      const profile = await db.query.styleProfiles.findFirst({
        where: eq(styleProfiles.userId, access.userId),
      });
      if (profile?.enabled) {
        styleProfile = profile.profileText;
      }
    }

    const formatId = resolveFormatId(formatIdFromBody ?? post.formatId);

    const generated = await generateSocialPosts({
      title: video.title ?? "Untitled video",
      channelName: video.channelName ?? "Unknown channel",
      transcript,
      styleProfile,
      language: post.language,
      platforms: post.platforms ?? ["linkedin", "x"],
      formatId,
      isProUser: true,
    });

    const [updated] = await db
      .update(posts)
      .set({
        linkedinDraft: generated.linkedin,
        xDraft: generated.x,
        xThread: generated.xThread,
        formatId,
        regenerateCount: post.regenerateCount + 1,
      })
      .where(eq(posts.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        linkedinDraft: updated.linkedinDraft,
        xDraft: updated.xDraft,
        xThread: updated.xThread,
        platforms: updated.platforms ?? ["linkedin", "x"],
        formatId: updated.formatId,
        regenerateCount: updated.regenerateCount,
      },
    });
  } catch (error) {
    console.error("[POST /api/posts/:id/regenerate]", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to regenerate drafts",
        },
      },
      { status: 500 },
    );
  }
}
