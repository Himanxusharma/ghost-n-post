"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { JobProgress } from "./job-progress";
import { PostResult } from "./post-result";
import { SiteHeader } from "./site-header";
import { UrlForm } from "./url-form";
import type { SupportedLanguage } from "@/lib/content";
import { extractYoutubeId } from "@/lib/youtube-id";

const StyleSettingsModal = dynamic(
  () =>
    import("./style-settings-modal").then((mod) => ({
      default: mod.StyleSettingsModal,
    })),
  { ssr: false },
);

type JobResponse = {
  success: boolean;
  data?: {
    id: string;
    status: string;
    stageLabel: string;
    errorMessage: string | null;
    postId: string | null;
    video: {
      title: string | null;
      channelName: string | null;
      thumbnailUrl: string | null;
      durationSeconds: number | null;
    } | null;
  };
  error?: { message: string };
};

type PostResponse = {
  success: boolean;
  data?: {
    id: string;
    linkedinDraft: string;
    xDraft: string;
    xThread: string[];
    regenerateCount: number;
    carouselSlides?: Array<{
      headline: string;
      body: string;
      imageUrl: string;
    }>;
    language?: string;
    customThumbnailUrl?: string | null;
    customThumbnailHeadline?: string | null;
    video: {
      title: string | null;
      thumbnailUrl: string | null;
    } | null;
  };
};

