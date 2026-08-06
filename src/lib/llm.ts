import Groq from "groq-sdk";

/**
 * Shared Groq client for post generation, style profiles, and slide/thumbnail copy.
 * Groq is OpenAI-compatible; we use chat.completions with optional JSON mode.
 */

const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

export function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set");
  }
  return new Groq({ apiKey });
}

export function getGroqModel(): string {
  return process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL;
}

/** Plain-text completion (style profiles, free-form analysis). */
export async function completeText(prompt: string, maxTokens = 1024): Promise<string> {
  const client = getGroqClient();
  const completion = await client.chat.completions.create({
    model: getGroqModel(),
    messages: [{ role: "user", content: prompt }],
    temperature: 0.6,
    max_tokens: maxTokens,
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("Groq returned no text content");
  }
  return text;
}

/**
 * Ask the model for JSON. Prefer native json_object mode; fall back to
 * extracting a JSON object from fenced / messy text if needed.
 */
export async function completeJson(prompt: string, maxTokens = 4096): Promise<unknown> {
  const client = getGroqClient();
  const completion = await client.chat.completions.create({
    model: getGroqModel(),
    messages: [
      {
        role: "system",
        content: "You are a careful assistant. Reply with valid JSON only, no markdown fences.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("Groq returned no JSON content");
  }

  return parseJsonObject(text);
}

/** Extract a JSON object from model output that may include fences or prose. */
export function parseJsonObject(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1]?.trim() ?? raw.trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Model response did not contain JSON");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}
