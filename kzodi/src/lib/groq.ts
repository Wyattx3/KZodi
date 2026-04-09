/**
 * Centralized Groq API Client — moonshotai/kimi-k2-instruct-0905 (Kimi K2)
 *
 * Pay-as-you-go plan — high TPM limits
 *
 * Features:
 *   - Direct language output (1 call, not 2)
 *   - Compact system prompts to save input tokens
 *   - TPM tracking with auto-delay when near limit
 *   - Aggressive caching for repeated queries
 *   - Request queue (max 2 concurrent) + retry with backoff
 *   - LRU Cache: 500 entries, 30min TTL
 */
// ─── API Key Pool (Multi-Account Load Balancing) ─────────────────────────────

interface KeyState {
  key: string;
  label: string;
  rateLimitedUntil: number; // timestamp when this key becomes usable again
  requestCount: number;
}

class KeyPool {
  private keys: KeyState[] = [];
  private currentIndex = 0;

  constructor() {
    // Collect all GROQ_API_KEY* environment variables
    const envKeys: { key: string; label: string }[] = [];
    if (process.env.GROQ_API_KEY) envKeys.push({ key: process.env.GROQ_API_KEY, label: "acc1" });
    if (process.env.GROQ_API_KEY_2) envKeys.push({ key: process.env.GROQ_API_KEY_2, label: "acc2" });
    if (process.env.GROQ_API_KEY_3) envKeys.push({ key: process.env.GROQ_API_KEY_3, label: "acc3" });
    if (process.env.GROQ_API_KEY_4) envKeys.push({ key: process.env.GROQ_API_KEY_4, label: "acc4" });
    if (process.env.GROQ_API_KEY_5) envKeys.push({ key: process.env.GROQ_API_KEY_5, label: "acc5" });

    if (envKeys.length === 0) {
      console.error("[Groq KeyPool] ⚠️ No API keys found!");
    } else {
      console.log(`[Groq KeyPool] 🔑 Loaded ${envKeys.length} API keys`);
    }

    this.keys = envKeys.map(k => ({
      key: k.key,
      label: k.label,
      rateLimitedUntil: 0,
      requestCount: 0,
    }));
  }

  /** Get the next available API key (least-used-first for balanced distribution) */
  getKey(): { key: string; label: string } | null {
    if (this.keys.length === 0) return null;

    const now = Date.now();

    // Filter to available (non-rate-limited) keys
    const available = this.keys.filter(k => k.rateLimitedUntil <= now);

    if (available.length > 0) {
      // Pick the key with the lowest requestCount (least-used-first)
      available.sort((a, b) => a.requestCount - b.requestCount);
      const chosen = available[0];
      chosen.requestCount++;
      console.log(`[Groq KeyPool] Using ${chosen.label} (requests: ${chosen.requestCount}, available: ${available.length}/${this.keys.length})`);
      return { key: chosen.key, label: chosen.label };
    }

    // All keys are rate-limited — use the one that expires soonest
    const soonest = this.keys.reduce((a, b) => a.rateLimitedUntil < b.rateLimitedUntil ? a : b);
    const waitMs = soonest.rateLimitedUntil - now;
    console.warn(`[Groq KeyPool] ⚠️ All keys rate-limited! Using ${soonest.label} (wait ${waitMs}ms)`);
    soonest.requestCount++;
    return { key: soonest.key, label: soonest.label };
  }

  /** Mark a key as rate-limited for a duration */
  markRateLimited(apiKey: string, durationMs: number = 60000): void {
    const keyState = this.keys.find(k => k.key === apiKey);
    if (keyState) {
      keyState.rateLimitedUntil = Date.now() + durationMs;
      console.log(`[Groq KeyPool] 🚫 ${keyState.label} rate-limited for ${durationMs}ms`);
    }
  }

  /** Get pool stats */
  get stats() {
    const now = Date.now();
    return this.keys.map(k => ({
      label: k.label,
      available: k.rateLimitedUntil <= now,
      requests: k.requestCount,
      rateLimitedFor: Math.max(0, k.rateLimitedUntil - now),
    }));
  }

  get size() { return this.keys.length; }
}

const keyPool = new KeyPool();
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// ─── Model Configuration ─────────────────────────────────────────────────────

const MODEL = "@cf/google/gemma-4-26b-a4b-it";
const FALLBACK_MODEL = "llama-3.3-70b-versatile";
const GEMINI_MODEL = "@cf/google/gemma-4-26b-a4b-it";

