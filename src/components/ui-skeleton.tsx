"use client";

import { SiteHeader } from "@/components/site-header";

type SkeletonBlockProps = {
  className?: string;
};

/** Hard-edge shimmer block — matches brutalist loading language. */
export function SkeletonBlock({ className = "" }: SkeletonBlockProps) {
  return <span className={`skeleton-block ${className}`.trim()} aria-hidden />;
}

type ListSkeletonProps = {
  rows?: number;
  /** Show thumbnail placeholder column (history-style). */
  withThumb?: boolean;
};

export function ListSkeleton({ rows = 4, withThumb = true }: ListSkeletonProps) {
  return (
    <ul className="skeleton-list" aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="skeleton-list-row">
          {withThumb ? <SkeletonBlock className="skeleton-thumb" /> : null}
          <div className="skeleton-list-copy">
            <SkeletonBlock className="skeleton-line-lg" />
            <SkeletonBlock className="skeleton-line-md" />
            <SkeletonBlock className="skeleton-line-sm" />
          </div>
          <SkeletonBlock className="skeleton-action" />
        </li>
      ))}
    </ul>
  );
}

export function FormSkeleton() {
  return (
    <div className="skeleton-form" aria-hidden>
      <SkeletonBlock className="skeleton-toggle" />
      <SkeletonBlock className="skeleton-field" />
      <SkeletonBlock className="skeleton-field-sm" />
      <SkeletonBlock className="skeleton-field-sm" />
      <SkeletonBlock className="skeleton-cta" />
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="skeleton-analytics" aria-hidden>
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="skeleton-stat">
          <SkeletonBlock className="skeleton-stat-value" />
          <SkeletonBlock className="skeleton-line-sm" />
        </div>
      ))}
    </div>
  );
}

export function ResultPanelSkeleton() {
  return (
    <div className="progress-panel skeleton-result" aria-busy="true">
      <div className="skeleton-result-header" aria-hidden>
        <div className="skeleton-list-copy">
          <SkeletonBlock className="skeleton-line-sm" />
          <SkeletonBlock className="skeleton-title" />
          <SkeletonBlock className="skeleton-line-md" />
        </div>
        <div className="skeleton-toolbar">
          <SkeletonBlock className="skeleton-chip" />
          <SkeletonBlock className="skeleton-chip" />
          <SkeletonBlock className="skeleton-chip" />
        </div>
      </div>
      <SkeletonBlock className="skeleton-media" />
      <div className="skeleton-draft-grid" aria-hidden>
        <SkeletonBlock className="skeleton-draft-card" />
        <SkeletonBlock className="skeleton-draft-card" />
      </div>
      <span className="sr-only">Loading drafts…</span>
    </div>
  );
}

type PageLoadingShellProps = {
  stamp: string;
  /** history | form | analytics | connections */
  variant?: "list" | "form" | "analytics" | "connections";
};

/**
 * Full secondary-page loading shell (nav + panel + shimmer).
 * Used by route `loading.tsx` and Suspense fallbacks.
 */
export function PageLoadingShell({
  stamp,
  variant = "list",
}: PageLoadingShellProps) {
  return (
    <div className="page-shell">
      <SiteHeader onOpenStyle={() => undefined} />
      <main
        id="main-content"
        className="history-page"
        tabIndex={-1}
        aria-busy="true"
      >
        <div className="page-panel page-loading-panel">
          <div className="catalog-meta" aria-hidden>
            <span className="catalog-meta-id">REC // INDEX</span>
            <span className="catalog-meta-stamp">{stamp}</span>
          </div>
          <SkeletonBlock className="skeleton-brand" />
          <SkeletonBlock className="skeleton-title" />
          <SkeletonBlock className="skeleton-copy" />
          {variant === "analytics" ? <AnalyticsSkeleton /> : null}
          {variant === "form" ? <FormSkeleton /> : null}
          {variant === "connections" ? (
            <ListSkeleton rows={2} withThumb={false} />
          ) : null}
          {variant === "list" || variant === "analytics" ? (
            <ListSkeleton rows={variant === "analytics" ? 3 : 4} />
          ) : null}
          {variant === "form" ? <ListSkeleton rows={3} /> : null}
          <span className="sr-only">Loading {stamp}…</span>
        </div>
      </main>
    </div>
  );
}

/** Home route Suspense / slow load fallback. */
export function HomeLoadingShell() {
  return (
    <div className="page-shell">
      <SiteHeader onOpenStyle={() => undefined} />
      <main id="main-content" className="hero" tabIndex={-1} aria-busy="true">
        <div className="hero-atmosphere" aria-hidden />
        <div className="hero-content page-loading-panel">
          <div className="catalog-meta" aria-hidden>
            <span className="catalog-meta-id">REC.0001 // MEDIA-INDEX</span>
            <span className="catalog-meta-stamp">Draft studio</span>
          </div>
          <SkeletonBlock className="skeleton-home-brand" />
          <SkeletonBlock className="skeleton-home-headline" />
          <SkeletonBlock className="skeleton-copy" />
          <div className="skeleton-url" aria-hidden>
            <SkeletonBlock className="skeleton-field" />
            <SkeletonBlock className="skeleton-cta" />
          </div>
          <div className="skeleton-options" aria-hidden>
            <SkeletonBlock className="skeleton-chip" />
            <SkeletonBlock className="skeleton-chip" />
            <SkeletonBlock className="skeleton-chip" />
          </div>
          <span className="sr-only">Loading Ghost n Post…</span>
        </div>
      </main>
    </div>
  );
}

/** Auth route loading — centered access card. */
export function AuthLoadingShell() {
  return (
    <main id="main-content" className="auth-page" tabIndex={-1} aria-busy="true">
      <div className="auth-shell page-panel page-loading-panel">
        <div className="catalog-meta" aria-hidden>
          <span className="catalog-meta-id">REC // ACCESS</span>
          <span className="catalog-meta-stamp">Sign in</span>
        </div>
        <SkeletonBlock className="skeleton-home-brand" />
        <SkeletonBlock className="skeleton-copy" />
        <SkeletonBlock className="skeleton-cta skeleton-auth-cta" />
        <span className="sr-only">Loading sign in…</span>
      </div>
    </main>
  );
}
