import { auth, currentUser } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { batches, users } from "@/db/schema";
import { events, inngest } from "@/inngest/client";
import { batchRequestSchema } from "@/lib/batch/validations";

export const runtime = "nodejs";

export async function GET() {
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

    const db = getDb();
    const rows = await db
      .select()
      .from(batches)
      .where(eq(batches.userId, userId))
      .orderBy(desc(batches.createdAt))
      .limit(30);

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("[GET /api/batch]", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to list batches" },
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Sign in to run batch jobs" },
        },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = batchRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: parsed.error.issues[0]?.message ?? "Invalid batch request",
          },
        },
        { status: 400 },
      );
    }

    const db = getDb();
    const clerkUser = await currentUser();
    await db
      .insert(users)
      .values({
        id: userId,
        email: clerkUser?.primaryEmailAddress?.emailAddress ?? null,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: clerkUser?.primaryEmailAddress?.emailAddress ?? null,
        },
      });

    const sourceInput =
      parsed.data.type === "channel"
        ? parsed.data.channelInput!.trim()
        : (parsed.data.urls ?? [])
            .map((url) => url.trim())
            .filter(Boolean)
            .join("\n");

    const [batch] = await db
      .insert(batches)
      .values({
        userId,
        type: parsed.data.type,
        sourceInput,
        applyStyle: parsed.data.applyStyle,
        language: parsed.data.language,
        maxVideos: parsed.data.maxVideos,
        status: "queued",
        stageLabel: "Queued…",
      })
      .returning();

    await inngest.send({
      name: events.batchRequested,
      data: { batchId: batch.id },
    });

    return NextResponse.json({
      success: true,
      data: { id: batch.id, status: batch.status },
    });
  } catch (error) {
    console.error("[POST /api/batch]", error);
    const { publicErrorMessage } = await import("@/lib/errors");
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: publicErrorMessage(error, "Failed to start batch"),
        },
      },
      { status: 500 },
    );
  }
}
