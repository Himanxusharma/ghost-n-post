/**
 * Trending LinkedIn post structures (skeleton templates).
 * UI cards select a formatId; generation injects the structure prompt.
 * Optional image under /public/formats/{id}.jpg|png|webp when screenshots land.
 */

export const DEFAULT_FORMAT_ID = "hook-list" as const;

export type PostFormatId =
  | "hook-list"
  | "story-arc"
  | "numbered-takeaways"
  | "myth-bust"
  | "before-after"
  | "contrarian"
  | "how-to"
  | "question-hook"
  | "framework"
  | "quote-expand"
  | "slide-stack";

export type PostFormat = {
  id: PostFormatId;
  name: string;
  shortLabel: string;
  description: string;
  /** Mini preview lines shown on the card when no screenshot exists. */
  previewLines: string[];
  /** Optional screenshot path, e.g. /formats/hook-list.jpg */
  imageSrc?: string | null;
  /** Prompt block that steers LinkedIn structure. */
  structurePrompt: string;
};

export const POST_FORMATS: PostFormat[] = [
  {
    id: "hook-list",
    name: "Hook + list",
    shortLabel: "Hook + list",
    description: "Bold opener, scannable bullets, soft close.",
    previewLines: ["Bold hook line.", "• Point one", "• Point two", "Soft CTA"],
    structurePrompt: `Use this LinkedIn structure exactly:
1) One-line hook alone (bold with **...**)
2) Blank line
3) 1 short context sentence
4) Blank line
5) 3-5 bullet lines starting with • (one idea each)
6) Blank line
7) One closing CTA or reflection line`,
  },
  {
    id: "story-arc",
    name: "Story arc",
    shortLabel: "Story",
    description: "Setup, tension, lesson.",
    previewLines: ["I used to…", "Then it broke.", "What changed:", "The lesson"],
    structurePrompt: `Use this LinkedIn structure exactly:
1) Personal setup hook (1 line)
2) Blank line
3) Tension / what went wrong (2-3 short lines)
4) Blank line
5) Turning point (1-2 lines)
6) Blank line
7) Clear lesson + soft CTA`,
  },
  {
    id: "numbered-takeaways",
    name: "Numbered takeaways",
    shortLabel: "Numbers",
    description: "5 crisp insights, numbered.",
    previewLines: ["5 things I learned:", "1.", "2.", "3."],
    structurePrompt: `Use this LinkedIn structure exactly:
1) Hook that promises a count (e.g. 5 takeaways)
2) Blank line
3) Exactly 5 numbered lines: 1/ 2/ 3/ 4/ 5/ each with one concrete insight
4) Blank line
5) One-line closer`,
  },
  {
    id: "myth-bust",
    name: "Myth bust",
    shortLabel: "Myth",
    description: "Popular belief → why it's wrong → truth.",
    previewLines: ["Myth:", "Why it fails", "Truth:", "Do this instead"],
    structurePrompt: `Use this LinkedIn structure exactly:
1) "Myth:" + the common belief (hook)
2) Blank line
3) Why it fails (2 short paragraphs)
4) Blank line
5) "Truth:" + the better framing
6) Blank line
7) One actionable closer`,
  },
  {
    id: "before-after",
    name: "Before / after",
    shortLabel: "Before→After",
    description: "Contrast the old way vs the new way.",
    previewLines: ["Before:", "After:", "What flipped", "Try this"],
    structurePrompt: `Use this LinkedIn structure exactly:
1) Hook naming a transformation
2) Blank line
3) "Before:" block (2-3 short lines)
4) Blank line
5) "After:" block (2-3 short lines)
6) Blank line
7) What caused the shift + soft CTA`,
  },
  {
    id: "contrarian",
    name: "Contrarian take",
    shortLabel: "Hot take",
    description: "Sharp opinion, then proof.",
    previewLines: ["Unpopular opinion:", "Here's why", "Evidence", "Still…"],
    structurePrompt: `Use this LinkedIn structure exactly:
1) Contrarian one-liner hook (bold)
2) Blank line
3) Why most people get this wrong (short)
4) Blank line
5) 2-3 proof points as • bullets
6) Blank line
7) Nuanced closer (not arrogant)`,
  },
  {
    id: "how-to",
    name: "How-to steps",
    shortLabel: "How-to",
    description: "Problem, steps, result.",
    previewLines: ["Problem", "Step 1", "Step 2", "Result"],
    structurePrompt: `Use this LinkedIn structure exactly:
1) Problem hook
2) Blank line
3) One sentence of stakes
4) Blank line
5) 3-4 numbered steps (1. 2. 3. …) with concrete actions
6) Blank line
7) Result line + soft CTA`,
  },
  {
    id: "question-hook",
    name: "Question hook",
    shortLabel: "Question",
    description: "Open with a question, then answer it.",
    previewLines: ["What if…?", "Most people…", "Here's the fix", "Ask yourself"],
    structurePrompt: `Use this LinkedIn structure exactly:
1) Provocative question as the only line in the hook
2) Blank line
3) Brief wrong answer most people give
4) Blank line
5) Your better answer in 2-3 short paragraphs
6) Blank line
7) End with a question to the reader`,
  },
  {
    id: "framework",
    name: "Named framework",
    shortLabel: "Framework",
    description: "Label a simple 3-part model.",
    previewLines: ["The X framework", "1) Part", "2) Part", "3) Part"],
    structurePrompt: `Use this LinkedIn structure exactly:
1) Hook introducing a simple named framework (invent a short 2-3 word name from the video ideas)
2) Blank line
3) One sentence what it solves
4) Blank line
5) Three labeled parts as • bullets (Name: explanation)
6) Blank line
7) How to apply it tomorrow + soft CTA`,
  },
  {
    id: "quote-expand",
    name: "Quote expand",
    shortLabel: "Quote",
    description: "Punchy line, then unpack it.",
    previewLines: ["Punch line.", "What it means", "Example", "Apply it"],
    structurePrompt: `Use this LinkedIn structure exactly:
1) A memorable one-sentence punch line alone (bold)
2) Blank line
3) Unpack what it means (2 short paragraphs)
4) Blank line
5) One concrete example from the video
6) Blank line
7) Application line for the reader`,
  },
  {
    id: "slide-stack",
    name: "Slide stack",
    shortLabel: "Slides",
    description: "Carousel energy in plain text.",
    previewLines: ["Slide 1", "Slide 2", "Slide 3", "CTA"],
    structurePrompt: `Use this LinkedIn structure exactly:
1) Hook as "Slide 1" energy: one short line
2) Blank line between each "slide"
3) 4-6 ultra-short blocks (1-2 lines each), like carousel slides
4) No long paragraphs
5) Final block is a CTA slide`,
  },
];

const FORMAT_BY_ID = Object.fromEntries(
  POST_FORMATS.map((format) => [format.id, format]),
) as Record<PostFormatId, PostFormat>;

export const POST_FORMAT_IDS = POST_FORMATS.map((format) => format.id);

export function isPostFormatId(value: unknown): value is PostFormatId {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(FORMAT_BY_ID, value)
  );
}

export function getPostFormat(
  formatId?: string | null,
): PostFormat {
  if (formatId && isPostFormatId(formatId)) {
    return FORMAT_BY_ID[formatId];
  }
  return FORMAT_BY_ID[DEFAULT_FORMAT_ID];
}

export function resolveFormatId(formatId?: string | null): PostFormatId {
  return getPostFormat(formatId).id;
}
