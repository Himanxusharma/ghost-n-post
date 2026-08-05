"use client";

import Link from "next/link";

type AuthGateProps = {
  title?: string;
  message?: string;
};

/**
 * Inline prompt when a feature requires Google authentication.
 */
export function AuthGate({
  title = "Sign in to continue",
  message = "Continue with Google to save drafts, match your voice, and publish.",
}: AuthGateProps) {
  return (
    <section className="auth-gate" role="region" aria-label="Sign in required">
      <h2>{title}</h2>
      <p>{message}</p>
      <div className="auth-gate-actions">
        <Link href="/sign-in" className="btn-primary">
          Continue with Google
        </Link>
      </div>
    </section>
  );
}
