"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { ThumbImage } from "@/components/thumb-image";
import type { CarouselSlide } from "@/lib/content";

type PublishPanelProps = {
  postId: string;
  linkedinDraft: string;
  xDraft: string;
  xThread: string[];
  carouselSlides: CarouselSlide[];
  customThumbnailUrl?: string | null;
  onCarouselGenerated: (slides: CarouselSlide[]) => void;
};

type AccountInfo = {
  platform: "linkedin" | "x";
  displayName: string | null;
  platformUsername: string | null;
};

export function PublishPanel({
  postId,
  linkedinDraft,
  xDraft,
  xThread,
  carouselSlides,
  customThumbnailUrl = null,
  onCarouselGenerated,
}: PublishPanelProps) {
  const { isSignedIn } = useAuth();
  const [platform, setPlatform] = useState<"linkedin" | "x">("linkedin");
  const [includeCarousel, setIncludeCarousel] = useState(false);
  const [includeCustomThumbnail, setIncludeCustomThumbnail] = useState(false);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledFor, setScheduledFor] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [carouselBusy, setCarouselBusy] = useState(false);

  // Shared cache key with /connections — avoids duplicate network calls.
  const accountsQuery = useQuery({
    queryKey: ["social-accounts"],
    enabled: Boolean(isSignedIn),
    staleTime: 60_000,
    queryFn: async (): Promise<{ accounts: AccountInfo[] }> => {
      const response = await fetch("/api/social/accounts");
      const json = await response.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? "Failed to load accounts");
      }
      return json.data as { accounts: AccountInfo[] };
    },
  });

  const accounts = accountsQuery.data?.accounts ?? [];
  const connected = accounts.some((account) => account.platform === platform);

  async function generateCarousel() {
    setCarouselBusy(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/posts/${postId}/carousel`, {
        method: "POST",
      });
      const json = await response.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? "Carousel generation failed");
      }
      onCarouselGenerated(json.data.carouselSlides);
      setIncludeCarousel(true);
      setStatus(`Generated ${json.data.carouselSlides.length} carousel slides.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Carousel failed");
    } finally {
      setCarouselBusy(false);
    }
  }

  async function publish() {
    setBusy(true);
    setStatus(null);
    try {
      if (scheduleMode && !scheduledFor) {
        throw new Error("Pick a schedule date/time");
      }
      if (scheduleMode) {
        const when = new Date(scheduledFor);
        if (Number.isNaN(when.getTime()) || when <= new Date()) {
          throw new Error("Schedule time must be in the future");
        }
      }

      const payload: Record<string, unknown> = {
        platform,
        includeCarousel,
        includeCustomThumbnail:
          includeCustomThumbnail && !includeCarousel,
        content: platform === "linkedin" ? linkedinDraft : xDraft,
      };
      if (platform === "x" && xThread.length > 0) {
        payload.threadParts = xThread;
      }
      if (scheduleMode) {
        payload.scheduledFor = new Date(scheduledFor).toISOString();
      }

      const response = await fetch(`/api/posts/${postId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? "Publish failed");
      }

      setStatus(
        json.data.status === "scheduled"
          ? `Scheduled for ${new Date(json.data.scheduledFor).toLocaleString()}`
          : "Publishing started — check Scheduled for status.",
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  }

  if (!isSignedIn) {
    return (
      <section className="publish-panel">
        <AuthGate
          title="Sign in to publish"
          message="Continue with Google, then connect LinkedIn or X to publish or schedule."
        />
      </section>
    );
  }

  return (
    <section className="publish-panel">
      <header className="publish-header">
        <h3>Publish</h3>
        <a href="/connections" className="text-link">
          Manage connections
        </a>
      </header>

      <div className="platform-toggle" role="group" aria-label="Platform">
        <button
          type="button"
          className={platform === "linkedin" ? "active" : ""}
          aria-pressed={platform === "linkedin"}
          onClick={() => setPlatform("linkedin")}
        >
          LinkedIn
        </button>
        <button
          type="button"
          className={platform === "x" ? "active" : ""}
          aria-pressed={platform === "x"}
          onClick={() => setPlatform("x")}
        >
          X
        </button>
      </div>

      {!connected ? (
        <p className="hint">
          {platform === "linkedin" ? "LinkedIn" : "X"} is not connected.{" "}
          <a
            href={`/api/social/${platform === "linkedin" ? "linkedin" : "x"}/start?returnTo=/`}
            className="text-link"
          >
            Connect now
          </a>
        </p>
      ) : (
        <p className="hint">
          Connected as{" "}
          {accounts.find((a) => a.platform === platform)?.displayName ||
            accounts.find((a) => a.platform === platform)?.platformUsername}
        </p>
      )}

      <div className="publish-options">
        <label>
          <input
            type="checkbox"
            checked={includeCarousel}
            onChange={(event) => {
              setIncludeCarousel(event.target.checked);
              if (event.target.checked) setIncludeCustomThumbnail(false);
            }}
            disabled={carouselSlides.length === 0}
          />
          Attach carousel / image
        </label>
        <label>
          <input
            type="checkbox"
            checked={includeCustomThumbnail}
            onChange={(event) => {
              setIncludeCustomThumbnail(event.target.checked);
              if (event.target.checked) setIncludeCarousel(false);
            }}
            disabled={!customThumbnailUrl}
          />
          Attach custom thumbnail
        </label>
        <button
          type="button"
          className="btn-quiet"
          onClick={generateCarousel}
          disabled={carouselBusy}
        >
          {carouselBusy
            ? "Generating slides…"
            : carouselSlides.length
              ? "Regenerate carousel"
              : "Generate carousel"}
        </button>
      </div>

      {carouselSlides.length > 0 ? (
        <div className="carousel-preview">
          {carouselSlides.map((slide, index) => (
            <ThumbImage
              key={slide.imageUrl}
              src={slide.imageUrl}
              alt={`Slide ${index + 1}: ${slide.headline}`}
              width={1080}
              height={1350}
              sizes="(max-width: 720px) 40vw, 180px"
            />
          ))}
        </div>
      ) : null}

      <label className="style-toggle">
        <input
          type="checkbox"
          checked={scheduleMode}
          onChange={(event) => setScheduleMode(event.target.checked)}
        />
        Schedule for later
      </label>

      {scheduleMode ? (
        <label className="schedule-field">
          Schedule for
          <input
            type="datetime-local"
            className="schedule-input"
            value={scheduledFor}
            onChange={(event) => setScheduledFor(event.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            required
          />
        </label>
      ) : null}

      <div className="publish-actions">
        <button
          type="button"
          onClick={publish}
          disabled={busy || !connected}
        >
          {busy
            ? "Working…"
            : scheduleMode
              ? "Schedule post"
              : "Publish now"}
        </button>
        <a href="/scheduled" className="text-link">
          View scheduled
        </a>
      </div>

      {status ? (
        <p
          className={
            /fail|error|invalid|required|connect/i.test(status)
              ? "field-error"
              : "hint"
          }
          role={/fail|error|invalid|required/i.test(status) ? "alert" : undefined}
        >
          {status}
        </p>
      ) : null}
    </section>
  );
}
