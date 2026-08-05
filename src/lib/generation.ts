import { z } from "zod";
import { completeJson, completeText } from "@/lib/llm";
import type { SocialPlatform } from "@/lib/validations";

const generatedPostsSchema = z.object({
  linkedin: z.string().default(""),
  x: z.string().default(""),
  xThread: z.array(z.string()).default([]),
});

export type GeneratedPosts = z.infer<typeof generatedPostsSchema>;

const DEFAULT_STYLE =
  "Neutral, professional, clear. Prefer concrete insight over hype. Short paragraphs. No hashtag spam.";

const X_CHAR_LIMIT = 280;

/** Trim long transcripts so generation stays within context + cost bounds. */
export function prepareTranscriptForPrompt(transcript: string): string {
  const maxChars = 48_000;
  if (transcript.length <= maxChars) {
    return transcript;
  }
  // Keep opening (hook-rich) + closing (CTA/summary-rich) slices.
  const head = transcript.slice(0, Math.floor(maxChars * 0.7));
  const tail = transcript.slice(-Math.floor(maxChars * 0.3));
  return `${head}\n\n[…middle of transcript omitted for length…]\n\n${tail}`;
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
}): Promise<GeneratedPosts> {
  const style = input.styleProfile?.trim() || DEFAULT_STYLE;
  const transcript = prepareTranscriptForPrompt(input.transcript);
  const language =
    input.language && input.language !== "auto" ? input.language : "en";
  const platforms = normalizePlatforms(input.platforms);
  const wantLinkedIn = platforms.includes("linkedin");
  const wantX = platforms.includes("x");

  const shapeLines: string[] = [];
  if (wantLinkedIn) {
    shapeLines.push(
      `"linkedin": "long-form LinkedIn post with a strong hook, body paragraphs, and a closing line"`,
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
      "- LinkedIn: structured, scannable, no emoji overload, no hashtag walls.",
    );
  }
  if (wantX) {
    rules.push(
      `- X: punchy; if content exceeds one post, put the full thread in xThread (1/, 2/, …) and put tweet 1 in "x".`,
    );
  }
  rules.push("- Stay faithful to the video's ideas without inventing facts.");
  rules.push(`- Entire output must be in ${language}.`);
  rules.push(
    `- Only fill platforms requested: ${platforms.join(" + ")}. Leave others as empty string / [].`,
  );

  const parsed = await completeJson(
    `You are a social ghostwriter. Paraphrase insights from the video — never copy the transcript verbatim.

Video title: ${input.title}
Channel: ${input.channelName}
Output language: ${language} (write ALL drafts in this language)
Platforms to write for: ${platforms.join(", ")}

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
  );

  const result = generatedPostsSchema.parse(parsed);

  if (!wantLinkedIn) {
    result.linkedin = "";
  }
  if (!wantX) {
    result.x = "";
    result.xThread = [];
  } else if (result.x.length > X_CHAR_LIMIT && result.xThread.length === 0) {
    // Ensure single-tweet fits; otherwise force a thread from the long draft.
    result.xThread = splitIntoThread(result.x);
    result.x = result.xThread[0] ?? result.x.slice(0, X_CHAR_LIMIT - 1);
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
    `Analyze these writing samples and produce a reusable style profile (tone, structure, length pattern, formatting habits, vocabulary quirks). Be specific enough to steer future generations. Return plain text only — no JSON.

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
