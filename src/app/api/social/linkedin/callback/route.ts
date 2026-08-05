import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { socialAccounts } from "@/db/schema";
import { sanitizeReturnTo } from "@/lib/auth/authorize";
import {
  exchangeLinkedInCode,
  fetchLinkedInProfile,
} from "@/lib/social/linkedin";
import { getAppBaseUrl, parseOAuthState } from "@/lib/social/oauth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError || !code || !state) {
    return NextResponse.redirect(
      new URL("/connections?error=linkedin_denied", getAppBaseUrl()),
    );
  }

  try {
    const { userId: sessionUserId } = await auth();
    if (!sessionUserId) {
      return NextResponse.redirect(
        new URL("/sign-in?error=oauth_session", getAppBaseUrl()),
      );
    }

    const parsed = parseOAuthState(state);
    if (parsed.platform !== "linkedin") {
      throw new Error("Unexpected OAuth platform");
    }
    if (parsed.userId !== sessionUserId) {
      return NextResponse.redirect(
        new URL("/connections?error=oauth_user_mismatch", getAppBaseUrl()),
      );
    }

    const tokens = await exchangeLinkedInCode(code);
    const profile = await fetchLinkedInProfile(tokens.accessToken);
    const db = getDb();

    await db
      .insert(socialAccounts)
      .values({
        userId: sessionUserId,
        platform: "linkedin",
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? null,
        expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        platformUserId: profile.id,
        platformUsername: profile.username ?? null,
        displayName: profile.name,
        scopes: "openid profile w_member_social",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [socialAccounts.userId, socialAccounts.platform],
        set: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken ?? null,
          expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
          platformUserId: profile.id,
          platformUsername: profile.username ?? null,
          displayName: profile.name,
          scopes: "openid profile w_member_social",
          updatedAt: new Date(),
        },
      });

    const returnTo = sanitizeReturnTo(parsed.returnTo);
    return NextResponse.redirect(
      new URL(
        `${returnTo}${returnTo.includes("?") ? "&" : "?"}connected=linkedin`,
        getAppBaseUrl(),
      ),
    );
  } catch (error) {
    console.error("[GET /api/social/linkedin/callback]", error);
    return NextResponse.redirect(
      new URL("/connections?error=linkedin_callback", getAppBaseUrl()),
    );
  }
}
