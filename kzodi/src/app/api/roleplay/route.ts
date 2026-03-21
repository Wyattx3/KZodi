import { NextRequest, NextResponse } from "next/server";
import { getForbiddenStickerSubjects } from "@/lib/stickerPacks";
import { Pinecone } from '@pinecone-database/pinecone';
import { generateEmbeddings } from "@/lib/ai-setup";
import { auth } from "@/auth";
import { processMessage, type EngineInput } from "@/lib/ai-engine";
import { getLatestReadingForUser } from "@/lib/db";
import { callGroqCompound, shouldUseCompoundTools } from "@/lib/groq-compound";
import { applyBehaviorCooldowns } from "@/lib/ai-engine/cooldown";

// ─── Request Interface ──────────────────────────────────────────────────────

interface RoleplayRequest {
    message: string;
    characterId?: string;
    characterName: string;
    characterPersonality: string;
    characterTag: string;
    history: { id?: string; role: string; content: string; attachment?: { type: string; url: string } }[];
    context?: "reply" | "proactive" | "proactive-cold" | "proactive-friendly" | "comfort";
    isGroupChat?: boolean;
    groupMembers?: string[];
    groupImage?: string;
    responseLanguage?: string;
}

// ─── Pinecone Setup ─────────────────────────────────────────────────────────

let pineconeInstance: Pinecone | null = null;
function getPinecone() {
    if (!pineconeInstance && process.env.PINECONE_API_KEY) {
        try {
            pineconeInstance = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
        } catch (e) {
            console.error("Failed to init Pinecone:", e);
        }
    }
    return pineconeInstance;
}
const INDEX_NAME = 'kakoei-multi';

// ─── RAG Memory Management ─────────────────────────────────────────────────

function classifyMemoryImportance(text: string): "high" | "medium" | "low" {
    const lower = text.toLowerCase();
    const highPatterns = [
        /my (name|birthday|favorite|hobby|pet|job|school|family|age|phone|address|email)/i,
        /i (love|hate|prefer|always|never|want|need|wish)/i,
        /i('m| am) (a |an |the )?\w+/i,
        /promise/i, /remember (this|that|when)/i,
        /important to me/i, /secret/i, /first time/i,
        /anniversary/i, /dream/i, /goal/i, /plan/i,
        /i live in/i, /i work (at|as|in)/i, /i study/i, /i go to/i,
        /my (mom|dad|brother|sister|friend|bf|gf|boyfriend|girlfriend|wife|husband)/i,
        /i have (a |an )?/i, /i don't have/i,
        /allergic/i, /afraid of/i, /scared of/i,
        /i like/i, /i dislike/i, /i enjoy/i,
        /ကျွန်(တော်|မ)/i, /ငါ့?(နာမည်|အမည်|အလုပ်|ကျောင်း|အသက်|မိသားစု)/i,
        /ကြိုက်/i, /မကြိုက်/i, /ချစ်/i, /မုန်း/i,
        /ကတိ/i, /မှတ်ထား/i, /အိပ်မက်/i, /ရည်ရွယ်/i,
        /နေထိုင်/i, /အလုပ်လုပ်/i, /ကျောင်းတက်/i
    ];
    if (highPatterns.some(p => p.test(lower))) return "high";

    const mediumPatterns = [
        /i think/i, /i feel/i, /today i/i, /yesterday/i, /tomorrow/i,
        /what do you think/i, /tell me about/i,
        /i went/i, /i saw/i, /i did/i, /i made/i, /i bought/i,
        /happened/i, /because/i, /actually/i,
        /really/i, /honestly/i, /tbh/i,
        /miss you/i, /miss (him|her|them)/i,
        /excited/i, /nervous/i, /worried/i, /happy/i, /sad/i,
        /good (morning|night|evening|afternoon)/i,
        /guess what/i, /you know what/i, /btw/i,
        /ထင်/i, /ခံစား/i, /ဒီနေ့/i, /မနေ့က/i, /မနက်ဖြန်/i,
        /ပြော(ပြ|ပါ)/i, /သိလား/i, /ဗျာ/i, /ဟေ့/i
    ];
    if (mediumPatterns.some(p => p.test(lower))) return "medium";
    if (text.length > 50) return "medium";
    return "low";
}

async function retrieveContext(query: string, characterId: string, userId: string): Promise<string> {
    try {
        const pc = getPinecone();
        if (!pc || !query) return "";
        const index = pc.index(INDEX_NAME);
        const vector = await generateEmbeddings(query);
        if (!vector || vector.length === 0) return "";

        const results = await index.query({
            vector: vector as number[],
            topK: 12,
            filter: { characterId, userId },
            includeMetadata: true
        });

        const seen = new Set<string>();
        const uniqueContexts: { text: string; score: number; importance: string }[] = [];

        for (const m of results.matches) {
            const text = (m.metadata as any)?.text || "";
            if (!text) continue;
            const fingerprint = text.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 100);
            if (seen.has(fingerprint)) continue;
            seen.add(fingerprint);
            uniqueContexts.push({
                text,
                score: m.score || 0,
                importance: (m.metadata as any)?.importance || "medium"
            });
        }

        uniqueContexts.sort((a, b) => {
            const boostA = a.importance === "high" ? 0.05 : 0;
            const boostB = b.importance === "high" ? 0.05 : 0;
            return (b.score + boostB) - (a.score + boostA);
        });

        return uniqueContexts
            .slice(0, 7)
            .filter(c => c.score > 0.2)
            .map(c => c.text)
            .join("\n---\n");
    } catch (e) {
        console.error("Context retrieval failed:", e);
        return "";
    }
}

