/**
 * ❤️ AI Heart Module — Emotion & Personality Engine
 * 
 * This module handles ALL emotional processing for the AI character.
 * It runs ENTIRELY locally (no LLM calls) — fast pure computation.
 * 
 * Key capabilities:
 *   - Detect user's emotional state from message text + history
 *   - Evolve AI's own emotional state over time (mood inertia)
 *   - Model relationship dynamics (closeness, trust, fondness)
 *   - Calculate humanistic timing (seen/read/typing delays)
 *   - Personality-aware emotional expression
 */

import Sentiment from "sentiment";
import {
    type Emotion,
    type HeartState,
    type RelationshipLevel,
    type PersonalityTraits,
    analyzePersonalityTraits,
} from "./types";

const sentimentAnalyzer = new Sentiment();

// ─── Persistent Emotional Memory (per character session) ─────────────────────

interface EmotionalMemory {
    /** Rolling average mood: -1 (miserable) to 1 (ecstatic) */
    moodAverage: number;
    /** How many positive interactions recently */
    positiveStreak: number;
    /** How many negative interactions recently */
    negativeStreak: number;
    /** Last detected emotions (sliding window) */
    recentEmotions: Emotion[];
    /** Interaction count for relationship progression */
    interactionCount: number;
    /** Last interaction timestamp */
    lastInteractionTime: number;
    /** AI's last emotional state */
    lastAiEmotion: Emotion;
    /** AI's emotion intensity last time */
    lastIntensity: number;
}

// In-memory store keyed by `${userId}-${characterId}`
const emotionalMemoryStore = new Map<string, EmotionalMemory>();

function getEmotionalMemory(userId: string, characterId: string): EmotionalMemory {
    const key = `${userId}-${characterId}`;
    if (!emotionalMemoryStore.has(key)) {
        emotionalMemoryStore.set(key, {
            moodAverage: 0.3, // Slightly positive default
            positiveStreak: 0,
            negativeStreak: 0,
            recentEmotions: [],
            interactionCount: 0,
            lastInteractionTime: Date.now(),
            lastAiEmotion: "neutral",
            lastIntensity: 0.3,
        });
    }
    return emotionalMemoryStore.get(key)!;
}

// ─── Emotion Detection (Enhanced) ───────────────────────────────────────────

