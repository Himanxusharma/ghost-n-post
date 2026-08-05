import { createHash, randomBytes } from "crypto";
import { auth } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { extensionTokens } from "@/db/schema";

export type AuthedUser = {
  userId: string;
  via: "clerk" | "extension_token";
  tokenId?: string;
};

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Create a one-time-visible extension API token (gnp_…). */
export function mintExtensionToken(): {
  rawToken: string;
  prefix: string;
  hash: string;
} {
  const rawToken = `gnp_${randomBytes(24).toString("base64url")}`;
  return {
    rawToken,
    prefix: rawToken.slice(0, 10),
    hash: hashToken(rawToken),
  };
}

/**
 * Resolve the caller from Clerk session or `Authorization: Bearer gnp_…`.
 * Extension clients use the bearer token path.
 */
export async function requireUser(
  request?: Request,
): Promise<AuthedUser | null> {
  const { userId } = await auth();
  if (userId) {
    return { userId, via: "clerk" };
  }

  if (!request) return null;

  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(gnp_[A-Za-z0-9_-]+)$/i);
  if (!match) return null;

  const hash = hashToken(match[1]);
  const db = getDb();
  const token = await db.query.extensionTokens.findFirst({
    where: and(
      eq(extensionTokens.tokenHash, hash),
      isNull(extensionTokens.revokedAt),
    ),
  });

  if (!token) return null;

  await db
    .update(extensionTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(extensionTokens.id, token.id));

  return {
    userId: token.userId,
    via: "extension_token",
    tokenId: token.id,
  };
}
