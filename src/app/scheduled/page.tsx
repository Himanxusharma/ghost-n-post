"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { SiteHeader } from "@/components/site-header";
import { StyleSettingsModal } from "@/components/style-settings-modal";
import { ListSkeleton } from "@/components/ui-skeleton";
import { useToast } from "@/components/toast";

type PublicationItem = {
  id: string;
  platform: "linkedin" | "x";
  status: string;
  contentSnippet: string;
  scheduledFor: string | null;
  publishedAt: string | null;
  externalUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export default function ScheduledPage() {
  const [styleOpen, setStyleOpen] = useState(false);
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const listQuery = useQuery({
    queryKey: ["publications"],
    queryFn: async (): Promise<PublicationItem[]> => {
      const response = await fetch("/api/publications?status=active");
      const json = await response.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? "Failed to load publications");
      }
      return json.data;
    },
    refetchInterval: (query) => {
      const rows = query.state.data ?? [];
      const active = rows.some(
        (row) =>
          row.status === "pending" ||
          row.status === "scheduled" ||
          row.status === "publishing",
      );
      return active ? 5000 : false;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/publications/${id}`, {
        method: "DELETE",
      });
      const json = await response.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? "Cancel failed");
      }
    },
    onSuccess: () => {
      success("Publication cancelled");
      queryClient.invalidateQueries({ queryKey: ["publications"] });
    },
    onError: (error: Error) => toastError("Cancel failed", error.message),
  });

  return (
    <div className="page-shell">
      <SiteHeader onOpenStyle={() => setStyleOpen(true)} />

      <main id="main-content" className="history-page" tabIndex={-1}>
        <div className="page-panel">
          <PageHeader
            stamp="V2 Feature"
            title="Scheduled & published"
            description="Direct social account scheduling and queue management will unlock in Version 2.0."
            backHref="/"
            backLabel="← New draft"
          />

          <div className="v2-lock-card">
            <span className="v2-badge">🔒 LOCKED FOR V2</span>
            <h3>Post Scheduling is Launching in Version 2.0</h3>
            <p>
              Direct calendar scheduling and automated posting to LinkedIn & X will unlock in V2. For now, generate posts in the Studio and use 1-click <strong>Copy</strong> to post directly!
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