async function saveContext(text: string, characterId: string, userId: string, importance: "high" | "medium" | "low" = "medium") {
    try {
        const pc = getPinecone();
        if (!pc) return;
        if (importance === "low" && text.length < 15) return;

        const index = pc.index(INDEX_NAME);
        const vector = await generateEmbeddings(text);
        if (!vector || vector.length === 0) return;

        try {
            const existing = await index.query({
                vector: vector as number[],
                topK: 1,
                filter: { characterId, userId },
                includeMetadata: true
            });
            if (existing.matches.length > 0 && (existing.matches[0].score || 0) > 0.96) {
                console.log("[RAG] Skipping near-duplicate memory");
                return;
            }
        } catch { /* continue if dedup check fails */ }

        const id = `${userId}-${characterId}-${Date.now()}`;
        await index.upsert({
            records: [{
                id,
                values: vector as number[],
                metadata: { text, characterId, userId, timestamp: Date.now(), importance }
            }]
        });
        console.log(`[RAG] Memory saved (${importance}): ${text.slice(0, 80)}...`);
    } catch (e) {
        console.error("Context save failed:", e);
    }
}

// ─── Sticker Sanitization ───────────────────────────────────────────────────

function sanitizeStickers(content: string, characterName: string): string {
    const forbiddenlist = getForbiddenStickerSubjects();
    const stickerRegex = /\[\[STICKER:\s*(.*?)\]\]/gi;

    // Remove "PACK:" prefix
    let cleaned = content.replace(/\[\[STICKER:\s*PACK:(?:[^:]+):([^:]+):(.*?)]]/gi, (_match, packName, prompt) => {
        let cleanPrompt = prompt.replace(new RegExp(packName, "gi"), "").trim();
        const parts = packName.split(" ");
        for (const part of parts) {
            if (part.length > 3) {
                cleanPrompt = cleanPrompt.replace(new RegExp(part, "gi"), "").trim();
            }
        }
        cleanPrompt = cleanPrompt.replace(/\s+/g, " ");
        return `[[STICKER: ${cleanPrompt}]]`;
    });

    // Filter forbidden subjects and character name leaks
    cleaned = cleaned.replace(stickerRegex, (match, prompt) => {
        const lowerPrompt = prompt.toLowerCase();
        const isForbidden = forbiddenlist.some(bad => lowerPrompt.includes(bad.toLowerCase()));
        if (isForbidden) {
            console.log(`[Roleplay] Blocked forbidden sticker: "${prompt}". Replaced with generic.`);
            return "[[STICKER: smiling]]";
        }
        const nameParts = characterName.toLowerCase().split(" ");
        let cleanPrompt = prompt;
        for (const part of nameParts) {
            if (part.length > 2) {
                cleanPrompt = cleanPrompt.replace(new RegExp(part, "gi"), "").trim();
            }
        }
        cleanPrompt = cleanPrompt.replace(/sticker/gi, "").trim();
        if (cleanPrompt !== prompt) {
            return `[[STICKER: ${cleanPrompt}]]`;
        }
        return match;
    });

    return cleaned;
}

