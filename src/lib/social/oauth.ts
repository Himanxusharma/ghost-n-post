import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { isProductionRuntime } from "@/lib/auth/authorize";

export { getAppBaseUrl } from "@/lib/env";

const STATE_TTL_MS = 10 * 60 * 1000;

function getSecret() {
  const secret =
    process.env.OAUTH_STATE_SECRET || process.env.CLERK_SECRET_KEY || "";
  if (!secret) {
    if (isProductionRuntime()) {
      throw new Error(
        "OAUTH_STATE_SECRET or CLERK_SECRET_KEY must be set in production",
      );
    }
    return "dev-oauth-state-secret";
  }
  return secret;
}

/** Signed OAuth state to prevent CSRF on LinkedIn/X connect flows. */
export function createOAuthState(payload: {
  userId: string;
  platform: "linkedin" | "x";
  returnTo?: string;
  codeVerifier?: string;
}): string {
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      nonce: randomBytes(8).toString("hex"),
      exp: Date.now() + STATE_TTL_MS,
    }),
  ).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function parseOAuthState(state: string): {
  userId: string;
  platform: "linkedin" | "x";
  returnTo?: string;
  codeVerifier?: string;
} {
  const [body, sig] = state.split(".");
  if (!body || !sig) {
    throw new Error("Invalid OAuth state");
  }
  const expected = createHmac("sha256", getSecret())
    .update(body)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("OAuth state signature mismatch");
  }
  const parsed = JSON.parse(
    Buffer.from(body, "base64url").toString("utf8"),
  ) as {
    userId: string;
    platform: "linkedin" | "x";
    returnTo?: string;
    codeVerifier?: string;
    exp: number;
  };
  if (parsed.exp < Date.now()) {
    throw new Error("OAuth state expired");
  }
  return parsed;
}

/** OAuth 2.0 PKCE pair for X (Twitter). */
export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256")
    .update(verifier)
    .digest("base64url");
  return { verifier, challenge };
}
