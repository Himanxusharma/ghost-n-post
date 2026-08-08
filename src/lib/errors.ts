import { isProductionRuntime } from "@/lib/auth/authorize";

const INTERNAL_PATTERN =
  /failed query|select |insert |update |delete |ECONNREFUSED|fetch failed|password|secret|api[_-]?key|token|stack|at Object\./i;

/**
 * Clean raw provider error messages (e.g. Groq 413 TPM dumps, raw JSON errors)
 * into friendly, presentable text for the UI.
 */
export function sanitizeUserErrorMessage(error: unknown): string {
  if (!(error instanceof Error) || !error.message) {
    return "An unexpected error occurred. Please try again.";
  }

  const raw = error.message.trim();

  // Groq TPM / Rate limit / Request too large
  if (
    /rate_limit_exceeded|Request too large|tokens per minute|TPM|413|429/i.test(
      raw,
    )
  ) {
    return "The video transcript is too long or AI capacity is temporarily reached. Please try again in a minute.";
  }

  // Deepgram / STT failure
  if (/DEEPGRAM|speech-to-text|transcription/i.test(raw)) {
    return "Could not transcribe audio for this video. Please ensure the video has clear spoken content.";
  }

  // Free tier duration limit
  if (/3 minutes|Free plan supports videos|Upgrade to Pro/i.test(raw)) {
    return raw;
  }

  // YouTube access errors
  if (/private|unavailable|age-restricted|region-locked/i.test(raw)) {
    return raw.length < 180
      ? raw
      : "This YouTube video is unavailable or restricted.";
  }

  // Strip raw JSON dumps or internal org/API detail
  if (raw.includes("{") || raw.includes("org_") || raw.length > 200) {
    return "Failed to process video content. Please try again or try another video.";
  }

  return raw;
}

/**
 * Message for unexpected 500s. Keeps detail in server logs;
 * never leaks SQL / secrets / provider internals to the browser.
 * In production always returns the fallback.
 */
export function publicErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (!(error instanceof Error) || !error.message) {
    return fallback;
  }

  const message = sanitizeUserErrorMessage(error);
  if (INTERNAL_PATTERN.test(message) || isProductionRuntime()) {
    return fallback;
  }

  if (message.length > 240) {
    return fallback;
  }
  return message;
}

/**
 * Message for expected client errors (400/403) thrown by our own code.
 * Allows curated operational text; still blocks internal-looking strings.
 */
export function safeClientMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error) || !error.message) {
    return fallback;
  }
  const message = sanitizeUserErrorMessage(error);
  if (INTERNAL_PATTERN.test(message) || message.length > 240) {
    return fallback;
  }
  return message;
}
