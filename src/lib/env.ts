import { isProductionRuntime } from "@/lib/auth/authorize";

/**
 * Production-safe environment helpers.
 * Prefer these over reading process.env ad hoc for URLs and required secrets.
 */

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

/**
 * Canonical public origin for OAuth callbacks, invite links, and absolute URLs.
 * Production never falls back to localhost.
 */
export function getAppBaseUrl(): string {
  const explicit = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    ""
  ).trim().replace(/\/$/, "");

  if (explicit) {
    return explicit;
  }

  // Default to canonical custom domain for Ghost n Post production / Vercel
  if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1") {
    return "https://www.ghostnpost.com";
  }

  return "http://localhost:3010";
}

/** Client-safe / build-safe public origin. */
export function getPublicAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1") {
    return "https://www.ghostnpost.com";
  }

  return "http://localhost:3010";
}

const REQUIRED_IN_PRODUCTION = [
  "DATABASE_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "GROQ_API_KEY",
  "BLOB_READ_WRITE_TOKEN",
  "INNGEST_EVENT_KEY",
  "INNGEST_SIGNING_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
] as const;

/**
 * Fail fast when critical production config is missing.
 * Called from instrumentation.ts on Node runtime boot.
 */
export function assertProductionEnv(): void {
  if (!isProductionRuntime()) return;

  const missing: string[] = [];

  for (const key of REQUIRED_IN_PRODUCTION) {
    if (!process.env[key]?.trim()) {
      missing.push(key);
    }
  }

  const hasAppUrl =
    Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim()) ||
    Boolean(process.env.APP_URL?.trim()) ||
    Boolean(process.env.VERCEL_URL?.trim());

  if (!hasAppUrl) {
    missing.push("NEXT_PUBLIC_APP_URL");
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required production environment variables: ${missing.join(", ")}`,
    );
  }

  // Soft warning — publish features stay optional.
  if (!process.env.LINKEDIN_CLIENT_ID || !process.env.X_CLIENT_ID) {
    console.warn(
      "[env] LinkedIn/X OAuth not fully configured; publish connections will stay disabled until set.",
    );
  }
}
