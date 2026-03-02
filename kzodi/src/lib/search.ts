const EXA_API_KEY = process.env.EXA_API_KEY || "";
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || "";

// -- Search Cache --
interface SearchCacheEntry { value: string; expiry: number; }
const searchCache = new Map<string, SearchCacheEntry>();

export function getCachedSearch(key: string): string | null {
    const e = searchCache.get(key);
    if (!e) return null;
    if (Date.now() > e.expiry) { searchCache.delete(key); return null; }
    return e.value;
}

export function setCachedSearch(key: string, value: string): void {
    if (searchCache.size > 200) {
        const oldest = searchCache.keys().next().value;
        if (oldest !== undefined) searchCache.delete(oldest);
    }
    searchCache.set(key, { value, expiry: Date.now() + 3600000 });
}

export async function searchExa(query: string): Promise<string> {
    if (!EXA_API_KEY) return "";
    const cached = getCachedSearch(`exa:${query}`);
    if (cached !== null) return cached;
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch("https://api.exa.ai/search", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": EXA_API_KEY },
            body: JSON.stringify({ query, numResults: 2, useAutoprompt: true, type: "auto", contents: { text: { maxCharacters: 500 } } }),
            signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) return "";
        const data = await res.json();
        const result = (data.results || []).map((r: { text?: string }) => r.text || "").join("\n").slice(0, 1000);
        setCachedSearch(`exa:${query}`, result);
        return result;
    } catch { return ""; }
}

export async function searchTavily(query: string): Promise<string> {
    if (!TAVILY_API_KEY) return "";
    const cached = getCachedSearch(`tavily:${query}`);
    if (cached !== null) return cached;
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ api_key: TAVILY_API_KEY, query, max_results: 2, search_depth: "basic", include_answer: true }),
            signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) return "";
        const data = await res.json();
        const result = data.answer || (data.results || []).map((r: { content?: string }) => r.content || "").join("\n").slice(0, 1000);
        setCachedSearch(`tavily:${query}`, result);
        return result;
    } catch { return ""; }
}

/**
 * Performs a web search using Exa first, then falls back to Tavily.
 */
export async function performWebSearch(query: string): Promise<string> {
    const cached = getCachedSearch(`web:${query}`);
    if (cached !== null) return cached;

    let result = await searchExa(query);
    if (!result) {
        result = await searchTavily(query);
    }

    if (result) {
        setCachedSearch(`web:${query}`, result);
    }

    return result;
}