export const MODELS = {
  CHAT: MODEL,
  ANALYZE: "moonshotai/kimi-k2-instruct-0905",
  VISION: "moonshotai/kimi-k2-instruct-0905", // Fallback to text model since vision model is unavailable
  GEMINI: GEMINI_MODEL,
} as const;

/** Paid tier TPM limits (updated for 100K scale) */
const MODEL_TPM_LIMITS: Record<string, number> = {
  "gemini-3-flash-preview": 1_000_000,
  "moonshotai/kimi-k2-instruct-0905": 300_000,
  "llama-3.3-70b-versatile": 300_000,
  "@cf/google/gemma-4-26b-a4b-it": 999_999_999,
};

// ─── LRU Cache ───────────────────────────────────────────────────────────────

interface CacheEntry {
  value: string;
  expiry: number;
}

class LRUCache {
  private map = new Map<string, CacheEntry>();
  private maxSize: number;
  private ttlMs: number;

  constructor(maxSize = 2000, ttlMinutes = 60) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  get(key: string): string | null {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.map.delete(key);
      return null;
    }
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: string, value: string): void {
    this.map.delete(key);
    if (this.map.size >= this.maxSize) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, { value, expiry: Date.now() + this.ttlMs });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  get size(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }
}

// ─── Request Queue ───────────────────────────────────────────────────────────

type QueueTask<T> = {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

class RequestQueue {
  private queue: QueueTask<unknown>[] = [];
  private active = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent = 5) {
    this.maxConcurrent = maxConcurrent;
  }

  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ fn, resolve: resolve as (v: unknown) => void, reject });
      this.processNext();
    });
  }

  private async processNext(): Promise<void> {
    if (this.active >= this.maxConcurrent || this.queue.length === 0) return;
    const task = this.queue.shift()!;
    this.active++;
    try {
      const result = await task.fn();
      task.resolve(result);
    } catch (err) {
      task.reject(err);
    } finally {
      this.active--;
      this.processNext();
    }
  }

  get pending(): number { return this.queue.length; }
  get running(): number { return this.active; }
}

// ─── TPM Tracker ─────────────────────────────────────────────────────────────

interface TokenUsage {
  timestamp: number;
  tokens: number;
}

class TPMTracker {
  private usage: Map<string, TokenUsage[]> = new Map();

  /** Record token usage for a model */
  record(model: string, tokens: number): void {
    if (!this.usage.has(model)) this.usage.set(model, []);
    const list = this.usage.get(model)!;
    list.push({ timestamp: Date.now(), tokens });
    // Cleanup entries older than 60s
    const cutoff = Date.now() - 60_000;
    this.usage.set(model, list.filter((u) => u.timestamp > cutoff));
  }

  /** Get current TPM usage for a model */
  getCurrentTPM(model: string): number {
    const cutoff = Date.now() - 60_000;
    const list = this.usage.get(model) || [];
    return list.filter((u) => u.timestamp > cutoff).reduce((sum, u) => sum + u.tokens, 0);
  }

  /** Calculate delay needed to stay under TPM limit */
  getRequiredDelay(model: string, estimatedTokens: number): number {
    const limit = MODEL_TPM_LIMITS[model] || 10_000;
    const current = this.getCurrentTPM(model);

    // No usage in window → always allow immediately
    if (current === 0) return 0;

    const projected = current + estimatedTokens;
    if (projected <= limit * 0.85) return 0; // Under 85% - safe

    // Find when enough tokens will "expire" from the window
    const list = (this.usage.get(model) || []).sort((a, b) => a.timestamp - b.timestamp);
    let accumulated = current;
    for (const entry of list) {
      accumulated -= entry.tokens;
      if (accumulated + estimatedTokens <= limit * 0.85) {
        const waitUntil = entry.timestamp + 60_000;
        const delay = waitUntil - Date.now();
        return Math.max(delay, 0);
      }
    }

    // Wait for oldest entry to expire
    if (list.length > 0) {
      const oldestExpiry = list[0].timestamp + 60_000;
      return Math.max(oldestExpiry - Date.now(), 1000);
    }

    return 0;
  }
}

// ─── Groq + xAI + Ollama Unified Client ──────────────────────────────────────

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqChatParams {
  messages: GroqMessage[];
  model?: string;
  fallbackModel?: string;
  disableProviderFallback?: boolean;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: string };
}

