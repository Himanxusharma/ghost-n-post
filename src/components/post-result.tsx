"use client";

import { useState } from "react";
import type { CarouselSlide } from "@/lib/content";
import { languageDisplayName } from "@/lib/content";
import { PublishPanel } from "./publish-panel";
import { ThumbImage } from "./thumb-image";
type PostResultProps = {
  postId: string;
  linkedinDraft: string;
  xDraft: string;
  xThread: string[];
  regenerateCount?: number;
  carouselSlides?: CarouselSlide[];
  thumbnailUrl?: string | null;
  customThumbnailUrl?: string | null;
  customThumbnailHeadline?: string | null;
  language?: string;
  videoTitle?: string | null;
};

export function PostResult({
  postId,
  linkedinDraft,
  xDraft,
  xThread: initialThread,
  regenerateCount = 0,
  carouselSlides: initialCarousel = [],
  thumbnailUrl,
  customThumbnailUrl: initialCustomThumb = null,
  customThumbnailHeadline: initialHeadline = null,
  language,
  videoTitle,
}: PostResultProps) {
  const [linkedin, setLinkedin] = useState(linkedinDraft);
  const [xPost, setXPost] = useState(xDraft);
  const [xThread, setXThread] = useState(initialThread);
  const [carouselSlides, setCarouselSlides] =
    useState<CarouselSlide[]>(initialCarousel);
  const [customThumbnailUrl, setCustomThumbnailUrl] = useState(
    initialCustomThumb,
  );
  const [customThumbnailHeadline, setCustomThumbnailHeadline] = useState(
    initialHeadline,
  );
  const [regens, setRegens] = useState(regenerateCount);
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [thumbBusy, setThumbBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copyText(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1600);
  }

  function downloadMarkdown() {
    const threadBlock =
      xThread.length > 0
        ? `\n\n## X Thread\n\n${xThread.join("\n\n")}`
        : "";
    const content = `# ${videoTitle ?? "Ghost n Post draft"}

## LinkedIn

${linkedin}

## X

${xPost}${threadBlock}
`;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ghost-n-post-draft.md";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function downloadPlainText() {
    const content = [
      "LINKEDIN",
      linkedin,
      "",
      "X",
      xPost,
      ...(xThread.length > 1 ? ["", "THREAD", ...xThread] : []),
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ghost-n-post-draft.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function downloadThumbnail(url: string | null | undefined, filename: string) {
    if (!url) return;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.click();
  }

  async function regenerate() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/posts/${postId}/regenerate`, {
        method: "POST",
      });
      const json = await response.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? "Regenerate failed");
      }
      setLinkedin(json.data.linkedinDraft);
      setXPost(json.data.xDraft);
      setXThread(json.data.xThread ?? []);
      setRegens(json.data.regenerateCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regenerate failed");
    } finally {
      setBusy(false);
    }
  }

  async function generateCustomThumbnail() {
    setThumbBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/posts/${postId}/thumbnail`, {
        method: "POST",
      });
      const json = await response.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? "Thumbnail generation failed");
      }
      setCustomThumbnailUrl(json.data.customThumbnailUrl);
      setCustomThumbnailHeadline(json.data.customThumbnailHeadline);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Thumbnail generation failed",
      );
    } finally {
      setThumbBusy(false);
    }
  }

  return (
    <section className="result-panel animate-rise">
      <div className="result-actions">
        <button type="button" onClick={downloadMarkdown}>
          Download markdown
        </button>
        <button type="button" onClick={downloadPlainText}>
          Download text
        </button>
        {thumbnailUrl ? (
          <button
            type="button"
            onClick={() => downloadThumbnail(thumbnailUrl, "thumbnail.jpg")}
          >
            Download video thumb
          </button>
        ) : null}
        <button
          type="button"
          onClick={regenerate}
          disabled={busy || regens >= 3}
        >
          {busy ? "Regenerating…" : `Regenerate (${3 - regens} left)`}
        </button>
      </div>

      {language ? (
        <p className="hint">
          Draft language: {languageDisplayName(language)}
        </p>
      ) : null}

      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="draft-grid">
        <article className="draft-block">
          <header>
            <h3>LinkedIn</h3>
            <button type="button" onClick={() => copyText("li", linkedin)}>
              {copied === "li" ? "Copied" : "Copy"}
            </button>
          </header>
          <textarea
            value={linkedin}
            onChange={(event) => setLinkedin(event.target.value)}
            rows={14}
            aria-label="LinkedIn draft"
          />
        </article>

        <article className="draft-block">
          <header>
            <h3>X</h3>
            <button type="button" onClick={() => copyText("x", xPost)}>
              {copied === "x" ? "Copied" : "Copy"}
            </button>
          </header>
          <textarea
            value={xPost}
            onChange={(event) => setXPost(event.target.value)}
            rows={6}
            aria-label="X draft"
          />

          {xThread.length > 1 ? (
            <div className="thread-block">
              <h4>Thread</h4>
              <ol>
                {xThread.map((tweet, index) => (
                  <li key={`${index}-${tweet.slice(0, 12)}`}>
                    <textarea
                      value={tweet}
                      rows={3}
                      aria-label={`Thread part ${index + 1}`}
                      onChange={(event) => {
                        const next = [...xThread];
                        next[index] = event.target.value;
                        setXThread(next);
                      }}
                    />
                  </li>
                ))}
              </ol>
              <button
                type="button"
                onClick={() => copyText("thread", xThread.join("\n\n"))}
              >
                {copied === "thread" ? "Copied" : "Copy thread"}
              </button>
            </div>
          ) : null}
        </article>
      </div>

      <section className="custom-thumb-panel">
        <header className="publish-header">
          <h3>Custom thumbnail</h3>
          <button
            type="button"
            className="btn-quiet"
            onClick={generateCustomThumbnail}
            disabled={thumbBusy}
          >
            {thumbBusy
              ? "Generating…"
              : customThumbnailUrl
                ? "Regenerate thumbnail"
                : "Generate branded thumbnail"}
          </button>
        </header>
        {customThumbnailUrl ? (
          <div className="custom-thumb-preview">
            <ThumbImage
              src={customThumbnailUrl}
              alt={customThumbnailHeadline || "Custom thumbnail"}
              width={1200}
              height={630}
              sizes="(max-width: 720px) 100vw, 640px"
            />
            <button
              type="button"
              onClick={() =>
                downloadThumbnail(customThumbnailUrl, "custom-thumbnail.png")
              }
            >
              Download custom thumbnail
            </button>
          </div>
        ) : (
          <p className="hint">
            Create a quote-card image from the draft for LinkedIn/X.
          </p>
        )}
      </section>

      <PublishPanel
        postId={postId}
        linkedinDraft={linkedin}
        xDraft={xPost}
        xThread={xThread}
        carouselSlides={carouselSlides}
        customThumbnailUrl={customThumbnailUrl}
        onCarouselGenerated={setCarouselSlides}
      />
    </section>
  );
}
