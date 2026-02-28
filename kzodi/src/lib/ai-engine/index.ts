/**
 * 🤖 AI Engine — Main Orchestrator
 * 
 * The central intelligence that orchestrates Brain + Heart into a unified
 * cognitive pipeline for generating realistic AI roleplay responses.
 * 
 * Pipeline:
 *   1. Heart processes emotional state (local, instant)
 *   2. Brain reasons about the message (LLM "thinking" call)
 *   3. Combined cognitive state builds the final prompt
 *   4. Main LLM call generates the actual response
 *   5. Timing and metadata computed from emotional state
 */

import { groq, MODELS } from "@/lib/groq";
import Sentiment from "sentiment";
import { processHeart, calculateTiming } from "./heart";
import { thinkAboutMessage, buildCognitivePrompt } from "./brain";
import type {
    EngineInput,
    EngineOutput,
    CognitiveState,
} from "./types";

const sentimentAnalyzer = new Sentiment();

/**
 * Main entry point: process a user message and generate an AI response.
 * 
 * This runs the full cognitive pipeline:
 *   Heart (local) → Brain (LLM thinking) → Compose (LLM generation) → Output
 */
export async function processMessage(input: EngineInput): Promise<EngineOutput> {
    const {
        message,
        characterId,
        characterName,
        characterPersonality,
        characterTag,
        history,
        context,
        isGroupChat,
        groupMembers,
        relevantMemory,
        userId,
        userReadingContext,
    } = input;

    console.log(`\n${"═".repeat(60)}`);
    console.log(`[AI Engine] 🚀 Processing message for ${characterName}`);
    console.log(`[AI Engine] Message: "${message.slice(0, 80)}${message.length > 80 ? "..." : ""}"`);
    console.log(`${"═".repeat(60)}`);

    // ─── Phase 1: Heart Processing (instant, local) ──────────────────
    console.log(`[AI Engine] Phase 1: ❤️ Heart processing...`);

    const heartState = processHeart({
        message,
        characterName,
        characterPersonality,
        history: history.map(h => ({ role: h.role, content: h.content || "" })),
        userId,
        characterId,
    });

    // ─── Phase 2: Brain Reasoning (LLM thinking call) ──────────────────
    // With 5 API keys load-balanced, Brain ALWAYS runs for maximum quality.
    // Only skip for truly empty messages (comfort follow-ups with no user input).
    const { getFallbackBrainStateFromHeart } = await import("./brain");

    let brainState;
    if (message && message.trim() !== "") {
        console.log(`[AI Engine] Phase 2: 🧠 Brain reasoning...`);
        try {
            const thinkingPromise = thinkAboutMessage(
                message,
                characterName,
                characterPersonality,
                characterTag,
                heartState,
                history.map(h => ({ role: h.role, content: h.content || "" })),
                relevantMemory,
                context,
                userReadingContext
            );
            // 15s timeout — fail fast to fallback
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Brain thinking timed out")), 15000)
            );
            brainState = await Promise.race([thinkingPromise, timeoutPromise]);
        } catch (e) {
            console.warn(`[AI Engine] Brain thinking failed/timed out, using fallback:`, e);
            brainState = getFallbackBrainStateFromHeart(heartState, characterPersonality);
        }
    } else {
        console.log(`[AI Engine] Phase 2: 🧠 Brain skipped (empty message for ${context})`);
        brainState = getFallbackBrainStateFromHeart(heartState, characterPersonality);
    }

    // ─── Cognitive State Snapshot ─────────────────────────────────────
    const cognitiveState: CognitiveState = {
        heart: heartState,
        brain: brainState,
        timestamp: Date.now(),
    };

    // ─── Phase 3: Response Generation (main LLM call) ────────────────
    console.log(`[AI Engine] Phase 3: 💬 Generating response...`);

    const systemPrompt = buildCognitivePrompt(
        characterName,
        characterPersonality,
        characterTag,
        heartState,
        brainState,
        relevantMemory,
        context,
        isGroupChat,
        groupMembers,
        userReadingContext
    );

    // Build messages array
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: systemPrompt },
        ...history.slice(-30).map((h) => {
            const textContent = h.role === "user" && h.id && h.content
                ? `[MessageID: ${h.id}] ${h.content}`
                : (h.content || " ");

            let finalContent = textContent;
            if (h.attachment?.type === "image" && h.attachment.url) {
                finalContent = textContent + "\n[User sent an image]";
            }

            return {
                role: h.role as "user" | "assistant",
                content: finalContent,
            };
        }),
        ...(message ? [{ role: "user" as const, content: message }] : []),
    ];

    // Emotional state affects generation parameters
    const isEmotional = heartState.userEmotion !== "neutral" || context === "comfort";
    const maxTokens = isEmotional ? 800 : 600;
    const temperature = isEmotional ? 0.95 : 0.9;

    const result = await groq.chat(
        {
            messages,
            model: MODELS.CHAT,
            temperature,
            max_tokens: maxTokens,
        },
        {
            cachePrefix: "roleplay",
            useCache: false,
            maxRetries: 3,
        }
    );

    // ─── Phase 4: Post-Processing ────────────────────────────────────
    const content = result.content || "";

    // Analyze AI's own sentiment for timing calculations
    const textForSentiment = content
        .replace(/\|/g, " ")
        .replace(/\[\[STICKER:.*?\]\]/gi, "")
        .replace(/\[\[REACT:.*?\]\]/gi, "")
        .trim();
    const aiSentiment = sentimentAnalyzer.analyze(textForSentiment);

    // Calculate humanistic timing
    const timing = calculateTiming(
        heartState.currentEmotion,
        heartState.intensity,
        heartState.userEmotion,
        aiSentiment.comparative
    );

    // Determine if ignore
    const isIgnore = content.includes("{{IGNORE}}");

    console.log(`[AI Engine] ✅ Response generated (${content.length} chars)`);
    console.log(`[AI Engine] ⏱️ Timing: seen=${timing.seenDelay}ms, read=${timing.readDelay}ms, factor=${timing.delayFactor}`);
    console.log(`${"═".repeat(60)}\n`);

    return {
        reply: isIgnore ? "" : content,
        action: isIgnore ? "ignore" : "reply",
        detectedEmotion: heartState.userEmotion,
        needsComfort: heartState.comfortNeeded,
        delayFactor: timing.delayFactor,
        aiSentiment: aiSentiment.comparative,
        seenDelay: timing.seenDelay,
        readDelay: timing.readDelay,
        cognitiveState,
    };
}

// Re-export types and utilities for convenience
export { processHeart, calculateTiming } from "./heart";
export { thinkAboutMessage, buildCognitivePrompt } from "./brain";
export type { EngineInput, EngineOutput, CognitiveState, HeartState, BrainState } from "./types";
