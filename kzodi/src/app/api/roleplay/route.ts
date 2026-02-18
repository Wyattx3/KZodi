import { NextRequest, NextResponse } from "next/server";
import { groq, MODELS } from "@/lib/groq";

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
  - Example: [[STICKER: excited jump]] | I'm so happy!
  - Use this for cute/expressive moments.

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
        const content = rawContent.replace(/^["']+|["']+$/g, "").trim();

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