export interface GroqResponse {
  content: string;
  finish_reason: string;
  truncated: boolean;
  cached: boolean;
  provider?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3);
}

function generateCacheKey(params: GroqChatParams, prefix: string): string {
  const model = params.model || MODELS.CHAT;
  const msgKey = params.messages.map((m) => `${m.role}:${m.content.slice(0, 200)}`).join("|");
  return `${prefix}:${model}:${params.temperature ?? 0.7}:${params.max_tokens ?? 1000}:${msgKey}`;
}

export const PROVIDERS = {
  GROQ: "groq",
  XAI: "xai",
  OLLAMA: "ollama",
  FIREWORKS: "fireworks",
  GEMINI: "gemini",
  CLOUDFLARE: "cloudflare"
};

function determineProvider(model: string): string {
  if (model.startsWith("@cf/")) return PROVIDERS.CLOUDFLARE;
  if (model.includes("gemini")) return PROVIDERS.GEMINI;
  if (model.includes("grok")) return PROVIDERS.XAI;
  if (model.includes("ollama")) return PROVIDERS.OLLAMA;
  if (model.includes("fireworks")) return PROVIDERS.FIREWORKS;
  return PROVIDERS.GROQ; // default to Groq
}

class MultiProviderClient {
  private queues: Map<string, RequestQueue> = new Map();
  private cache: LRUCache;
  private tpm: TPMTracker;

  constructor() {
    this.cache = new LRUCache(2000, 60);
    this.tpm = new TPMTracker();
  }

  private getQueue(model: string): RequestQueue {
    if (!this.queues.has(model)) {
      // Allow more concurrency for Ollama since it's local
      const isOllama = model.includes("ollama");
      const isCloudflare = model.startsWith("@cf/");
      this.queues.set(model, new RequestQueue(isOllama ? 4 : (isCloudflare ? 8 : 2)));
    }
    return this.queues.get(model)!;
  }

  async chat(params: GroqChatParams, options?: {
    cachePrefix?: string;
    useCache?: boolean;
    maxRetries?: number;
  }): Promise<GroqResponse> {
    const { cachePrefix = "chat", useCache = false, maxRetries = 3 } = options || {};

    if (useCache) {
      const cacheKey = generateCacheKey(params, cachePrefix);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.log(`[AI] Cache hit (${cachePrefix})`);
        return { content: cached, finish_reason: "cached", truncated: false, cached: true };
      }
    }

    const model = params.model || MODELS.CHAT;
    const queue = this.getQueue(model);

    const result = await queue.enqueue(() => this.callWithRetry(params, maxRetries, useCache ? cachePrefix : null));

    // Auto-fallback: if primary model returns empty/too-short, try fallback model
    const provider = determineProvider(model);
    const fallbackToUse = params.disableProviderFallback || provider === PROVIDERS.CLOUDFLARE ? undefined : (params.fallbackModel || FALLBACK_MODEL);
    if ((!result.content || result.content.length < 10) && model === MODEL && fallbackToUse) {
      console.warn(`[AI] Primary model empty (${result.content.length} chars). Auto-fallback to ${fallbackToUse}...`);
      const fallbackParams = { ...params, model: fallbackToUse };
      const fbQueue = this.getQueue(fallbackToUse);
      const fbResult = await fbQueue.enqueue(() => this.callWithRetry(fallbackParams, maxRetries, useCache ? cachePrefix : null));
      if (fbResult.content && fbResult.content.length >= 10) {
        return fbResult;
      }
    }

