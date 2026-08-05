import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main-content" className="auth-page" tabIndex={-1}>
      <div className="auth-shell">
        <header className="auth-brand">
          <Link href="/" className="brand-sm">
            Ghost n Post
          </Link>
          <h1>Page not found</h1>
          <p>That link doesn&apos;t lead anywhere. Head home to generate a draft.</p>
        </header>
        <Link href="/" className="btn-primary">
          Back to home
        </Link>
      </div>
    </main>
  );
}
