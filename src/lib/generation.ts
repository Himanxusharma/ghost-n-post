import { z } from "zod";
import { completeJson, completeText } from "@/lib/llm";
import { getPostFormat, type PostFormatId } from "@/lib/post-formats";
import { polishSocialDraft } from "@/lib/post-format";
import type { SocialPlatform } from "@/lib/validations";

const generatedPostsSchema = z.object({
  linkedin: z.string().default(""),
  x: z.string().default(""),
  xThread: z.array(z.string()).default([]),
});

export type GeneratedPosts = z.infer<typeof generatedPostsSchema>;

const DEFAULT_STYLE =
  "Neutral, professional, clear. Prefer concrete insight over hype. Short paragraphs. No hashtag spam. No em dashes.";

const X_CHAR_LIMIT = 280;

/**
 * Splits long transcripts into ~5,000 character (~5 minute) logical chunks.
 */
export function chunkTranscript(
  transcript: string,
  chunkSize = 5_000,
): string[] {
  if (transcript.length <= chunkSize) return [transcript];
  const chunks: string[] = [];
  let start = 0;
  while (start < transcript.length) {
    let end = start + chunkSize;
    if (end < transcript.length) {
      const breakPos = transcript.lastIndexOf("\n", end);
      if (breakPos > start + chunkSize * 0.4) {
        end = breakPos;
      }
    }
    chunks.push(transcript.slice(start, end).trim());
    start = end;
  }
  return chunks;
}

/**
 * Map Phase: Summarizes a transcript chunk into 3-5 high-signal takeaway bullets.
 */
export async function summarizeChunk(
  chunkText: string,
  chunkIndex: number,
  totalChunks: number,
): Promise<string> {
  const prompt = `You are a content extraction assistant. Extract 3-5 core takeaways, key insights, statistics, and main ideas from Part ${chunkIndex + 1} of ${totalChunks} of a video transcript. Be concise and factual.

Transcript Part ${chunkIndex + 1}:
${chunkText}`;

  try {
    return await completeText(prompt, 400);
  } catch {
    return `Part ${chunkIndex + 1}: ${chunkText.slice(0, 300)}…`;
  }
}

/**
 * Map-Reduce Transcript Preparation:
 * - Short transcripts (<= 12,000 chars): Passes full transcript directly.
 * - Long transcripts (> 12,000 chars): Splits into ~5-minute chunks, summarizes each chunk in parallel,
 *   and combines summaries into a structured, full-coverage video executive digest.
 */
export async function prepareTranscriptWithMapReduce(
  transcript: string,
): Promise<string> {
  const maxDirectChars = 12_000;
  if (transcript.length <= maxDirectChars) {
    return transcript;
  }

  const chunks = chunkTranscript(transcript, 6_000);
  const activeChunks = chunks.slice(0, 8);

  const summaries = await Promise.all(
    activeChunks.map((chunk, index) =>
      summarizeChunk(chunk, index, activeChunks.length),
    ),
  );

  const executiveDigest = summaries
    .map(
      (summary, index) =>
        `=== Section ${index + 1} Key Takeaways ===\n${summary}`,
    )
    .join("\n\n");

  return `Executive Summary & Key Section Takeaways from full video transcript:\n\n${executiveDigest}`;
}

/**
 * Generate LinkedIn and/or X drafts from video context.
 * Uses Groq (`GROQ_API_KEY`) with the transcript as primary context.
 */
