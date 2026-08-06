"use client";

import { FormEvent, useState } from "react";
import {
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "@/lib/content";
import type { SocialPlatform } from "@/lib/validations";
import { extractYoutubeId } from "@/lib/youtube-id";
import { useToast } from "@/components/toast";

type UrlFormProps = {
  disabled?: boolean;
  initialUrl?: string;
  onSubmitUrl: (
    youtubeUrl: string,
    applyStyle: boolean,
    language: SupportedLanguage,
    platforms: SocialPlatform[],
  ) => Promise<void>;
};

export function UrlForm({
  disabled,
  initialUrl = "",
  onSubmitUrl,
}: UrlFormProps) {
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const [applyStyle, setApplyStyle] = useState(true);
  const [wantLinkedIn, setWantLinkedIn] = useState(true);
  const [wantX, setWantX] = useState(true);
  const [language, setLanguage] = useState<SupportedLanguage>("auto");
  const [submitting, setSubmitting] = useState(false);
  const { success, error: toastError } = useToast();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = url.trim();
    const id = extractYoutubeId(trimmed);

    if (!id) {
      setError("Enter a valid YouTube video URL");
      return;
    }

    const platforms: SocialPlatform[] = [
      ...(wantLinkedIn ? (["linkedin"] as const) : []),
      ...(wantX ? (["x"] as const) : []),
    ];

    if (platforms.length === 0) {
      setError("Select at least one platform");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await onSubmitUrl(trimmed, applyStyle, language, platforms);
      success("Generation started", "Pulling the video. Writing drafts…");
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
      <label htmlFor="youtube-url" className="field-label">
        Source URL
      </label>
      <div className="url-row">
        <input
          id="youtube-url"
          name="youtubeUrl"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://youtube.com/watch?v=…"
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
