import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { socialAccounts, type SocialAccount } from "@/db/schema";
import { getAppBaseUrl } from "./oauth";

const LINKEDIN_VERSION = process.env.LINKEDIN_API_VERSION || "202507";

export function linkedinConfigured(): boolean {
  return Boolean(
    process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET,
  );
}

export function getLinkedInAuthUrl(state: string): string {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) {
    throw new Error("LINKEDIN_CLIENT_ID is not set");
  }
  const redirectUri = `${getAppBaseUrl()}/api/social/linkedin/callback`;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: "openid profile w_member_social",
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
}

export async function exchangeLinkedInCode(code: string): Promise<{
  accessToken: string;
  expiresIn: number;
  refreshToken?: string;
  refreshTokenExpiresIn?: number;
}> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("LinkedIn OAuth is not configured");
  }

  const redirectUri = `${getAppBaseUrl()}/api/social/linkedin/callback`;
  const response = await fetch(
    "https://www.linkedin.com/oauth/v2/accessToken",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    },
  );

  const json = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    refresh_token_expires_in?: number;
    error_description?: string;
  };

  if (!response.ok || !json.access_token) {
    throw new Error(json.error_description || "LinkedIn token exchange failed");
  }

  return {
    accessToken: json.access_token,
    expiresIn: json.expires_in ?? 5184000,
    refreshToken: json.refresh_token,
    refreshTokenExpiresIn: json.refresh_token_expires_in,
  };
}

export async function fetchLinkedInProfile(accessToken: string): Promise<{
  id: string;
  name: string;
  username?: string;
}> {
  // Prefer OpenID userinfo, fall back to legacy /v2/me for person id.
  const userInfoResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const userInfo = (await userInfoResponse.json()) as {
    sub?: string;
    name?: string;
    email?: string;
    message?: string;
  };

  if (userInfoResponse.ok && userInfo.sub) {
    return {
      id: userInfo.sub,
      name: userInfo.name || "LinkedIn user",
      username: userInfo.email,
    };
  }

  const meResponse = await fetch(
    "https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName)",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const me = (await meResponse.json()) as {
    id?: string;
    localizedFirstName?: string;
    localizedLastName?: string;
    message?: string;
  };
  if (!meResponse.ok || !me.id) {
    throw new Error(
      userInfo.message || me.message || "Failed to load LinkedIn profile",
    );
  }

  return {
    id: me.id,
    name: [me.localizedFirstName, me.localizedLastName]
      .filter(Boolean)
      .join(" "),
  };
}

async function refreshLinkedInToken(
  account: SocialAccount,
): Promise<SocialAccount> {
  if (!account.refreshToken) {
    return account;
  }
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return account;
  }

  const response = await fetch(
    "https://www.linkedin.com/oauth/v2/accessToken",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: account.refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    },
  );
  const json = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
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
      expiresAt: new Date(Date.now() + (json.expires_in ?? 5184000) * 1000),
      updatedAt: new Date(),
    })
    .where(eq(socialAccounts.id, account.id))
    .returning();

  return updated;
}

export async function getValidLinkedInAccount(
  userId: string,
): Promise<SocialAccount> {
  const db = getDb();
  const account = await db.query.socialAccounts.findFirst({
    where: and(
      eq(socialAccounts.userId, userId),
      eq(socialAccounts.platform, "linkedin"),
    ),
  });
  if (!account) {
    throw new Error("Connect LinkedIn before publishing");
  }

  if (
    account.expiresAt &&
    account.expiresAt.getTime() < Date.now() + 60_000
  ) {
    return refreshLinkedInToken(account);
  }
  return account;
}

/**
 * Publish a member post via LinkedIn Posts API (with ugcPosts fallback).
 * Optionally attaches the first image URL as an uploaded LinkedIn image asset.
 */
