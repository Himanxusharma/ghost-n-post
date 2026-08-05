"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { StyleSettingsModal } from "@/components/style-settings-modal";

type AnalyticsPayload = {
  summary: {
    generations: number;
    completedGenerations: number;
    failedGenerations: number;
    publishes: number;
    published: number;
    scheduled: number;
    failedPublishes: number;
    engagement: {
      likes: number;
      comments: number;
      shares: number;
      impressions: number;
    };
  };
  publications: Array<{
    id: string;
    platform: string;
    videoTitle: string | null;
    snippet: string;
    externalUrl: string | null;
    publishedAt: string | null;
    metrics: {
      likes: number;
      comments: number;
      shares: number;
      impressions: number;
      views: number;
      fetchedAt: string | null;
    };
  }>;
};

export default function AnalyticsPage() {
  const [styleOpen, setStyleOpen] = useState(false);
  const queryClient = useQueryClient();

  const analyticsQuery = useQuery({
    queryKey: ["analytics"],
    queryFn: async (): Promise<AnalyticsPayload> => {
      const response = await fetch("/api/analytics");
      const json = await response.json();
      if (!json.success) throw new Error(json.error?.message ?? "Failed");
      return json.data;
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/analytics", { method: "POST" });
      const json = await response.json();
      if (!json.success) throw new Error(json.error?.message ?? "Sync failed");
    },
    onSuccess: () => {
      window.setTimeout(
        () => queryClient.invalidateQueries({ queryKey: ["analytics"] }),
        2500,
      );
    },
  });

  const summary = analyticsQuery.data?.summary;

  return (
    <div className="page-shell">
      <SiteHeader onOpenStyle={() => setStyleOpen(true)} />
      <main id="main-content" className="history-page" tabIndex={-1}>
        <header className="history-header">
          <p className="brand-sm">Ghost n Post</p>
          <h1>Analytics</h1>
          <p>Generation volume and published post performance.</p>
          <div className="publish-actions">
            <button
              type="button"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? "Syncing…" : "Refresh metrics"}
            </button>
            <Link href="/scheduled" className="text-link">
              Publications
            </Link>
          </div>
        </header>

        {summary ? (
          <div className="analytics-grid">
            <article>
              <h2>{summary.completedGenerations}</h2>
              <p>Drafts generated</p>
            </article>
            <article>
              <h2>{summary.published}</h2>
              <p>Posts published</p>
            </article>
            <article>
              <h2>{summary.engagement.likes}</h2>
              <p>Likes (synced)</p>
            </article>
            <article>
              <h2>{summary.engagement.impressions}</h2>
              <p>Impressions (synced)</p>
            </article>
          </div>
        ) : null}

        {analyticsQuery.isLoading ? <p className="hint">Loading…</p> : null}
        {analyticsQuery.isError ? (
          <p className="field-error" role="alert">
            {(analyticsQuery.error as Error).message}
          </p>
        ) : null}
        {syncMutation.isError ? (
          <p className="field-error" role="alert">
            {(syncMutation.error as Error).message}
          </p>
        ) : null}

        <ul className="history-list">
          {(analyticsQuery.data?.publications ?? []).map((item) => (
            <li key={item.id} className="publication-row">
              <div className="thumb-placeholder platform-badge">
                {item.platform === "linkedin" ? "in" : "𝕏"}
              </div>
              <div>
                <h2>{item.videoTitle || item.platform}</h2>
                <p>{item.snippet}…</p>
                <p className="hint">
                  {item.metrics.likes} likes · {item.metrics.comments} comments ·{" "}
                  {item.metrics.shares} shares · {item.metrics.impressions}{" "}
                  impressions
                </p>
                {item.externalUrl ? (
                  <a
                    href={item.externalUrl}
                    className="text-link"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open post
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>

        {analyticsQuery.data?.publications.length === 0 ? (
          <p className="hint">
            No published posts yet. Publish a draft, then refresh metrics.
          </p>
        ) : null}
      </main>
      {styleOpen ? (
        <StyleSettingsModal
          open={styleOpen}
          onClose={() => setStyleOpen(false)}
        />
      ) : null}
    </div>
  );
}
