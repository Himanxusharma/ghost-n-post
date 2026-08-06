"use client";

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
  return (
    <fieldset
      className={`format-picker${compact ? " format-picker-compact" : ""}`}
      disabled={disabled}
    >
      <legend className="field-label">{label}</legend>
      <div
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
                    <span className="format-card-mock-avatar" />
                    <div className="format-card-mock-lines">
                      {format.previewLines.map((line) => (
                        <span key={line}>{line}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <span className="format-card-name">{format.shortLabel}</span>
            </button>
          );
        })}
      </div>
      <p className="format-picker-hint">
        {POST_FORMATS.find((format) => format.id === value)?.description ??
          POST_FORMATS.find((format) => format.id === DEFAULT_FORMAT_ID)
            ?.description}
      </p>
    </fieldset>
  );
}