export async function publishToLinkedIn(input: {
  account: SocialAccount;
  commentary: string;
  imageUrls?: string[];
}): Promise<{ externalPostId: string; externalUrl: string }> {
  const authorUrn = `urn:li:person:${input.account.platformUserId}`;
  let imageUrn: string | null = null;

  if (input.imageUrls?.[0]) {
    try {
      imageUrn = await uploadLinkedInImage(
        input.account.accessToken,
        authorUrn,
        input.imageUrls[0],
      );
    } catch (error) {
      console.warn("[linkedin] image upload skipped:", error);
    }
  }

  // Prefer modern Posts API
  try {
    return await createLinkedInRestPost({
      accessToken: input.account.accessToken,
      authorUrn,
      commentary: input.commentary,
      imageUrn,
    });
  } catch (error) {
    console.warn("[linkedin] Posts API failed, trying ugcPosts:", error);
    return createLinkedInUgcPost({
      accessToken: input.account.accessToken,
      authorUrn,
      commentary: input.commentary,
      imageUrn,
    });
  }
}

async function createLinkedInRestPost(input: {
  accessToken: string;
  authorUrn: string;
  commentary: string;
  imageUrn: string | null;
}): Promise<{ externalPostId: string; externalUrl: string }> {
  const body: Record<string, unknown> = {
    author: input.authorUrn,
    commentary: input.commentary,
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };

  if (input.imageUrn) {
    body.content = {
      media: {
        id: input.imageUrn,
      },
    };
  }

  const response = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": LINKEDIN_VERSION,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LinkedIn Posts API error (${response.status}): ${text}`);
  }

  const postId =
    response.headers.get("x-restli-id") ||
    response.headers.get("x-linkedin-id") ||
    `li-${Date.now()}`;

  return {
    externalPostId: postId,
    externalUrl: `https://www.linkedin.com/feed/update/${encodeURIComponent(postId)}`,
  };
}

async function createLinkedInUgcPost(input: {
  accessToken: string;
  authorUrn: string;
  commentary: string;
  imageUrn: string | null;
}): Promise<{ externalPostId: string; externalUrl: string }> {
  const shareContent: Record<string, unknown> = {
    shareCommentary: { text: input.commentary },
    shareMediaCategory: input.imageUrn ? "IMAGE" : "NONE",
  };

  if (input.imageUrn) {
    shareContent.media = [
      {
        status: "READY",
        media: input.imageUrn,
      },
    ];
  }

  const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: input.authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": shareContent,
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LinkedIn ugcPosts error (${response.status}): ${text}`);
  }

  const json = (await response.json().catch(() => ({}))) as { id?: string };
  const postId =
    json.id ||
    response.headers.get("x-restli-id") ||
    `li-${Date.now()}`;

  return {
    externalPostId: postId,
    externalUrl: `https://www.linkedin.com/feed/update/${encodeURIComponent(postId)}`,
  };
}

async function uploadLinkedInImage(
  accessToken: string,
  ownerUrn: string,
  imageUrl: string,
): Promise<string> {
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error("Failed to download image for LinkedIn upload");
  }
  const bytes = Buffer.from(await imageResponse.arrayBuffer());

  const register = await fetch(
    "https://api.linkedin.com/v2/assets?action=registerUpload",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
          owner: ownerUrn,
          serviceRelationships: [
            {
              relationshipType: "OWNER",
              identifier: "urn:li:userGeneratedContent",
            },
          ],
        },
      }),
    },
  );

  const registerJson = (await register.json()) as {
    value?: {
      asset?: string;
      uploadMechanism?: {
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"?: {
          uploadUrl?: string;
        };
      };
    };
  };

  const uploadUrl =
    registerJson.value?.uploadMechanism?.[
      "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
    ]?.uploadUrl;
  const asset = registerJson.value?.asset;
  if (!register.ok || !uploadUrl || !asset) {
    throw new Error("LinkedIn image registerUpload failed");
  }

  const upload = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/octet-stream",
    },
    body: bytes,
  });
  if (!upload.ok) {
    throw new Error(`LinkedIn image upload failed (${upload.status})`);
  }

  return asset;
}
