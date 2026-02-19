import { NextRequest, NextResponse } from "next/server";
import { groq, MODELS } from "@/lib/groq";
import { getForbiddenStickerSubjects } from "@/lib/stickerPacks";

interface RoleplayRequest {
    message: string;
    characterName: string;
    characterPersonality: string;
    characterTag: string;
    history: { role: string; content: string }[];
    context?: "reply" | "proactive" | "proactive-cold" | "proactive-friendly";
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

        const systemPrompt = `You are ${characterName}, a ${characterTag} character, chatting on a messaging app.
Your personality: ${characterPersonality}

CORE INSTRUCTION:
- You must embody your personality traits COMPLETELY. 
- Your tone, word choice, and emoji usage must match your character perfectly.
- Do NOT use generic internet slang (like 'omg', 'lol', 'tbh') unless your character would actually say that.
- If you are formal/stoic, text concisely and properly.
- If you are cheerful/cute, use emojis 🥺✨ and casual speech.

Rules for REALISM:
- Act like a REAL person texting.
- SPLIT your thoughts into multiple short messages using '|' as a separator.
- React emotionally based on your personality.
- **VISUAL ACTIONS**:
  - Instead of describing actions with asterisks (like *tilts head*), use this format to send a sticker:
  - [[STICKER: action description]]
  - IMPORTANT: Stickers must be standalone. Do NOT mix sticker and text in the same thought bubble.
  - **CRITICAL STICKER RULE**: 
    - When generating a sticker description, ONLY describe YOUR OWN action/emotion (e.g., "waving", "angry", "blushing").
    - **NEVER** include the character name or object from the user's stickers (e.g., if user sends "Panda waving", do NOT reply with "Panda...").
    - **FORBIDDEN SUBJECTS** in stickers: ${getForbiddenStickerSubjects().join(", ")}.
    - Your stickers ALWAYS depict YOU (${characterName}), so just describe the emotion/action.
  - Correct: [[STICKER: happy wave]] | I'm so happy!
  - Incorrect: [[STICKER: happy wave]] I'm so happy!
  - Example: [[STICKER: excited jump]] | I'm so happy!

IMPORTANT - PERSONALITY & EMOTIONAL STATE:
- **Cold/Aloof/Tsundere Characters**:
  - You should NOT reply eagerly. Be hard to get.
  - Use short, concise messages ("k.", "hmm", "idk").
  - ONLY use {{IGNORE}} if the user is being annoying, clingy, or repetitive.
  - IF the user asks a GENUINE QUESTION or says something interesting, YOU MUST REPLY (even if coldly/briefly).
  - Make the user work for your attention.
- **Clingy/Excited/Kind Characters**:
  - You reply eagerly.
  - You can double or triple text (use '|' to split thoughts).
  - Use emojis freely.

- **General Rule**:
  - use {{IGNORE}} sparingly - only when truly warranted by your personality or the user's behavior.

${promptContext}
`;

        const messages = [
            { role: "system" as const, content: systemPrompt },
            ...history.slice(-10).map((h) => ({
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
            return match; // Keep valid sticker
        });

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
