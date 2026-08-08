"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { ThumbImage } from "@/components/thumb-image";
import { useToast } from "@/components/toast";
import type { CarouselSlide } from "@/lib/content";

type PublishPanelProps = {
  postId: string;
  linkedinDraft: string;
  xDraft: string;
  xThread: string[];
  carouselSlides: CarouselSlide[];
  customThumbnailUrl?: string | null;
  platforms?: Array<"linkedin" | "x">;
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
  platforms = ["linkedin", "x"],
  onCarouselGenerated,
}: PublishPanelProps) {
  const { isSignedIn } = useAuth();
  const availablePlatforms = platforms.length
    ? platforms
    : (["linkedin", "x"] as const);
  const [platform, setPlatform] = useState<"linkedin" | "x">(
    availablePlatforms.includes("linkedin") ? "linkedin" : "x",
  );
  const [includeCarousel, setIncludeCarousel] = useState(false);
  const [includeCustomThumbnail, setIncludeCustomThumbnail] = useState(false);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledFor, setScheduledFor] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [carouselBusy, setCarouselBusy] = useState(false);
  const { success, error: toastError } = useToast();

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
      const message = `Generated ${json.data.carouselSlides.length} carousel slides.`;
      setStatus(message);
      success("Carousel ready", message);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Carousel failed";
      setStatus(message);
      toastError("Carousel failed", message);
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

      const message =
        json.data.status === "scheduled"
          ? `Scheduled for ${new Date(json.data.scheduledFor).toLocaleString()}`
          : "Publishing started. Check Scheduled for status.";
      setStatus(message);
      success(
        json.data.status === "scheduled" ? "Post scheduled" : "Publish started",
        message,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Publish failed";
      setStatus(message);
      toastError("Publish failed", message);
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
      <div className="v2-lock-banner">
        <span className="v2-badge">🔒 V2 FEATURE</span>
        <p>
          Direct social publishing & calendar scheduling will unlock in{" "}
          <strong>Version 2.0</strong>. For now, use the 1-click{" "}
          <strong>Copy</strong> buttons above to paste your drafts into LinkedIn & X!
        </p>
      </div>

      <div className="publish-options">
        <button
          type="button"
          className="tool-btn"
          onClick={generateCarousel}
          disabled={carouselBusy}
        >
          {carouselBusy
            ? "Generating slides…"
            : carouselSlides.length > 0
              ? "Regenerate carousel slides"
              : "Generate carousel slides"}
        </button>
        {status ? <p className="hint">{status}</p> : null}
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
    </section>
  );
}
