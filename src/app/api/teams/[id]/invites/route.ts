import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppBaseUrl } from "@/lib/env";
import { createTeamInvite, requireTeamAdmin } from "@/lib/teams";

export const runtime = "nodejs";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]).optional().default("member"),
});

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
          error: { code: "UNAUTHORIZED", message: "Sign in required" },
        },
        { status: 401 },
      );
    }

    const { id: teamId } = await context.params;
    try {
      await requireTeamAdmin(userId, teamId);
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
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: parsed.error.issues[0]?.message ?? "Invalid invite",
          },
        },
        { status: 400 },
      );
    }

    const invite = await createTeamInvite({
      teamId,
      email: parsed.data.email,
      role: parsed.data.role,
      invitedByUserId: userId,
    });

    const acceptUrl = `${getAppBaseUrl()}/team?invite=${invite.token}`;

    // Send invitation email asynchronously
    const { sendTeamInviteEmail } = await import("@/lib/email");
    const { getTeamById } = await import("@/lib/teams");
    const team = await getTeamById(teamId);

    const emailResult = await sendTeamInviteEmail({
      to: invite.email,
      inviterName: "Your teammate",
      teamName: team?.name ?? "Team Workspace",
      acceptUrl,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: invite.id,
          email: invite.email,
          role: invite.role,
          token: invite.token,
          expiresAt: invite.expiresAt,
          acceptUrl,
          emailSent: emailResult.sent,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/teams/:id/invites]", error);
    const { publicErrorMessage } = await import("@/lib/errors");
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: publicErrorMessage(error, "Failed to create invite"),
        },
      },
      { status: 500 },
    );
  }
}
