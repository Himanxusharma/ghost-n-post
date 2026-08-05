import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { socialAccounts } from "@/db/schema";
import { sanitizeReturnTo } from "@/lib/auth/authorize";
import { getAppBaseUrl, parseOAuthState } from "@/lib/social/oauth";
import { exchangeXCode, fetchXProfile } from "@/lib/social/x";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError || !code || !state) {
    return NextResponse.redirect(
      new URL("/connections?error=x_denied", getAppBaseUrl()),
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
    if (parsed.platform !== "x" || !parsed.codeVerifier) {
      throw new Error("Unexpected OAuth state for X");
    }
    if (parsed.userId !== sessionUserId) {
      return NextResponse.redirect(
        new URL("/connections?error=oauth_user_mismatch", getAppBaseUrl()),
      );
    }

    const tokens = await exchangeXCode(code, parsed.codeVerifier);
    const profile = await fetchXProfile(tokens.accessToken);
    const db = getDb();

    await db
      .insert(socialAccounts)
      .values({
        userId: sessionUserId,
        platform: "x",
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? null,
        expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        platformUserId: profile.id,
        platformUsername: profile.username,
        displayName: profile.name,
        scopes: tokens.scope ?? "tweet.read tweet.write users.read offline.access",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [socialAccounts.userId, socialAccounts.platform],
        set: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken ?? null,
          expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
          platformUserId: profile.id,
          platformUsername: profile.username,
          displayName: profile.name,
          scopes:
            tokens.scope ??
            "tweet.read tweet.write users.read offline.access",
          updatedAt: new Date(),
        },
      });

    const returnTo = sanitizeReturnTo(parsed.returnTo);
    return NextResponse.redirect(
      new URL(
        `${returnTo}${returnTo.includes("?") ? "&" : "?"}connected=x`,
        getAppBaseUrl(),
      ),
    );
  } catch (error) {
    console.error("[GET /api/social/x/callback]", error);
    return NextResponse.redirect(
      new URL("/connections?error=x_callback", getAppBaseUrl()),
    );
  }
}
