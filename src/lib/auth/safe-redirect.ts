/**
 * Allow only same-origin relative paths for post-auth redirects.
 */
export function safeRedirect(raw: string | undefined | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  if (raw.includes("://") || raw.includes("\\") || raw.includes("..")) {
    return null;
  }
  return raw;
}
