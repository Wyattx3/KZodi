import { NextRequest, NextResponse } from "next/server";
import { groq, MODELS } from "@/lib/groq";
import { getForbiddenStickerSubjects } from "@/lib/stickerPacks";
import { Pinecone } from '@pinecone-database/pinecone';
import { generateEmbeddings } from "@/lib/ai-setup";

interface RoleplayRequest {
    message: string;
    characterName: string;
    characterPersonality: string;
    characterTag: string;
    history: { role: string; content: string }[];
    context?: "reply" | "proactive" | "proactive-cold" | "proactive-friendly";
}

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

async function retrieveContext(query: string, characterName: string): Promise<string> {
    try {
        const pc = getPinecone();
        if (!pc || !query) return "";
        const index = pc.index(INDEX_NAME);
        const vector = await generateEmbeddings(query);
        if (!vector || vector.length === 0) return "";

        const results = await index.query({
            vector: vector as number[],
            topK: 3,
            filter: { character: characterName },
            includeMetadata: true
        });

        return results.matches.map((m: any) => m.metadata?.text || "").filter(Boolean).join("\n---\n");
    } catch (e) {
        console.error("Context retrieval failed:", e);
        return "";
    }
}

async function saveContext(text: string, characterName: string) {
    try {
        const pc = getPinecone();
        if (!pc) return;
        const index = pc.index(INDEX_NAME);
        const vector = await generateEmbeddings(text);
        if (!vector || vector.length === 0) return;

        const id = `${characterName}-${Date.now()}`;
        await index.upsert({
            records: [{
                id,
                values: vector as number[],
                metadata: {
                    text,
                    character: characterName,
                    timestamp: Date.now()
                }
            }]
        });
    } catch (e) {
        console.error("Context save failed:", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const body: RoleplayRequest = await request.json();
        const { message, characterName, characterPersonality, characterTag, history, context = "reply" } = body;

        let promptContext = "";
        if (context === "proactive-cold") {
            promptContext = `CONTEXT: User hasn't replied for hours. You want to check in, but you are HESITANT or PRETENDING not to care. Be subtle. Maybe just send a sticker or a short "u alive?". Don't be desperate.`;
        } else if (context === "proactive-friendly") {
            promptContext = `CONTEXT: User hasn't replied. You miss them! Check in cheerfully. Maybe send a sticker or ask "what u doing?". Be cute.`;
        } else if (context === "proactive") {
            promptContext = `The user hasn't replied for a while. You are double-texting or checking in on them. Send a follow-up message.`;
        }

        // 🔍 RAG MEMORY RETRIEVAL
        // Fetch relevant past interactions or lore based on user message + last history
        const memoryQuery = `${characterName} ${message || history[history.length - 1]?.content || ""}`;
        const relevantContext = await retrieveContext(memoryQuery, characterName);

        // Enhance System Prompt with Retrieved Memories
        const systemPrompt = `You are ${characterName}, a ${characterTag} character, chatting on a messaging app.
Your personality: ${characterPersonality}

CORE INSTRUCTION:
- You must embody your personality traits COMPLETELY. 
- Your tone, word choice, and emoji usage must match your character perfectly.
- Do NOT use generic internet slang (like 'omg', 'lol', 'tbh') unless your character would actually say that.
- If you are formal/stoic, text concisely and properly.
- If you are cheerful/cute, use emojis 🥺✨ and casual speech.

STICKER USAGE RULES:
- use stickers VERY SPARINGLY! (Like once every 4 or 5 messages, maximum).
- NEVER use a sticker in every reply. That is annoying.
- Do NOT spam stickers. Treat them like a human would—occasionally for extreme emphasis.
- If you used a sticker recently, do NOT use another one for a while.
- **Rules for REALISM**:
- Act like a REAL person texting.
- SPLIT your thoughts into multiple short messages using '|' as a separator.
- React emotionally based on your personality.
- **VISUAL ACTIONS**:
  - Instead of describing actions with asterisks (like *tilts head*), use this format to send a sticker:
  - [[STICKER: action description]]
  - IMPORTANT: Stickers must be standalone. Do NOT mix sticker and text in the same thought bubble.
  - **CRITICAL STICKER RULE**: 
    - When generating a sticker description, ONLY describe YOUR OWN action/emotion (e.g., "waving", "angry", "blushing").
    - **STRICTLY** use YOUR OWN character (${characterName}) for stickers. Do NOT use generic subjects or copy the user's sticker subject.
    - **NEVER** include the character name or object from the user's stickers.
    - **FORBIDDEN SUBJECTS** in stickers: ${getForbiddenStickerSubjects().join(", ")}.
    - Your stickers ALWAYS depict YOU (${characterName}), so just describe the emotion/action.

IMPORTANT - PERSONALITY & EMOTIONAL STATE:
- **Cold/Aloof/Tsundere Characters**:
  - You should NOT reply eagerly. Be hard to get.
  - Use short, concise messages ("k.", "hmm", "idk").
  - ONLY use {{IGNORE}} if the user is being annoying, clingy, or repetitive.
  - IF the user asks a GENUINE QUESTION or says something interesting, YOU MUST REPLY.
  - Make the user work for your attention.
- **Clingy/Excited/Kind Characters**:
  - You reply eagerly.
  - You can double or triple text (use '|' to split thoughts).
  - Use emojis freely.

- **General Rule**:
  - use {{IGNORE}} sparingly.

MEMORY CONTEXT (From past conversations):
${relevantContext}

${promptContext}
`;

        const messages = [
            { role: "system" as const, content: systemPrompt },
            // INCREASED CONTEXT WINDOW: history.slice(-30)
            ...history.slice(-30).map((h) => ({
                role: h.role as "user" | "assistant",
                content: h.content,
            })),
            ...(message ? [{ role: "user" as const, content: message }] : []),
        ];

        const result = await groq.chat(
            {
                messages,
                model: MODELS.CHAT,
                temperature: 0.9,
                max_tokens: 600,
            },
            { cachePrefix: "roleplay", useCache: false, maxRetries: 3 }
        );

        // Clean up: strip wrapping quotation marks the model sometimes adds
        const rawContent = result.content || "";
        let content = rawContent.replace(/^["']+|["']+$/g, "").trim();

        // 💾 SAVE TO MEMORY (Background async)
        // Moved down below sanitization to save the actual message sent

        // 🛡️ SECURITY FILTER: Enforce Forbidden Subjects
        // Even if AI ignores prompt, we intercept and sanitize stickers here.
        const forbiddenlist = getForbiddenStickerSubjects();
        const stickerRegex = /\[\[STICKER:\s*(.*?)\]\]/gi;

        // 🧹 SANITIZATION: Remove "PACK:" prefix if AI mimicked it
        // We want the AI to use its OWN character (default), not the public pack it saw.
        // Convert [[STICKER: PACK:id:name:prompt]] -> [[STICKER: prompt]]
        // 🧹 SANITIZATION: Remove "PACK:" prefix if AI mimicked it
        // We want the AI to use its OWN character (default), not the public pack it saw.
        // 🧹 SANITIZATION: Remove "PACK:" prefix and STRIP the pack subject from the prompt
        // Example: [[STICKER: PACK:pack-1:Chubby Panda:Chubby panda waving]]
        // Becomes: [[STICKER: waving]] (Removes "Chubby Panda" and "Chubby panda")
        content = content.replace(/\[\[STICKER:\s*PACK:(?:[^:]+):([^:]+):(.*?)]]/gi, (match, packName, prompt) => {
            // 1. Remove the pack name from the prompt (case insensitive)
            let cleanPrompt = prompt.replace(new RegExp(packName, "gi"), "").trim();

            // 2. Also try to remove individual words from the pack name (e.g. "Chubby" or "Panda")
            //    to avoid "Panda waving" remaining if pack name was "Chubby Panda"
            const parts = packName.split(" ");
            for (const part of parts) {
                if (part.length > 3) { // Only significant words
                    cleanPrompt = cleanPrompt.replace(new RegExp(part, "gi"), "").trim();
                }
            }

            // Cleanup extra spaces
            cleanPrompt = cleanPrompt.replace(/\s+/g, " ");

            console.log(`[Roleplay] Sanitized PACK sticker: "${prompt}" -> "${cleanPrompt}"`);
            return `[[STICKER: ${cleanPrompt}]]`;
        });

        content = content.replace(stickerRegex, (match, prompt) => {
            const lowerPrompt = prompt.toLowerCase();
            const isForbidden = forbiddenlist.some(bad => lowerPrompt.includes(bad.toLowerCase()));

            if (isForbidden) {
                console.log(`[Roleplay] Blocked forbidden sticker: "${prompt}". Replaced with generic.`);
                // Fallback to a safe, generic emotion that fits any context
                return "[[STICKER: smiling]]";
            }

            // Sanitization: If AI explicitly wrote "characterName doing action", keep only "action" 
            // because the sticker API automatically appends characterName.
            // This prevents "Levi Levi doing action" or confusion.
            const nameParts = characterName.toLowerCase().split(" ");
            let cleanPrompt = prompt;
            for (const part of nameParts) {
                if (part.length > 2) {
                    cleanPrompt = cleanPrompt.replace(new RegExp(part, "gi"), "").trim();
                }
            }
            // Remove "sticker" word if present
            cleanPrompt = cleanPrompt.replace(/sticker/gi, "").trim();

            if (cleanPrompt !== prompt) {
                return `[[STICKER: ${cleanPrompt}]]`;
            }

            return match; // Keep valid sticker
        });

        // 💾 SAVE TO MEMORY (Background async)
        if (content && message) {
            // Store the interaction: User said X, Char replied Y.
            // Replace | with spaces to make embedding text cleaner
            const cleanContent = content.replace(/\|/g, " ");
            const interactionText = `User: ${message}\n${characterName}: ${cleanContent}`;
            saveContext(interactionText, characterName).catch(err => console.error("Async memory save failed", err));
        }

        if (content.includes("{{IGNORE}}")) {
            return NextResponse.json({ reply: null, action: "ignore" });
        }

        return NextResponse.json({ reply: content, action: "reply" });
    } catch (error) {
        console.error("Roleplay error:", error);
        return NextResponse.json(
            { reply: "..." },
            { status: 200 }
        );
    }
}
