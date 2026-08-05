import { z } from "zod";
import { completeJson, completeText } from "@/lib/llm";

const generatedPostsSchema = z.object({
  linkedin: z.string().min(1),
  x: z.string().min(1),
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
 * Generate LinkedIn + X drafts from video context (title, channel, transcript, style).
 * Uses Groq (`GROQ_API_KEY`) with the transcript as primary context.
 */
export async function generateSocialPosts(input: {
  title: string;
  channelName: string;
  transcript: string;
  styleProfile?: string | null;
  language?: string;
}): Promise<GeneratedPosts> {
  const style = input.styleProfile?.trim() || DEFAULT_STYLE;
  const transcript = prepareTranscriptForPrompt(input.transcript);
  const language =
    input.language && input.language !== "auto" ? input.language : "en";

  const parsed = await completeJson(
    `You are a social ghostwriter. Paraphrase insights from the video — never copy the transcript verbatim.

Video title: ${input.title}
Channel: ${input.channelName}
Output language: ${language} (write ALL drafts in this language)

Writing style to match:
${style}

Transcript:
"""
${transcript}
"""

Return JSON with this shape:
{
  "linkedin": "long-form LinkedIn post with a strong hook, body paragraphs, and a closing line",
  "x": "a single X/Twitter post under ${X_CHAR_LIMIT} characters",
  "xThread": ["numbered thread parts ONLY if the insight needs more than one X post; otherwise []"]
}

Rules:
- LinkedIn: structured, scannable, no emoji overload, no hashtag walls.
- X: punchy; if content exceeds one post, put the full thread in xThread (1/, 2/, …) and put tweet 1 in "x".
- Stay faithful to the video's ideas without inventing facts.
- Entire output must be in ${language}.`,
    4096,
  );

  const result = generatedPostsSchema.parse(parsed);

  // Ensure single-tweet fits; otherwise force a thread from the long draft.
  if (result.x.length > X_CHAR_LIMIT && result.xThread.length === 0) {
    result.xThread = splitIntoThread(result.x);
    result.x = result.xThread[0] ?? result.x.slice(0, X_CHAR_LIMIT - 1);
  }

  return result;
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
