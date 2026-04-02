import { NextRequest, NextResponse } from "next/server";
import { LANG_NAMES, aiClient, MODELS } from "@/lib/groq";

/**
 * Translation API
 * Using unified aiClient which handles multi-provider routing and fallbacks
 */

// ─── Server-side Translation Cache ───────────────────────────────────────────

interface CacheEntry {
  value: string;
  expiry: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 30 * 60 * 1000; // 30 min
const MAX_CACHE = 500;

function getCache(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCache(key: string, value: string): void {
  if (cache.size >= MAX_CACHE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { value, expiry: Date.now() + CACHE_TTL });
}

// ─── Single Translation ──────────────────────────────────────────────────────

async function translateSingle(text: string, targetLang: string): Promise<string> {
  if (targetLang === "en" || !text) return text;

  // Check cache
  const cacheKey = `${targetLang}:${text.slice(0, 200)}`;
  const cached = getCache(cacheKey);
  if (cached) {
    console.log("[Translate] Cache hit");
    return cached;
  }

  const langName = LANG_NAMES[targetLang] || targetLang;
  
  // Conditionally use Gemini for Myanmar language
  const modelToUse = targetLang === "my" ? MODELS.GEMINI : MODELS.CHAT;

  const result = await aiClient.chat({
    model: modelToUse,
    disableProviderFallback: targetLang === "my",
    temperature: 0.3,
    max_tokens: 4000,
    messages: [
      {
        role: "system", content: `You are an expert translator. Return ONLY the translation, nothing else.

CRITICAL RULES:
- Keep ALL zodiac sign names in English: Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpio, Sagittarius, Capricorn, Aquarius, Pisces
- Keep ALL MBTI types in English: INTJ, INFP, ENTJ, etc.
- Keep planet names in English: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto
- Keep astrological terms in English: Rising sign, Ascendant, Houses, Elements (Fire, Earth, Air, Water)
- Keep the app name "Kakoei" unchanged
- Translate everything else naturally into the requested target language.`
      },
      { role: "user", content: `Translate the following text to ${langName}:\n\n${text}` }
    ]
  });

  const content = result.content;
  if (content) {
    setCache(cacheKey, content);
  }

  return content || text;
}

// ─── Batch Translation (N texts → 1 API call) ───────────────────────────────

async function translateBatch(
  texts: Record<string, string>,
  targetLang: string
): Promise<Record<string, string>> {
  if (targetLang === "en") return texts;

  const langName = LANG_NAMES[targetLang] || targetLang;
  const entries = Object.entries(texts).filter(([, v]) => v && v.trim());

  if (entries.length === 0) return {};

  // Single text → use single endpoint (more cache-friendly)
  if (entries.length === 1) {
    const [key, text] = entries[0];
    const translated = await translateSingle(text, targetLang);
    return { [key]: translated };
  }

  const numberedTexts = entries
    .map(([, text], i) => `[${i + 1}] ${text}`)
    .join("\n\n---\n\n");

  // Conditionally use Gemini for Myanmar language
  const modelToUse = targetLang === "my" ? MODELS.GEMINI : MODELS.CHAT;

  const response = await aiClient.chat({
    model: modelToUse,
    disableProviderFallback: targetLang === "my",
    temperature: 0.3,
    max_tokens: Math.min(entries.length * 2000, 8000),
    messages: [
      {
        role: "system", content: `You are an expert translator. Return ONLY translations in the exact same numbered format provided: [1] ... [2] ... No explanations.

CRITICAL RULES:
- Keep ALL zodiac sign names in English: Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpio, Sagittarius, Capricorn, Aquarius, Pisces
- Keep ALL MBTI types in English: INTJ, INFP, ENTJ, etc.
- Keep planet names in English: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto
- Keep astrological terms in English: Rising sign, Ascendant, Houses, Elements (Fire, Earth, Air, Water)
- Keep the app name "Kakoei" unchanged
- Translate everything else naturally into the requested target language.`
      },
      { role: "user", content: `Translate ALL texts below to ${langName}:\n\n${numberedTexts}` }
    ]
  });

  const result = response.content;

  if (!result) {
    return Object.fromEntries(entries);
  }

  // Parse numbered response
  const translated: Record<string, string> = {};
  for (let i = 0; i < entries.length; i++) {
    const [key] = entries[i];
    const pattern = new RegExp(
      `\\[${i + 1}\\]\\s*([\\s\\S]*?)(?=\\[${i + 2}\\]|$)`
    );
    const match = result.match(pattern);
    translated[key] = match ? match[1].trim() : entries[i][1];
  }

  return translated;
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, texts, targetLang } = body;

    if (!targetLang) {
      return NextResponse.json({ error: "Missing targetLang" }, { status: 400 });
    }

    if (targetLang === "en") {
      if (texts) return NextResponse.json({ translations: texts });
      return NextResponse.json({ translated: text });
    }

    // Batch mode
    if (texts && typeof texts === "object") {
      const translations = await translateBatch(texts, targetLang);
      return NextResponse.json({ translations });
    }

    // Single mode
    if (!text) {
      return NextResponse.json({ error: "Missing text or texts" }, { status: 400 });
    }

    const translated = await translateSingle(text, targetLang);
    return NextResponse.json({ translated });
  } catch (e) {
    console.error("[Translate] Error:", e);
    return NextResponse.json({ error: "Translation error" }, { status: 500 });
  }
}