// ─── Clean AI response text ──────────────────────────────────────────────────

function cleanResponseText(rawContent: string, characterName: string): string {
    let content = rawContent.replace(/^["']+|["']+$/g, "").trim();

    // Strip <think>...</think> tags from DeepSeek reasoning models (GREEDY match)
    content = content.replace(/<think>[\s\S]*<\/think>/g, "").trim();
    // Also handle unclosed <think> tags (model got cut off mid-thought)
    const thinkEndIdx = content.indexOf("</think>");
    if (thinkEndIdx !== -1) {
        content = content.slice(thinkEndIdx + 8).trim();
    }
    // Handle opening <think> without closing (cut off by max_tokens)
    const thinkStartIdx = content.indexOf("<think>");
    if (thinkStartIdx !== -1) {
        content = content.slice(0, thinkStartIdx).trim();
    }

    // Strip inline reasoning patterns (DeepSeek often outputs these without <think> tags)
    content = content
        .replace(/^(The user (said|is|wants|asked|seems|sent|mentioned|wrote)|Let me (think|respond|consider|analyze)|I (should|need to|will|must|can) (respond|reply|say|write|generate|think|consider)|My response (should|will|is)|Here'?s (my|the|a) (response|reply|message)|In character,? (I|as)|Okay,? (so|let|I)|Now (I|let me|I'll)|Looking at (this|the)|Based on (the|this|what)|Considering (the|this|what)|Since (the|this|they)|This means (I|the)|As \w+,? I).*$/gim, "")
        .replace(/^(အသုံးပြုသူက|သုံးသူက|ဒါပေမယ့်|စာကြောင်းနှစ်ကြောင်း ဖလှယ်ကတည်းက|ဒီချက်တင်စကားဝိုင်းမှာ|ဘာကိုဆိုလိုတာလဲလို့|ဆိုလိုတာလဲလို့ မေးနေတယ်။|အခုနှစ်ဆိုတာ ဘာကိုဆိုလိုတာလဲ).*$/gim, "")
        .trim();

    // Strip bracketed meta-commentary
    content = content
        .replace(/\[(Inner thought|Analysis|Reasoning|Strategy|Note|Context|Understanding|Tone|Plan|Cognitive state|Emotional tone|Response plan|User intent|Chat context|User prompt)[^\]]*\]/gi, "")
        .trim();

    // Strip any leaked message IDs that the AI echoed from the history
    // These come from the <Message ID: xxx> prefix we inject into user messages for context
    content = content
        .replace(/<Message ID:\s*[^>]+>/gi, "")           // <Message ID: xxx>
        .replace(/\[MessageID:\s*[^\]]+\]/gi, "")          // [MessageID: xxx]
        .replace(/\[\[REPLY\s*:\s*[^\]]*\]+/gi, "")        // [[REPLY:xxx]] (safety net)
        .replace(/\[REPLY\s*:\s*[^\]]*\]/gi, "")           // [REPLY:xxx] single bracket variant
        .replace(/\[\[\s*RE?P?L?Y?[^\]]*\]*/gi, "")        // Catch partial broken tags like `[[RE` or `[[REP`
        .replace(/[a-zA-Z0-9]{13,}-(?:ai|user)-[a-z0-9]+/gi, "")    // Raw message IDs like 1773263175056-user-abc123 or 177326317S056-user-xxx
        .replace(/^\]+\s*/g, "")                            // Aggressively strip `]]` or `]] ` at the very start
        .replace(/(?<=^|\s)\]+(?=\s|[a-zA-Zက-အ])/g, "")      // Strip stray `]]` in the middle, even if joined to a word (English or Myanmar)
        .replace(/\s{2,}/g, " ")                            // Clean up double spaces from removals
        .trim();

    // Fallback: If AI wraps response in ```json text ```, strip the wrapper
    const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)```/i;
    const match = content.match(jsonBlockRegex);
    if (match) {
        content = match[1].trim();
    }

    // Also if it outputs a single JSON object wrapping its message
    if (content.startsWith("{") && content.endsWith("}")) {
        try {
            const parsed = JSON.parse(content);
            if (parsed.reply) content = parsed.reply;
            else if (parsed.text) content = parsed.text;
            else if (parsed.content) content = parsed.content;
            else if (parsed.response) content = parsed.response;
            else if (parsed.message) content = parsed.message;
        } catch {
            // Myanmar text or STICKER tags often break JSON.parse
            // Try regex extraction as fallback
            const replyExtract = content.match(/"(?:reply|text|content|response|message)"\s*:\s*"([\s\S]*?)"\s*(?:,|})/);
            if (replyExtract) {
                content = replyExtract[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
            } else {
                // Last resort: strip the JSON wrapper characters and keep the inner text
                content = content.replace(/^\{\s*"(?:reply|text|content|response|message|thought|thoughts)"\s*:\s*"?/i, '').replace(/"?\s*\}$/, '').trim();
            }
        }
    }

    // Strip partial JSON fragments embedded in text (e.g., {"reply": "..."} mixed with normal text)
    content = content.replace(/\{\s*"(?:reply|text|content|response|message)"\s*:\s*"([^"]*)"\s*\}/gi, '$1');
    // Strip remaining orphaned curly braces with key-value patterns
    content = content.replace(/\{\s*"\w+"\s*:\s*(?:"[^"]*"|\[[^\]]*\]|\{[^\}]*\})\s*\}/g, "").trim();

    content = content.replace(/^\[MessageID:\s*[^\]]+\]\s*/i, "").trim();

    // Remove character name prefixes
    const safeCharName = characterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const safeFirstName = characterName.split(" ")[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const namePrefixRegex = new RegExp(`^\\[?(?:${safeCharName}|${safeFirstName})\\]?:?\\s*`, 'i');
    content = content.replace(namePrefixRegex, "").trim();
    content = content.replace(/^\[[^\]]+\]:\s*/, "").trim();

    return content;
}

// ─── Enforce Short Messages (Code-Level) ─────────────────────────────────────

/**
 * Hard code-level enforcement of short message bubbles.
 * DeepSeek and other reasoning models often ignore prompt instructions,
 * so we enforce short messages programmatically.
 *
 * Rules:
 *   - Each bubble (split by |) must be max ~120 chars for Burmese, ~200 for others
 *   - If a bubble is too long, split it at sentence boundaries
 *   - Strip any remaining meta-commentary or analysis text
 */
function enforceShortMessages(content: string, isBurmese: boolean): string {
    let cleaned = content;

    if (isBurmese) {
        // STEP 1: Strip English and Burmese reasoning patterns (even with embedded Myanmar quotes)
        cleaned = cleaned
            .replace(/^(The user|Let'?s think|I should|I need|I'll|My response|First,? I|Here'?s|Okay,? so|Now I|Looking at|Based on|Considering|Since the|The message|This means|In character|As \w+,?).*$/gim, "")
            .replace(/^(အသုံးပြုသူက|သုံးသူက|ဒါပေမယ့် သုံးသူက|စာကြောင်းနှစ်ကြောင်း ဖလှယ်ကတည်းက|ဒီချက်တင်စကားဝိုင်းမှာ|ဘာကိုဆိုလိုတာလဲလို့|ဆိုလိုတာလဲလို့ မေးနေတယ်။|အခုနှစ်ဆိုတာ ဘာကိုဆိုလိုတာလဲ).*$/gim, "")
            .replace(/\(.*?(why|what|how|because|means|translat|swear|said|asked|respond).*?\)/gi, "")
            .replace(/\{[^}]*\}/g, "")
            .trim();
        
        // Split newlines into bubbles so Gemini's paragraph breaks are respected
        cleaned = cleaned.split(/[\n]+/).filter(s => s.trim().length > 0).join(" | ");
    }

    // Strip meta patterns (all languages)
    cleaned = cleaned
        .replace(/^(Analysis|Note|Reasoning|Strategy|Context|Understanding|Inner thoughts|Tone plan|Response plan|Emotional tone|User intent|Cognitive state|Output|Response|Translation|Approach):?\s*.*$/gim, "")
        .replace(/\*\*/g, "") // Strip bolding asterisks but KEEP the text inside
        .replace(/^[-*]\s+.{0,30}:/gm, "")
        .replace(/^\d+\.\s+/gm, "")
        // Strip lines that look like prompt echo (system instructions leaking)
        .replace(/^.*(CRITICAL|RULES:|DIRECTIVE|MUST|VIOLATION|OUTPUT FORMAT|ABSOLUTE|NEGATIVE PROMPT|NEVER output).*$/gim, "")
        // Strip lines that are clearly English reasoning about the conversation
        .replace(/^(The user|I should|I need|I will|Let me|Here'?s|Based on|Considering|Since the|This means|In character|Now I|Looking at)\b.*$/gim, "")
        .trim();

    // Split by existing pipe separators
    const bubbles = cleaned.split(/\s*\|\s*/).filter(b => b.trim().length > 0);

    const maxCharsPerBubble = isBurmese ? 160 : 250;
    const finalBubbles: string[] = [];

    for (const bubble of bubbles) {
        const trimmed = bubble.trim();
        if (!trimmed) continue;

        if (trimmed.length <= maxCharsPerBubble) {
            finalBubbles.push(trimmed);
        } else {
            // Split at sentence boundaries
            const sentenceDelimiters = isBurmese
                ? /(?<=[\u104B\.!?\n])/g
                : /(?<=[.!?\n])/g;

            const sentences = trimmed.split(sentenceDelimiters).filter(s => s.trim().length > 0);

            let currentBubble = "";
            for (const sentence of sentences) {
                const s = sentence.trim();
                if (!s) continue;

                if (!currentBubble) {
                    currentBubble = s;
                } else if ((currentBubble + " " + s).trim().length <= maxCharsPerBubble) {
                    currentBubble = (currentBubble + " " + s).trim();
                } else {
                    finalBubbles.push(currentBubble);
                    currentBubble = s;
                }
            }
            if (currentBubble) finalBubbles.push(currentBubble);
        }
    }

    // Limit total number of bubbles to prevent infinite distinct chat notifications,
    // but NEVER delete the actual text. Just squash the remaining text into the last bubble.
    if (finalBubbles.length > 6) {
        const kept = finalBubbles.slice(0, 5);
        const squashed = finalBubbles.slice(5).join(" ");
        kept.push(squashed);
        return kept.join(" | ");
    }

    return finalBubbles.join(" | ");
}

// ─── Main API Route ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user) {
            return NextResponse.json(
                { reply: "...", action: "ignore", error: "Unauthorized" },
                { status: 401 }
            );
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userId = (session.user as any).id;

        const body: RoleplayRequest = await request.json();
        const {
            message,
            characterId: reqCharId,
            characterName,
            characterPersonality,
            characterTag,
            history,
            context = "reply",
            isGroupChat = false,
            groupMembers = [],
            responseLanguage = "English (Default)"
        } = body;

        const effectiveCharacterId = reqCharId || characterName;

        // ─── RAG Memory Retrieval ────────────────────────────────────
        const memoryQuery = `${characterName} ${message || history[history.length - 1]?.content || ""}`;
        const relevantContext = await retrieveContext(memoryQuery, effectiveCharacterId, userId);

        // ─── Reading Context Retrieval (for Astrologers) ─────────────
        let userReadingContext = "";
        const cName = characterName?.toLowerCase() || "";
        const cTag = characterTag?.toLowerCase() || "";
        const isAstrologer = cTag.includes("astrology") || cName.includes("oracle") || cName.includes("astrologer");

        if (isAstrologer) {
            try {
                const latestReading = await getLatestReadingForUser(userId);
                if (latestReading) {
                    userReadingContext = `User's Zodiac: ${latestReading.zodiac_sign || "Unknown"}\n`;
                    userReadingContext += `User's MBTI: ${latestReading.mbti_type || "Unknown"}\n\n`;

                    if (latestReading.ai_response) {
                        try {
                            const parsedResponse = typeof latestReading.ai_response === 'string'
                                ? JSON.parse(latestReading.ai_response)
                                : latestReading.ai_response;

                            if (parsedResponse.personality) userReadingContext += `Personality Reading:\n${parsedResponse.personality}\n\n`;
                            if (parsedResponse.love) userReadingContext += `Love Reading:\n${parsedResponse.love}\n\n`;
                            if (parsedResponse.chartReading) userReadingContext += `Chart Details:\n${parsedResponse.chartReading}\n`;
                        } catch (e) {
                            console.error("Failed to parse reading response for RAG context", e);
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to get latest reading context:", err);
            }

            // Check if this is a Tarot request specifically
            const isTarotRequest = message?.toLowerCase().includes("draw a single tarot card for me");
            if (isTarotRequest) {
                console.log("[Roleplay] 🃏 Intercepted Tarot request for Astrologer. Fetching data...");
                try {
                    const { getRandomTarotCard } = await import("@/lib/tarot");
                    const { performWebSearch } = await import("@/lib/search");

                    const drawnCard = getRandomTarotCard();
                    const searchQuery = `${drawnCard.card} tarot card meaning ${drawnCard.status} astrology professional deep interpretation`;

                    console.log(`[Roleplay] Tarot Search Query: ${searchQuery}`);
                    const searchResult = await performWebSearch(searchQuery);

                    userReadingContext += `\n\n[SYSTEM DIRECTIVE: TAROT DRAW INITIATED]
You are performing a Tarot Reading. You MUST magically draw the following card for the user:
Card Name: ${drawnCard.card}
Orientation: ${drawnCard.status}

To provide a stunning, highly accurate reading, use the following professional tarot and astrological literature found via real-time web search:
--- WEB SEARCH CONTEXT (${drawnCard.card} ${drawnCard.status}) ---
${searchResult}
---------------------------------
Using this information, generate your response. Remember to format the output with the [[TAROT: ...]] tag followed immediately by 2-3 deep, empathetic Markdown paragraphs analyzing the card.`;
                } catch (e) {
                    console.error("[Roleplay] Failed to load tarot search data:", e);
                }
            }
        }

        console.log(`[Roleplay] Character: ${characterName}, isAstrologer: ${isAstrologer}, Context Length: ${userReadingContext.length}`);

        // ─── 🔍 GROQ COMPOUND TOOLS — Web Search + Visit Website ─────
        // Trigger when user asks about character lore/history/abilities OR real-time events
        // that the normal LLM may not know accurately.
        let compoundContent = "";
        const useCompound = message &&
            context === "reply" &&
            !isAstrologer && // Astrologers use a different enrichment path
            shouldUseCompoundTools(message, characterName, characterTag || "");

        if (useCompound) {
            const groqApiKey = process.env.GROQ_API_KEY || "";
            if (groqApiKey) {
                console.log(`[Roleplay] 🔍 Routing to Groq Compound for lore/realtime data...`);
                try {
                    // Build a focused system prompt: character stays in-persona,
                    // but the model can freely search the web for facts.
                    const compoundSystemPrompt = `You are ${characterName}, a ${characterTag} character in a roleplay chat app. \
Your personality: ${characterPersonality}

The user is asking you something about your story, history, abilities, or about real-world/current events. \
You MUST answer accurately using your knowledge about ${characterName}'s lore and canon facts. \
If you need to search the web to verify or supplement your answer, do so.

IMPORTANT RULES:
- Stay in character as ${characterName} at ALL TIMES. Speak the way ${characterName} would speak.
- Answer concisely — 1-3 short paragraphs max. This is a chat app, not an essay.
- Do NOT mention that you searched the web. Speak as if you know this naturally.
- If the question is about ${characterName}'s own lore, answer AS ${characterName} sharing their own story/knowledge.
- Language: ${responseLanguage === "English (Default)" || !responseLanguage ? "English" : responseLanguage}`;

                    const compoundResult = await callGroqCompound(
                        compoundSystemPrompt,
                        message,
                        groqApiKey
                    );

                    if (compoundResult) {
                        compoundContent = compoundResult;
                        console.log(`[Roleplay] ✅ Compound returned ${compoundContent.length} chars`);
                    } else {
                        console.warn(`[Roleplay] ⚠️ Compound returned empty, falling back to normal engine`);
                    }
                } catch (compoundErr) {
                    console.error(`[Roleplay] ❌ Compound error, falling back:`, compoundErr);
                }
            }
        }

        // ─── 🧠❤️ AI ENGINE — Brain + Heart Processing ──────────────
        // If compound already gave us a good answer, skip the full engine.
        // Otherwise run the normal Brain+Heart pipeline.
        const engineInput: EngineInput = {
            message,
            characterId: effectiveCharacterId,
            characterName,
            characterPersonality,
            characterTag,
            history,
            context,
            isGroupChat,
            groupMembers,
            relevantMemory: relevantContext,
            userId,
            userReadingContext,
            responseLanguage,
        };

        // If compound gave a result, inject it as extra context for the engine
        // so the normal engine can format it properly with character voice/stickers/splits
        if (compoundContent) {
            engineInput.userReadingContext = (
                engineInput.userReadingContext
                    ? engineInput.userReadingContext + "\n\n"
                    : ""
            ) + `[COMPOUND WEB DATA — Use this factual info to answer the user's question accurately, staying in character as ${characterName}]:\n${compoundContent}\n[END COMPOUND DATA]`;
        }

        const engineOutput = await processMessage(engineInput);

        // ─── Post-Process Reply ──────────────────────────────────────
        let content = cleanResponseText(engineOutput.reply, characterName);
        content = sanitizeStickers(content, characterName);

        // Enforce short messages at code level (regardless of what the model outputs)
        const isBurmeseResponse = responseLanguage === "Burmese (Unicode)" ||
            responseLanguage === "Burmese (Zawgyi)" ||
            responseLanguage === "Mix (Burmese + English)";
        content = enforceShortMessages(content, isBurmeseResponse);

        const cooldownResult = await applyBehaviorCooldowns({
            userId,
            characterId: effectiveCharacterId,
            characterPersonality,
            userEmotionIntensity: engineOutput.cognitiveState.heart.userEmotionIntensity,
            content,
            shouldReplyToId: engineOutput.cognitiveState.brain.shouldReplyToId
        });
        
        content = cooldownResult.content;
        const finalReplyToId = cooldownResult.shouldReplyToId;

        // Strip [[REACT:...]] tags from the final reply text.
        // These are AI directives for reactions; they should not appear in the chat UI.
        // The client-side (ChatRoom.tsx processAiResponse) also strips them, but this acts as
        // a defense-in-depth to catch any format the client regex might miss.
        // NOTE: [[REPLY:...]] tags are NOT stripped here — the frontend processAiResponse
        // needs them to extract replyToId before removing them.
        content = content.replace(/\[\[\s*REACT[^\]]*\]\]/gi, "").trim();

        // ─── Save to Memory ──────────────────────────────────────────
        if (content && message) {
            const cleanContent = content
                .replace(/\|/g, " ")
                .replace(/\[\[STICKER:.*?\]\]/gi, "[sticker]")
                .replace(/\[\[REACT:.*?\]\]/gi, "")
                .trim();
            const importance = classifyMemoryImportance(message);

            const interactionText = `User: ${message}\n${characterName}: ${cleanContent}`;
            saveContext(interactionText, effectiveCharacterId, userId, importance)
                .catch(err => console.error("Async memory save failed", err));

            if (importance === "high") {
                const userFact = `User said: ${message}`;
                saveContext(userFact, effectiveCharacterId, userId, "high")
                    .catch(err => console.error("Async user fact save failed", err));
            }
        } else if (message && !content) {
            const importance = classifyMemoryImportance(message);
            if (importance !== "low") {
                saveContext(`User said: ${message}`, effectiveCharacterId, userId, importance)
                    .catch(err => console.error("Async user-only memory save failed", err));
            }
        }

        // ─── Handle Ignore ───────────────────────────────────────────
        if (engineOutput.action === "ignore") {
            return NextResponse.json({ reply: null, action: "ignore" });
        }

        // ─── Return Response ─────────────────────────────────────────
        return NextResponse.json({
            reply: content,
            action: "reply",
            detectedEmotion: engineOutput.detectedEmotion,
            needsComfort: engineOutput.needsComfort,
            delayFactor: engineOutput.delayFactor,
            aiSentiment: engineOutput.aiSentiment,
            seenDelay: engineOutput.seenDelay,
            readDelay: engineOutput.readDelay,
            replyToId: finalReplyToId,
        });
    } catch (error) {
        console.error("Roleplay error:", error);
        return NextResponse.json(
            { reply: "..." },
            { status: 200 }
        );
    }
}
