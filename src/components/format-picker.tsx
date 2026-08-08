"use client";

import { useEffect, useRef } from "react";
import {
  DEFAULT_FORMAT_ID,
  POST_FORMATS,
  type PostFormatId,
} from "@/lib/post-formats";

type FormatPickerProps = {
  value: PostFormatId;
  onChange: (formatId: PostFormatId) => void;
  disabled?: boolean;
  /** Compact strip for the result panel rewrite flow. */
  compact?: boolean;
  label?: string;
};

/**
 * Horizontal card strip for trending LinkedIn post structures.
 * Cards show a mini silhouette until real screenshots land in /public/formats/.
 */
export function FormatPicker({
  value,
  onChange,
  disabled,
  compact = false,
  label = "Post format",
}: FormatPickerProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let targetScroll = track.scrollLeft;
    let animId: number | null = null;

    const smoothScroll = () => {
      if (!track) return;
      const current = track.scrollLeft;
      const diff = targetScroll - current;
      if (Math.abs(diff) > 0.5) {
        track.scrollLeft += diff * 0.25;
        animId = requestAnimationFrame(smoothScroll);
      } else {
        track.scrollLeft = targetScroll;
        animId = null;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
        // Sync target with actual scroll position if new gesture starts
        const currentTarget = animId !== null ? targetScroll : track.scrollLeft;
        targetScroll = Math.max(0, Math.min(maxScroll, currentTarget + e.deltaY * 1.35));
        if (!animId) {
          animId = requestAnimationFrame(smoothScroll);
        }
      }
    };

    track.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      track.removeEventListener("wheel", handleWheel);
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <fieldset
      className={`format-picker${compact ? " format-picker-compact" : ""}`}
      disabled={disabled}
    >
      <legend className="field-label">{label}</legend>
      <div
        ref={trackRef}
        className="format-picker-track"
        role="listbox"
        aria-label={label}
      >
        {POST_FORMATS.map((format) => {
          const selected = value === format.id;
          return (
            <button
              key={format.id}
              type="button"
              role="option"
              aria-selected={selected}
              className={`format-card${selected ? " selected" : ""}`}
              onClick={() => onChange(format.id)}
              disabled={disabled}
              title={format.description}
            >
              <div className="format-card-preview" aria-hidden>
                {format.imageSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={format.imageSrc} alt="" />
                ) : (
                  <div className="format-card-mock">
                    <div className="format-card-mock-author">
                      <span className="mock-avatar" />
                      <span className="mock-author-line" />
                    </div>
                    <div className="format-card-mock-content">
                      {format.previewLines.map((line, idx) => (
                        <span key={line} className={idx === 0 ? "mock-hook" : "mock-body"}>
                          {line}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="format-card-footer">
                <span className="format-card-tag">{format.shortLabel}</span>
                {selected ? <span className="format-card-dot" /> : null}
              </div>
            </button>
          );
        })}
      </div>
      <p className="format-picker-hint">
        <span className="hint-symbol">✦</span>{" "}
        <strong>
          {POST_FORMATS.find((f) => f.id === value)?.name ?? "Hook + list"}:
        </strong>{" "}
        {POST_FORMATS.find((format) => format.id === value)?.description ??
          POST_FORMATS.find((format) => format.id === DEFAULT_FORMAT_ID)
            ?.description}
      </p>
    </fieldset>
  );
}
