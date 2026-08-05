import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { sanitizeReturnTo } from "@/lib/auth/authorize";
import {
  createOAuthState,
  createPkcePair,
  getAppBaseUrl,
} from "@/lib/social/oauth";
import { getXAuthUrl, xConfigured } from "@/lib/social/x";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    if (!xConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_CONFIGURED",
            message: "X OAuth env vars are not set",
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
    const { verifier, challenge } = createPkcePair();
    const state = createOAuthState({
      userId,
      platform: "x",
      returnTo,
      codeVerifier: verifier,
    });

    return NextResponse.redirect(getXAuthUrl(state, challenge));
  } catch (error) {
    console.error("[GET /api/social/x/start]", error);
    return NextResponse.redirect(
      new URL("/connections?error=x_start", getAppBaseUrl()),
    );
  }
}
