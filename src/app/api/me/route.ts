import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { ensureUserRow, getActiveTeamId, listUserTeams } from "@/lib/teams";

export const runtime = "nodejs";

/**
 * Current session profile. Creates/updates the local users row so history,
 * style profiles, and teams work immediately after first sign-in.
 */
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

    const clerkUser = await currentUser();
    const email = clerkUser?.primaryEmailAddress?.emailAddress ?? null;
    const name =
      clerkUser?.fullName ||
      [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
      null;

    await ensureUserRow(userId, email);

    const db = getDb();
    const [row] = await db
      .update(users)
      .set({ email })
      .where(eq(users.id, userId))
      .returning({
        preferredLanguage: users.preferredLanguage,
        activeTeamId: users.activeTeamId,
      });

    const [activeTeamId, teams] = await Promise.all([
      getActiveTeamId(userId),
      listUserTeams(userId),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        id: userId,
        email,
        name,
        imageUrl: clerkUser?.imageUrl ?? null,
        preferredLanguage: row?.preferredLanguage ?? "auto",
        activeTeamId: activeTeamId ?? row?.activeTeamId ?? null,
        teams,
      },
    });
  } catch (error) {
    console.error("[GET /api/me]", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to load profile",
        },
      },
      { status: 500 },
    );
  }
}
