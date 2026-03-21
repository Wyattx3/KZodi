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
        responseLanguage,
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

    // ─── Routing Logic Configuration ──────────────────────────────────
    const isBurmese = responseLanguage === "Burmese (Unicode)" ||
        responseLanguage === "Burmese (Zawgyi)" ||
        responseLanguage === "Mix (Burmese + English)";
    const isNonEnglish = responseLanguage && responseLanguage !== "English (Default)";

    let brainModel: string;
    let generationModel: string;
    let fallbackModel: string | undefined;

    if (isBurmese) {
        // Myanmar language — use Gemini Flash for strong Burmese text generation
        // DeepSeek V3p1 was producing garbled/gibberish Myanmar Unicode
        brainModel = MODELS.CHAT; // Use Kimi K2 for brain reasoning (structured JSON)
        generationModel = MODELS.GEMINI; // Gemini Flash for actual Burmese text generation
        fallbackModel = "grok-4-1-fast-reasoning"; // User requested grok fallback for Myanmar
    } else {
        // Other Languages (English, Japanese, etc.)
        // Use Kimi K2 via MODELS.CHAT for all contexts
        brainModel = MODELS.CHAT;
        if (context === "reading") {
            generationModel = MODELS.CHAT;
        } else {
            // Roleplay chat — use versatile model for faster generation
            generationModel = "llama-3.3-70b-versatile";
        }
    }

    console.log(`[AI Routing] Language: ${responseLanguage || "English"}, Brain: ${brainModel}, Generation: ${generationModel}`);

    // ─── Phase 2: Brain Reasoning (LLM thinking call) ──────────────────
    const { getFallbackBrainStateFromHeart } = await import("./brain");
    const isFireworksModel = generationModel.includes("fireworks");

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
                userReadingContext,
                brainModel
            );
            // 45s timeout — reasoning models (like Deepseek V3/R1) take longer to think
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Brain thinking timed out")), 45000)
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
        userReadingContext,
        responseLanguage,
        generationModel
    );

    // Build messages array
    // For Fireworks/DeepSeek: increase history to 20 messages to provide enough context
    // for logical conversation flow, resolving the issue of nonsensical replies.
    const historyLimit = isFireworksModel ? 20 : 30;
    const recentHistory = history.slice(-historyLimit);

    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: systemPrompt },
        ...recentHistory.map((h, idx) => {
            const isRecent = idx >= recentHistory.length - 5;
            let textContent = h.role === "user" && h.id && h.content
                ? `[MessageID: ${h.id}] ${h.content}`
                : (h.content || " ");

            // For Fireworks: truncate older messages to save input tokens
            if (isFireworksModel && !isRecent && textContent.length > 200) {
                textContent = textContent.slice(0, 200) + "...";
            }

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
    let maxTokens = isEmotional ? 800 : 600;
    const temperature = isEmotional ? 0.95 : 0.9;

    // For Burmese, allow higher maxTokens since Myanmar Unicode characters
    // use more tokens per word than English. Length is still enforced
    // post-generation by enforceShortMessages().
    if (isBurmese) {
        maxTokens = isEmotional ? 1000 : 800;
    }

    const result = await groq.chat(
        {
            messages,
            model: generationModel,
            fallbackModel,
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
    let content = result.content || "";

    // IMPORTANT: Strip <think>...</think> tags which are output by DeepSeek r1 or similar reasoning models
    // Since DeepSeek sometimes outputs its thoughts even when instructed not to, we must clean the final output.
    // IMPORTANT: Strip <think>...</think> tags using GREEDY matching
    // to catch ALL reasoning content between first <think> and last </think>
    const thinkMatch = content.match(/<think>[\s\S]*<\/think>/);
    if (thinkMatch) {
        content = content.replace(thinkMatch[0], "").trim();
    } else {
        const thinkEndIdx = content.indexOf("</think>");
        if (thinkEndIdx !== -1) {
            content = content.slice(thinkEndIdx + 8).trim();
        }
    }

    // Analyze AI's own sentiment for timing calculations
    const textForSentiment = content
        .replace(/\|/g, " ")
        .replace(/\[\[\s*STICKER\s*:.*?\]+/gi, "")
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
export { applyBehaviorCooldowns } from "./cooldown";
export type { EngineInput, EngineOutput, CognitiveState, HeartState, BrainState } from "./types";
