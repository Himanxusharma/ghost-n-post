/**
 * Client-safe YouTube URL helpers (no Zod).
 */

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "music.youtube.com",
]);

function isValidVideoId(id: string): boolean {
  return /^[\w-]{11}$/.test(id);
}

/** Extract an 11-character YouTube video id from common URL shapes. */
export function extractYoutubeId(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }

  if (!YOUTUBE_HOSTS.has(url.hostname)) {
    return null;
  }

  if (url.hostname.includes("youtu.be")) {
    const id = url.pathname.replace(/^\//, "").split("/")[0];
    return isValidVideoId(id) ? id : null;
  }

  const v = url.searchParams.get("v");
  if (v && isValidVideoId(v)) {
    return v;
  }

  // /shorts/:id, /embed/:id, /live/:id
  const parts = url.pathname.split("/").filter(Boolean);
  if (
    parts.length >= 2 &&
    ["shorts", "embed", "live", "v"].includes(parts[0]) &&
    isValidVideoId(parts[1])
  ) {
    return parts[1];
  }

  return null;
}