export function HomeWorkspace() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const deepLinkUrl = searchParams.get("url") || "";
  const deepLinkJobId = searchParams.get("jobId");

  const [jobId, setJobId] = useState<string | null>(null);
  const [styleOpen, setStyleOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [jobRunning, setJobRunning] = useState(false);

  function rememberJob(nextJobId: string) {
    setJobId(nextJobId);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("url");
    params.set("jobId", nextJobId);
    router.replace(`/?${params.toString()}`, { scroll: false });
  }

  async function onSubmitUrl(
    youtubeUrl: string,
    applyStyle: boolean,
    language: SupportedLanguage = "auto",
  ) {
    setSubmitError(null);
    setFormBusy(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeUrl, applyStyle, language }),
      });
      const json = await response.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? "Could not start generation");
      }
      rememberJob(json.data.jobId);
      setJobRunning(true);
      return json.data.jobId as string;
    } finally {
      setFormBusy(false);
    }
  }

  // Extension deep-link: auto-start generate for ?url= (once per URL).
  const autoGenerateQuery = useQuery({
    queryKey: ["auto-generate", deepLinkUrl],
    enabled:
      Boolean(deepLinkUrl) &&
      !deepLinkJobId &&
      !jobId &&
      Boolean(extractYoutubeId(deepLinkUrl)),
    queryFn: async () => onSubmitUrl(deepLinkUrl, true),
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const activeJobId = jobId ?? deepLinkJobId ?? autoGenerateQuery.data ?? null;

  return (
    <div className="page-shell">
      <SiteHeader onOpenStyle={() => setStyleOpen(true)} />

      <main id="main-content" className="hero" tabIndex={-1}>
        <div className="hero-atmosphere" aria-hidden />

        <div className="hero-content">
          <p className="brand animate-fade">Ghost n Post</p>
          <h1 className="headline animate-fade delay-1">
            Your AI ghostwriter for video.
          </h1>
          <p className="subhead animate-fade delay-2">
            Paste a YouTube link. Get a LinkedIn and X draft in your voice —
            with the thumbnail ready to go.
          </p>

          <div className="hero-input animate-fade delay-3">
            <UrlForm
              key={deepLinkUrl || "url-form"}
              initialUrl={deepLinkUrl}
              onSubmitUrl={async (youtubeUrl, applyStyle, language) => {
                try {
                  await onSubmitUrl(youtubeUrl, applyStyle, language);
                } catch (error) {
                  setSubmitError(
                    error instanceof Error
                      ? error.message
                      : "Could not start generation",
                  );
                  throw error;
                }
              }}
              disabled={formBusy || jobRunning}
            />
            {submitError || autoGenerateQuery.isError ? (
              <p className="field-error" role="alert">
                {submitError ||
                  (autoGenerateQuery.error as Error)?.message ||
                  "Could not start generation"}
              </p>
            ) : null}
          </div>
        </div>
      </main>

      {activeJobId ? (
        <ActiveJobPanel
          jobId={activeJobId}
          onRetry={() => {
            setJobId(null);
            setJobRunning(false);
            router.replace("/", { scroll: false });
          }}
          onJobSettled={() => setJobRunning(false)}
        />
      ) : null}

      {styleOpen ? (
        <StyleSettingsModal
          open={styleOpen}
          onClose={() => setStyleOpen(false)}
        />
      ) : null}
    </div>
  );
}

/**
 * Isolates job/post polling so hero + header do not re-render every 1.5s.
 */
function ActiveJobPanel({
  jobId,
  onRetry,
  onJobSettled,
}: {
  jobId: string;
  onRetry: () => void;
  onJobSettled: () => void;
}) {
  const jobQuery = useQuery({
    queryKey: ["job", jobId],
    queryFn: async (): Promise<JobResponse["data"]> => {
      const response = await fetch(`/api/jobs/${jobId}`);
      const json = (await response.json()) as JobResponse;
      if (!json.success || !json.data) {
        throw new Error(json.error?.message ?? "Failed to load job");
      }
      return json.data;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || status === "complete" || status === "failed") {
        return false;
      }
      return 1500;
    },
  });

  const status = jobQuery.data?.status;

  useEffect(() => {
    if (status === "complete" || status === "failed") {
      onJobSettled();
    }
  }, [status, onJobSettled]);

  const postId = jobQuery.data?.postId ?? null;
  const postQuery = useQuery({
    queryKey: ["post", postId],
    enabled: Boolean(postId) && jobQuery.data?.status === "complete",
    staleTime: 60_000,
    queryFn: async () => {
      const response = await fetch(`/api/posts/${postId}`);
      const json = (await response.json()) as PostResponse;
      if (!json.success || !json.data) {
        throw new Error("Failed to load generated posts");
      }
      return json.data;
    },
  });

  const showProgress =
    jobQuery.data && jobQuery.data.status !== "complete";

  return (
    <>
      {showProgress || jobQuery.data?.status === "failed" ? (
        <div className="workspace">
          <JobProgress
            stageLabel={jobQuery.data?.stageLabel ?? "Queued…"}
            status={jobQuery.data?.status ?? "queued"}
            video={jobQuery.data?.video}
            errorMessage={jobQuery.data?.errorMessage}
            onRetry={onRetry}
          />
        </div>
      ) : null}

      {jobQuery.isError ? (
        <div className="workspace">
          <p className="field-error" role="alert">
            {(jobQuery.error as Error).message}
          </p>
        </div>
      ) : null}

      {postQuery.isLoading ? (
        <div className="workspace" aria-busy="true">
          <div className="progress-panel">
            <span className="skeleton-line" aria-hidden />
            <p className="hint">Loading drafts…</p>
          </div>
        </div>
      ) : null}

      {postQuery.isError ? (
        <div className="workspace">
          <p className="field-error" role="alert">
            {(postQuery.error as Error).message}
          </p>
        </div>
      ) : null}

      {postQuery.data ? (
        <div className="workspace">
          {jobQuery.data?.video ? (
            <JobProgress
              stageLabel="Done"
              status="complete"
              video={jobQuery.data.video}
            />
          ) : null}
          <PostResult
            postId={postQuery.data.id}
            linkedinDraft={postQuery.data.linkedinDraft}
            xDraft={postQuery.data.xDraft}
            xThread={postQuery.data.xThread}
            regenerateCount={postQuery.data.regenerateCount}
            carouselSlides={postQuery.data.carouselSlides ?? []}
            thumbnailUrl={postQuery.data.video?.thumbnailUrl}
            customThumbnailUrl={postQuery.data.customThumbnailUrl}
            customThumbnailHeadline={postQuery.data.customThumbnailHeadline}
            language={postQuery.data.language}
            videoTitle={postQuery.data.video?.title}
          />
        </div>
      ) : null}
    </>
  );
}
