"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { SiteHeader } from "@/components/site-header";
import { StyleSettingsModal } from "@/components/style-settings-modal";
import { ThumbImage } from "@/components/thumb-image";
import { ListSkeleton } from "@/components/ui-skeleton";
import { useToast } from "@/components/toast";
import {
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
} from "@/lib/content";
import { extractYoutubeId } from "@/lib/youtube-id";

type BatchRow = {
  id: string;
  type: "urls" | "channel";
  status: string;
  stageLabel: string;
  sourceInput: string;
  channelTitle: string | null;
  totalCount: number;
  completedCount: number;
  failedCount: number;
  createdAt: string;
};

type BatchDetail = BatchRow & {
  errorMessage: string | null;
  jobs: Array<{
    id: string;
    status: string;
    stageLabel: string;
    errorMessage: string | null;
    youtubeUrl: string;
    postId: string | null;
    videoTitle: string | null;
    thumbnailUrl: string | null;
  }>;
};

export function BatchWorkspace() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const detailId = searchParams.get("id");
  const [styleOpen, setStyleOpen] = useState(false);
  const [mode, setMode] = useState<"urls" | "channel">("channel");
  const [channelInput, setChannelInput] = useState("");
  const [urlsText, setUrlsText] = useState("");
  const [maxVideos, setMaxVideos] = useState(5);
  const [language, setLanguage] = useState("auto");
  const [status, setStatus] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const listQuery = useQuery({
    queryKey: ["batches"],
    queryFn: async (): Promise<BatchRow[]> => {
      const response = await fetch("/api/batch");
      const json = await response.json();
      if (!json.success) throw new Error(json.error?.message ?? "Failed");
      return json.data;
    },
    refetchInterval: (query) => {
      const rows = query.state.data ?? [];
      const active = rows.some(
        (row) =>
          row.status === "queued" ||
          row.status === "resolving" ||
          row.status === "processing",
      );
      return active ? 4000 : false;
    },
  });

  const detailQuery = useQuery({
    queryKey: ["batch", detailId],
    enabled: Boolean(detailId),
    queryFn: async (): Promise<BatchDetail> => {
      const response = await fetch(`/api/batch/${detailId}`);
      const json = await response.json();
      if (!json.success) throw new Error(json.error?.message ?? "Failed");
      return json.data;
    },
    refetchInterval: (query) => {
      const statusValue = query.state.data?.status;
      if (
        !statusValue ||
        statusValue === "complete" ||
        statusValue === "failed" ||
        statusValue === "cancelled"
      ) {
        return false;
      }
      return 3000;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload =
        mode === "channel"
          ? {
              type: "channel",
              channelInput: channelInput.trim(),
              maxVideos,
              applyStyle: true,
              language,
            }
          : {
              type: "urls",
              urls: urlsText
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean),
              maxVideos,
              applyStyle: true,
              language,
            };
      const response = await fetch("/api/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.error?.message ?? "Failed");
      return json.data as { id: string };
    },
    onSuccess: (data) => {
      setStatus("Batch queued.");
      setFormError(null);
      success("Batch queued", "Processing videos in the background.");
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      router.replace(`/batch?id=${data.id}`);
    },
    onError: (error: Error) => {
      setStatus(error.message);
      toastError("Batch failed", error.message);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/batch/${id}`, { method: "DELETE" });
      const json = await response.json();
      if (!json.success) throw new Error(json.error?.message ?? "Cancel failed");
    },
    onSuccess: () => {
      success("Batch cancelled");
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["batch", detailId] });
    },
    onError: (error: Error) => toastError("Cancel failed", error.message),
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus(null);
    setFormError(null);

    if (mode === "channel" && !channelInput.trim()) {
      setFormError("Provide a channel URL, @handle, or channel id");
      return;
    }
    if (mode === "urls") {
      const urls = urlsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      if (urls.length === 0) {
        setFormError("Provide at least one YouTube URL");
        return;
      }
      const invalid = urls.find((url) => !extractYoutubeId(url));
      if (invalid) {
        setFormError(`Invalid YouTube URL: ${invalid}`);
        return;
      }
    }
    if (maxVideos < 1 || maxVideos > 25) {
      setFormError("Max videos must be between 1 and 25");
      return;
    }

    createMutation.mutate();
  }

  return (
    <div className="page-shell">
      <SiteHeader onOpenStyle={() => setStyleOpen(true)} />
      <main id="main-content" className="history-page" tabIndex={-1}>
        <div className="page-panel">
          <PageHeader
            stamp="Batch"
            title="Batch & channel"
            description="Process multiple videos or a whole channel feed."
            backHref="/"
            backLabel="← Single video"
          />

          <form className="batch-form" onSubmit={onSubmit} noValidate>
          <div className="platform-toggle" role="group" aria-label="Batch mode">
            <button
              type="button"
              className={mode === "channel" ? "active" : ""}
              aria-pressed={mode === "channel"}
              onClick={() => setMode("channel")}
            >
              Channel
            </button>
            <button
              type="button"
              className={mode === "urls" ? "active" : ""}
              aria-pressed={mode === "urls"}
              onClick={() => setMode("urls")}
            >
              URL list
            </button>
          </div>

          {mode === "channel" ? (
            <label>
              Channel
              <input
                type="text"
                placeholder="Channel URL, @handle, or UC… id"
                value={channelInput}
                onChange={(event) => setChannelInput(event.target.value)}
                required
                autoComplete="off"
              />
            </label>
          ) : (
            <label>
              YouTube URLs
              <textarea
                rows={6}
                placeholder={"One YouTube URL per line"}
                value={urlsText}
                onChange={(event) => setUrlsText(event.target.value)}
                required
              />
            </label>
          )}

          <label>
            Max videos
            <input
              type="number"
              min={1}
              max={25}
              value={maxVideos}
              onChange={(event) => setMaxVideos(Number(event.target.value))}
            />
          </label>

          <label>
            Language
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              {SUPPORTED_LANGUAGES.map((code) => (
                <option key={code} value={code}>
                  {LANGUAGE_LABELS[code]}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Starting…" : "Start batch"}
          </button>
          {formError ? (
            <p className="field-error" role="alert">
              {formError}
            </p>
          ) : null}
          {status ? <p className="hint">{status}</p> : null}
        </form>

        {detailId ? (
          <section className="team-section">
            <header className="publish-header">
              <h2>Batch details</h2>
              <button
                type="button"
                className="btn-quiet"
                onClick={() => router.replace("/batch")}
              >
                Close
              </button>
            </header>
            {detailQuery.isLoading ? <ListSkeleton rows={3} /> : null}
            {detailQuery.isError ? (
              <p className="field-error" role="alert">
                {(detailQuery.error as Error).message}
              </p>
            ) : null}
            {detailQuery.data ? (
              <>
                <p>
                  {detailQuery.data.channelTitle || detailQuery.data.type} ·{" "}
                  {detailQuery.data.status}
                </p>
                <p className="hint">{detailQuery.data.stageLabel}</p>
                {detailQuery.data.errorMessage ? (
                  <p className="field-error">{detailQuery.data.errorMessage}</p>
                ) : null}
                {detailQuery.data.status === "queued" ||
                detailQuery.data.status === "resolving" ||
                detailQuery.data.status === "processing" ? (
                  <button
                    type="button"
                    className="btn-quiet"
                    onClick={() => cancelMutation.mutate(detailQuery.data.id)}
                    disabled={cancelMutation.isPending}
                  >
                    Cancel batch
                  </button>
                ) : null}
                <ul className="history-list">
                  {detailQuery.data.jobs.map((job) => (
                    <li key={job.id} className="publication-row">
                      {job.thumbnailUrl ? (
                        <ThumbImage
                          src={job.thumbnailUrl}
                          alt={
                            job.videoTitle
                              ? `Thumbnail for ${job.videoTitle}`
                              : "Video thumbnail"
                          }
                          width={120}
                          height={68}
                          sizes="120px"
                        />
                      ) : (
                        <div className="thumb-placeholder" />
                      )}
                      <div className="history-meta">
                        <h2>{job.videoTitle || job.youtubeUrl}</h2>
                        <p>
                          {job.status} · {job.stageLabel}
                        </p>
                        {job.errorMessage ? (
                          <p className="field-error">{job.errorMessage}</p>
                        ) : null}
                        {job.postId ? (
                          <Link href={`/?jobId=${job.id}`} className="text-link">
                            Open draft
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
                {detailQuery.data.jobs.length === 0 ? (
                  <p className="hint">No child jobs yet.</p>
                ) : null}
              </>
            ) : null}
          </section>
        ) : null}

        <section className="team-section">
          <h2>Recent batches</h2>
          {listQuery.isLoading ? <ListSkeleton rows={3} /> : null}
          {listQuery.isError ? (
            <p className="field-error" role="alert">
              {(listQuery.error as Error).message}
            </p>
          ) : null}
          {!listQuery.isLoading ? (
            <ul className="history-list">
              {(listQuery.data ?? []).map((batch) => (
                <li key={batch.id} className="publication-row">
                  <div className="thumb-placeholder platform-badge">
                    {batch.type === "channel" ? "ch" : "list"}
                  </div>
                  <div className="history-meta">
                    <h2>
                      {batch.channelTitle || batch.type} · {batch.status}
                    </h2>
                    <p>{batch.stageLabel}</p>
                    <p className="hint">
                      {batch.completedCount}/{batch.totalCount} complete
                      {batch.failedCount ? ` · ${batch.failedCount} failed` : ""}
                    </p>
                    <Link href={`/batch?id=${batch.id}`} className="text-link">
                      Details
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          {!listQuery.isLoading && listQuery.data?.length === 0 ? (
            <p className="hint">No batches yet. Start one above.</p>
          ) : null}
        </section>
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
