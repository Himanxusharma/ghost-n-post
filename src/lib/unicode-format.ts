/**
 * Unicode social formatting for LinkedIn / X paste-through.
 * Platforms strip HTML/Markdown; styled Unicode characters survive copy-paste.
 */

type LetterMap = Record<string, string>;

function rangeMap(from: string, toCodePoint: number): LetterMap {
  const map: LetterMap = {};
  const start = from.codePointAt(0)!;
  for (let i = 0; i < 26; i += 1) {
    map[String.fromCodePoint(start + i)] = String.fromCodePoint(toCodePoint + i);
  }
  return map;
}

function digitMap(toCodePoint: number): LetterMap {
  const map: LetterMap = {};
  for (let i = 0; i < 10; i += 1) {
    map[String(i)] = String.fromCodePoint(toCodePoint + i);
  }
  return map;
}

const BOLD: LetterMap = {
  ...rangeMap("A", 0x1d5d4),
  ...rangeMap("a", 0x1d5ee),
  ...digitMap(0x1d7ec),
};

const ITALIC: LetterMap = {
  ...rangeMap("A", 0x1d608),
  ...rangeMap("a", 0x1d622),
};

// Mathematical italic has a few holes — patch known missing glyphs.
ITALIC.h = "ℎ";

const BOLD_ITALIC: LetterMap = {
  ...rangeMap("A", 0x1d63c),
  ...rangeMap("a", 0x1d656),
};

const UNDERLINE = "\u0332";
const STRIKE = "\u0336";

const REVERSE: LetterMap = {};
for (const map of [BOLD, ITALIC, BOLD_ITALIC]) {
  for (const [plain, styled] of Object.entries(map)) {
    REVERSE[styled] = plain;
  }
}
REVERSE["ℎ"] = "h";

export type FormatStyle = "bold" | "italic" | "underline" | "strike";

function stripCombining(text: string): string {
  return text.replace(/[\u0332\u0336]/g, "");
}

/** Normalize styled Unicode letters back to ASCII when possible. */
export function toPlainText(text: string): string {
  let out = "";
  for (const char of stripCombining(text)) {
    out += REVERSE[char] ?? char;
  }
  return out;
}

function mapLetters(text: string, map: LetterMap): string {
  const plain = toPlainText(text);
  let out = "";
  for (const char of plain) {
    out += map[char] ?? char;
  }
  return out;
}

function hasCombining(text: string, mark: string): boolean {
  const chars = [...text];
  if (chars.length === 0) return false;
  let marked = 0;
  let base = 0;
  for (let i = 0; i < chars.length; i += 1) {
    if (chars[i] === mark) {
      marked += 1;
      continue;
    }
    if (/\s/.test(chars[i]!)) continue;
    base += 1;
  }
  return base > 0 && marked >= Math.ceil(base * 0.6);
}

function applyCombining(text: string, mark: string): string {
  if (hasCombining(text, mark)) {
    return text.replaceAll(mark, "");
  }
  let out = "";
  for (const char of text) {
    if (char === mark || /\s/.test(char)) {
      out += char;
      continue;
    }
    out += `${char}${mark}`;
  }
  return out;
}

function isMostlyMapped(text: string, map: LetterMap): boolean {
  const chars = [...text].filter((char) => /[A-Za-z0-9]/.test(toPlainText(char)));
  if (chars.length === 0) return false;
  let hits = 0;
  for (const char of chars) {
    if (Object.prototype.hasOwnProperty.call(REVERSE, char) && map[toPlainText(char)] === char) {
      hits += 1;
    } else if (map[char]) {
      // already plain — not styled
    }
  }
  // Count styled hits against letters that look styled via reverse map belonging to this style
  let styled = 0;
  for (const char of [...text]) {
    const plain = REVERSE[char];
    if (plain && map[plain] === char) styled += 1;
  }
  const letters = [...text].filter((char) => REVERSE[char] || /[A-Za-z0-9]/.test(char));
  return letters.length > 0 && styled >= Math.ceil(letters.length * 0.6);
}

export function applyFormat(text: string, style: FormatStyle): string {
  if (!text) return text;

  switch (style) {
    case "bold": {
      if (isMostlyMapped(text, BOLD) || isMostlyMapped(text, BOLD_ITALIC)) {
        return toPlainText(text);
      }
      // Preserve italic by upgrading to bold-italic when already italic.
      if (isMostlyMapped(text, ITALIC)) {
        return mapLetters(text, BOLD_ITALIC);
      }
      return mapLetters(text, BOLD);
    }
    case "italic": {
      if (isMostlyMapped(text, ITALIC) || isMostlyMapped(text, BOLD_ITALIC)) {
        return toPlainText(text);
      }
      if (isMostlyMapped(text, BOLD)) {
        return mapLetters(text, BOLD_ITALIC);
      }
      return mapLetters(text, ITALIC);
    }
    case "underline":
      return applyCombining(text, UNDERLINE);
    case "strike":
      return applyCombining(text, STRIKE);
    default:
      return text;
  }
}

/** Prefix non-empty lines with a bullet for list styling. */
export function toggleBullets(text: string): string {
  const lines = text.split("\n");
  const nonEmpty = lines.filter((line) => line.trim().length > 0);
  if (nonEmpty.length === 0) return text;

  const allBulleted = nonEmpty.every((line) => /^(\s*)([•\-*]|\d+\.)\s+/.test(line));
  if (allBulleted) {
    return lines
      .map((line) => line.replace(/^(\s*)([•\-*]|\d+\.)\s+/, "$1"))
      .join("\n");
  }

  return lines
    .map((line) => {
      if (!line.trim()) return line;
      if (/^(\s*)([•\-*]|\d+\.)\s+/.test(line)) return line;
      return line.replace(/^(\s*)/, "$1• ");
    })
    .join("\n");
}

export function clearFormatting(text: string): string {
  return toPlainText(text);
}
