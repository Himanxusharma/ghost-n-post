import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createTeam,
  ensureUserRow,
  getActiveTeamId,
  listUserTeams,
  setActiveTeam,
} from "@/lib/teams";

export const runtime = "nodejs";

const createTeamSchema = z.object({
  name: z.string().min(2).max(120),
  defaultLanguage: z
    .enum([
      "auto",
      "en",
      "es",
      "fr",
      "de",
      "pt",
      "hi",
      "ja",
      "ko",
      "it",
      "nl",
      "ar",
    ])
    .optional()
    .default("auto"),
});

const activeTeamSchema = z.object({
  teamId: z.string().uuid().nullable(),
});

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

    const teams = await listUserTeams(userId);
    const activeTeamId = await getActiveTeamId(userId);

    return NextResponse.json({
      success: true,
      data: { teams, activeTeamId },
    });
  } catch (error) {
    console.error("[GET /api/teams]", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to list teams" },
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
          error: { code: "UNAUTHORIZED", message: "Sign in to create a team" },
        },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = createTeamSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: parsed.error.issues[0]?.message ?? "Invalid team",
          },
        },
        { status: 400 },
      );
    }

    const clerkUser = await currentUser();
    await ensureUserRow(
      userId,
      clerkUser?.primaryEmailAddress?.emailAddress ?? null,
    );

    const team = await createTeam({
      userId,
      name: parsed.data.name,
      defaultLanguage: parsed.data.defaultLanguage,
    });

    return NextResponse.json(
      { success: true, data: team },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/teams]", error);
    const { publicErrorMessage } = await import("@/lib/errors");
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: publicErrorMessage(error, "Failed to create team"),
        },
      },
      { status: 500 },
    );
  }
}

/** Set or clear the caller's active team workspace. */
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

    const body = await request.json();
    const parsed = activeTeamSchema.safeParse(body);
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

    try {
      await setActiveTeam(userId, parsed.data.teamId);
    } catch (error) {
      const { safeClientMessage } = await import("@/lib/errors");
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: safeClientMessage(error, "Cannot set active team"),
          },
        },
        { status: 403 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { activeTeamId: parsed.data.teamId },
    });
  } catch (error) {
    console.error("[PATCH /api/teams]", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update active team",
        },
      },
      { status: 500 },
    );
  }
}
