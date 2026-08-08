"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { SiteFooter } from "@/components/site-footer";
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
import { UpgradeModal } from "@/components/upgrade-modal";

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
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null);
  const [mode, setMode] = useState<"urls" | "channel">("channel");
  const [channelInput, setChannelInput] = useState("");
  const [urls, setUrls] = useState<string[]>([]);
  const [urlDraft, setUrlDraft] = useState("");
  const [urlDraftError, setUrlDraftError] = useState<string | null>(null);
  const [maxVideos, setMaxVideos] = useState(5);
  const [language, setLanguage] = useState("auto");
  const [status, setStatus] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  function addUrl() {
    const trimmed = urlDraft.trim();
    if (!trimmed) {
      setUrlDraftError("Paste a YouTube URL first");
      return;
    }
    if (!extractYoutubeId(trimmed)) {
      setUrlDraftError("Enter a valid YouTube video URL");
      return;
    }
    const videoId = extractYoutubeId(trimmed)!;
    if (
      urls.some((existing) => extractYoutubeId(existing) === videoId)
    ) {
      setUrlDraftError("That video is already in the list");
      return;
    }
    if (urls.length >= 25) {
      setUrlDraftError("Max 25 URLs per batch");
      return;
    }

    setUrls((prev) => [...prev, trimmed]);
    setUrlDraft("");
    setUrlDraftError(null);
    setFormError(null);
  }

  function removeUrl(index: number) {
    setUrls((prev) => prev.filter((_, i) => i !== index));
  }

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
              urls,
              maxVideos: urls.length,
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
      setUrls([]);
      setUrlDraft("");
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
      if (urls.length === 0) {
        setFormError("Add at least one YouTube URL");
        return;
      }
      const invalid = urls.find((url) => !extractYoutubeId(url));
      if (invalid) {
        setFormError(`Invalid YouTube URL: ${invalid}`);
        return;
      }
    }
    if (mode === "channel" && (maxVideos < 1 || maxVideos > 25)) {
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
            description="One playlist. Many drafts. Less babysitting."
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
            <div className="batch-url-builder">
              <span className="batch-url-builder-label">YouTube URLs</span>
              <div className="batch-url-add-row">
                <input
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="https://youtube.com/watch?v=…"
                  value={urlDraft}
                  onChange={(event) => {
                    setUrlDraft(event.target.value);
                    if (urlDraftError) setUrlDraftError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addUrl();
                    }
                  }}
                  aria-label="YouTube URL to add"
                  aria-invalid={Boolean(urlDraftError)}
                  aria-describedby={
                    urlDraftError ? "batch-url-draft-error" : undefined
                  }
                />
                <button
                  type="button"
                  className="batch-url-add-btn"
                  onClick={addUrl}
                  disabled={urls.length >= 25}
                >
                  Add
                </button>
              </div>
              {urlDraftError ? (
                <p
                  id="batch-url-draft-error"
                  className="field-error"
                  role="alert"
                >
                  {urlDraftError}
                </p>
              ) : null}

              {urls.length > 0 ? (
                <ul className="batch-url-list" aria-label="Queued YouTube URLs">
                  {urls.map((url, index) => (
                    <li key={`${extractYoutubeId(url) ?? url}-${index}`}>
                      <span className="batch-url-index">{index + 1}</span>
                      <span className="batch-url-value" title={url}>
                        {url}
                      </span>
                      <button
                        type="button"
                        className="batch-url-remove"
                        onClick={() => removeUrl(index)}
                        aria-label={`Remove URL ${index + 1}`}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="hint">Add links one by one. Max 25.</p>
              )}
              {urls.length > 0 ? (
                <p className="hint">
                  {urls.length} video{urls.length === 1 ? "" : "s"} queued
                </p>
              ) : null}
            </div>
          )}

          {mode === "channel" ? (
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
          ) : null}

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

          <button
            type="submit"
            className="btn-primary"
            disabled={createMutation.isPending}
          >
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
                <div className="batch-delivery-bar" style={{ margin: "0.75rem 0 1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--accent)" }}>
                      ⚡ Incremental Delivery: {detailQuery.data.completedCount || 0} of {detailQuery.data.totalCount || detailQuery.data.jobs.length} drafts ready
                    </span>
                    <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono), monospace", color: "var(--ink-soft)" }}>
                      {detailQuery.data.totalCount ? Math.round(((detailQuery.data.completedCount || 0) / detailQuery.data.totalCount) * 100) : 0}%
                    </span>
                  </div>
                  <div style={{ height: "6px", background: "#141618", border: "1px solid var(--border)", borderRadius: "3px", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        background: "var(--accent)",
                        width: `${detailQuery.data.totalCount ? Math.round(((detailQuery.data.completedCount || 0) / detailQuery.data.totalCount) * 100) : 0}%`,
                        transition: "width 300ms ease",
                      }}
                    />
                  </div>
                </div>

                {detailQuery.data.errorMessage ? (
                  <div>
                    <p className="field-error">{detailQuery.data.errorMessage}</p>
                    {/upgrade|free plan|3 minutes/i.test(detailQuery.data.errorMessage) ? (
                      <button
                        type="button"
                        className="inline-upgrade-btn"
                        onClick={() => {
                          setUpgradeReason(detailQuery.data?.errorMessage);
                          setUpgradeOpen(true);
                        }}
                      >
                        ⚡ Upgrade to Pro
                      </button>
                    ) : null}
                  </div>
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
                          {job.status === "complete" ? (
                            <span style={{ color: "var(--accent)", fontWeight: 700 }}>✓ Draft Ready</span>
                          ) : (
                            `${job.status} · ${job.stageLabel}`
                          )}
                        </p>
                        {job.errorMessage ? (
                          <div>
                            <p className="field-error">{job.errorMessage}</p>
                            {/upgrade|free plan|3 minutes/i.test(job.errorMessage) ? (
                              <button
                                type="button"
                                className="inline-upgrade-btn"
                                onClick={() => {
                                  setUpgradeReason(job.errorMessage);
                                  setUpgradeOpen(true);
                                }}
                              >
                                ⚡ Upgrade to Pro
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                        {job.postId ? (
                          <Link
                            href={`/?jobId=${job.id}`}
                            className="tool-btn tool-btn-primary"
                            style={{
                              display: "inline-flex",
                              marginTop: "0.5rem",
                              padding: "0.3rem 0.75rem",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              textDecoration: "none",
                            }}
                          >
                            ✨ Open draft →
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
            <p className="hint">No batches yet. Queue one above and let it cook.</p>
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
      <UpgradeModal
        isOpen={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason={upgradeReason}
      />
      <SiteFooter />
    </div>
  );
}
