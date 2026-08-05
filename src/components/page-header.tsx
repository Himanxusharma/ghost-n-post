import Link from "next/link";
import type { ReactNode } from "react";

type PageHeaderProps = {
  /** Archival stamp shown top-right, e.g. "History", "Batch". */
  stamp: string;
  title: string;
  description: string;
  /** Optional back / secondary link under the description. */
  backHref?: string;
  backLabel?: string;
  children?: ReactNode;
};

/**
 * Shared secondary-page masthead — matches home archival / brutalist cues.
 */
export function PageHeader({
  stamp,
  title,
  description,
  backHref,
  backLabel = "← Back",
  children,
}: PageHeaderProps) {
  return (
    <header className="history-header">
      <div className="catalog-meta" aria-hidden>
        <span className="catalog-meta-id">REC // INDEX</span>
        <span className="catalog-meta-stamp">{stamp}</span>
      </div>
      <p className="brand-sm">Ghost n Post</p>
      <h1>{title}</h1>
      <p>{description}</p>
      {backHref ? (
        <Link href={backHref} className="text-link">
          {backLabel}
        </Link>
      ) : null}
      {children ? <div className="history-header-actions">{children}</div> : null}
    </header>
  );
}
