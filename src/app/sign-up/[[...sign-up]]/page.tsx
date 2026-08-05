import Link from "next/link";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { safeRedirect } from "@/lib/auth/safe-redirect";

type SignUpPageProps = {
  searchParams: Promise<{ redirect_url?: string }>;
};

/**
 * Sign-up uses the same Google OAuth path as sign-in.
 * New Google accounts are created automatically on first successful OAuth.
 */
export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const redirectUrl = safeRedirect(params.redirect_url) || "/";

  return (
    <main id="main-content" className="auth-page" tabIndex={-1}>
      <div className="auth-shell page-panel">
        <header className="auth-brand">
          <div className="catalog-meta" aria-hidden>
            <span className="catalog-meta-id">REC // ACCESS</span>
            <span className="catalog-meta-stamp">Sign up</span>
          </div>
          <Link href="/" className="brand-sm">
            Ghost n Post
          </Link>
          <p>
            Create your account with Google to unlock history, style, and teams.
          </p>
        </header>

        <GoogleSignInButton
          redirectUrlComplete={redirectUrl}
          label="Continue with Google"
        />

        <p className="auth-footnote">
          Already joined?{" "}
          <Link href="/sign-in" className="text-link">
            Sign in with Google
          </Link>
        </p>
      </div>
    </main>
  );
}
