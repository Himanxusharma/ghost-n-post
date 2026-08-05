/**
 * Client-safe domain constants/types (no Drizzle / Node deps).
 * UI modules should import from here instead of `@/db/schema`.
 */

export const SUPPORTED_LANGUAGES = [
  "auto",
  "en",
  "es",
  "fr",
  "de",
  "pt",
  "hi",
  "ja",
  "ko",
  "it",
  "nl",
  "ar",
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export type CarouselSlide = {
  headline: string;
  body: string;
  imageUrl: string;
};

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  auto: "Auto-detect",
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  hi: "Hindi",
  ja: "Japanese",
  ko: "Korean",
  it: "Italian",
  nl: "Dutch",
  ar: "Arabic",
};

export function isSupportedLanguage(value: string): value is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

export function languageDisplayName(code: string): string {
  if (isSupportedLanguage(code)) return LANGUAGE_LABELS[code];
  return code;
}
