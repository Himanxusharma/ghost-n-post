"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { SiteHeader } from "@/components/site-header";
import { StyleSettingsModal } from "@/components/style-settings-modal";
import { AnalyticsSkeleton, ListSkeleton } from "@/components/ui-skeleton";
import { useToast } from "@/components/toast";

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
  const { success, error: toastError, info } = useToast();

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
      info("Sync started", "Refreshing metrics…");
      window.setTimeout(
        () => queryClient.invalidateQueries({ queryKey: ["analytics"] }),
        2500,
      );
      window.setTimeout(
        () => success("Metrics refreshed"),
        2800,
      );
    },
    onError: (error: Error) => toastError("Sync failed", error.message),
  });

  const summary = analyticsQuery.data?.summary;

  return (
    <div className="page-shell">
      <SiteHeader onOpenStyle={() => setStyleOpen(true)} />

      <main id="main-content" className="history-page" tabIndex={-1}>
        <div className="page-panel">
          <PageHeader
            stamp="V2 Feature"
            title="Analytics dashboard"
            description="Live engagement tracking and post performance analytics will unlock in Version 2.0."
            backHref="/"
            backLabel="← New draft"
          />

          <div className="v2-lock-card">
            <span className="v2-badge">🔒 LOCKED FOR V2</span>
            <h3>Analytics Dashboard Launching in Version 2.0</h3>
            <p>
              Live post impressions, engagement sync, and performance analytics will unlock in V2. For now, generate posts in the Studio and use 1-click <strong>Copy</strong> to post directly!
            </p>
            <div style={{ marginTop: "1rem" }}>
              <a href="/" className="tool-btn tool-btn-primary">
                ← Return to Draft Studio
              </a>
            </div>
          </div>
        </div>
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