const EMOTION_PATTERNS: Record<Emotion, RegExp[]> = {
    angry: [
        /wtf/i, /fuck/i, /shit/i, /damn/i, /hate\s+(you|this|it)/i,
        /go away/i, /leave me alone/i, /shut up/i, /don't talk to me/i,
        /annoying/i, /ugh+/i, /piss(ed)?\s*off/i, /sick of/i,
        /whatever/i, /i don't care/i, /enough/i,
        /စိတ်ဆိုး/i, /ဒေါသ/i, /မကြိုက်/i, /ထွက်သွား/i,
        /🤬/, /😤/, /💢/,
    ],
    sad: [
        /i('m| am) (so )?(sad|depressed|down|lonely|miserable)/i,
        /crying/i, /i cried/i, /feel(ing)? (bad|terrible|awful|empty|broken)/i,
        /nobody (cares|loves|likes)/i, /alone/i, /miss (you|them|him|her)/i,
        /heartbreak/i, /hurt(s)?/i, /pain/i, /why (does|do) (it|things)/i,
        /ဝမ်းနည်း/i, /စိတ်မကောင်း/i, /ငိုချင်/i,
        /😢/, /😭/, /💔/, /🥺/,
    ],
    upset: [
        /hmm+\.*/i, /ok\.$/i, /k\.$/i, /fine\.$/i, /whatever\.$/i,
        /\.\.\.$/i, /^\.+$/i, /don't care$/i, /nvm/i, /never mind/i,
        /forget it/i, /it's nothing/i, /i'm fine/i,
        /စိတ်ကောက်/i, /ဘာမှမဟုတ်/i,
        /😒/, /🙄/, /😑/, /😐/,
    ],
    happy: [
        /haha/i, /lol/i, /lmao/i, /rofl/i, /😂/, /🤣/, /😄/, /😆/,
        /i('m| am) (so )?(happy|excited|thrilled)/i, /yay/i, /woohoo/i,
        /awesome/i, /amazing/i, /love (it|this|that)/i,
        /ပျော်/i, /ကောင်း/i,
    ],
    excited: [
        /omg/i, /oh my god/i, /can't wait/i, /so excited/i,
        /!!+/, /🎉/, /🤩/, /🥳/, /let's go/i, /finally/i,
    ],
    flirty: [
        /miss you/i, /love you/i, /you're (cute|hot|beautiful|handsome)/i,
        /😘/, /😍/, /🥰/, /💕/, /💗/,
        /cutie/i, /babe/i, /darling/i, /sweetheart/i,
        /ချစ်/i,
    ],
    confused: [
        /what\??$/i, /huh\??/i, /wdym/i, /i don't understand/i,
        /confused/i, /🤔/, /❓/,
    ],
    lonely: [
        /i feel (so )?alone/i, /no one (is here|cares|talks)/i,
        /wish (someone|you) (were|was) here/i,
        /တစ်ယောက်တည်း/i, /ဆီးသား/i,
        /💙/, /🌙/,
    ],
    frustrated: [],
    worried: [
        /i('m| am) (so )?worried/i, /what if/i, /scared/i, /nervous/i,
        /anxious/i, /stress/i, /can't sleep/i,
        /စိုးရိမ်/i, /ကြောက်/i,
    ],
    jealous: [
        /who (is|was) (she|he|that|they)/i, /are you (talking|chatting) (to|with)/i,
        /you (like|prefer) (her|him|them)/i, /jealous/i,
        /မနာလို/i,
    ],
    shy: [
        /um+/i, /ehh/i, /blush/i, /don't say that/i,
        /you're making me/i, /stop it/i,
        /😳/, /🫣/,
    ],
    playful: [
        /hehe/i, /teehee/i, /catch me/i, /bet you can't/i,
        /dare you/i, /wanna play/i,
        /😜/, /😝/, /😏/,
    ],
    nostalgic: [
        /remember when/i, /back then/i, /those days/i, /i miss when/i,
        /used to/i, /old times/i,
    ],
    guilty: [
        /i('m| am) sorry/i, /my fault/i, /i shouldn't have/i,
        /forgive me/i, /i feel bad/i,
    ],
    relieved: [
        /thank god/i, /finally/i, /phew/i, /glad it's over/i,
        /relief/i,
    ],
    bored: [
        /bored/i, /nothing to do/i, /so boring/i, /meh/i,
        /ငြီးငွေ့/i,
    ],
    tender: [
        /thank you/i, /means a lot/i, /you're the best/i,
        /i appreciate/i, /grateful/i,
    ],
    neutral: [],
};

/**
 * Detect the user's emotional state from their message and recent history.
 * Returns an emotion with intensity scoring.
 */
export function detectUserEmotion(
    message: string,
    recentHistory: { role: string; content: string }[]
): { emotion: Emotion; intensity: number } {
    const lower = message.toLowerCase();
    const sentimentResult = sentimentAnalyzer.analyze(lower);
    const score = sentimentResult.comparative;

    // Score each emotion by how many patterns match + sentiment alignment
    const emotionScores: Partial<Record<Emotion, number>> = {};

    for (const [emotion, patterns] of Object.entries(EMOTION_PATTERNS)) {
        const matchCount = patterns.filter(p => p.test(lower)).length;
        if (matchCount > 0) {
            emotionScores[emotion as Emotion] = matchCount;
        }
    }

    // Boost scores with sentiment analysis alignment
    if (score < -1.5) {
        emotionScores["angry"] = (emotionScores["angry"] || 0) + 2;
    } else if (score < -0.5) {
        emotionScores["sad"] = (emotionScores["sad"] || 0) + 1;
        emotionScores["upset"] = (emotionScores["upset"] || 0) + 1;
    } else if (score > 1.5) {
        emotionScores["happy"] = (emotionScores["happy"] || 0) + 2;
        emotionScores["excited"] = (emotionScores["excited"] || 0) + 1;
    } else if (score > 0.5) {
        emotionScores["happy"] = (emotionScores["happy"] || 0) + 1;
    }

    // Check for sustained negative emotion from history
    const recentUserMsgs = recentHistory.filter(h => h.role === "user").slice(-3);
    const negCount = recentUserMsgs.filter(m => {
        const s = sentimentAnalyzer.analyze(m.content.toLowerCase()).comparative;
        return s < -0.5;
    }).length;
    if (negCount >= 2) {
        emotionScores["frustrated"] = (emotionScores["frustrated"] || 0) + 3;
    }

    // Find the highest-scoring emotion
    let topEmotion: Emotion = "neutral";
    let topScore = 0;
    for (const [emotion, emotionScore] of Object.entries(emotionScores)) {
        if (emotionScore > topScore) {
            topEmotion = emotion as Emotion;
            topScore = emotionScore;
        }
    }

    // Calculate intensity (0.0 - 1.0)
    const intensity = Math.min(1.0, topScore > 0 ? 0.3 + (topScore * 0.15) + (Math.abs(score) * 0.1) : 0.2);

    return { emotion: topEmotion, intensity };
}

// ─── AI Emotional Evolution ──────────────────────────────────────────────────

/**
 * Compute how the AI CHARACTER should feel based on:
 * - The user's emotional state
 * - The AI's personality traits
 * - Emotional momentum from recent interactions
 * - Relationship closeness
 */
function evolveAiEmotion(
    userEmotion: Emotion,
    userIntensity: number,
    traits: PersonalityTraits,
    memory: EmotionalMemory
): { emotion: Emotion; intensity: number; isSuppressing: boolean } {

    // Emotional response mapping: how each personality type reacts to user emotions
    const responseMap: Record<string, Partial<Record<Emotion, Emotion>>> = {
        warm: {
            sad: "worried", angry: "worried", upset: "tender",
            happy: "happy", excited: "excited", flirty: "flirty",
            lonely: "tender", frustrated: "worried", jealous: "confused",
            guilty: "tender", bored: "playful",
        },
        cold: {
            sad: "neutral", angry: "neutral", upset: "neutral",
            happy: "neutral", excited: "neutral", flirty: "shy",
            lonely: "neutral", frustrated: "neutral", jealous: "confused",
            guilty: "neutral", bored: "bored",
        },
        tsundere: {
            sad: "worried", angry: "upset", upset: "worried",
            happy: "shy", excited: "playful", flirty: "shy",
            lonely: "tender", frustrated: "worried", jealous: "jealous",
            guilty: "tender", bored: "playful",
        },
        playful: {
            sad: "tender", angry: "confused", upset: "playful",
            happy: "excited", excited: "excited", flirty: "flirty",
            lonely: "playful", frustrated: "playful", jealous: "playful",
            guilty: "tender", bored: "playful",
        },
        clingy: {
            sad: "worried", angry: "sad", upset: "sad",
            happy: "excited", excited: "excited", flirty: "flirty",
            lonely: "worried", frustrated: "worried", jealous: "jealous",
            guilty: "sad", bored: "lonely",
        },
    };

    // Determine which personality response map to use
    let personalityKey = "warm"; // default
    if (traits.isTsundere) personalityKey = "tsundere";
    else if (traits.isCold) personalityKey = "cold";
    else if (traits.isPlayful) personalityKey = "playful";
    else if (traits.isClingy) personalityKey = "clingy";

    const map = responseMap[personalityKey] || responseMap.warm;
    let aiEmotion: Emotion = map[userEmotion] || "neutral";

    // Mood inertia: AI's emotion is influenced by recent mood
    // If the mood has been consistently negative, AI becomes more concerned
    if (memory.moodAverage < -0.5 && !["worried", "sad", "tender"].includes(aiEmotion)) {
        aiEmotion = "worried";
    }
    // If mood has been consistently positive, AI becomes more cheerful
    if (memory.moodAverage > 0.5 && aiEmotion === "neutral") {
        aiEmotion = traits.isCold ? "neutral" : "happy";
    }

    // Intensity: warm characters feel more strongly, cold characters suppress
    let intensity = userIntensity * (traits.isWarm || traits.isClingy ? 1.2 : traits.isCold ? 0.5 : 0.8);
    intensity = Math.min(1.0, Math.max(0.1, intensity));

    // Mood inertia boost: if recent mood aligns, intensify
    if (memory.lastAiEmotion === aiEmotion) {
        intensity = Math.min(1.0, intensity + 0.1);
    }

    // Suppression detection (tsundere / cold / shy)
    const isSuppressing = (traits.isTsundere || traits.isCold || traits.isShy) &&
        ["worried", "tender", "flirty", "happy"].includes(aiEmotion);

    return { emotion: aiEmotion, intensity, isSuppressing };
}

// ─── Relationship Dynamics ───────────────────────────────────────────────────

function computeRelationship(memory: EmotionalMemory): RelationshipLevel {
    const count = memory.interactionCount;
    const mood = memory.moodAverage;

    // Relationship progression based on interaction count + mood quality
    if (count < 5) return "stranger";
    if (count < 15) return mood > 0 ? "acquaintance" : "stranger";
    if (count < 40) return mood > 0.2 ? "friend" : "acquaintance";
    if (count < 80) return mood > 0.3 ? "close_friend" : "friend";
    if (count < 150) return mood > 0.4 ? "crush" : "close_friend";
    if (count < 300) return mood > 0.5 ? "lover" : "crush";
    return mood > 0.6 ? "soulmate" : "lover";
}

// ─── Humanistic Timing ──────────────────────────────────────────────────────

export interface TimingState {
    seenDelay: number;
    readDelay: number;
    delayFactor: number;
}

/**
 * Calculate humanistic timing based on emotional state.
 * A happy AI reads fast and types fast.
 * An upset AI takes forever to even "see" the message.
 */
export function calculateTiming(
    aiEmotion: Emotion,
    aiIntensity: number,
    userEmotion: Emotion,
    aiSentimentScore: number
): TimingState {
    // Base delays
    let seenDelay = 1000 + Math.random() * 2000; // 1-3s default
    let readDelay = 300 + Math.random() * 700;     // 0.3-1s default
    let delayFactor = 1.0;

    // AI emotional state affects timing
    if (aiSentimentScore > 1.0 || aiEmotion === "happy" || aiEmotion === "excited") {
        seenDelay = 500 + Math.random() * 1000;    // 0.5-1.5s (reads fast)
        readDelay = 100 + Math.random() * 300;      // 0.1-0.4s (types fast)
        delayFactor = 0.8;
    }

    if (aiEmotion === "upset" || aiEmotion === "frustrated") {
        seenDelay = 3000 + Math.random() * 3000;   // 3-6s (sulking)
        readDelay = 1500 + Math.random() * 2000;    // 1.5-3.5s
        delayFactor = 1.8;
    }

    if (aiEmotion === "angry" || aiSentimentScore < -1.5) {
        seenDelay = 5000 + Math.random() * 3000;   // 5-8s (very upset)
        readDelay = 2000 + Math.random() * 2000;    // 2-4s
        delayFactor = 2.5;
    }

    if (aiEmotion === "worried" || aiEmotion === "tender") {
        seenDelay = 800 + Math.random() * 800;     // 0.8-1.6s (alert, caring)
        readDelay = 200 + Math.random() * 400;      // 0.2-0.6s
        delayFactor = 0.9;
    }

    if (aiEmotion === "shy" || aiEmotion === "flirty") {
        seenDelay = 2000 + Math.random() * 2000;   // 2-4s (Hesitant / processing feelings)
        readDelay = 800 + Math.random() * 1200;     // 0.8-2s
        delayFactor = 1.3;
    }

    // User emotion affects AI timing too
    if (["angry", "upset", "frustrated"].includes(userEmotion)) {
        seenDelay = Math.max(seenDelay, 4000 + Math.random() * 4000); // 4-8s minimum
    }

    // Intensity amplifies delays
    const intensityMultiplier = 0.7 + (aiIntensity * 0.6); // 0.7 - 1.3
    seenDelay *= intensityMultiplier;
    readDelay *= intensityMultiplier;

    return {
        seenDelay: Math.round(seenDelay),
        readDelay: Math.round(readDelay),
        delayFactor,
    };
}

// ─── Main Heart Processing ──────────────────────────────────────────────────

export interface HeartInput {
    message: string;
    characterName: string;
    characterPersonality: string;
    history: { role: string; content: string }[];
    userId: string;
    characterId: string;
    aiResponseText?: string; // If available, used for AI sentiment
}

/**
 * Process the heart state for a given message.
 * This is the main entry point for the Heart module.
 * 
 * It DOES NOT make any LLM calls — purely local computation.
 */
export function processHeart(input: HeartInput): HeartState {
    const { message, characterPersonality, history, userId, characterId } = input;

    // 1. Analyze personality traits
    const traits = analyzePersonalityTraits(characterPersonality);

    // 2. Get emotional memory for this user-character pair
    const memory = getEmotionalMemory(userId, characterId);

    // 3. Detect user's emotion
    const { emotion: userEmotion, intensity: userIntensity } = detectUserEmotion(message, history);

    // 4. Evolve AI's emotional state
    const { emotion: aiEmotion, intensity: aiIntensity, isSuppressing } = evolveAiEmotion(
        userEmotion, userIntensity, traits, memory
    );

    // 5. Compute relationship level
    const relationship = computeRelationship(memory);

    // 6. Update emotional memory
    const sentimentResult = sentimentAnalyzer.analyze(message.toLowerCase());
    const moodDelta = sentimentResult.comparative * 0.1; // Gentle shift
    memory.moodAverage = Math.max(-1, Math.min(1, memory.moodAverage * 0.9 + moodDelta));
    memory.interactionCount++;
    memory.lastInteractionTime = Date.now();
    memory.lastAiEmotion = aiEmotion;
    memory.lastIntensity = aiIntensity;

    // Update emotion streaks
    if (sentimentResult.comparative > 0.3) {
        memory.positiveStreak++;
        memory.negativeStreak = 0;
    } else if (sentimentResult.comparative < -0.3) {
        memory.negativeStreak++;
        memory.positiveStreak = 0;
    }

    // Keep recent emotions (sliding window of 10)
    memory.recentEmotions.push(userEmotion);
    if (memory.recentEmotions.length > 10) memory.recentEmotions.shift();

    // 7. Generate mood shift narrative
    let moodShift = "";
    if (userEmotion !== "neutral") {
        if (traits.isTsundere && isSuppressing) {
            moodShift = `User seems ${userEmotion}. I notice it but I won't show that I care... not directly.`;
        } else if (traits.isWarm) {
            moodShift = `User seems ${userEmotion}. I feel ${aiEmotion} — I want to make them feel better.`;
        } else if (traits.isCold) {
            moodShift = `User seems ${userEmotion}. I acknowledge it internally but won't overreact.`;
        } else {
            moodShift = `User seems ${userEmotion}. I'm feeling ${aiEmotion} about this.`;
        }
    }

    // 8. Determine comfort need — only trigger for STRONG negative emotions
    // (too-low threshold causes excessive comfort follow-up API calls → TPM exhaustion)
    const comfortNeeded = ["angry", "upset", "sad", "frustrated", "lonely"].includes(userEmotion)
        && userIntensity > 0.65;

    console.log(`[Heart] ❤️ User: ${userEmotion}(${userIntensity.toFixed(2)}) → AI: ${aiEmotion}(${aiIntensity.toFixed(2)}) | Relationship: ${relationship} | Mood: ${memory.moodAverage.toFixed(2)} | Suppress: ${isSuppressing}`);

    return {
        currentEmotion: aiEmotion,
        intensity: aiIntensity,
        emotionTowardUser: aiEmotion,
        relationshipFeeling: relationship,
        userEmotion,
        userEmotionIntensity: userIntensity,
        moodInertia: memory.moodAverage,
        isSuppressingFeelings: isSuppressing,
        moodShift,
        comfortNeeded,
    };
}
