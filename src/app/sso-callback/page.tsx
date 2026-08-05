"use client";

import { useClerk, useSignIn, useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { readPostAuthRedirect } from "@/components/google-sign-in-button";

/**
 * Completes Google OAuth after Clerk redirects back from Google.
 * Must match `redirectCallbackUrl` in GoogleSignInButton (`/sso-callback`).
 */
export default function SSOCallbackPage() {
  const clerk = useClerk();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const router = useRouter();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!clerk.loaded || !signIn || !signUp || hasRun.current) return;
    hasRun.current = true;

    void (async () => {
      const destination = readPostAuthRedirect();

      async function goHome(session?: { currentTask?: unknown } | null) {
        if (session?.currentTask) {
          router.replace("/sign-in");
          return;
        }
        router.replace(destination);
      }

      try {
        if (signIn.status === "complete") {
          await signIn.finalize({
            navigate: async ({ session }) => {
              await goHome(session);
            },
          });
          return;
        }

        if (signUp.isTransferable) {
          await signIn.create({ transfer: true });
          const signInStatus = signIn.status as typeof signIn.status | "complete";
          if (signInStatus === "complete") {
            await signIn.finalize({
              navigate: async ({ session }) => {
                await goHome(session);
              },
            });
            return;
          }
          router.replace("/sign-in");
          return;
        }

        if (signIn.isTransferable) {
          await signUp.create({ transfer: true });
          if (signUp.status === "complete") {
            await signUp.finalize({
              navigate: async ({ session }) => {
                await goHome(session);
              },
            });
            return;
          }
          router.replace("/sign-in");
          return;
        }

        if (signUp.status === "complete") {
          await signUp.finalize({
            navigate: async ({ session }) => {
              await goHome(session);
            },
          });
          return;
        }

        const existingSessionId =
          signIn.existingSession?.sessionId || signUp.existingSession?.sessionId;
        if (existingSessionId) {
          await clerk.setActive({
            session: existingSessionId,
            navigate: async ({ session }) => {
              await goHome(session);
            },
          });
          return;
        }

        router.replace("/sign-in");
      } catch (error) {
        console.error("[sso-callback]", error);
        router.replace("/sign-in");
      }
    })();
  }, [clerk, router, signIn, signUp]);

  return (
    <main id="main-content" className="auth-page" tabIndex={-1}>
      <div className="auth-shell">
        <p className="hint">Finishing Google sign-in…</p>
        <div id="clerk-captcha" />
      </div>
    </main>
  );
}
