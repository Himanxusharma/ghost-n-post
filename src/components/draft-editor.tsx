"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  applyFormat,
  clearFormatting,
  toggleBullets,
  type FormatStyle,
} from "@/lib/unicode-format";

type DraftEditorProps = {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  "aria-label": string;
  className?: string;
  hint?: string;
};

/**
 * Social-safe draft editor: Bold/Italic/etc. via Unicode so copy-paste
 * keeps styling on LinkedIn, X, and threads (HTML is stripped there).
 */
export function DraftEditor({
  value,
  onChange,
  rows = 8,
  "aria-label": ariaLabel,
  className,
  hint,
}: DraftEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectionRef = useRef({ start: 0, end: 0 });
  const hintId = useId();

  const rememberSelection = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    selectionRef.current = {
      start: el.selectionStart,
      end: el.selectionEnd,
    };
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const onSelect = () => rememberSelection();
    el.addEventListener("select", onSelect);
    el.addEventListener("keyup", onSelect);
    el.addEventListener("mouseup", onSelect);
    return () => {
      el.removeEventListener("select", onSelect);
      el.removeEventListener("keyup", onSelect);
      el.removeEventListener("mouseup", onSelect);
    };
  }, [rememberSelection]);

  function replaceSelection(nextSelected: string) {
    const el = textareaRef.current;
    if (!el) return;

    const { start, end } = selectionRef.current;
    const hasSelection = start !== end;
    const from = hasSelection ? start : el.selectionStart;
    const to = hasSelection ? end : el.selectionEnd;
    const selected = value.slice(from, to);

    if (!selected) {
      el.focus();
      return;
    }

    const next = value.slice(0, from) + nextSelected + value.slice(to);
    onChange(next);

    const caret = from + nextSelected.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(from, caret);
      selectionRef.current = { start: from, end: caret };
    });
  }

  function runFormat(style: FormatStyle) {
    rememberSelection();
    const { start, end } = selectionRef.current;
    const selected = value.slice(start, end);
    if (!selected) return;
    replaceSelection(applyFormat(selected, style));
  }

  function runBullets() {
    rememberSelection();
    const el = textareaRef.current;
    if (!el) return;

    let { start, end } = selectionRef.current;
    if (start === end) {
      // Format the current line when nothing is selected.
      const before = value.lastIndexOf("\n", Math.max(0, start - 1));
      const after = value.indexOf("\n", start);
      start = before === -1 ? 0 : before + 1;
      end = after === -1 ? value.length : after;
      selectionRef.current = { start, end };
    }

    const selected = value.slice(start, end);
    if (!selected) return;
    replaceSelection(toggleBullets(selected));
  }

  function runClear() {
    rememberSelection();
    const { start, end } = selectionRef.current;
    const selected = value.slice(start, end);
    if (!selected) return;
    replaceSelection(clearFormatting(selected));
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    const meta = event.metaKey || event.ctrlKey;
    if (!meta) return;

    const key = event.key.toLowerCase();
    if (key === "b") {
      event.preventDefault();
      runFormat("bold");
    } else if (key === "i") {
      event.preventDefault();
      runFormat("italic");
    } else if (key === "u") {
      event.preventDefault();
      runFormat("underline");
    }
  }

  function onInput(event: ChangeEvent<HTMLTextAreaElement>) {
    onChange(event.target.value);
    rememberSelection();
  }

  return (
    <div className={`draft-editor${className ? ` ${className}` : ""}`}>
      <div className="format-toolbar" role="toolbar" aria-label="Text formatting">
        <FormatButton label="Bold" shortcut="⌘B" onClick={() => runFormat("bold")}>
          <span className="format-glyph format-glyph-bold">B</span>
        </FormatButton>
        <FormatButton label="Italic" shortcut="⌘I" onClick={() => runFormat("italic")}>
          <span className="format-glyph format-glyph-italic">I</span>
        </FormatButton>
        <FormatButton label="Underline" shortcut="⌘U" onClick={() => runFormat("underline")}>
          <span className="format-glyph format-glyph-underline">U</span>
        </FormatButton>
        <FormatButton label="Strikethrough" onClick={() => runFormat("strike")}>
          <span className="format-glyph format-glyph-strike">S</span>
        </FormatButton>
        <span className="format-toolbar-sep" aria-hidden />
        <FormatButton label="Bulleted list" onClick={runBullets}>
          <IconList />
        </FormatButton>
        <FormatButton label="Clear formatting" onClick={runClear}>
          <IconClear />
        </FormatButton>
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={onInput}
        onKeyDown={onKeyDown}
        onSelect={rememberSelection}
        rows={rows}
        aria-label={ariaLabel}
        aria-describedby={hint ? hintId : undefined}
        spellCheck
      />

      <p id={hintId} className="draft-editor-hint">
        {hint ??
          "Select text, then format. Styling uses Unicode so it pastes into LinkedIn and X as-is."}
      </p>
    </div>
  );
}

function FormatButton({
  label,
  shortcut,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="format-btn"
      onMouseDown={(event) => {
        // Keep textarea selection when clicking the toolbar.
        event.preventDefault();
      }}
      onClick={onClick}
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
    >
      {children}
    </button>
  );
}

function IconList() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 6h13M8 12h13M8 18h13" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

function IconClear() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="m6 6 12 12M7 19h10M9.5 5.5 14 16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="square"
      />
    </svg>
  );
}
