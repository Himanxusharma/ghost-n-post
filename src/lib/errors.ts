import { isProductionRuntime } from "@/lib/auth/authorize";

const INTERNAL_PATTERN =
  /failed query|select |insert |update |delete |ECONNREFUSED|fetch failed|password|secret|api[_-]?key|token|stack|at Object\./i;

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

  const message = error.message;
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
  const message = error.message;
  if (INTERNAL_PATTERN.test(message) || message.length > 240) {
    return fallback;
  }
  return message;
}
