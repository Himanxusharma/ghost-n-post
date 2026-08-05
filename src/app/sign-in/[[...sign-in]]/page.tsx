import Link from "next/link";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { safeRedirect } from "@/lib/auth/safe-redirect";

type SignInPageProps = {
  searchParams: Promise<{ redirect_url?: string; error?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const redirectUrl = safeRedirect(params.redirect_url) || "/";

  return (
    <main id="main-content" className="auth-page" tabIndex={-1}>
      <div className="auth-shell page-panel">
        <header className="auth-brand">
          <div className="catalog-meta" aria-hidden>
            <span className="catalog-meta-id">REC // ACCESS</span>
            <span className="catalog-meta-stamp">Sign in</span>
          </div>
          <Link href="/" className="brand-sm">
            Ghost n Post
          </Link>
          <p>
            Sign in with Google to save drafts, match your voice, and publish.
          </p>
          {params.error === "oauth_session" ? (
            <p className="field-error" role="alert">
              Please sign in with Google again to finish connecting your social
              account.
            </p>
          ) : null}
        </header>

        <GoogleSignInButton redirectUrlComplete={redirectUrl} />
      </div>
    </main>
  );
}
