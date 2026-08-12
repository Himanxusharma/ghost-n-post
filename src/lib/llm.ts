import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";

const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

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

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENAI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

export type LLMOptions = {
  isProUser?: boolean;
  preferGemini?: boolean;
};

/**
 * Plain-text completion.
 * Pro Users: Uses Google Gemini 2.5 Flash as primary engine, falling back to Groq.
 * Free Users: Uses Groq (llama-3.3-70b-versatile).
 */
export async function completeText(
  prompt: string,
  maxTokens = 1024,
  options?: LLMOptions,
): Promise<string> {
  const isPro = options?.isProUser || options?.preferGemini;
  const gemini = isPro ? getGeminiClient() : null;

  if (gemini) {
    try {
      const response = await gemini.models.generateContent({
        model: DEFAULT_GEMINI_MODEL,
        contents: prompt,
      });
      const text = response.text?.trim();
      if (text) return text;
    } catch (err) {
      console.warn("[llm] Gemini primary text completion failed; falling back to Groq:", err);
    }
  }

  // Fallback / default Groq completion
  const groq = getGroqClient();
  const completion = await groq.chat.completions.create({
    model: getGroqModel(),
    messages: [{ role: "user", content: prompt }],
    temperature: 0.6,
    max_tokens: maxTokens,
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("LLM returned no text content");
  }
  return text;
}

/**
 * JSON completion.
 * Pro Users: Uses Google Gemini 2.5 Flash (responseMimeType: "application/json") as primary engine, falling back to Groq.
 * Free Users: Uses Groq (response_format: { type: "json_object" }).
 */
export async function completeJson(
  prompt: string,
  maxTokens = 4096,
  options?: LLMOptions,
): Promise<unknown> {
  const isPro = options?.isProUser || options?.preferGemini;
  const gemini = isPro ? getGeminiClient() : null;

  if (gemini) {
    try {
      const response = await gemini.models.generateContent({
        model: DEFAULT_GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });
      const text = response.text?.trim();
      if (text) {
        return parseJsonObject(text);
      }
    } catch (err) {
      console.warn("[llm] Gemini primary JSON completion failed; falling back to Groq:", err);
    }
  }

  // Fallback / default Groq JSON completion
  const groq = getGroqClient();
  const completion = await groq.chat.completions.create({
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
    throw new Error("LLM returned no JSON content");
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
