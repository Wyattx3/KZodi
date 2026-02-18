import { NextRequest, NextResponse } from "next/server";
import { LANG_NAMES } from "@/lib/groq";

/**
 * Translation API — powered by Grok AI (xAI)
 * Model: grok-4-1-fast-reasoning
 * Endpoint: https://api.x.ai/v1/chat/completions
 *
 * Separate from Groq entirely → does NOT consume Groq TPM budget.
 *
 * Modes:
 * 1. Single: { text, targetLang }
 * 2. Batch:  { texts: { key: text }, targetLang } → 1 API call for N texts
 */

const GROK_API_KEY = process.env.GROK_API_KEY || "";
const GROK_URL = "https://api.x.ai/v1/chat/completions";
const GROK_MODEL = "grok-4-1-fast-reasoning";

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

// ─── Grok API Call with Retry ────────────────────────────────────────────────

async function callGrok(
  systemPrompt: string,
  userContent: string,
  maxTokens: number
): Promise<string> {
  if (!GROK_API_KEY) {
    console.error("[Translate] No GROK_API_KEY configured");
    return "";
  }

  const backoffs = [1000, 2000, 4000];

  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      console.log(`[Translate] Grok ${GROK_MODEL} attempt ${attempt + 1}/3`);

      const res = await fetch(GROK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROK_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROK_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          temperature: 0.3,
          max_tokens: maxTokens,
        }),
      });

      if (res.status === 429) {
        const retryAfter = res.headers.get("retry-after");
        const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : backoffs[attempt] || 4000;
        console.warn(`[Translate] Grok rate limited (429). Wait ${waitMs}ms`);
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
        return "";
      }

      if (res.status >= 500) {
        console.warn(`[Translate] Grok server error (${res.status})`);
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, backoffs[attempt] || 2000));
          continue;
        }
        return "";
      }

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[Translate] Grok error ${res.status}: ${errText.slice(0, 300)}`);
        return "";
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "";
      const finishReason = data.choices?.[0]?.finish_reason || "unknown";

      if (finishReason === "length") {
        console.warn(`[Translate] Grok response truncated (finish_reason=length)`);
      }

      console.log(`[Translate] Grok OK: ${content.length} chars, reason=${finishReason}`);
      return content;
    } catch (err) {
      console.error(`[Translate] Grok exception attempt ${attempt + 1}:`, err);
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, backoffs[attempt] || 2000));
        continue;
      }
      return "";
    }
  }

  return "";
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
  const result = await callGrok(
    `Translate to ${langName}. Return ONLY the translation, nothing else.`,
    text,
    4000
  );

  if (result) {
    setCache(cacheKey, result);
  }

  return result || text;
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

  const result = await callGrok(
    `Translate ALL texts below to ${langName}. Return ONLY translations in same numbered format: [1] ... [2] ... No explanations.`,
    numberedTexts,
    Math.min(entries.length * 2000, 8000)
  );

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
