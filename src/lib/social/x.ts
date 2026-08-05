import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { socialAccounts, type SocialAccount } from "@/db/schema";
import { getAppBaseUrl } from "./oauth";

export function xConfigured(): boolean {
  return Boolean(
    process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET,
  );
}

export function getXAuthUrl(state: string, codeChallenge: string): string {
  const clientId = process.env.X_CLIENT_ID;
  if (!clientId) {
    throw new Error("X_CLIENT_ID is not set");
  }
  const redirectUri = `${getAppBaseUrl()}/api/social/x/callback`;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "tweet.read tweet.write users.read offline.access",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `https://twitter.com/i/oauth2/authorize?${params}`;
}

export async function exchangeXCode(
  code: string,
  codeVerifier: string,
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scope?: string;
}> {
  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("X OAuth is not configured");
  }

  const redirectUri = `${getAppBaseUrl()}/api/social/x/callback`;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  const json = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    error_description?: string;
    error?: string;
  };

  if (!response.ok || !json.access_token) {
    throw new Error(
      json.error_description || json.error || "X token exchange failed",
    );
  }

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresIn: json.expires_in ?? 7200,
    scope: json.scope,
  };
}

export async function fetchXProfile(accessToken: string): Promise<{
  id: string;
  name: string;
  username: string;
}> {
  const response = await fetch("https://api.twitter.com/2/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await response.json()) as {
    data?: { id: string; name: string; username: string };
    detail?: string;
    title?: string;
  };
  if (!response.ok || !json.data) {
    throw new Error(json.detail || json.title || "Failed to load X profile");
  }
  return {
    id: json.data.id,
    name: json.data.name,
    username: json.data.username,
  };
}

async function refreshXToken(account: SocialAccount): Promise<SocialAccount> {
  if (!account.refreshToken) {
    return account;
  }
  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return account;
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: account.refreshToken,
    }),
  });

  const json = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!response.ok || !json.access_token) {
    return account;
  }

  const db = getDb();
  const [updated] = await db
    .update(socialAccounts)
    .set({
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? account.refreshToken,
      expiresAt: new Date(Date.now() + (json.expires_in ?? 7200) * 1000),
      updatedAt: new Date(),
    })
    .where(eq(socialAccounts.id, account.id))
    .returning();

  return updated;
}

export async function getValidXAccount(userId: string): Promise<SocialAccount> {
  const db = getDb();
  const account = await db.query.socialAccounts.findFirst({
    where: and(
      eq(socialAccounts.userId, userId),
      eq(socialAccounts.platform, "x"),
    ),
  });
  if (!account) {
    throw new Error("Connect X before publishing");
  }

  if (
    account.expiresAt &&
    account.expiresAt.getTime() < Date.now() + 60_000
  ) {
    return refreshXToken(account);
  }
  return account;
}

/**
 * Publish a single tweet or a reply-chain thread.
 * Media (first image) is attached to the first tweet when provided.
 */
export async function publishToX(input: {
  account: SocialAccount;
  text: string;
  threadParts?: string[];
  imageUrls?: string[];
}): Promise<{ externalPostId: string; externalUrl: string }> {
  const tweets =
    input.threadParts && input.threadParts.length > 0
      ? input.threadParts
      : [input.text];

  let mediaId: string | null = null;
  if (input.imageUrls?.[0]) {
    try {
      mediaId = await uploadXMedia(
        input.account.accessToken,
        input.imageUrls[0],
      );
    } catch (error) {
      console.warn("[x] media upload skipped:", error);
    }
  }

  let rootId: string | null = null;
  let previousId: string | null = null;

  for (let i = 0; i < tweets.length; i++) {
    const body: Record<string, unknown> = { text: tweets[i] };
    if (previousId) {
      body.reply = { in_reply_to_tweet_id: previousId };
    }
    if (i === 0 && mediaId) {
      body.media = { media_ids: [mediaId] };
    }

    const response = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.account.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const json = (await response.json()) as {
      data?: { id: string };
      detail?: string;
      title?: string;
      errors?: Array<{ message?: string }>;
    };

    if (!response.ok || !json.data?.id) {
      throw new Error(
        json.detail ||
          json.title ||
          json.errors?.[0]?.message ||
          `X publish failed (${response.status})`,
      );
    }

    if (!rootId) rootId = json.data.id;
    previousId = json.data.id;
  }

  const username = input.account.platformUsername || "i";
  return {
    externalPostId: rootId!,
    externalUrl: `https://x.com/${username}/status/${rootId}`,
  };
}

/**
 * X media upload still uses v1.1 simple upload with OAuth 2 user token.
 */
async function uploadXMedia(
  accessToken: string,
  imageUrl: string,
): Promise<string> {
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error("Failed to download image for X upload");
  }
  const bytes = Buffer.from(await imageResponse.arrayBuffer());
  const form = new FormData();
  form.append(
    "media",
    new Blob([bytes], { type: "image/png" }),
    "carousel.png",
  );
  form.append("media_category", "tweet_image");

  const response = await fetch(
    "https://upload.twitter.com/1.1/media/upload.json",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    },
  );

  const json = (await response.json()) as {
    media_id_string?: string;
    errors?: Array<{ message?: string }>;
  };
  if (!response.ok || !json.media_id_string) {
    throw new Error(
      json.errors?.[0]?.message || `X media upload failed (${response.status})`,
    );
  }
  return json.media_id_string;
}