export async function generateSocialPosts(input: {
  title: string;
  channelName: string;
  transcript: string;
  styleProfile?: string | null;
  language?: string;
  platforms?: SocialPlatform[];
  formatId?: string | null;
  isProUser?: boolean;
}): Promise<GeneratedPosts> {
  const style = input.styleProfile?.trim() || DEFAULT_STYLE;
  const transcript = await prepareTranscriptWithMapReduce(input.transcript);
  const language =
    input.language && input.language !== "auto" ? input.language : "en";
  const platforms = normalizePlatforms(input.platforms);
  const wantLinkedIn = platforms.includes("linkedin");
  const wantX = platforms.includes("x");
  const format = getPostFormat(input.formatId);

  const shapeLines: string[] = [];
  if (wantLinkedIn) {
    shapeLines.push(
      `"linkedin": "LinkedIn post using real \\\\n line breaks following the selected format structure"`,
    );
  } else {
    shapeLines.push(`"linkedin": ""`);
  }
  if (wantX) {
    shapeLines.push(
      `"x": "a single X/Twitter post under ${X_CHAR_LIMIT} characters"`,
      `"xThread": ["numbered thread parts ONLY if the insight needs more than one X post; otherwise []"]`,
    );
  } else {
    shapeLines.push(`"x": ""`, `"xThread": []`);
  }

  const rules: string[] = [];
  if (wantLinkedIn) {
    rules.push(
      "- LinkedIn MUST include real newline characters (\\n), not one dense paragraph.",
    );
    rules.push(
      `- LinkedIn format selected: "${format.name}" (${format.id}). Follow its structure rules strictly.`,
    );
    rules.push(format.structurePrompt);
    rules.push(
      "- LinkedIn emphasis: wrap the hook in **double asterisks** for bold. Wrap 1-2 short key phrases in *single asterisks* for italic. Do not bold the whole post.",
    );
    rules.push(
      "- LinkedIn: scannable like a native feed post. No emoji overload, no hashtag walls.",
    );
  }
  if (wantX) {
    rules.push(
      `- X: punchy; if content exceeds one post, put the full thread in xThread (1/, 2/, …) and put tweet 1 in "x".`,
    );
    rules.push(
      "- X emphasis: optionally wrap one short phrase in **bold**. Keep the rest plain so the tweet stays readable.",
    );
    rules.push(
      `- X should echo the same insight angle as the LinkedIn "${format.shortLabel}" format, compressed.`,
    );
  }
  rules.push("- Stay faithful to the video's ideas without inventing facts.");
  rules.push(
    "- Never use em dashes (—) or en dashes (–). Use commas, periods, or colons instead.",
  );
  rules.push(
    "- Sound human: concrete hooks, short lines, no corporate filler or 'In today's world' openers.",
  );
  rules.push(`- Entire output must be in ${language}.`);
  rules.push(
    `- Only fill platforms requested: ${platforms.join(" + ")}. Leave others as empty string / [].`,
  );

  const parsed = await completeJson(
    `You are a social ghostwriter. Paraphrase insights from the video. Never copy the transcript verbatim.

Video title: ${input.title}
Channel: ${input.channelName}
Output language: ${language} (write ALL drafts in this language)
Platforms to write for: ${platforms.join(", ")}
Post format: ${format.name} (${format.id as PostFormatId})
Format intent: ${format.description}

Writing style to match:
${style}

Transcript:
"""
${transcript}
"""

Return JSON with this shape:
{
  ${shapeLines.join(",\n  ")}
}

Rules:
${rules.join("\n")}`,
    4096,
    { isProUser: input.isProUser },
  );

  const result = generatedPostsSchema.parse(parsed);

  if (!wantLinkedIn) {
    result.linkedin = "";
  } else {
    // Paragraph spacing + Unicode bold/italic for LinkedIn paste-through.
    result.linkedin = polishSocialDraft(result.linkedin, "linkedin");
  }
  if (!wantX) {
    result.x = "";
    result.xThread = [];
  } else {
    result.x = polishSocialDraft(result.x, "x");
    result.xThread = result.xThread.map((tweet) =>
      polishSocialDraft(tweet, "x"),
    );
    if (result.x.length > X_CHAR_LIMIT && result.xThread.length === 0) {
      // Ensure single-tweet fits; otherwise force a thread from the long draft.
      result.xThread = splitIntoThread(result.x);
      result.x = result.xThread[0] ?? result.x.slice(0, X_CHAR_LIMIT - 1);
    }
  }

  return result;
}

export function normalizePlatforms(
  platforms?: SocialPlatform[] | null,
): SocialPlatform[] {
  const unique = [...new Set(platforms ?? ["linkedin", "x"])].filter(
    (platform): platform is SocialPlatform =>
      platform === "linkedin" || platform === "x",
  );
  return unique.length > 0 ? unique : ["linkedin", "x"];
}

export async function extractStyleProfile(samples: string[]): Promise<string> {
  return completeText(
    `Analyze these writing samples and produce a reusable style profile (tone, structure, length pattern, formatting habits, vocabulary quirks). Be specific enough to steer future generations. Return plain text only, no JSON. Never use em dashes.

Samples:
${samples.map((s, i) => `--- Sample ${i + 1} ---\n${s}`).join("\n\n")}`,
    1024,
  );
}

function splitIntoThread(text: string): string[] {
  const words = text.split(/\s+/);
  const tweets: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    // Reserve room for "12/ " prefix
    if (next.length > X_CHAR_LIMIT - 4) {
      if (current) tweets.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) tweets.push(current);

  return tweets.map((tweet, index) => `${index + 1}/ ${tweet}`);
}
