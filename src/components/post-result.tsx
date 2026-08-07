"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CarouselSlide } from "@/lib/content";
import { languageDisplayName } from "@/lib/content";
import { polishSocialDraft } from "@/lib/post-format";
import {
  DEFAULT_FORMAT_ID,
  getPostFormat,
  type PostFormatId,
} from "@/lib/post-formats";
import type { SocialPlatform } from "@/lib/validations";
import { DraftEditor } from "./draft-editor";
import { FormatPicker } from "./format-picker";
import { PublishPanel } from "./publish-panel";
import { ThumbPreview } from "./thumb-preview";
import { useToast } from "./toast";

type PostResultProps = {
  postId: string;
  linkedinDraft: string;
  xDraft: string;
  xThread: string[];
  platforms?: SocialPlatform[];
  formatId?: string | null;
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
  platforms = ["linkedin", "x"],
  formatId: initialFormatId = DEFAULT_FORMAT_ID,
  regenerateCount = 0,
  carouselSlides: initialCarousel = [],
  thumbnailUrl,
  customThumbnailUrl: initialCustomThumb = null,
  customThumbnailHeadline: initialHeadline = null,
  language,
  videoTitle,
}: PostResultProps) {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const showLinkedIn = platforms.includes("linkedin");
  const showX = platforms.includes("x");
  const platformLabel = [
    showLinkedIn ? "LinkedIn" : null,
    showX ? "X" : null,
  ]
    .filter(Boolean)
    .join(" + ");
  const [linkedin, setLinkedin] = useState(() =>
    polishSocialDraft(linkedinDraft, "linkedin"),
  );
  const [xPost, setXPost] = useState(() => polishSocialDraft(xDraft, "x"));
  const [xThread, setXThread] = useState(() =>
    initialThread.map((tweet) => polishSocialDraft(tweet, "x")),
  );
  const [formatId, setFormatId] = useState<PostFormatId>(
    getPostFormat(initialFormatId).id,
  );
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
  const { success, error: toastError } = useToast();

  const regenerationsLeft = Math.max(0, 3 - regens);

  function requireSignInForExport(actionLabel = "copy content"): boolean {
    if (!isSignedIn) {
      toastError("Sign in required", `Please sign in to ${actionLabel}.`);
      const currentPath =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : "/";
      router.push(`/sign-in?returnBackUrl=${encodeURIComponent(currentPath)}`);
      return false;
    }
    return true;
  }

  async function copyText(key: string, value: string) {
    if (!requireSignInForExport("copy generated content")) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1600);
      success("Copied", "It's on your clipboard.");
    } catch {
      toastError("Copy failed", "Clipboard permission was blocked.");
    }
  }

  function downloadMarkdown() {
    if (!requireSignInForExport("download markdown draft")) return;

    const sections: string[] = [`# ${videoTitle ?? "Ghost n Post draft"}`];
    if (showLinkedIn) {
      sections.push(`## LinkedIn\n\n${linkedin}`);
    }
    if (showX) {
      const threadBlock =
        xThread.length > 0
          ? `\n\n## X Thread\n\n${xThread.join("\n\n")}`
          : "";
      sections.push(`## X\n\n${xPost}${threadBlock}`);
    }
    const content = `${sections.join("\n\n")}\n`;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ghost-n-post-draft.md";
    anchor.click();
    URL.revokeObjectURL(url);
    success("Downloaded", "Markdown draft saved.");
  }

  function downloadPlainText() {
    if (!requireSignInForExport("download plain text draft")) return;
    const content = [
      ...(showLinkedIn ? ["LINKEDIN", linkedin, ""] : []),
      ...(showX
        ? [
            "X",
            xPost,
            ...(xThread.length > 1 ? ["", "THREAD", ...xThread] : []),
          ]
        : []),
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ghost-n-post-draft.txt";
    anchor.click();
    URL.revokeObjectURL(url);
    success("Downloaded", "Text draft saved.");
  }

  async function downloadThumbnail(
    kind: "video" | "custom",
    fallbackFilename: string,
  ) {
    try {
      const response = await fetch(
        `/api/posts/${postId}/download-thumbnail?kind=${kind}`,
      );
      if (!response.ok) {
        const json = await response.json().catch(() => null);
        throw new Error(
          json?.error?.message ??
            `Could not download thumbnail (${response.status})`,
        );
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const header = response.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(header);
      const filename = match?.[1] ?? fallbackFilename;

      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      success("Thumbnail downloaded");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not download thumbnail to this device";
      setError(message);
      toastError("Download failed", message);
    }
  }

  async function regenerate(nextFormatId: PostFormatId = formatId) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/posts/${postId}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formatId: nextFormatId }),
      });
      const json = await response.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? "Regenerate failed");
      }
      setLinkedin(polishSocialDraft(json.data.linkedinDraft, "linkedin"));
      setXPost(polishSocialDraft(json.data.xDraft, "x"));
      setXThread(
        (json.data.xThread ?? []).map((tweet: string) =>
          polishSocialDraft(tweet, "x"),
        ),
      );
      setFormatId(getPostFormat(json.data.formatId ?? nextFormatId).id);
      setRegens(json.data.regenerateCount);
      success(
        "Drafts regenerated",
        getPostFormat(json.data.formatId ?? nextFormatId).name,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Regenerate failed";
      setError(message);
      toastError("Regenerate failed", message);
    } finally {
      setBusy(false);
    }
  }

  async function applyFormat(nextFormatId: PostFormatId) {
    if (nextFormatId === formatId || busy || regenerationsLeft <= 0) {
      setFormatId(nextFormatId);
      return;
    }
    setFormatId(nextFormatId);
    await regenerate(nextFormatId);
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
      success("Custom thumbnail ready");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Thumbnail generation failed";
      setError(message);
      toastError("Thumbnail failed", message);
    } finally {
      setThumbBusy(false);
    }
  }

  return (
    <section className="result-panel animate-rise">
      <header className="result-header">
        <div className="result-header-copy">
          <p className="result-kicker">Draft folio</p>
          <h2 className="result-title">
            {videoTitle?.trim() || "Generated drafts"}
          </h2>
          <p className="result-meta">
            <span>{platformLabel || "Drafts"}</span>
            {language ? (
              <>
                <span aria-hidden className="result-meta-sep">
                  /
                </span>
                <span>{languageDisplayName(language)}</span>
              </>
            ) : null}
            <span aria-hidden className="result-meta-sep">
              /
            </span>
            <span>
              {regenerationsLeft} regenerate
              {regenerationsLeft === 1 ? "" : "s"} left
            </span>
          </p>
        </div>

        <div className="result-toolbar" role="toolbar" aria-label="Draft tools">
          <button
            type="button"
            className="tool-btn"
            onClick={downloadMarkdown}
            title="Download markdown"
          >
            <IconMarkdown />
            <span>Markdown</span>
          </button>
          <button
            type="button"
            className="tool-btn"
            onClick={downloadPlainText}
            title="Download plain text"
          >
            <IconText />
            <span>Text</span>
          </button>
          <button
            type="button"
            className="tool-btn tool-btn-primary"
            onClick={() => void regenerate()}
            disabled={busy || regenerationsLeft <= 0}
            title={
              regenerationsLeft <= 0
                ? "No regenerations left"
                : `Regenerate drafts (${regenerationsLeft} left)`
            }
          >
            <IconRefresh spinning={busy} />
            <span>
              {busy
                ? "Working…"
                : regenerationsLeft <= 0
                  ? "No regenerates"
                  : "Regenerate"}
            </span>
          </button>
        </div>
      </header>

      <FormatPicker
        value={formatId}
        onChange={(next) => {
          void applyFormat(next);
        }}
        disabled={busy || regenerationsLeft <= 0}
        compact
        label="Try another format"
      />

      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}

      {thumbnailUrl ? (
        <div className="result-media">
          <ThumbPreview
            src={thumbnailUrl}
            alt={
              videoTitle
                ? `Thumbnail for ${videoTitle}`
                : "Source video thumbnail"
            }
            label="Source thumbnail"
            meta="From YouTube · 16:9"
            priority
            sizes="(max-width: 720px) 100vw, 380px"
            downloadLabel="Download"
            onDownload={() =>
              downloadThumbnail("video", `${videoTitle || "thumbnail"}.jpg`)
            }
          />
        </div>
      ) : null}

      <div
        className={`draft-grid${showLinkedIn && showX ? "" : " draft-grid-single"}`}
      >
        {showLinkedIn ? (
          <article className="draft-block">
            <header>
              <div className="draft-heading">
                <span className="draft-platform-icon" aria-hidden>
                  <IconLinkedIn />
                </span>
                <div>
                  <h3>LinkedIn</h3>
                  <p className="draft-count">{linkedin.length} chars</p>
                </div>
              </div>
              <button
                type="button"
                className="tool-btn tool-btn-compact"
                onClick={() => copyText("li", linkedin)}
              >
                {copied === "li" ? <IconCheck /> : <IconCopy />}
                <span>{copied === "li" ? "Copied" : "Copy"}</span>
              </button>
            </header>
            <DraftEditor
              value={linkedin}
              onChange={setLinkedin}
              rows={14}
              aria-label="LinkedIn draft"
              hint="Select text → Bold / Italic. Copy pastes styled text into LinkedIn."
            />
          </article>
        ) : null}

        {showX ? (
          <article className="draft-block">
            <header>
              <div className="draft-heading">
                <span className="draft-platform-icon" aria-hidden>
                  <IconX />
                </span>
                <div>
                  <h3>X</h3>
                  <p className="draft-count">{xPost.length} chars</p>
                </div>
              </div>
              <button
                type="button"
                className="tool-btn tool-btn-compact"
                onClick={() => copyText("x", xPost)}
              >
                {copied === "x" ? <IconCheck /> : <IconCopy />}
                <span>{copied === "x" ? "Copied" : "Copy"}</span>
              </button>
            </header>
            <DraftEditor
              value={xPost}
              onChange={setXPost}
              rows={6}
              aria-label="X draft"
              hint="Select text → format. Copy pastes into X with styling intact."
            />

            {xThread.length > 1 ? (
              <div className="thread-block">
                <div className="thread-header">
                  <h4>Thread · {xThread.length} posts</h4>
                  <button
                    type="button"
                    className="tool-btn tool-btn-compact"
                    onClick={() => copyText("thread", xThread.join("\n\n"))}
                  >
                    {copied === "thread" ? <IconCheck /> : <IconCopy />}
                    <span>{copied === "thread" ? "Copied" : "Copy all"}</span>
                  </button>
                </div>
                <ol>
                  {xThread.map((tweet, index) => (
                    <li key={`${index}-${tweet.slice(0, 12)}`}>
                      <span className="thread-index" aria-hidden>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <DraftEditor
                        value={tweet}
                        rows={3}
                        aria-label={`Thread part ${index + 1}`}
                        hint="Format this post, then copy. It pastes into X as-is."
                        onChange={(nextValue) => {
                          const next = [...xThread];
                          next[index] = nextValue;
                          setXThread(next);
                        }}
                      />
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </article>
        ) : null}
      </div>

      <section className="custom-thumb-panel">
        <header className="publish-header">
          <div>
            <p className="result-kicker">Asset</p>
            <h3>Custom thumbnail</h3>
          </div>
          <button
            type="button"
            className="tool-btn"
            onClick={generateCustomThumbnail}
            disabled={thumbBusy}
          >
            <IconSparkle />
            <span>
              {thumbBusy
                ? "Generating…"
                : customThumbnailUrl
                  ? "Regenerate"
                  : "Generate"}
            </span>
          </button>
        </header>
        {customThumbnailUrl ? (
          <div className="custom-thumb-preview">
            <ThumbPreview
              src={customThumbnailUrl}
              alt={customThumbnailHeadline || "Custom thumbnail"}
              label="Branded thumbnail"
              meta={customThumbnailHeadline || "Quote card · 1200×630"}
              width={1200}
              height={630}
              sizes="(max-width: 720px) 100vw, 560px"
              downloadLabel="Download"
              onDownload={() =>
                downloadThumbnail(
                  "custom",
                  `${videoTitle || "custom-thumbnail"}.png`,
                )
              }
            />
          </div>
        ) : (
          <p className="hint">
            Create a quote card from the draft. Ready for LinkedIn or X.
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
        platforms={platforms}
        onCarouselGenerated={setCarouselSlides}
      />
    </section>
  );
}

function IconMarkdown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h16v12H4V6Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M7 15V9l2.5 3L12 9v6M14.5 12.5 16 15l1.5-2.5M16 9v6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="square"
      />
    </svg>
  );
}

function IconText() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 7h14M8 7v10M16 7v10M10 17h4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="square"
      />
    </svg>
  );
}

function IconRefresh({ spinning = false }: { spinning?: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={spinning ? "icon-spin" : undefined}
    >
      <path
        d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="square"
      />
      <path
        d="M19.5 4.5V9H15"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="square"
      />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 9h11v11H9V9Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 15V4h11" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="m5 12 5 5L20 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="square"
      />
    </svg>
  );
}

function IconLinkedIn() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6.5 9.5H3.8v10.7h2.7V9.5ZM5.15 4.3a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4ZM20.2 13.2c0-2.7-1.5-4-3.5-4-1.3 0-2.2.6-2.7 1.4h-.1V9.5H11.4c0 .5 0 10.7 0 10.7h2.7v-6c0-.3 0-.6.1-.8.3-.6.9-1.2 1.9-1.2 1.3 0 1.9.9 1.9 2.3v5.7h2.7v-6Z" />
    </svg>
  );
}

function IconX() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.2 3H21l-6.5 7.4L22 21h-5.6l-4.4-5.7L6.7 21H4l7-7.9L2.4 3h5.7l4 5.2L18.2 3Zm-1 16.3h1.6L7.1 4.6H5.4l11.8 14.7Z" />
    </svg>
  );
}

function IconSparkle() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v4M12 17v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M3 12h4M17 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="square"
      />
    </svg>
  );
}
