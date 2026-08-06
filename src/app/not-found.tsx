import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main-content" className="auth-page" tabIndex={-1}>
      <div className="auth-shell">
        <header className="auth-brand">
          <Link href="/" className="brand-sm">
            Ghost n Post
          </Link>
          <h1>This page ghosted you</h1>
          <p>Wrong turn. Home still has drafts waiting.</p>
        </header>
        <Link href="/" className="btn-primary">
          Back to home
        </Link>
      </div>
    </main>
  );
}
