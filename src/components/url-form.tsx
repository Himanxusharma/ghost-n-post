"use client";

import { FormEvent, useState } from "react";
import {
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "@/lib/content";
import { extractYoutubeId } from "@/lib/youtube-id";

type UrlFormProps = {
  disabled?: boolean;
  initialUrl?: string;
  onSubmitUrl: (
    youtubeUrl: string,
    applyStyle: boolean,
    language: SupportedLanguage,
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
  const [language, setLanguage] = useState<SupportedLanguage>("auto");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = url.trim();
    const id = extractYoutubeId(trimmed);

    if (!id) {
      setError("Enter a valid YouTube video URL");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await onSubmitUrl(trimmed, applyStyle, language);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="url-form" onSubmit={handleSubmit} noValidate>
      <label htmlFor="youtube-url" className="sr-only">
        YouTube URL
      </label>
      <div className="url-row">
        <input
          id="youtube-url"
          name="youtubeUrl"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="Paste a YouTube link"
          value={url}
          disabled={disabled || submitting}
          onChange={(event) => {
            setUrl(event.target.value);
            if (error) setError(null);
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "url-error" : undefined}
        />
        <button type="submit" disabled={disabled || submitting || !url.trim()}>
          {submitting ? "Starting…" : "Generate"}
        </button>
      </div>

      {error ? (
        <p id="url-error" className="field-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="url-options">
        <label className="style-toggle">
          <input
            type="checkbox"
            checked={applyStyle}
            onChange={(event) => setApplyStyle(event.target.checked)}
            disabled={disabled || submitting}
          />
          <span>Write in my voice (if saved)</span>
        </label>

        <label className="language-select">
          <span>Output language</span>
          <select
            value={language}
            onChange={(event) =>
              setLanguage(event.target.value as SupportedLanguage)
            }
            disabled={disabled || submitting}
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
