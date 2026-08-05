import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { teamInvites, teamMembers, teams } from "@/db/schema";
import { requireTeamAdmin, requireTeamMember } from "@/lib/teams";

export const runtime = "nodejs";

const updateTeamSchema = z.object({
  name: z.string().min(2).max(120).optional(),
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
    .optional(),
});

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
    const membership = await requireTeamMember(userId, id).catch(() => null);
    if (!membership) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "Not a member of this team" },
        },
        { status: 403 },
      );
    }

    const db = getDb();
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, id),
    });
    if (!team) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Team not found" },
        },
        { status: 404 },
      );
    }

    const members = await db
      .select({
        id: teamMembers.id,
        userId: teamMembers.userId,
        role: teamMembers.role,
        createdAt: teamMembers.createdAt,
      })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, id));

    const invites = await db
      .select({
        id: teamInvites.id,
        email: teamInvites.email,
        role: teamInvites.role,
        status: teamInvites.status,
        expiresAt: teamInvites.expiresAt,
        createdAt: teamInvites.createdAt,
      })
      .from(teamInvites)
      .where(
        and(eq(teamInvites.teamId, id), eq(teamInvites.status, "pending")),
      );

    return NextResponse.json({
      success: true,
      data: {
        team,
        role: membership.role,
        members,
        // Invite tokens are only returned at creation time, never listed.
        invites:
          membership.role === "owner" || membership.role === "admin"
            ? invites
            : [],
      },
    });
  } catch (error) {
    console.error("[GET /api/teams/:id]", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to load team" },
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
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
    try {
      await requireTeamAdmin(userId, id);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "Admin access required" },
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = updateTeamSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: parsed.error.issues[0]?.message ?? "Invalid update",
          },
        },
        { status: 400 },
      );
    }

    const db = getDb();
    const [updated] = await db
      .update(teams)
      .set({
        ...(parsed.data.name ? { name: parsed.data.name.trim() } : {}),
        ...(parsed.data.defaultLanguage
          ? { defaultLanguage: parsed.data.defaultLanguage }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(teams.id, id))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[PATCH /api/teams/:id]", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update team",
        },
      },
      { status: 500 },
    );
  }
}
