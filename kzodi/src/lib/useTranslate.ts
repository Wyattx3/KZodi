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
const cache = new Map<string, string>();

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
        cache.set(cacheKey, data.translated);
        setTranslations((prev) => ({ ...prev, [key]: data.translated }));
      }
    } catch {
      // Keep original
    } finally {
      setTranslating(false);
    }
  }, []);

  const changeLang = useCallback(async (newLang: string, texts: Record<string, string | null>) => {
    setLang(newLang);
    if (newLang === "en") {
      setTranslations({});
      return;
    }
    // Translate all provided texts
    setTranslating(true);
    const promises = Object.entries(texts)
      .filter(([, v]) => v)
      .map(async ([key, text]) => {
        const cacheKey = `${newLang}:${key}`;
        if (cache.has(cacheKey)) {
          return { key, translated: cache.get(cacheKey)! };
        }
        try {
          const res = await fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, targetLang: newLang }),
          });
          if (res.ok) {
            const data = await res.json();
            cache.set(cacheKey, data.translated);
            return { key, translated: data.translated };
          }
        } catch { /* skip */ }
        return null;
      });

    const results = await Promise.all(promises);
    const newTranslations: Record<string, string> = {};
    results.forEach((r) => { if (r) newTranslations[r.key] = r.translated; });
    setTranslations(newTranslations);
    setTranslating(false);
  }, []);

  const getText = useCallback((key: string, original: string | null) => {
    if (lang === "en" || !original) return original;
    return translations[key] || original;
  }, [lang, translations]);

  return { lang, translating, translate, changeLang, getText };
}
