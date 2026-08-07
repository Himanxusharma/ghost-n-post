import { DeepgramClient } from "@deepgram/sdk";
import type { TranscriptResult } from "./youtube";
import { resolveAudioStreamUrl } from "./youtube";

async function transcribeWithGroqWhisper(
  audioUrl: string,
  language: string = "auto",
): Promise<TranscriptResult | null> {
  try {
    const { getGroqClient } = await import("@/lib/llm");
    const groq = getGroqClient();

    const response = await fetch(audioUrl);
    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    const file = new File([arrayBuffer], "audio.webm", { type: "audio/webm" });

    const result = await groq.audio.transcriptions.create({
      file,
      model: "whisper-large-v3-turbo",
      response_format: "verbose_json",
      ...(language && language !== "auto" ? { language } : {}),
    });

    const text = result.text?.trim() ?? "";
    if (!text) return null;

    // Extract time-aligned segments if present from verbose_json response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawSegments: any[] = (result as any).segments ?? [];
    const segments = rawSegments
      .map((s) => ({
        start: String(s.start ?? 0),
        text: String(s.text ?? "").trim(),
      }))
      .filter((s) => s.text.length > 0);

    return {
      text,
      source: "stt",
      segments: segments.length > 0 ? segments : [{ start: "0", text }],
    };
  } catch (error) {
    console.warn("[transcription] Groq Whisper fallback skipped:", error);
    return null;
  }
}

/**
 * Multi-tier STT fallback:
 * 1) Groq Whisper (whisper-large-v3-turbo) — 100% Free using existing GROQ_API_KEY
 * 2) Deepgram (nova-3) — Metered fallback
 */
export async function transcribeFromAudioUrl(
  youtubeId: string,
  language: string = "auto",
): Promise<TranscriptResult> {
  const audioUrl = await resolveAudioStreamUrl(youtubeId);

  // 1st STT Fallback (Free): Groq Whisper
  const groqResult = await transcribeWithGroqWhisper(audioUrl, language);
  if (groqResult) {
    return groqResult;
  }

  // 2nd STT Fallback: Deepgram SDK
  const apiKey = process.env.DEEPGRAM_API_KEY?.trim();
  if (!apiKey || apiKey.includes("placeholder")) {
    throw new Error(
      "No captions available and DEEPGRAM_API_KEY is not configured for fallback.",
    );
  }

  const client = new DeepgramClient({ apiKey });

  const { toDeepgramLanguage } = await import("@/lib/language");
  const deepgramLang = toDeepgramLanguage(
    language as import("@/db/schema").SupportedLanguage,
  );

  const response = await client.listen.v1.media.transcribeUrl({
    url: audioUrl,
    model: "nova-3",
    smart_format: true,
    punctuate: true,
    utterances: true,
    detect_language: !deepgramLang,
    ...(deepgramLang ? { language: deepgramLang } : {}),
  });

  const results = "results" in response ? response.results : null;
  const transcript =
    results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? "";

  if (!transcript) {
    throw new Error(
      "Transcription found no spoken content. Music-only or silent videos can't be turned into posts.",
    );
  }

  const utterances = results?.utterances ?? [];
  const segments =
    utterances.length > 0
      ? utterances.map((u) => ({
          start: String(u.start ?? 0),
          text: u.transcript ?? "",
        }))
      : [{ start: "0", text: transcript }];

  return {
    text: transcript,
    source: "stt",
    segments,
  };
}
