"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { SiteHeader } from "@/components/site-header";
import { StyleSettingsModal } from "@/components/style-settings-modal";
import { ListSkeleton } from "@/components/ui-skeleton";

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
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["publications"] }),
  });

  return (
    <div className="page-shell">
      <SiteHeader onOpenStyle={() => setStyleOpen(true)} />

      <main id="main-content" className="history-page" tabIndex={-1}>
        <div className="page-panel">
          <PageHeader
            stamp="Schedule"
            title="Scheduled & published"
            description="Track immediate publishes and upcoming scheduled posts."
            backHref="/"
            backLabel="← New draft"
          />

          {listQuery.isLoading ? <ListSkeleton rows={4} /> : null}
          {listQuery.isError ? (
            <p className="field-error">
              {(listQuery.error as Error).message}
            </p>
          ) : null}

          {!listQuery.isLoading ? (
            <ul className="history-list">
              {(listQuery.data ?? []).map((item) => (
                <li key={item.id} className="publication-row">
                  <div className="thumb-placeholder platform-badge">
                    {item.platform === "linkedin" ? "in" : "𝕏"}
                  </div>
                  <div className="history-meta">
                    <h2>
                      {item.platform.toUpperCase()} · {item.status}
                    </h2>
                    <p>{item.contentSnippet}…</p>
                    {item.scheduledFor ? (
                      <time dateTime={item.scheduledFor}>
                        Scheduled {new Date(item.scheduledFor).toLocaleString()}
                      </time>
                    ) : item.publishedAt ? (
                      <time dateTime={item.publishedAt}>
                        Published {new Date(item.publishedAt).toLocaleString()}
                      </time>
                    ) : (
                      <time dateTime={item.createdAt}>
                        Created {new Date(item.createdAt).toLocaleString()}
                      </time>
                    )}
                    {item.errorMessage ? (
                      <p className="field-error">{item.errorMessage}</p>
                    ) : null}
                    {item.externalUrl ? (
                      <p>
                        <a
                          href={item.externalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-link"
                        >
                          Open on{" "}
                          {item.platform === "linkedin" ? "LinkedIn" : "X"}
                        </a>
                      </p>
                    ) : null}
                  </div>
                  {item.status === "scheduled" || item.status === "pending" ? (
                    <button
                      type="button"
                      className="btn-quiet"
                      onClick={() => cancelMutation.mutate(item.id)}
                    >
                      Cancel
                    </button>
                  ) : (
                    <span />
                  )}
                </li>
              ))}
            </ul>
          ) : null}

          {!listQuery.isLoading && listQuery.data?.length === 0 ? (
            <p className="hint">
              No publications yet. Generate a draft, then use Publish now or
              Schedule.
            </p>
          ) : null}
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