    return result;
  }

  private async callWithRetry(
    params: GroqChatParams,
    maxRetries: number,
    cachePrefix: string | null
  ): Promise<GroqResponse> {
    const backoffs = [1000, 2000, 4000, 8000];
    const model = params.model || MODELS.CHAT;
    const provider = determineProvider(model);
    const fallbackToUse = params.disableProviderFallback || provider === PROVIDERS.CLOUDFLARE ? undefined : (params.fallbackModel || FALLBACK_MODEL);

    // Estimate tokens
    const inputText = params.messages.map((m) => m.content).join("");
    const estimatedInput = estimateTokens(inputText);
    const estimatedTotal = estimatedInput + (params.max_tokens || 1000);

    // TPM tracking (only for cloud APIs)
    if (provider !== PROVIDERS.OLLAMA) {
      const delay = this.tpm.getRequiredDelay(model, estimatedTotal);
      if (delay > 0) {
        console.log(`[AI] TPM throttle: waiting ${delay}ms before request to ${model} (current: ${this.tpm.getCurrentTPM(model)} TPM)`);
        await sleep(delay);
      }
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        let apiUrl = "";
        let apiKey = "";
        let headers: Record<string, string> = { "Content-Type": "application/json" };
        let requestModel = model;

        if (provider === PROVIDERS.XAI) {
          apiUrl = "https://api.x.ai/v1/chat/completions";
          apiKey = process.env.XAI_API_KEY || "";
          if (!apiKey) {
            if (fallbackToUse) {
              console.warn("[AI] XAI_API_KEY missing, falling back to Groq Kimi");
              return this.callWithRetry({ ...params, model: fallbackToUse }, maxRetries, cachePrefix);
            }
            console.warn("[AI] XAI_API_KEY missing and provider fallback disabled");
            return { content: "", finish_reason: "missing_api_key", truncated: false, cached: false, provider };
          }
          headers.Authorization = `Bearer ${apiKey}`;
        } else if (provider === PROVIDERS.FIREWORKS) {
          apiUrl = "https://api.fireworks.ai/inference/v1/chat/completions";
          apiKey = process.env.FIREWORKS_API_KEY || "";
          if (!apiKey) {
            if (fallbackToUse) {
              console.warn("[AI] FIREWORKS_API_KEY missing, falling back to Groq Kimi");
              return this.callWithRetry({ ...params, model: fallbackToUse }, maxRetries, cachePrefix);
            }
            console.warn("[AI] FIREWORKS_API_KEY missing and provider fallback disabled");
            return { content: "", finish_reason: "missing_api_key", truncated: false, cached: false, provider };
          }
          headers.Authorization = `Bearer ${apiKey}`;
        } else if (provider === PROVIDERS.GEMINI) {
          apiUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
          apiKey = process.env.GEMINI_API_KEY || "";
          if (!apiKey) {
             if (fallbackToUse) {
               console.warn("[AI] GEMINI_API_KEY missing, falling back to Groq Kimi");
               return this.callWithRetry({ ...params, model: fallbackToUse }, maxRetries, cachePrefix);
             }
             console.warn("[AI] GEMINI_API_KEY missing and provider fallback disabled");
             return { content: "", finish_reason: "missing_api_key", truncated: false, cached: false, provider };
          }
          headers.Authorization = `Bearer ${apiKey}`;
        } else if (provider === PROVIDERS.CLOUDFLARE) {
          const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
          const apiToken = process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_WORKER_AI_API;
          if (!accountId || !apiToken) {
            console.warn("[AI] CLOUDFLARE credentials missing");
            return { content: "", finish_reason: "missing_api_key", truncated: false, cached: false, provider };
          }
          apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`;
          headers.Authorization = `Bearer ${apiToken}`;
        } else if (provider === PROVIDERS.GROQ) {
          apiUrl = GROQ_URL;
          const currentKey = keyPool.getKey();
          if (!currentKey) {
            console.error("[AI] No Groq API key available");
            return { content: "", finish_reason: "error", truncated: false, cached: false, provider };
          }
          apiKey = currentKey.key;
          headers.Authorization = `Bearer ${apiKey}`;
        } else if (provider === PROVIDERS.OLLAMA) {
          apiUrl = "http://localhost:11434/api/chat";
          // strip "ollama/" prefix from model name if present
          requestModel = model.replace(/^ollama\//, "");
        }

        let messages = params.messages;
        if (attempt > 0 && params.response_format && provider === PROVIDERS.GROQ) {
          // Only inject JSON hint for Groq — xAI reasoning models don't support this
          messages = [
            ...params.messages,
            { role: "user", content: "Remember: respond ONLY with a valid JSON object starting with { — no other text." },
          ];
        }

        const body: Record<string, unknown> = {
          model: requestModel,
          messages,
        };

        if (provider === PROVIDERS.OLLAMA) {
          body.stream = false;
          body.options = {
            temperature: params.temperature ?? 0.7,
            num_predict: params.max_tokens ?? 1000
          };
        } else if (provider === PROVIDERS.XAI) {
          // Grok 4 is a reasoning model — does NOT support temperature, 
          // presencePenalty, frequencyPenalty, stop, or reasoning_effort
          body.max_tokens = params.max_tokens ?? 1000;
          // Do NOT send response_format or temperature for grok-4
        } else if (provider === PROVIDERS.FIREWORKS) {
          // Fireworks (DeepSeek v3p1) — base model
          body.temperature = params.temperature ?? 0.7;
          body.max_tokens = params.max_tokens ?? 1000;
          // Do NOT send response_format for DeepSeek — it causes malformed output
        } else if (provider === PROVIDERS.CLOUDFLARE) {
          body.temperature = params.temperature ?? 0.7;
          body.max_tokens = params.max_tokens ?? 1000;
        } else {
          body.temperature = params.temperature ?? 0.7;
          body.max_tokens = params.max_tokens ?? 1000;
          if (params.response_format) {
            body.response_format = params.response_format;
          }
        }

        console.log(`[AI][${provider}] ${model} attempt ${attempt + 1}/${maxRetries + 1}`);

        const fetchController = new AbortController();
        const fetchTimeout = setTimeout(() => fetchController.abort(), 60000);
        const res = await fetch(apiUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: fetchController.signal,
        });
        clearTimeout(fetchTimeout);

        // Rate Limit Handling — mark key and immediately rotate to next available key
        if (res.status === 429 && provider === PROVIDERS.GROQ) {
          const retryAfter = res.headers.get("retry-after");
          const cooldownMs = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
          console.warn(`[AI] Rate limited (429) on ${model}. Marking key for ${cooldownMs}ms cooldown`);
          keyPool.markRateLimited(apiKey, cooldownMs);
          // Immediately try next available key instead of waiting
          const nextKey = keyPool.getKey();
          if (nextKey && attempt < maxRetries) {
            apiKey = nextKey.key;
            headers.Authorization = `Bearer ${apiKey}`;
            console.log(`[AI] Rotated to ${nextKey.label}, retrying...`);
            continue;
          }
          if (attempt < maxRetries) continue;
          return { content: "", finish_reason: "rate_limited", truncated: false, cached: false, provider };
        }

        if (res.status >= 500 || (res.status === 429 && provider === PROVIDERS.CLOUDFLARE)) {
          const waitMs = backoffs[attempt] || 8000;
          console.warn(`[AI] Server error (${res.status}) on ${model}. Wait ${waitMs}ms`);
          if (attempt < maxRetries) {
            await sleep(waitMs);
            continue;
          }
          // if xAI fails, fallback to Groq Kimi if it was Grok
          if (provider === PROVIDERS.XAI && model.includes("grok") && fallbackToUse) {
            console.warn(`[AI] xAI failed consistently, falling back to ${fallbackToUse}`);
            return this.callWithRetry({ ...params, model: fallbackToUse }, maxRetries, cachePrefix);
          }
          return { content: "", finish_reason: "server_error", truncated: false, cached: false, provider };
        }

        if (!res.ok) {
          const errText = await res.text();
          console.error(`[AI] Error ${res.status} on ${model}: ${errText.slice(0, 300)}`);
          // ANY error (400, 403, network error, etc.) should fall back to Kimi k2 / LLaMa for these providers
          if (provider !== PROVIDERS.GROQ && fallbackToUse) {
            console.warn(`[AI] ${provider} error ${res.status}, falling back to ${fallbackToUse}`);
            return this.callWithRetry({ ...params, model: fallbackToUse }, maxRetries, cachePrefix);
          }
          if (res.status === 400 || (res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 403)) {
            if (attempt < maxRetries) {
              await sleep(backoffs[attempt] || 2000);
              continue;
            }
          }
          return { content: "", finish_reason: "error", truncated: false, cached: false, provider };
        }

        // Success
        let content = "";
        let finishReason = "unknown";
        let truncated = false;

        const data = await res.json();
        if (provider === PROVIDERS.OLLAMA) {
          content = data.message?.content || "";
          finishReason = data.done ? "stop" : "unknown";
          // Optional: map Ollama specific metrics here if wanted
        } else if (provider === PROVIDERS.CLOUDFLARE) {
          const chatContent = data.choices?.[0]?.message?.content;
          if (chatContent) {
            content = chatContent;
            console.log(`[AI][CLOUDFLARE] Parsed using OpenAI-compatible content path (${content.length} chars)`);
          } else {
            content = data.result?.response || "";
            if (content) {
              console.log(`[AI][CLOUDFLARE] Parsed using legacy result.response path (${content.length} chars)`);
            } else {
              console.log(`[AI][CLOUDFLARE] Response empty or format unrecognized`);
            }
          }
          finishReason = "stop"; 
        } else {
          const choice = data.choices?.[0];
          // IMPORTANT: DeepSeek models return reasoning in `reasoning_content` (separate field).
          // We ONLY want the `content` field, never the reasoning.
          content = choice?.message?.content || "";

          // Debug: log if reasoning_content is present (to verify it's being separated)
          if (provider === PROVIDERS.FIREWORKS && choice?.message?.reasoning_content) {
            console.log(`[AI][FIREWORKS] reasoning_content present (${choice.message.reasoning_content.length} chars) — DISCARDED`);
            console.log(`[AI][FIREWORKS] actual content: "${content.slice(0, 100)}..."`);
          }

          finishReason = choice?.finish_reason || "unknown";
          truncated = finishReason === "length";

          const usage = data.usage;
          if (usage) {
            this.tpm.record(model, (usage.prompt_tokens || 0) + (usage.completion_tokens || 0));
            console.log(`[AI][${provider}] ${model} tokens: ${usage.prompt_tokens}in + ${usage.completion_tokens}out = ${usage.total_tokens}total`);
          } else {
            this.tpm.record(model, estimatedTotal);
          }
        }

        // Strip <think>...</think> tags that DeepSeek may embed in content
        // Use GREEDY matching to catch everything between first <think> and last </think>
        content = content.replace(/<think>[\s\S]*<\/think>/g, "").trim();
        // Handle unclosed </think> tag (reasoning at start of content)
        const thinkEndIdx = content.indexOf("</think>");
        if (thinkEndIdx !== -1) {
          content = content.slice(thinkEndIdx + 8).trim();
        }
        // Handle opening <think> without closing (cut off by max_tokens)
        const thinkStartIdx = content.indexOf("<think>");
        if (thinkStartIdx !== -1) {
          content = content.slice(0, thinkStartIdx).trim();
        }

        if (truncated) {
          console.warn(`[AI] TRUNCATED on ${model}! finish_reason=length, max_tokens=${params.max_tokens}. Output: ${content.length} chars`);
        }

        console.log(`[AI][${provider}] OK: ${content.length} chars, reason=${finishReason}`);

        if (cachePrefix && content) {
          const cacheKey = generateCacheKey(params, cachePrefix);
          this.cache.set(cacheKey, content);
        }

        return { content, finish_reason: finishReason, truncated, cached: false, provider };
      } catch (err) {
        console.error(`[AI] Exception on ${model} attempt ${attempt + 1}:`, err);
        if (attempt < maxRetries) {
          await sleep(backoffs[attempt] || 4000);
          continue;
        }
        if ((provider === PROVIDERS.XAI || provider === PROVIDERS.OLLAMA || provider === PROVIDERS.FIREWORKS || provider === PROVIDERS.GEMINI) && fallbackToUse) {
          console.warn(`[AI] ${provider} failed, falling back to ${fallbackToUse}`);
          return this.callWithRetry({ ...params, model: fallbackToUse }, maxRetries, cachePrefix);
        }
        return { content: "", finish_reason: "exception", truncated: false, cached: false, provider };
      }
    }

    return { content: "", finish_reason: "exhausted_retries", truncated: false, cached: false, provider: determineProvider(model) };
  }

  get stats() {
    const models = Object.values(MODELS);
    const perModel: Record<string, { tpm: number; limit: number }> = {};
    for (const m of models) {
      perModel[m] = {
        tpm: this.tpm.getCurrentTPM(m),
        limit: MODEL_TPM_LIMITS[m] || 0,
      };
    }
    return { cacheSize: this.cache.size, perModel };
  }
}

// ─── Singleton Export ────────────────────────────────────────────────────────

export const aiClient = new MultiProviderClient();
// Alias for backward compatibility while we refactor everywhere
export const groq = aiClient;

// ─── Language Names (shared across routes) ───────────────────────────────────

export const LANG_NAMES: Record<string, string> = {
  my: "Burmese (Myanmar)",
  th: "Thai",
  zh: "Chinese (Simplified)",
  ja: "Japanese",
  ko: "Korean",
  hi: "Hindi",
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  ru: "Russian",
  ar: "Arabic",
  vi: "Vietnamese",
  id: "Indonesian",
};
