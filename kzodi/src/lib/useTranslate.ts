"use client";
import { useState, useCallback } from "react";

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "my", label: "Myanmar" },
  { code: "th", label: "Thai" },
  { code: "zh", label: "Chinese" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "hi", label: "Hindi" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "pt", label: "Portuguese" },
  { code: "ru", label: "Russian" },
  { code: "ar", label: "Arabic" },
  { code: "vi", label: "Vietnamese" },
  { code: "id", label: "Indonesian" },
];

// In-memory cache to avoid re-translating the same text
// We validate cached entries to avoid caching English fallbacks from failed API calls
const cache = new Map<string, string>();

/** Check if text looks like it was actually translated (not just the original English) */
function looksTranslated(original: string, translated: string, targetLang: string): boolean {
  if (targetLang === "en") return true;
  // If they're identical, it wasn't actually translated
  if (original.trim() === translated.trim()) return false;
  // For CJK / Myanmar / Arabic / Hindi etc, check for non-ASCII characters
  const nonAsciiLangs = ["my", "th", "zh", "ja", "ko", "hi", "ar", "ru"];
  if (nonAsciiLangs.includes(targetLang)) {
    // eslint-disable-next-line no-control-regex
    const hasNonAscii = /[^\x00-\x7F]/.test(translated);
    return hasNonAscii;
  }
  return true;
}

export function useTranslate() {
  const [lang, setLang] = useState("en");
  const [translating, setTranslating] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});

  const translate = useCallback(async (key: string, text: string, targetLang: string) => {
    if (targetLang === "en") return;

    const cacheKey = `${targetLang}:${key}`;
    if (cache.has(cacheKey)) {
      setTranslations((prev) => ({ ...prev, [key]: cache.get(cacheKey)! }));
      return;
    }

    setTranslating(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLang }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.translated && looksTranslated(text, data.translated, targetLang)) {
          cache.set(cacheKey, data.translated);
          setTranslations((prev) => ({ ...prev, [key]: data.translated }));
        } else {
          console.warn(`[useTranslate] Translation for "${key}" looks like original, not caching`);
        }
      }
    } catch (err) {
      console.error(`[useTranslate] Error translating "${key}":`, err);
    } finally {
      setTranslating(false);
    }
  }, []);

  const changeLang = useCallback(async (newLang: string, texts: Record<string, string | null>) => {
    console.log(`[useTranslate] changeLang to "${newLang}", texts keys:`, Object.keys(texts).filter(k => texts[k]));
    setLang(newLang);
    if (newLang === "en") {
      setTranslations({});
      return;
    }

    // Clear any stale cache entries for this language that look like English fallbacks
    for (const [cacheKey, cachedValue] of cache.entries()) {
      if (cacheKey.startsWith(`${newLang}:`)) {
        const originalKey = cacheKey.replace(`${newLang}:`, "");
        const originalText = texts[originalKey];
        if (originalText && !looksTranslated(originalText, cachedValue, newLang)) {
          console.log(`[useTranslate] Clearing stale cache for "${cacheKey}"`);
          cache.delete(cacheKey);
        }
      }
    }

    // Translate all provided texts
    setTranslating(true);
    const promises = Object.entries(texts)
      .filter(([, v]) => v)
      .map(async ([key, text]) => {
        const cacheKey = `${newLang}:${key}`;
        if (cache.has(cacheKey)) {
          console.log(`[useTranslate] Cache hit for "${key}"`);
          return { key, translated: cache.get(cacheKey)! };
        }
        try {
          console.log(`[useTranslate] Fetching translation for "${key}" (${text!.length} chars)`);
          const res = await fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, targetLang: newLang }),
          });
          if (res.ok) {
            const data = await res.json();
            console.log(`[useTranslate] Got translation for "${key}": ${data.translated?.slice(0, 50)}...`);
            if (data.translated && looksTranslated(text!, data.translated, newLang)) {
              cache.set(cacheKey, data.translated);
              return { key, translated: data.translated };
            } else {
              console.warn(`[useTranslate] Translation for "${key}" looks untranslated, skipping cache`);
            }
          } else {
            console.error(`[useTranslate] Translate API returned ${res.status} for "${key}"`);
          }
        } catch (err) {
          console.error(`[useTranslate] Fetch error for "${key}":`, err);
        }
        return null;
      });

    const results = await Promise.all(promises);
    const newTranslations: Record<string, string> = {};
    results.forEach((r) => { if (r) newTranslations[r.key] = r.translated; });
    console.log(`[useTranslate] Translated ${Object.keys(newTranslations).length} sections`);
    setTranslations(newTranslations);
    setTranslating(false);
  }, []);

  const getText = useCallback((key: string, original: string | null) => {
    if (lang === "en" || !original) return original;
    return translations[key] || original;
  }, [lang, translations]);

  return { lang, translating, translate, changeLang, getText };
}

