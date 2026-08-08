import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-left">
          <Link href="/" className="footer-brand">
            Ghost n Post
          </Link>
          <p className="footer-copyright">
            © {new Date().getFullYear()} Ghost n Post. All rights reserved.
          </p>
        </div>
        <nav className="footer-nav" aria-label="Footer Navigation">
          <Link href="/pricing">Pricing</Link>
          <Link href="/extension">Extension</Link>
          <Link href="/contact">Contact Us</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms & Conditions</Link>
        </nav>
      </div>
    </footer>
  );
}
