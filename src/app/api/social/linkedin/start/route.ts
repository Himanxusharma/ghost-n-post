import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { sanitizeReturnTo } from "@/lib/auth/authorize";
import { createOAuthState, getAppBaseUrl } from "@/lib/social/oauth";
import { getLinkedInAuthUrl, linkedinConfigured } from "@/lib/social/linkedin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    if (!linkedinConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_CONFIGURED",
            message: "LinkedIn OAuth env vars are not set",
          },
        },
        { status: 503 },
      );
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(new URL("/sign-in", getAppBaseUrl()));
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

    const returnTo = sanitizeReturnTo(
      new URL(request.url).searchParams.get("returnTo"),
    );
    const state = createOAuthState({
      userId,
      platform: "linkedin",
      returnTo,
    });

    return NextResponse.redirect(getLinkedInAuthUrl(state));
  } catch (error) {
    console.error("[GET /api/social/linkedin/start]", error);
    return NextResponse.redirect(
      new URL("/connections?error=linkedin_start", getAppBaseUrl()),
    );
  }
}
