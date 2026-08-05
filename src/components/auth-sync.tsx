"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

/**
 * After Clerk sign-in, sync the user into our Postgres `users` table so
 * history, style profiles, and teams are ready immediately.
 */
export function AuthSync() {
  const { isSignedIn, userId } = useAuth();
  const lastSynced = useRef<string | null>(null);

  useEffect(() => {
    if (!isSignedIn || !userId) {
      lastSynced.current = null;
      return;
    }
    if (lastSynced.current === userId) return;

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/me");
        if (!cancelled && response.ok) {
          lastSynced.current = userId;
        }
      } catch {
        // Non-blocking — generate/history routes also upsert the user.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, userId]);

  return null;
}
