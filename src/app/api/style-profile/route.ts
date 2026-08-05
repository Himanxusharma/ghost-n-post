import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { styleProfiles, users } from "@/db/schema";
import { extractStyleProfile } from "@/lib/generation";
import { styleProfileRequestSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Sign in to view your style profile" },
        },
        { status: 401 },
      );
    }

    const db = getDb();
    const profile = await db.query.styleProfiles.findFirst({
      where: eq(styleProfiles.userId, userId),
    });

    return NextResponse.json({
      success: true,
      data: profile
        ? {
            id: profile.id,
            samples: profile.samples,
            profileText: profile.profileText,
            enabled: profile.enabled,
            updatedAt: profile.updatedAt,
          }
        : null,
    });
  } catch (error) {
    console.error("[GET /api/style-profile]", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to load style profile" },
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
          error: {
            code: "UNAUTHORIZED",
            message: "Sign in to save a style profile",
          },
        },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = styleProfileRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: parsed.error.issues[0]?.message ?? "Invalid samples",
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

    const profileText = await extractStyleProfile(parsed.data.samples);

    const [saved] = await db
      .insert(styleProfiles)
      .values({
        userId,
        samples: parsed.data.samples,
        profileText,
        enabled: parsed.data.enabled,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: styleProfiles.userId,
        set: {
          samples: parsed.data.samples,
          profileText,
          enabled: parsed.data.enabled,
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        id: saved.id,
        profileText: saved.profileText,
        enabled: saved.enabled,
        samples: saved.samples,
        updatedAt: saved.updatedAt,
      },
    });
  } catch (error) {
    console.error("[POST /api/style-profile]", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to save style profile",
        },
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
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

    const body = (await request.json()) as {
      enabled?: boolean;
      reset?: boolean;
      profileText?: string;
    };

    const db = getDb();

    if (body.reset) {
      await db.delete(styleProfiles).where(eq(styleProfiles.userId, userId));
      return NextResponse.json({ success: true, data: null });
    }

    const updates: Partial<typeof styleProfiles.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (typeof body.enabled === "boolean") updates.enabled = body.enabled;
    if (typeof body.profileText === "string") {
      updates.profileText = body.profileText;
    }

    const [updated] = await db
      .update(styleProfiles)
      .set(updates)
      .where(eq(styleProfiles.userId, userId))
      .returning();

    return NextResponse.json({
      success: true,
      data: updated
        ? {
            id: updated.id,
            profileText: updated.profileText,
            enabled: updated.enabled,
            samples: updated.samples,
            updatedAt: updated.updatedAt,
          }
        : null,
    });
  } catch (error) {
    console.error("[PATCH /api/style-profile]", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to update style profile" },
      },
      { status: 500 },
    );
  }
}
