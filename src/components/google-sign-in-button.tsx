"use client";

import { useAuth, useClerk, useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { safeRedirect } from "@/lib/auth/safe-redirect";

const POST_AUTH_REDIRECT_KEY = "gnp_post_auth_redirect";

type GoogleSignInButtonProps = {
  /** Where to land after a successful Google OAuth session. */
  redirectUrlComplete?: string;
  label?: string;
  className?: string;
};

/**
 * App auth is Google-only. Email/password and other OAuth providers are not offered.
 * Requires Google enabled (and other methods disabled) in the Clerk dashboard.
 */
export function GoogleSignInButton({
  redirectUrlComplete = "/",
  label = "Continue with Google",
  className = "btn-google",
}: GoogleSignInButtonProps) {
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { signIn } = useSignIn();
  const clerk = useClerk();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = authLoaded && clerk.loaded && Boolean(signIn);
  const destination = safeRedirect(redirectUrlComplete) || "/";

  useEffect(() => {
    if (authLoaded && isSignedIn) {
      router.replace(destination);
    }
  }, [authLoaded, isSignedIn, destination, router]);

  async function handleGoogleSignIn() {
    if (!ready || !signIn || busy) return;

    setBusy(true);
    setError(null);

    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, destination);
      }

      const { error: ssoError } = await signIn.sso({
        strategy: "oauth_google",
        redirectUrl: destination,
        redirectCallbackUrl: "/sso-callback",
        oidcPrompt: "select_account",
      });

      if (ssoError) {
        setError(
          ssoError.message ||
            "Google sign-in is unavailable. Enable Google OAuth in the Clerk dashboard.",
        );
        setBusy(false);
      }
      // On success the browser navigates away to Google.
    } catch {
      setError(
        "Google sign-in is unavailable. Enable Google OAuth in the Clerk dashboard.",
      );
      setBusy(false);
    }
  }

  if (authLoaded && isSignedIn) {
    return <p className="hint">You&apos;re signed in — redirecting…</p>;
  }

  return (
    <div className="google-auth">
      <button
        type="button"
        className={className}
        onClick={handleGoogleSignIn}
        disabled={!ready || busy}
        aria-busy={busy}
      >
        <GoogleMark />
        <span>{busy ? "Redirecting to Google…" : label}</span>
      </button>

      <div id="clerk-captcha" />

      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : (
        <p className="hint google-auth-hint">
          Sign in or create an account with your Google account only.
        </p>
      )}
    </div>
  );
}

export function readPostAuthRedirect(): string {
  if (typeof window === "undefined") return "/";
  const stored = window.sessionStorage.getItem(POST_AUTH_REDIRECT_KEY);
  window.sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
  return safeRedirect(stored) || "/";
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z"
      />
    </svg>
  );
}
