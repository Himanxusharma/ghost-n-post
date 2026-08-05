"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { StyleSettingsModal } from "@/components/style-settings-modal";
import { ThumbImage } from "@/components/thumb-image";
import { useState } from "react";

type HistoryItem = {
  id: string;
  snippet: string;
  createdAt: string;
  videoTitle: string | null;
  channelName: string | null;
  thumbnailUrl: string | null;
};

export default function HistoryPage() {
  const [styleOpen, setStyleOpen] = useState(false);
  const queryClient = useQueryClient();

  const historyQuery = useQuery({
    queryKey: ["history"],
    queryFn: async (): Promise<HistoryItem[]> => {
      const response = await fetch("/api/history");
      const json = await response.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? "Failed to load history");
      }
      return json.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/history/${id}`, { method: "DELETE" });
      const json = await response.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? "Failed to delete");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["history"] }),
  });

  return (
    <div className="page-shell">
      <SiteHeader onOpenStyle={() => setStyleOpen(true)} />

      <main id="main-content" className="history-page" tabIndex={-1}>
        <header className="history-header">
          <p className="brand-sm">Ghost n Post</p>
          <h1>History</h1>
          <p>Past generations, newest first.</p>
          <Link href="/" className="text-link">
            ← New draft
          </Link>
        </header>

        {historyQuery.isLoading ? <p className="hint">Loading…</p> : null}
        {historyQuery.isError ? (
          <p className="field-error">
            {(historyQuery.error as Error).message}
          </p>
        ) : null}

        <ul className="history-list">
          {(historyQuery.data ?? []).map((item) => (
            <li key={item.id}>
              {item.thumbnailUrl ? (
                <ThumbImage
                  src={item.thumbnailUrl}
                  alt={
                    item.videoTitle
                      ? `Thumbnail for ${item.videoTitle}`
                      : "Saved draft thumbnail"
                  }
                  width={120}
                  height={68}
                  sizes="120px"
                />
              ) : (
                <div className="thumb-placeholder" aria-hidden />
              )}
              <div className="history-meta">
                <h2>{item.videoTitle ?? "Untitled video"}</h2>
                <p>{item.snippet}…</p>
                <time dateTime={item.createdAt}>
                  {new Date(item.createdAt).toLocaleString()}
                </time>
              </div>
              <button
                type="button"
                className="btn-quiet"
                onClick={() => deleteMutation.mutate(item.id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>

        {historyQuery.data?.length === 0 ? (
          <p className="hint">No saved drafts yet. Generate one from the home page.</p>
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
