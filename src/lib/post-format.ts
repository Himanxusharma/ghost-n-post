/**
 * LinkedIn / X drafts need real line breaks to read like native posts.
 * Models often return one dense paragraph in JSON mode; this repairs that.
 * Also converts **bold** / *italic* markers into paste-safe Unicode styling.
 */

import {
  forceFormat,
  hasUnicodeEmphasis,
} from "@/lib/unicode-format";

/** True when copy is a wall of text (few or no line breaks). */
export function isDenseParagraph(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 120) return false;
  const newlines = (trimmed.match(/\n/g) ?? []).length;
  const blankBlocks = (trimmed.match(/\n\s*\n/g) ?? []).length;
  // Long copy with almost no structure looks wrong in the editor.
  return blankBlocks === 0 && newlines < 3;
}

/**
 * Shape a LinkedIn-style draft: hook alone, then short paragraphs
 * separated by blank lines. Leaves already-formatted posts alone.
 */
export function formatLinkedInDraft(text: string): string {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return normalized;

  if (!isDenseParagraph(normalized)) {
    return normalized
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  // Collapse whitespace, then split into sentences for paragraphing.
  const flat = normalized.replace(/\s+/g, " ").trim();
  const sentences =
    flat.match(/[^.!?]+[.!?]+(?:["')\]]+)?|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ??
    [flat];

  if (sentences.length <= 1) {
    return flat;
  }

  const blocks: string[] = [sentences[0]];
  for (let i = 1; i < sentences.length; i += 2) {
    blocks.push(sentences.slice(i, i + 2).join(" "));
  }

  return blocks.join("\n\n");
}

/** Light touch for X: keep short posts as-is; break long single-line posts. */
export function formatXDraft(text: string): string {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized || normalized.length < 160 || !isDenseParagraph(normalized)) {
    return normalized;
  }
  return formatLinkedInDraft(normalized);
}

function hasMarkdownEmphasis(text: string): boolean {
  return /\*\*[^*]+\*\*|__[^_]+__|(?<!\*)\*[^*\n]+\*(?!\*)|(?<![A-Za-z0-9_])_[^_\n]+_(?![A-Za-z0-9_])/.test(
    text,
  );
}

/**
 * Convert markdown-style emphasis into Unicode that survives LinkedIn/X paste.
 * Process bold before italic so **...** is not eaten by *...* matching.
 */
export function convertMarkdownEmphasis(text: string): string {
  let out = text;
  out = out.replace(/\*\*([^*]+)\*\*/g, (_match, inner: string) =>
    forceFormat(inner, "bold"),
  );
  out = out.replace(/__([^_]+)__/g, (_match, inner: string) =>
    forceFormat(inner, "bold"),
  );
  out = out.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, (_match, inner: string) =>
    forceFormat(inner, "italic"),
  );
  out = out.replace(
    /(?<![A-Za-z0-9_])_([^_\n]+)_(?![A-Za-z0-9_])/g,
    (_match, inner: string) => forceFormat(inner, "italic"),
  );
  return out;
}

/**
 * When the model skipped markers, still add light emphasis:
 * bold the hook line; italicize one short body sentence on LinkedIn.
 */
function applyHeuristicEmphasis(
  text: string,
  platform: "linkedin" | "x",
): string {
  const blocks = text.split(/\n\n+/);
  if (blocks.length === 0) return text;

  const hook = blocks[0]?.trim() ?? "";
  if (hook && hook.length <= 180 && !hook.startsWith("•")) {
    blocks[0] = forceFormat(hook, "bold");
  }

  if (platform === "linkedin") {
    for (let i = 1; i < blocks.length; i += 1) {
      const block = blocks[i]?.trim() ?? "";
      if (!block || block.startsWith("•")) continue;
      const sentence = block.match(/^[^.!?]+[.!?]/)?.[0];
      if (sentence && sentence.length >= 24 && sentence.length <= 110) {
        blocks[i] =
          forceFormat(sentence.trim(), "italic") + block.slice(sentence.length);
        break;
      }
    }
  }

  return blocks.join("\n\n");
}

/**
 * Paragraph polish + bold/italic emphasis for social paste-through.
 */
export function polishSocialDraft(
  text: string,
  platform: "linkedin" | "x" = "linkedin",
): string {
  const spaced =
    platform === "x" ? formatXDraft(text) : formatLinkedInDraft(text);
  if (!spaced) return spaced;

  const hadMarkdown = hasMarkdownEmphasis(spaced);
  let next = convertMarkdownEmphasis(spaced);

  if (!hadMarkdown && !hasUnicodeEmphasis(next)) {
    next = applyHeuristicEmphasis(next, platform);
  }

  return next;
}
