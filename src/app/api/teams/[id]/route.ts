import { auth, clerkClient } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { teamInvites, teamMembers, teams, users } from "@/db/schema";
import { requireTeamAdmin, requireTeamMember, deleteTeam } from "@/lib/teams";

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
        email: users.email,
        displayName: users.displayName,
      })
      .from(teamMembers)
      .leftJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, id));

    // Backfill missing names/emails from Clerk so older rows still look human.
    const needsProfile = members.filter(
      (member) => !member.displayName || !member.email,
    );
    if (needsProfile.length > 0) {
      try {
        const client = await clerkClient();
        const clerkUsers = await client.users.getUserList({
          userId: needsProfile.map((member) => member.userId),
          limit: 100,
        });
        const byId = new Map(
          clerkUsers.data.map((clerkUser) => [clerkUser.id, clerkUser]),
        );

        for (const member of needsProfile) {
          const clerkUser = byId.get(member.userId);
          if (!clerkUser) continue;
          const email =
            clerkUser.primaryEmailAddress?.emailAddress ??
            clerkUser.emailAddresses[0]?.emailAddress ??
            null;
          const displayName =
            clerkUser.fullName ||
            [clerkUser.firstName, clerkUser.lastName]
              .filter(Boolean)
              .join(" ") ||
            null;
          if (!email && !displayName) continue;

          await db
            .update(users)
            .set({
              ...(email ? { email } : {}),
              ...(displayName ? { displayName } : {}),
            })
            .where(eq(users.id, member.userId));

          if (email) member.email = email;
          if (displayName) member.displayName = displayName;
        }
      } catch (error) {
        console.warn("[GET /api/teams/:id] Clerk profile backfill skipped", error);
      }
    }

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
        members: members.map((member) => ({
          id: member.id,
          userId: member.userId,
          role: member.role,
          createdAt: member.createdAt,
          email: member.email,
          displayName: member.displayName,
          label:
            member.displayName?.trim() ||
            member.email?.trim() ||
            "Team member",
        })),
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
    try {
      const deleted = await deleteTeam(userId, id);
      return NextResponse.json({
        success: true,
        data: { id: deleted.id, name: deleted.name },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete team";
      const status =
        message === "Team not found"
          ? 404
          : message.includes("owner")
            ? 403
            : 400;
      return NextResponse.json(
        {
          success: false,
          error: {
            code:
              status === 404
                ? "NOT_FOUND"
                : status === 403
                  ? "FORBIDDEN"
                  : "INVALID_INPUT",
            message,
          },
        },
        { status },
      );
    }
  } catch (error) {
    console.error("[DELETE /api/teams/:id]", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to delete team",
        },
      },
      { status: 500 },
    );
  }
}
