import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { publications } from "@/db/schema";

export const runtime = "nodejs";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const db = getDb();
    const rows = await db
      .select()
      .from(publications)
      .where(
        status === "scheduled"
          ? and(
              eq(publications.userId, userId),
              eq(publications.status, "scheduled"),
            )
          : status === "active"
            ? and(
                eq(publications.userId, userId),
                inArray(publications.status, [
                  "scheduled",
                  "pending",
                  "publishing",
                  "published",
                  "failed",
                ]),
              )
            : eq(publications.userId, userId),
      )
      .orderBy(desc(publications.createdAt))
      .limit(50);

    return NextResponse.json({
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        postId: row.postId,
        platform: row.platform,
        status: row.status,
        contentSnippet: row.content.slice(0, 140),
        scheduledFor: row.scheduledFor,
        publishedAt: row.publishedAt,
        externalUrl: row.externalUrl,
        errorMessage: row.errorMessage,
        createdAt: row.createdAt,
      })),
    });
  } catch (error) {
    console.error("[GET /api/publications]", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to load publications",
        },
      },
      { status: 500 },
    );
  }
}
