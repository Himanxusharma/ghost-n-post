/**
 * Duration & Chunk-Based Credit Calculation Rule:
 * - 1 credit per 5-minute chunk (300 seconds) or 6,000 characters of transcript.
 * - Minimum 1 credit per video generation.
 * - +1 credit bonus if Deepgram STT fallback was required.
 */
export function calculateCreditCost(options: {
  durationSeconds?: number | null;
  transcriptLength?: number;
  usedSTT?: boolean;
}): number {
  const durationSec = options.durationSeconds ?? 0;
  const chars = options.transcriptLength ?? 0;

  // Calculate chunk count based on duration (300s = 5 mins) or character length (6,000 chars)
  const durationChunks = Math.max(1, Math.ceil(durationSec / 300));
  const charChunks = Math.max(1, Math.ceil(chars / 6_000));
  const chunkCount = Math.max(durationChunks, charChunks);

  const baseCredits = Math.max(1, chunkCount);
  const sttExtra = options.usedSTT ? 1 : 0;

  return baseCredits + sttExtra;
}
