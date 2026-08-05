import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { posts, videos } from "@/db/schema";
import {
  authorizePostAccess,
  isAccessDenied,
} from "@/lib/auth/authorize";

export const runtime = "nodejs";

const postIdSchema = z.string().uuid();

/**
 * Proxy a thumbnail image with Content-Disposition: attachment so the
 * browser saves it to the device (avoids cross-origin <a download> issues).
 *
 * ?kind=video (default) | custom
 */
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

    const kind =
      new URL(request.url).searchParams.get("kind") === "custom"
        ? "custom"
        : "video";

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

    let imageUrl: string | null = null;
    let filename = "thumbnail.jpg";

    const video = await db.query.videos.findFirst({
      where: eq(videos.id, post.videoId),
    });
    const titleSlug = sanitizeFilename(video?.title || "thumbnail");

    if (kind === "custom") {
      imageUrl = post.customThumbnailUrl;
      filename = `${titleSlug}.png`;
    } else {
      imageUrl = video?.thumbnailBlobUrl ?? video?.thumbnailUrl ?? null;
      filename = `${titleSlug}.jpg`;
    }

    if (!imageUrl) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Thumbnail not available" },
        },
        { status: 404 },
      );
    }

    const upstream = await fetch(imageUrl);
    if (!upstream.ok) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UPSTREAM_ERROR",
            message: "Could not fetch thumbnail",
          },
        },
        { status: 502 },
      );
    }

    const contentType =
      upstream.headers.get("content-type") ??
      (kind === "custom" ? "image/png" : "image/jpeg");
    const bytes = await upstream.arrayBuffer();

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    console.error("[GET /api/posts/:id/download-thumbnail]", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to download thumbnail",
        },
      },
      { status: 500 },
    );
  }
}

/** Make a video title safe for Content-Disposition filenames. */
function sanitizeFilename(title: string): string {
  const cleaned = title
    .normalize("NFKD")
    .replace(/[^\w\s\-().]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return cleaned || "thumbnail";
}
