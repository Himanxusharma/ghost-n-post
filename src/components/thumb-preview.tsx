"use client";

import type { ReactNode } from "react";
import { ThumbImage } from "./thumb-image";

type ThumbPreviewProps = {
  src: string;
  alt: string;
  label: string;
  meta?: string;
  onDownload: () => void;
  downloadLabel?: string;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  actions?: ReactNode;
};

/**
 * Archival thumbnail frame with download above + hover overlay.
 */
export function ThumbPreview({
  src,
  alt,
  label,
  meta,
  onDownload,
  downloadLabel = "Download",
  width = 1280,
  height = 720,
  sizes = "(max-width: 720px) 100vw, 420px",
  priority = false,
  actions,
}: ThumbPreviewProps) {
  return (
    <figure className="thumb-preview">
      <div className="thumb-preview-bar">
        <div className="thumb-preview-copy">
          <p className="thumb-preview-label">{label}</p>
          {meta ? <p className="thumb-preview-meta">{meta}</p> : null}
        </div>
        <div className="thumb-preview-actions">
          {actions}
          <button
            type="button"
            className="tool-btn tool-btn-compact"
            onClick={onDownload}
          >
            <IconDownload />
            <span>{downloadLabel}</span>
          </button>
        </div>
      </div>

      <div className="thumb-preview-frame">
        <ThumbImage
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          priority={priority}
          className="thumb-preview-image"
        />
        <button
          type="button"
          className="thumb-preview-overlay"
          onClick={onDownload}
          aria-label={downloadLabel}
        >
          <span className="thumb-preview-overlay-chip">
            <IconDownload />
            <span>{downloadLabel}</span>
          </span>
        </button>
      </div>
    </figure>
  );
}

function IconDownload() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4v11M7.5 11.5 12 16l4.5-4.5M5 19h14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="square"
      />
    </svg>
  );
}
