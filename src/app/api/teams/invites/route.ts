import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  acceptTeamInvite,
  ensureUserRow,
  revokeTeamInvite,
} from "@/lib/teams";

export const runtime = "nodejs";

const acceptSchema = z.object({
  token: z.string().min(16),
});

const revokeSchema = z.object({
  inviteId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Sign in to accept an invite",
          },
        },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = acceptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: parsed.error.issues[0]?.message ?? "Invalid token",
          },
        },
        { status: 400 },
      );
    }

    const clerkUser = await currentUser();
    const email = clerkUser?.primaryEmailAddress?.emailAddress ?? null;
    await ensureUserRow(userId, email);

    try {
      const teamId = await acceptTeamInvite({
        token: parsed.data.token,
        userId,
        userEmail: email,
      });
      return NextResponse.json({ success: true, data: { teamId } });
    } catch (error) {
      const { safeClientMessage } = await import("@/lib/errors");
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVITE_INVALID",
            message: safeClientMessage(error, "Could not accept invite"),
          },
        },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("[POST /api/teams/invites]", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to accept invite",
        },
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
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
    const parsed = revokeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: parsed.error.issues[0]?.message ?? "Invalid invite id",
          },
        },
        { status: 400 },
      );
    }

    try {
      await revokeTeamInvite(parsed.data.inviteId, userId);
    } catch (error) {
      const { safeClientMessage } = await import("@/lib/errors");
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: safeClientMessage(error, "Could not revoke invite"),
          },
        },
        { status: 403 },
      );
    }

    return NextResponse.json({ success: true, data: { revoked: true } });
  } catch (error) {
    console.error("[DELETE /api/teams/invites]", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to revoke invite",
        },
      },
      { status: 500 },
    );
  }
}
