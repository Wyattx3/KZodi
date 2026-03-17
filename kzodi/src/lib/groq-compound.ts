/**
 * Groq Compound — Built-in Tools Client
 *
 * Uses `groq/compound` or `groq/compound-mini` model which has built-in:
 *   - Web Search  (real-time internet data)
 *   - Visit Website (read a specific URL's content)
 *
 * These tools are activated AUTOMATICALLY by the model — no extra setup needed.
 * Use this when a character needs real-world data to answer a question:
 *   - Character lore / backstory they should know about themselves
 *   - Recent news / current events
 *   - Facts about topics in conversation
 */

const COMPOUND_MODEL = "groq/compound-mini"; // Use compound-mini for faster, cheaper calls

// Cache: key = (systemPrompt + userMessage), value = { result, expiry }
interface CompoundCacheEntry {
    result: string;
    expiry: number;
}
const compoundCache = new Map<string, CompoundCacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCacheKey(systemPrompt: string, userMessage: string): string {
    // Use a truncated key to avoid massive map keys
    const combined = `${systemPrompt.slice(0, 300)}||${userMessage.slice(0, 200)}`;
    // Simple hash
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
        hash = ((hash << 5) - hash) + combined.charCodeAt(i);
        hash |= 0;
    }
    return `compound:${hash}`;
}

/**
 * Call Groq Compound with built-in web search + visit-website tools.
 *
 * The system prompt should define the character persona so responses
 * remain in-character even with web-sourced information.
 *
 * @param systemPrompt - Character persona / roleplay system prompt
 * @param userMessage  - The user's message (what they asked)
 * @param apiKey       - Groq API key
 * @returns            - The model's text response, or "" on failure
 */
export async function callGroqCompound(
    systemPrompt: string,
    userMessage: string,
    apiKey: string
): Promise<string> {
    const cacheKey = getCacheKey(systemPrompt, userMessage);

    // Check cache
    const cached = compoundCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
        console.log("[Compound] ✅ Cache hit");
        return cached.result;
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000); // 45s timeout

        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: COMPOUND_MODEL,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage },
                ],
                // Compound model ignores temperature/max_tokens — it manages them internally
            }),
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!res.ok) {
            const errText = await res.text();
            console.error(`[Compound] ❌ HTTP ${res.status}: ${errText.slice(0, 300)}`);
            return "";
        }

        const data = await res.json();
        const content: string = data.choices?.[0]?.message?.content || "";

        if (content) {
            // Log whether web search was actually used
            const executedTools = data.choices?.[0]?.message?.executed_tools;
            if (executedTools && executedTools.length > 0) {
                console.log(`[Compound] 🔍 Web search used (${executedTools.length} tool call(s))`);
            } else {
                console.log("[Compound] 💬 Answered from model knowledge (no web search needed)");
            }

            // Cache the result
            compoundCache.set(cacheKey, { result: content, expiry: Date.now() + CACHE_TTL_MS });
        }

        return content;
    } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
            console.error("[Compound] ⏱️ Request timed out after 45s");
        } else {
            console.error("[Compound] ❌ Exception:", err);
        }
        return "";
    }
}

/**
 * Detect if a user message is asking for info the character should know via web search.
 *
 * Two scenarios trigger this:
 *   1. CHARACTER LORE: User asks about the character's own backstory/history/abilities/story
 *      e.g., "tell me your history", "what happened in the chunin exams?"
 *   2. REAL-TIME DATA: User asks about current events / recent news
 *      e.g., "what's the latest news?", "what happened today?"
 *
 * @param message       - The user's message
 * @param characterName - The character's name (used for lore detection)
 * @param characterTag  - The character's tag/genre (e.g. "anime", "fictional")
 * @returns Whether compound tools should be used
 */
export function shouldUseCompoundTools(
    message: string,
    characterName: string,
    characterTag: string
): boolean {
    const lower = message.toLowerCase();
    const charTag = characterTag.toLowerCase();

    // ─── Scenario 1: Character Lore / Knowledge Questions ────────────
    // Detect questions about the character's own story, history, abilities, etc.
    const lorePhrases = [
        // English lore patterns
        "your history", "your backstory", "your past", "your story",
        "your origin", "your lore", "your powers", "your abilities",
        "your jutsu", "your technique", "your skill", "your training",
        "your family", "your childhood", "your mission", "your arc",
        "your clan", "your village", "your team", "your sensei",
        "what happened to you", "who are you", "tell me about yourself",
        "tell me about your", "explain your", "describe your",
        "your weakness", "your strength", "your goal", "your dream",
        "what can you do", "what are your powers",
        // Myanmar lore patterns
        "ရာဇဝင်", "မင်းရဲ့ အဖြစ်", "မင်းရဲ့ ဇာတ်လမ်း", "မင်းရဲ့ ကျောချင်",
        "မင်းရဲ့ စွမ်းရည်", "မင်းရဲ့ သမိုင်း", "ကိုယ်ပိုင် ဇာတ်", "မင်းဘယ်သူလဲ",
        "မင်းနဲ့ ပက်သက်", "မင်းရဲ့ မိသားစု", "မင်းဘာဖြစ်ခဲ့", "မင်းရဲ့ တိုက်ခိုက်",
        "မင်းဘာတတ်", "နိဒါန်း", "ဇာတ်ကြောင်း",
    ];

    // Check if it asks about the character's own knowledge/story
    if (lorePhrases.some(phrase => lower.includes(phrase))) {
        console.log(`[Compound] 📚 Lore query detected: "${message.slice(0, 60)}"`);
        return true;
    }

    // Also trigger for fictional/anime/game characters being asked about their world
    const isFictionalCharacter =
        charTag.includes("anime") ||
        charTag.includes("manga") ||
        charTag.includes("game") ||
        charTag.includes("movie") ||
        charTag.includes("tv") ||
        charTag.includes("fiction") ||
        charTag.includes("comic") ||
        charTag.includes("hero") ||
        charTag.includes("villain");

    if (isFictionalCharacter) {
        const worldQuestions = [
            "what happened", "who is", "how did", "when did", "where is",
            "explain", "describe", "tell me about", "what is", "who was",
            "ဘာဖြစ်", "ဘယ်သူ", "ဘယ်မှာ", "ဘယ်တော့", "ဘယ်လို",
            "ဖော်ပြပါ", "ရှင်းပြပါ", "ပြောပြပါ",
        ];
        if (worldQuestions.some(q => lower.includes(q))) {
            console.log(`[Compound] 🎌 Fictional character world-query detected for "${characterName}"`);
            return true;
        }
    }

    // ─── Scenario 2: Real-time / Current Events ───────────────────────
    const realtimePhrases = [
        // English
        "latest", "recent news", "what's happening", "current events",
        "right now", "today's", "this week", "this month",
        "breaking news", "just happened", "trending", "new release",
        "just released", "just announced", "what happened today",
        "what's new", "update me", "any news",
        // Myanmar
        "ယနေ့", "နောက်ဆုံး", "သတင်း", "ဘာဖြစ်နေလဲ",
        "အသစ်", "ထုတ်ပြန်", "ကြေညာ", "နောက်ဆုံးရ",
    ];

    if (realtimePhrases.some(phrase => lower.includes(phrase))) {
        console.log(`[Compound] 📡 Real-time query detected: "${message.slice(0, 60)}"`);
        return true;
    }

    return false;
}
