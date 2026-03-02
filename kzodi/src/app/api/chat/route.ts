import { NextRequest, NextResponse } from "next/server";
import { groq, MODELS, LANG_NAMES } from "@/lib/groq";

interface ChatRequest {
  message: string;
  zodiacSign: string;
  mbtiType: string;
  lang?: string;
  history: { role: string; content: string }[];
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, zodiacSign, mbtiType, lang, history } = body;

    const targetLang = lang && lang !== "en" ? lang : null;
    const langName = targetLang ? (LANG_NAMES[targetLang] || targetLang) : null;

    // Compact system prompt to save input tokens (every token counts toward TPM)
    let systemPrompt = `You are KZodi Oracle, a warm and confident master astrologer.
The user is ${zodiacSign}${mbtiType ? ` / ${mbtiType}` : ""}.
Give personalized readings referencing their zodiac traits, planetary influences, and patterns. No emojis. 2-3 paragraphs max. Be specific and direct.

CRITICAL: You MUST use proper markdown formatting, dividing your response into clear and beautifully written professional paragraphs. If generating a reading, provide a deep, empathetic analysis formatted nicely.`;

    // Direct language output: model responds in target language (no separate translate call)
    if (targetLang && langName) {
      systemPrompt += `\n\nCRITICAL: Your ENTIRE response MUST be written in ${langName}. Do NOT include ANY English words or sentences. Every single word must be in ${langName}. This is mandatory.`;
    }

    // Myanmar/CJK use 3-4x more tokens per word
    const maxTokens = targetLang ? 2000 : 1000;

    // Check if this is a Tarot request
    const isTarotRequest = message.toLowerCase().includes("draw a single tarot card for me");
    let tarotContext = "";

    if (isTarotRequest) {
      console.log("[Chat] 🃏 Intercepted Tarot request. Fetching data...");
      const { getRandomTarotCard } = await import("@/lib/tarot");
      const { performWebSearch } = await import("@/lib/search");

      const drawnCard = getRandomTarotCard();
      const searchQuery = `${drawnCard.card} tarot card meaning ${drawnCard.status} astrology professional deep interpretation`;

      console.log(`[Chat] Tarot Search Query: ${searchQuery}`);
      const searchResult = await performWebSearch(searchQuery);

      tarotContext = `\n\n[SYSTEM DIRECTIVE: TAROT DRAW INITIATED]
You are performing a Tarot Reading. You MUST magically draw the following card for the user:
Card Name: ${drawnCard.card}
Orientation: ${drawnCard.status}

To provide a stunning, highly accurate reading, use the following professional tarot and astrological literature found via real-time web search:
--- WEB SEARCH CONTEXT (${drawnCard.card} ${drawnCard.status}) ---
${searchResult}
---------------------------------
Using this information, generate your response. Remember to format the output with the [[TAROT: ...]] tag followed immediately by 2-3 deep, empathetic Markdown paragraphs analyzing the card in the context of their ${zodiacSign} Sun and ${mbtiType || "unknown"} MBTI.`;

      systemPrompt += tarotContext;
    }

    const messages = [
      { role: "system" as const, content: systemPrompt },
      // Limit history to 4 messages to save tokens (was 6)
      ...history.slice(-4).map((h) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user" as const, content: message },
    ];

    const result = await groq.chat(
      {
        messages,
        model: MODELS.CHAT, // llama-3.3-70b-versatile (12K TPM - highest)
        temperature: 0.8,
        max_tokens: maxTokens,
      },
      { cachePrefix: "chat", useCache: false, maxRetries: 3 }
    );

    if (!result.content) {
      console.error("[Chat] Empty response, finish_reason:", result.finish_reason);
      return NextResponse.json(
        { reply: "The stars are momentarily clouded. Please try again.", directLang: false },
        { status: 200 }
      );
    }

    if (result.truncated) {
      console.warn("[Chat] Response truncated! May appear cut off to user.");
    }

    return NextResponse.json({
      reply: result.content,
      directLang: !!targetLang,
      finish_reason: result.finish_reason,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { reply: "Something went wrong. Please try again.", directLang: false },
      { status: 200 }
    );
  }
}
