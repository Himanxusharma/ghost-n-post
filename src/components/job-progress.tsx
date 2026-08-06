"use client";

import { ThumbImage } from "./thumb-image";

type JobProgressProps = {
  stageLabel: string;
  status: string;
  video?: {
    title: string | null;
    channelName: string | null;
    thumbnailUrl: string | null;
    durationSeconds: number | null;
  } | null;
  errorMessage?: string | null;
  onRetry?: () => void;
};

const STAGES = [
  { label: "Fetching video…", tone: "fetch" },
  { label: "Transcribing…", tone: "transcribe" },
  { label: "Writing draft…", tone: "write" },
] as const;

export function JobProgress({
  stageLabel,
  status,
  video,
  errorMessage,
  onRetry,
}: JobProgressProps) {
  const activeIndex = STAGES.findIndex((stage) =>
    stageLabel
      .toLowerCase()
      .includes(stage.label.split("…")[0].toLowerCase()),
  );

  return (
    <section className="progress-panel" aria-live="polite">
      {video?.thumbnailUrl ? (
        <div className="progress-media animate-rise">
          <ThumbImage
            src={video.thumbnailUrl}
            alt={
              video.title ? `Thumbnail for ${video.title}` : "Video thumbnail"
            }
            width={320}
            height={180}
            sizes="(max-width: 720px) 40vw, 160px"
            priority={status !== "complete"}
          />
          <div>
            <h2>{video.title}</h2>
            <p>
              {video.channelName}
              {video.durationSeconds
                ? ` · ${formatDuration(video.durationSeconds)}`
                : null}
            </p>
            {video.durationSeconds && video.durationSeconds > 60 * 60 ? (
              <p className="hint">
                This video is over 60 minutes. Processing may take a few
                minutes.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {status === "failed" ? (
        <div className="progress-error">
          <p>{errorMessage ?? "Generation failed."}</p>
          {onRetry ? (
            <button type="button" onClick={onRetry}>
              Try again
            </button>
          ) : null}
        </div>
      ) : (
        <ol className="stage-list">
          {STAGES.map((stage, index) => {
            const done = activeIndex > index || status === "complete";
            const current = activeIndex === index && status !== "complete";
            const state = done ? "done" : current ? "current" : "pending";
            return (
              <li
                key={stage.label}
                className={`stage-item stage-${stage.tone} ${state}`}
              >
                <span className="stage-dot" aria-hidden />
                <span className="stage-label">
                  {current ? stageLabel || stage.label : stage.label}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
