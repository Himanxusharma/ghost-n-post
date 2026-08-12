"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { FormatPicker } from "@/components/format-picker";
import { useToast } from "@/components/toast";
import { useQuery } from "@tanstack/react-query";
import {
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "@/lib/content";
import {
  DEFAULT_FORMAT_ID,
  type PostFormatId,
} from "@/lib/post-formats";
import type { SocialPlatform } from "@/lib/validations";
import { extractYoutubeId } from "@/lib/youtube-id";

type UrlFormProps = {
  disabled?: boolean;
  initialUrl?: string;
  onSubmitUrl: (
    youtubeUrl: string,
    applyStyle: boolean,
    language: SupportedLanguage,
    platforms: SocialPlatform[],
    formatId: PostFormatId,
  ) => Promise<void>;
};

export function UrlForm({
  disabled,
  initialUrl = "",
  onSubmitUrl,
}: UrlFormProps) {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<"youtube" | "prompt">("youtube");
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const [applyStyle, setApplyStyle] = useState(true);
  const [wantLinkedIn, setWantLinkedIn] = useState(true);
  const [wantX, setWantX] = useState(true);
  const [language, setLanguage] = useState<SupportedLanguage>("auto");
  const [formatId, setFormatId] = useState<PostFormatId>(DEFAULT_FORMAT_ID);
  const [submitting, setSubmitting] = useState(false);
  const { success, error: toastError } = useToast();

  const profileQuery = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/me");
      const json = await res.json();
      return json.data as { teams?: any[]; activeTeamId?: string | null };
    },
    enabled: isSignedIn,
  });

  const isPro = Boolean(
    profileQuery.data?.teams && profileQuery.data.teams.length > 0,
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = url.trim();

    if (mode === "youtube") {
      const id = extractYoutubeId(trimmed);
      if (!id) {
        setError("Enter a valid YouTube video URL");
        return;
      }
    } else {
      if (trimmed.length < 5) {
        setError("Please enter a topic or context of at least 5 characters");
        return;
      }
    }

    const platforms: SocialPlatform[] = [
      ...(wantLinkedIn ? (["linkedin"] as const) : []),
      ...(wantX ? (["x"] as const) : []),
    ];

    if (platforms.length === 0) {
      setError("Select at least one platform");
      return;
    }

    const finalPayloadUrl = mode === "prompt" ? `prompt://${trimmed}` : trimmed;

    if (!isSignedIn) {
      sessionStorage.setItem(
        "ghost_pending_generation",
        JSON.stringify({
          youtubeUrl: finalPayloadUrl,
          applyStyle,
          language,
          platforms,
          formatId,
        }),
      );
      toastError(
        "Sign in required",
        "Please sign in with Google to start generation.",
      );
      const currentPath =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : "/";
      router.push(`/sign-in?returnBackUrl=${encodeURIComponent(currentPath)}`);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await onSubmitUrl(finalPayloadUrl, applyStyle, language, platforms, formatId);
      success("Generation started", mode === "prompt" ? "Drafting posts from your topic prompt..." : "Pulling the video. Writing drafts…");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      toastError("Could not start", message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="url-form" onSubmit={handleSubmit} noValidate>
      {/* Mode Switcher Tabs */}
      <div className="mode-toggle-tabs" style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button
          type="button"
          className={`tab-btn ${mode === "youtube" ? "tab-active" : ""}`}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.85rem",
            fontWeight: 700,
            borderRadius: "4px",
            background: mode === "youtube" ? "var(--accent)" : "#1c1d1f",
            color: mode === "youtube" ? "#000" : "var(--foreground)",
            border: "1px solid var(--border)",
            cursor: "pointer",
            transition: "all 0.15s ease"
          }}
          onClick={() => {
            setMode("youtube");
            setUrl("");
            setError(null);
          }}
        >
          📺 YouTube Video
        </button>
        <button
          type="button"
          className={`tab-btn ${mode === "prompt" ? "tab-active" : ""}`}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.85rem",
            fontWeight: 700,
            borderRadius: "4px",
            background: mode === "prompt" ? "var(--accent)" : "#1c1d1f",
            color: mode === "prompt" ? "#000" : "var(--foreground)",
            border: "1px solid var(--border)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            transition: "all 0.15s ease"
          }}
          onClick={() => {
            if (!isPro) {
              toastError("Pro Feature Only", "Upgrade to a Team Workspace plan to generate posts using custom topics / NLP prompt inputs.");
              return;
            }
            setMode("prompt");
            setUrl("");
            setError(null);
          }}
        >
          ✨ Text Prompt <span style={{ fontSize: "0.65rem", padding: "0.15rem 0.35rem", background: "rgba(255,255,255,0.15)", borderRadius: "3px", color: mode === "prompt" ? "#000" : "var(--foreground)" }}>PRO</span>
        </button>
      </div>

      <label htmlFor="youtube-url" className="field-label">
        {mode === "youtube" ? "Source URL" : "Topic or Context"}
      </label>
      <div className="url-row">
        <input
          id="youtube-url"
          name="youtubeUrl"
          type={mode === "youtube" ? "url" : "text"}
          inputMode={mode === "youtube" ? "url" : "text"}
          autoComplete="off"
          spellCheck={false}
          placeholder={mode === "youtube" ? "https://youtube.com/watch?v=…" : "e.g., I want to write on Entrepreneurship..."}
          value={url}
          disabled={disabled || submitting}
          onChange={(event) => {
            setUrl(event.target.value);
            if (error) setError(null);
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "url-error" : undefined}
        />
        <button
          type="submit"
          disabled={
            disabled ||
            submitting ||
            !url.trim() ||
            (!wantLinkedIn && !wantX)
          }
        >
          {submitting ? "Starting…" : "Generate"}
        </button>
      </div>

      {error ? (
        <p id="url-error" className="field-error" role="alert">
          {error}
        </p>
      ) : null}

      <fieldset className="platform-select" disabled={disabled || submitting}>
        <legend className="field-label">Generate for</legend>
        <div className="platform-select-options">
          <label className="style-toggle">
            <input
              type="checkbox"
              checked={wantLinkedIn}
              onChange={(event) => {
                setWantLinkedIn(event.target.checked);
                if (error) setError(null);
              }}
            />
            <span>LinkedIn</span>
          </label>
          <label className="style-toggle">
            <input
              type="checkbox"
              checked={wantX}
              onChange={(event) => {
                setWantX(event.target.checked);
                if (error) setError(null);
              }}
            />
            <span>X</span>
          </label>
        </div>
      </fieldset>

      <FormatPicker
        value={formatId}
        onChange={setFormatId}
        disabled={disabled || submitting}
      />

      <div className="url-options">
        <label className="style-toggle">
          <input
            type="checkbox"
            checked={applyStyle}
            onChange={(event) => setApplyStyle(event.target.checked)}
            disabled={disabled || submitting}
          />
          <span>Write in my voice</span>
        </label>

        <label className="language-select">
          <span className="language-select-label">Language</span>
          <select
            value={language}
            onChange={(event) =>
              setLanguage(event.target.value as SupportedLanguage)
            }
            disabled={disabled || submitting}
            aria-label="Output language"
          >
            {SUPPORTED_LANGUAGES.map((code) => (
              <option key={code} value={code}>
                {LANGUAGE_LABELS[code]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </form>
  );
}
