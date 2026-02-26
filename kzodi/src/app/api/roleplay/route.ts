import { NextRequest, NextResponse } from "next/server";
import { getForbiddenStickerSubjects } from "@/lib/stickerPacks";
import { Pinecone } from '@pinecone-database/pinecone';
import { generateEmbeddings } from "@/lib/ai-setup";
import { auth } from "@/auth";
import { processMessage, type EngineInput } from "@/lib/ai-engine";

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
const INDEX_NAME = 'kzodi-multi';

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
    content = content.replace(/^\[MessageID:\s*[^\]]+\]\s*/i, "").trim();

    // Remove character name prefixes
    const safeCharName = characterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const safeFirstName = characterName.split(" ")[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const namePrefixRegex = new RegExp(`^\\[?(?:${safeCharName}|${safeFirstName})\\]?:?\\s*`, 'i');
    content = content.replace(namePrefixRegex, "").trim();
    content = content.replace(/^\[[^\]]+\]:\s*/, "").trim();

    return content;
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
            groupMembers = []
        } = body;

        const effectiveCharacterId = reqCharId || characterName;

        // ─── RAG Memory Retrieval ────────────────────────────────────
        const memoryQuery = `${characterName} ${message || history[history.length - 1]?.content || ""}`;
        const relevantContext = await retrieveContext(memoryQuery, effectiveCharacterId, userId);

        // ─── 🧠❤️ AI ENGINE — Brain + Heart Processing ──────────────
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
        };

        const engineOutput = await processMessage(engineInput);

        // ─── Post-Process Reply ──────────────────────────────────────
        let content = cleanResponseText(engineOutput.reply, characterName);
        content = sanitizeStickers(content, characterName);

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
        });
    } catch (error) {
        console.error("Roleplay error:", error);
        return NextResponse.json(
            { reply: "..." },
            { status: 200 }
        );
    }
}
