import { DeepgramClient } from "@deepgram/sdk";
import type { TranscriptResult } from "./youtube";
import { resolveAudioStreamUrl } from "./youtube";

/**
 * URL-based STT fallback — Deepgram pulls the audio itself; we never
 * download or process audio locally on Vercel.
 */
export async function transcribeFromAudioUrl(
  youtubeId: string,
  language: string = "auto",
): Promise<TranscriptResult> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    throw new Error(
      "No captions available and DEEPGRAM_API_KEY is not configured for speech-to-text fallback.",
    );
  }

  const audioUrl = await resolveAudioStreamUrl(youtubeId);
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

  // Deepgram SDK returns SyncPrerecordedResponse | AsyncPrerecordedResponse
  const results =
    "results" in response
      ? response.results
      : null;

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
