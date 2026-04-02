import test from "node:test";
import assert from "node:assert/strict";
import { buildThinkingPrompt, parseThinking } from "../src/lib/ai-engine/brain";
import { unwrapStructuredReplyPayload } from "../src/lib/ai-engine/structuredReply";
import { analyzePersonalityTraits, type HeartState } from "../src/lib/ai-engine/types";

const baseHeartState: HeartState = {
    currentEmotion: "neutral",
    intensity: 0.2,
    emotionTowardUser: "neutral",
    relationshipFeeling: "friend",
    userEmotion: "neutral",
    userEmotionIntensity: 0.1,
    moodInertia: 0,
    isSuppressingFeelings: false,
    moodShift: "",
    comfortNeeded: false,
};

test("unwrapStructuredReplyPayload extracts plain reply text from structured payloads", () => {
    assert.equal(
        unwrapStructuredReplyPayload("```json\n{\"reply\":\"hey there\"}\n```"),
        "hey there",
    );

    assert.equal(
        unwrapStructuredReplyPayload("{\"response\":{\"content\":\"hello world\"}}"),
        "hello world",
    );

    assert.equal(
        unwrapStructuredReplyPayload("Some leaked wrapper {\"message\":\"soft reply\"}"),
        "soft reply",
    );
});

test("parseThinking accepts JSON-shaped model output instead of falling back", () => {
    const parsed = parseThinking(
        JSON.stringify({
            understanding: "The user wants reassurance.",
            intent: "comfort",
            strategy: "Validate first, then reassure gently.",
            tone: "soft concern",
            memory: "User was stressed yesterday.",
            thoughts: "I should be extra gentle here.",
            split: false,
            sticker: "",
            reply_to: "171717-user-abc123",
        }),
        analyzePersonalityTraits("warm and caring"),
    );

    assert.equal(parsed.understanding, "The user wants reassurance.");
    assert.equal(parsed.userIntent, "comfort");
    assert.equal(parsed.strategy, "Validate first, then reassure gently.");
    assert.equal(parsed.tonePlan, "soft concern");
    assert.equal(parsed.memoryToReference, "User was stressed yesterday.");
    assert.equal(parsed.innerThoughts, "I should be extra gentle here.");
    assert.equal(parsed.shouldSplitMessages, false);
    assert.equal(parsed.shouldReplyToId, "171717-user-abc123");
});

test("parseThinking still supports the expected line-based thinking format", () => {
    const parsed = parseThinking(
        [
            "UNDERSTANDING: The user is teasing playfully.",
            "INTENT: teasing",
            "STRATEGY: Tease back without losing the thread.",
            "TONE: playful",
            "MEMORY: They joked like this before.",
            "THOUGHTS: This is easy to bounce off.",
            "SPLIT: true",
            "STICKER: smirking",
            "REPLY_TO: 1773263175056-user-abc123",
        ].join("\n"),
        analyzePersonalityTraits("playful and witty"),
    );

    assert.equal(parsed.userIntent, "teasing");
    assert.equal(parsed.strategy, "Tease back without losing the thread.");
    assert.equal(parsed.shouldSplitMessages, true);
    assert.equal(parsed.stickerSuggestion, "smirking");
});

test("buildThinkingPrompt no longer contradicts itself about JSON output", () => {
    const prompt = buildThinkingPrompt(
        "why are you quiet",
        "Mika",
        "shy but caring",
        "Original",
        baseHeartState,
        analyzePersonalityTraits("shy but caring"),
        [{ role: "user", content: "you there?" }],
        "",
        "reply",
    );

    assert.match(prompt, /Do NOT output JSON/i);
    assert.doesNotMatch(prompt, /Output JSON only/i);
});
