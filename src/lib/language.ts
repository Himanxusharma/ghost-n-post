import {
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
  isSupportedLanguage,
  LANGUAGE_LABELS,
  languageDisplayName,
} from "@/lib/content";

export {
  LANGUAGE_LABELS,
  isSupportedLanguage,
  languageDisplayName,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
};

/** Map app language codes to Deepgram language params. */
export function toDeepgramLanguage(
  language: SupportedLanguage,
): string | undefined {
  if (language === "auto") return undefined;
  const map: Record<string, string> = {
    en: "en",
    es: "es",
    fr: "fr",
    de: "de",
    pt: "pt",
    hi: "hi",
    ja: "ja",
    ko: "ko",
    it: "it",
    nl: "nl",
    ar: "ar",
  };
  return map[language];
}

/**
 * Lightweight heuristic when language is `auto`. Prefers Latin → en,
 * Devanagari → hi, CJK → ja/ko, Arabic script → ar.
 */
export function detectLanguageFromText(text: string): SupportedLanguage {
  const sample = text.slice(0, 2000);
  if (/[\u0600-\u06FF]/.test(sample)) return "ar";
  if (/[\u0900-\u097F]/.test(sample)) return "hi";
  if (/[\u3040-\u30FF]/.test(sample)) return "ja";
  if (/[\uAC00-\uD7AF]/.test(sample)) return "ko";
  if (/[áéíóúñ¿¡]/i.test(sample)) return "es";
  if (/[àâçéèêëîïôùûüœ]/i.test(sample)) return "fr";
  if (/[äöüß]/i.test(sample)) return "de";
  if (/[ãõáàâêéíóôúç]/i.test(sample)) return "pt";
  return "en";
}
