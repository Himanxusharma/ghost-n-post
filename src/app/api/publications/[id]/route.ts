import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { publications } from "@/db/schema";

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
    const row = await db.query.publications.findFirst({
      where: and(eq(publications.id, id), eq(publications.userId, userId)),
    });

    if (!row) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Publication not found" },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: row });
  } catch (error) {
    console.error("[GET /api/publications/:id]", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to load publication" },
      },
      { status: 500 },
    );
  }
}

/** Cancel a scheduled publication. */
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
    const row = await db.query.publications.findFirst({
      where: and(eq(publications.id, id), eq(publications.userId, userId)),
    });

    if (!row) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Publication not found" },
        },
        { status: 404 },
      );
    }

    if (row.status !== "scheduled" && row.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_CANCELLABLE",
            message: "Only scheduled/pending publications can be cancelled",
          },
        },
        { status: 400 },
      );
    }

    const [updated] = await db
      .update(publications)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(publications.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: { id: updated.id, status: updated.status },
    });
  } catch (error) {
    console.error("[DELETE /api/publications/:id]", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to cancel publication",
        },
      },
      { status: 500 },
    );
  }
}
