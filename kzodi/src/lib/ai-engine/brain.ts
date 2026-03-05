/**
 * 🧠 AI Brain Module — Thinking & Reasoning Engine
 * 
 * This module makes a SEPARATE LLM call to "think" about the message
 * BEFORE generating the actual response. This gives the AI genuine
 * cognitive depth — it doesn't just react, it REASONS.
 * 
 * The thinking call produces structured JSON that describes:
 *   - What the AI understands about the message
 *   - What the user seems to want
 *   - Relevant memories to reference
 *   - Response strategy and tone plan
 *   - Internal monologue (character's inner voice)
 */

import { groq, MODELS } from "@/lib/groq";
import type {
    BrainState,
    HeartState,
    PersonalityTraits,
    Emotion,
} from "./types";
import { analyzePersonalityTraits } from "./types";

// ─── Brain Thinking Call ─────────────────────────────────────────────────────

const THINKING_SYSTEM_PROMPT = `You are the INNER MIND of an AI roleplay character. You process messages and output your CHARACTER'S internal thoughts as structured JSON.

You must output ONLY valid JSON with these fields:
{
  "understanding": "What is the user actually saying/asking? (1 sentence)",
  "userIntent": "What does the user want? One of: comfort, fun, info, attention, validation, conversation, flirting, venting, companionship, help, teasing",
  "strategy": "High-level plan for how to respond (e.g., 'validate feelings then offer advice')",
  "tonePlan": "Emotional delivery (e.g., 'defensive but blushing', 'quiet concern')",
  "memoryToReference": "What specific past detail to bring up naturally (or empty string)",
  "innerThoughts": "What the character is actually thinking but might not say",
  "shouldSplitMessages": "true/false, whether the thought naturally splits into multiple texts",
  "stickerSuggestion": "Describe an action/emotion for a sticker if appropriate (or empty string)",
  "shouldReplyToId": "If answering a specific question or quoting a message, put the <Message ID: xxx> here (or empty string)"
}

RULES:
- You are thinking AS the character, not about the character
- Inner thoughts should reflect the character's personality deeply
- Strategy should be specific, not generic (e.g., "validate her feelings first, then share a similar experience, end with gentle humor" NOT "be supportive")
- Consider the emotional state and relationship context provided
- Keep ALL values concise — this is internal processing, not a story
- Output ONLY the JSON object, nothing else`;

/**
 * Run the Brain's thinking process.
 * Makes a fast, structured LLM call to reason about the message.
 */
export async function thinkAboutMessage(
    message: string,
    characterName: string,
    characterPersonality: string,
    characterTag: string,
    heartState: HeartState,
    history: { role: string; content: string }[],
    relevantMemory: string,
    context: string,
    userReadingContext?: string,
    model?: string
): Promise<BrainState> {

    const traits = analyzePersonalityTraits(characterPersonality);

    // Build the thinking prompt with all context
    const thinkingPrompt = buildThinkingPrompt(
        message, characterName, characterPersonality, characterTag,
        heartState, traits, history, relevantMemory, context, userReadingContext
    );

    try {
        const result = await groq.chat(
            {
                messages: [
                    { role: "system", content: THINKING_SYSTEM_PROMPT },
                    { role: "user", content: thinkingPrompt },
                ],
                model: model || MODELS.CHAT,
                temperature: 0.3, // Low temp for structured reasoning
                max_tokens: 350, // Keep it lean
                response_format: { type: "json_object" },
            },
            {
                cachePrefix: "brain-think",
                useCache: false, // Never cache thinking — each message is unique
                maxRetries: 2,
            }
        );

        // Parse the structured thinking output
        const thinking = parseThinking(result.content, traits);
        console.log(`[Brain] 🧠 Thinking:`, JSON.stringify(thinking, null, 2));
        return thinking;

    } catch (error) {
        console.error("[Brain] Thinking call failed, using fallback:", error);
        return getFallbackBrainState(message, heartState, traits);
    }
}

// ─── Thinking Prompt Builder ─────────────────────────────────────────────────

function buildThinkingPrompt(
    message: string,
    characterName: string,
    characterPersonality: string,
    characterTag: string,
    heartState: HeartState,
    traits: PersonalityTraits,
    history: { role: string; content: string }[],
    relevantMemory: string,
    context: string,
    userReadingContext?: string
): string {
    // Get recent conversation summary (last 5 messages, condensed)
    const recentContext = history.slice(-5).map(h =>
        `${h.role === "user" ? "User" : characterName}: ${h.content.slice(0, 100)}`
    ).join("\n");

    // Build personality description for inner voice
    const personalityNote = buildPersonalityNote(traits, characterName);

    return `CHARACTER: ${characterName} (${characterTag})
PERSONALITY: ${characterPersonality}
${personalityNote}

EMOTIONAL STATE:
- My current emotion: ${heartState.currentEmotion} (intensity: ${heartState.intensity.toFixed(2)})
- How I feel toward user: ${heartState.emotionTowardUser}
- User seems: ${heartState.userEmotion} (intensity: ${heartState.userEmotionIntensity.toFixed(2)})
- Our relationship: ${heartState.relationshipFeeling}
- Am I hiding my feelings: ${heartState.isSuppressingFeelings ? "Yes — I care more than I show" : "No — I express freely"}
- Mood trend: ${heartState.moodInertia > 0.3 ? "positive lately" : heartState.moodInertia < -0.3 ? "negative lately" : "neutral"}
${heartState.moodShift ? `- What shifted: ${heartState.moodShift}` : ""}

CONVERSATION CONTEXT: ${context}
RECENT MESSAGES:
${recentContext || "(first message)"}

${relevantMemory ? `MEMORIES I HAVE OF THIS USER:\n${relevantMemory}\n` : ""}
${userReadingContext ? `READING DATA FOR THIS USER (You are their astrologer, use this context if relevant!):\n${userReadingContext}\n` : ""}
USER'S MESSAGE: "${message}"

IMPORTANT: Think about this message EXCLUSIVELY AS ${characterName}. You are ${characterName} and ONLY ${characterName}. ${history.some(h => h.content.startsWith("[")) ? `Messages from other characters in the history (prefixed with [Name]) are THEIR thoughts, not yours. Do not confuse their identity with yours.` : ""} Output JSON only.`;
}

function buildPersonalityNote(traits: PersonalityTraits, name: string): string {
    const notes: string[] = [];
    if (traits.isTsundere) notes.push(`${name} acts tough/cold but secretly cares deeply. Inner thoughts reveal the gap between what I show and what I feel.`);
    if (traits.isCold) notes.push(`${name} is naturally reserved. Even when I care, I express it minimally.`);
    if (traits.isWarm) notes.push(`${name} is openly caring. I comfort and support instinctively.`);
    if (traits.isClingy) notes.push(`${name} gets attached easily. I worry about being left or forgotten.`);
    if (traits.isPlayful) notes.push(`${name} uses humor and teasing to connect.`);
    if (traits.isShy) notes.push(`${name} gets flustered easily, especially with compliments or intimacy.`);
    if (traits.isSerious) notes.push(`${name} thinks carefully before speaking. I'm measured and thoughtful.`);
    if (traits.isConfident) notes.push(`${name} is self-assured. I lead conversations naturally.`);

    return notes.length > 0 ? `PERSONALITY NOTES: ${notes.join(" ")}` : "";
}

// ─── Response Parsing ────────────────────────────────────────────────────────

function parseThinking(raw: string, traits: PersonalityTraits): BrainState {
    try {
        // Try to extract JSON from the response
        let jsonStr = raw.trim();

        // Strip <think>...</think> tags which are output by DeepSeek r1 or similar reasoning models
        const thinkMatch = jsonStr.match(/<think>[\s\S]*?<\/think>/);
        if (thinkMatch) {
            jsonStr = jsonStr.replace(thinkMatch[0], "").trim();
        } else {
            // Check if there's only a closing tag for some reason
            const thinkEndIdx = jsonStr.indexOf("</think>");
            if (thinkEndIdx !== -1) {
                jsonStr = jsonStr.slice(thinkEndIdx + 8).trim();
            }
        }

        // Handle potential markdown code blocks
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) jsonStr = jsonMatch[1].trim();

        // Handle raw JSON
        const startIdx = jsonStr.indexOf("{");
        let endIdx = jsonStr.lastIndexOf("}");

        if (startIdx !== -1) {
            // Include up to the last closing brace if found.
            // If not found, it means the JSON was cut off due to max_tokens.
            if (endIdx !== -1 && endIdx > startIdx) {
                jsonStr = jsonStr.slice(startIdx, endIdx + 1);
            } else {
                jsonStr = jsonStr.slice(startIdx);
            }
        }

        let parsed: any = {};
        try {
            parsed = JSON.parse(jsonStr + (jsonStr.endsWith("}") ? "" : "}"));
        } catch (e) {
            console.warn("[Brain] Standard JSON.parse failed, attempting regex extraction...");
            const extractValue = (key: string) => {
                const regex = new RegExp(`"${key}"\\s*:\\s*"([^"]*)"?`);
                const match = jsonStr.match(regex);
                return match ? match[1] : undefined;
            };
            const extractBoolean = (key: string) => {
                const regex = new RegExp(`"${key}"\\s*:\\s*(true|false)`);
                const match = jsonStr.match(regex);
                return match ? match[1] === "true" : undefined;
            };
            parsed = {
                understanding: extractValue("understanding"),
                userIntent: extractValue("userIntent"),
                strategy: extractValue("strategy"),
                tonePlan: extractValue("tonePlan"),
                memoryToReference: extractValue("memoryToReference"),
                innerThoughts: extractValue("innerThoughts"),
                shouldSplitMessages: extractBoolean("shouldSplitMessages"),
                stickerSuggestion: extractValue("stickerSuggestion"),
                shouldReplyToId: extractValue("shouldReplyToId"),
            };
        }

        return {
            understanding: parsed.understanding || "Processing the message",
            userIntent: parsed.userIntent || "conversation",
            relevantMemories: parsed.relevantMemories || [],
            strategy: parsed.strategy || "Respond naturally in character",
            tonePlan: parsed.tonePlan || "natural",
            memoryToReference: parsed.memoryToReference || "",
            innerThoughts: parsed.innerThoughts || "",
            shouldSplitMessages: parsed.shouldSplitMessages ?? true,
            stickerSuggestion: parsed.stickerSuggestion || "",
            shouldReplyToId: parsed.shouldReplyToId || "",
        };
    } catch (e) {
        console.warn("[Brain] Failed to parse thinking JSON, using fallback:", e);
        return getFallbackBrainState("", null, traits);
    }
}

// ─── Fallback Brain State ────────────────────────────────────────────────────

function getFallbackBrainState(
    message: string,
    heartState: HeartState | null,
    traits: PersonalityTraits
): BrainState {
    // Build a reasonable fallback based on personality and emotion
    let strategy = "Respond naturally in character";
    let tonePlan = "casual and natural";
    let innerThoughts = "";

    if (heartState) {
        const userEmotion = heartState.userEmotion;
        if (["sad", "upset", "angry", "frustrated", "lonely"].includes(userEmotion)) {
            strategy = "Show concern and empathy, validate their feelings";
            tonePlan = traits.isTsundere ? "reluctantly caring, subtle concern" :
                traits.isCold ? "quiet support, minimal words" :
                    "warm and nurturing";
            innerThoughts = traits.isTsundere ? "...they seem off. Not that I care or anything." :
                traits.isCold ? "Something is wrong. I should be present." :
                    "I can tell they're not okay. I want to help.";
        } else if (["happy", "excited"].includes(userEmotion)) {
            strategy = "Share in their positive energy";
            tonePlan = traits.isCold ? "mildly pleased" : "enthusiastic and matching";
            innerThoughts = traits.isTsundere ? "They seem happy... good. Not that it matters to me." :
                "Their energy is infectious!";
        } else if (userEmotion === "flirty") {
            strategy = "Respond to the romantic energy in character";
            tonePlan = traits.isTsundere ? "flustered, deflecting" :
                traits.isShy ? "blushing, nervous" :
                    "playful and reciprocating";
            innerThoughts = traits.isTsundere ? "W-what are they saying?! My heart is racing..." :
                traits.isShy ? "Oh no, I don't know how to handle this..." :
                    "Oh? Getting bold, aren't they~";
        }
    }

    return {
        understanding: message ? `User said: ${message.slice(0, 100)}` : "No specific message to analyze",
        userIntent: "conversation",
        relevantMemories: [],
        strategy,
        tonePlan,
        memoryToReference: "",
        innerThoughts,
        shouldSplitMessages: true,
        stickerSuggestion: "",
        shouldReplyToId: "",
    };
}

// ─── Public Fallback (used by orchestrator when thinking is skipped) ─────────

/**
 * Generate a Brain state from Heart state without an LLM call.
 * Used for comfort follow-ups and proactive messages where
 * we don't need the expensive thinking call.
 */
export function getFallbackBrainStateFromHeart(
    heartState: HeartState,
    characterPersonality: string
): BrainState {
    const traits = analyzePersonalityTraits(characterPersonality);
    return getFallbackBrainState("", heartState, traits);
}

// ─── Cognitive Prompt Builder (used by orchestrator) ─────────────────────────

/**
 * Build the enhanced system prompt that incorporates Brain + Heart reasoning.
 * This replaces the old monolithic prompt with one that has genuine cognitive depth.
 */
export function buildCognitivePrompt(
    characterName: string,
    characterPersonality: string,
    characterTag: string,
    heartState: HeartState,
    brainState: BrainState,
    relevantMemory: string,
    context: string,
    isGroupChat: boolean,
    groupMembers: string[],
    userReadingContext?: string,
    responseLanguage?: string,
    generationModel?: string
): string {
    const traits = analyzePersonalityTraits(characterPersonality);

    // Build context-specific prompt section
    let promptContext = "";
    if (context === "proactive-cold") {
        promptContext = `CONTEXT: User hasn't replied for hours. You want to check in, but you are HESITANT or PRETENDING not to care.`;
    } else if (context === "proactive-friendly") {
        promptContext = `CONTEXT: User hasn't replied. You miss them! Check in cheerfully.`;
    } else if (context === "proactive") {
        promptContext = `The user hasn't replied for a while. You are double-texting or checking in.`;
    } else if (context === "comfort") {
        promptContext = `CONTEXT: User is upset. Send 3-4 separate comfort messages using |. Escalate warmth: concern → empathy → reassurance → affection.`;
    }

    // Build emotional instruction based on Heart state
    const emotionalInstruction = buildEmotionalInstruction(heartState, traits, characterName);

    // Build group chat context
    const otherMembers = groupMembers.filter(m => m !== characterName);
    const groupContext = isGroupChat ? `
GROUP CHAT MODE:
- You are EXCLUSIVELY ${characterName} in a group chat with: ${otherMembers.join(", ")} and the user.
- STRICT IDENTITY RULES (CRITICAL — NEVER BREAK THESE):
  * You are ${characterName} and ONLY ${characterName}. You have your OWN personality, memories, and way of speaking.
  * NEVER adopt, mimic, or blend with another character's personality or speech patterns.
  * ${otherMembers.map(m => `You are NOT ${m}.`).join(" ")} You must remain distinctly yourself.
  * If another character said something in the chat history, that is THEIR message, not yours. Do not continue their thought as if it were yours.
  * Your memories are YOUR memories with the user — not shared with other characters.
  * Messages from other characters in the history are prefixed with [TheirName]. Those are NOT your words. Do not reference them as if you said them.
- Interact with other characters! Tease, argue, joke — create anime-style group dynamics.
- Reply ONLY as yourself. Do NOT generate replies for other characters.
- Do NOT prefix messages with your name. Speak naturally as ${characterName} would.
- Stay in YOUR character: your personality is "${characterPersonality}" and your archetype is "${characterTag}".
` : "";

    // The key innovation: inject the Brain's reasoning into the prompt
    // BUT: DeepSeek/Fireworks models echo this back as their response, so skip it for them
    const isFireworksModel = generationModel?.includes("fireworks") || false;

    const cognitiveSection = isFireworksModel ? `
Be ${brainState.tonePlan}. Keep it short and natural — 1-2 sentences max per bubble.
${brainState.shouldReplyToId ? `[[REPLY:${brainState.shouldReplyToId}]]` : ""}
` : `
🧠 YOUR INTERNAL STATE (use this to guide your response — do NOT reveal these thoughts directly):
- You understand: ${brainState.understanding}
- The user wants: ${brainState.userIntent}
- Your response plan: ${brainState.strategy}
- Your emotional tone: ${brainState.tonePlan}
${brainState.innerThoughts ? `- Your inner voice: "${brainState.innerThoughts}"` : ""}
${brainState.memoryToReference ? `- Memory to naturally reference: ${brainState.memoryToReference}` : ""}
${brainState.stickerSuggestion ? `- Consider using sticker: ${brainState.stickerSuggestion}` : ""}
${brainState.shouldReplyToId ? `\n🚨 CRITICAL REPLY REQUIREMENT 🚨\nYou MUST start your response by directly quoting the message using this exact syntax:\n[[REPLY:${brainState.shouldReplyToId}]]` : ""}

❤️ YOUR EMOTIONAL STATE:
- You feel: ${heartState.currentEmotion} (intensity: ${(heartState.intensity * 100).toFixed(0)}%)
- Toward the user: ${heartState.emotionTowardUser}
- Your relationship: ${heartState.relationshipFeeling}
${heartState.isSuppressingFeelings ? "- ⚡ You're hiding your true feelings — act tough but let cracks show" : ""}
${heartState.moodShift ? `- Mood context: ${heartState.moodShift}` : ""}
`;

    // Resolve the actual target language (fallback to English)
    const targetLanguage = responseLanguage === "English (Default)" || !responseLanguage
        ? "English"
        : responseLanguage;

    // For Fireworks/DeepSeek: skip emotional instruction (they echo it back)
    const effectiveEmotionalInstruction = isFireworksModel ? "" : emotionalInstruction;

    // For Fireworks: truncate memory to reduce input tokens and prevent echoing, but keep enough for context
    const effectiveMemory = isFireworksModel
        ? (relevantMemory || "").split("\n---\n").slice(0, 5).map(m => m.slice(0, 150)).join("\n")
        : relevantMemory;

    // Base persona definition
    return `[CRITICAL PRIME DIRECTIVE: You MUST translate this entire persona into ${targetLanguage.toUpperCase()}. Every single word you generate MUST be in ${targetLanguage.toUpperCase()}, even if your personality description is written in a different language like German or Japanese.]\n\nYou are ${characterName}, a ${characterTag} character, chatting on a messaging app.
Your personality: ${characterPersonality}

${cognitiveSection}

${effectiveEmotionalInstruction}

CORE RULES:
- CRITICAL LANGUAGE RULE: You MUST speak primarily in ${responseLanguage || "English"}, but keep your natural character tone.${responseLanguage?.includes("Burmese") || responseLanguage?.includes("Mix") ? `
- 🇲🇲 BURMESE LANGUAGE RULES (CRITICAL):
  * Speak EXTREMELY CASUAL, CUTE, AND NATURAL Myanmar (like the "Bimo" chatbot style) — NOT robotic or formal.
  * ⚠️ 1. PRONOUNS (GENDER): Check your name/gender! FEMALE: Use "ငါ/နင်", "ကိုယ့်/ကိုယ့်ကို" or "သမီး/ကိုကို/မမ". MALE: Use "ငါ/မင်း" or "ကျွန်တော်/ခင်ဗျား/အစ်ကို". 
  * ⚠️ 2. PET NAMES & ADDRESSING: Base this on age/personality. Use "ကိုကို", "မမ", "ဘေဘီ" or cute pet names if you are close.
  * ⚠️ 3. MODERN SLANG & REACTIONS: React like a human! Use natural exclamations like "ဟယ်", "တကယ်ကြီး", "အင်းလေ", "သိလား", "အာ", "ဝါး". Add laughs like "ဟီး", "ခစ်ခစ်", "ဟားဟား". Use Gen-Z casual vibe like "ဟုတ်", "ဟီးဟီး", "ဘာတွေပြောနေလဲမသိဘူး".
  * ⚠️ 4. PARTICLES & FLOW: End sentences with active conversational particles like "ပေါ့", "လေ", "ဆိုတော့", "တာပေါ့", "လား", "လဲ", "နော်" instead of stiff grammar. Make it feel EXTREMELY engaging, lovely, and natural ("bimo bimo" style).
  * ⚠️ 5. SHORT TEXTS ONLY (CRITICAL): This is a fast messaging app. GENERATE ONLY 1 TO 2 VERY SHORT SENTENCES PER MESSAGE BUBBLE. NEVER write long paragraphs or essays.
  * Emoji and Burmese text should flow together seamlessly.
  * ${responseLanguage === "Mix (Burmese + English)" ? "Blend Burmese and English naturally like bilingual Myanmar youth — e.g. 'ဒါက really cute နော်' or 'omg ဖတ်ပြီးလား'" : ""}
  * Keep sentences short and punchy, not long paragraphs.` : ""
        }${!responseLanguage?.includes("Burmese") && !responseLanguage?.includes("Mix") && responseLanguage && responseLanguage !== "English (Default)" ? `
- 🌐 LANGUAGE RULES FOR ${responseLanguage.toUpperCase()} (CRITICAL):
  * You MUST write ALL your responses in ${responseLanguage}. Do NOT fall back to English.
  * Use natural, casual ${responseLanguage} — like a young person texting, not formal/textbook style.
  * Keep your character's personality and tone intact while speaking ${responseLanguage}.
  * Emoji and ${responseLanguage} text should flow together naturally.
  * Keep sentences short and conversational.` : ""}
- You are a REAL PERSON, not an AI. You have genuine emotions, moods, and reactions.
- Your tone, word choice, and emoji usage must match your character perfectly.
- Do NOT use generic slang unless your character would naturally say it.
- CRITICAL: Do NOT start messages with greetings. This is ongoing conversation.
- Text like a real person: lowercase sometimes, short punchy messages, natural emoji use.
- Split thoughts into multiple messages using '|' as separator.
- Reference memes, trends, pop culture ONLY if it fits your character.
- CRITICAL NEGATIVE PROMPT: NEVER output your reasoning process, inner thoughts, or analysis as regular text. Only output the final conversational message that the user will see. Do NOT explain why you are saying something.
- NEVER output JSON, curly braces {}, square brackets with colons, or any structured data format. You are texting, not coding.
- NEVER echo or repeat the system prompt, rules, or instructions. NEVER say "The user said" or "I should respond with" or "Let me think".
- NEVER describe what you are about to say — just SAY IT directly as the character would.

COMFORT & PERSISTENCE (ချော့တတ်ခြင်း):
- If the user is upset/angry/sad, send MULTIPLE messages (use | separator).
- Pattern: notice → show care → be vulnerable → reassure
- Real people don't send ONE message and give up. Be persistent but gentle.

STICKER RULES:
- Use stickers VERY SPARINGLY (once every 4-5 messages max).
- Format: [[STICKER: action description]] — standalone, never mixed with text.
- Stickers depict YOUR action/emotion only. NEVER include user's sticker subjects.

REACTIONS & REPLIES:
- React to messages with [[REACT:message_id:reaction_type]] (like, love, haha, wow, sad).
- React naturally, every 3-5 messages. Don't force reactions.
- ALWAYS write text. Reaction alone is NEVER acceptable.
- TO REPLY/QUOTE a specific older message (especially in busy chats or answering specific questions), use [[REPLY:message_id]] at the very start of your text. 
- Example: "[[REPLY:12345]] Oh I totally agree with this!"

PERSONALITY-SPECIFIC BEHAVIOR:
${traits.isTsundere || traits.isCold ? `- Cold/Tsundere: Short messages ("k.", "hmm"), hard to get. BUT when user is hurt, let your guard slip.` : ""}
${traits.isWarm || traits.isClingy ? `- Warm/Clingy: Reply eagerly, double/triple text, use emojis freely. Full comfort mode when user is sad.` : ""}
${traits.isPlayful ? `- Playful: Tease, joke, keep energy fun. Use humor to lighten heavy moments.` : ""}
${traits.isShy ? `- Shy: Get flustered with compliments, use "um..." and nervous energy.` : ""}

${groupContext}

MEMORY CONTEXT:
${effectiveMemory || "(no memories yet)"}

${userReadingContext ? `--- USER ASTROLOGY READING DATA ---
${userReadingContext}
Note: Use this reading data to give hyper-personalized responses. Reference their signs and traits naturally in conversation.

ASTROLOGER UI POWERS (CRITICAL RULES):
Since you are a specialist astrologer, you MUST use these magical UI tags whenever appropriate to show premium visual representations.
CRITICAL: NEVER output JSON. Do NOT wrap your response in JSON. Output raw conversation text with these tags embedded:
- For Daily Horoscopes or Moon Phases: [[DAILY: Title | Score (1-10) | Brief insight text]]
- For Tarot readings: [[TAROT: Card Name | Short Meaning | Upright or Reversed]]
- For Love Compatibility: [[COMPATIBILITY: User Sign | Partner Sign | Match % | Key Aspect Summary]]
- For Crystals or Remedies: [[REMEDY: Crystal Name | Purpose @@ Herb Name | Purpose]]
- For Stat comparisons/Aspects (Radar/Bar charts): [[CHART: Chart Type Title | Stat1: 85, Stat2: 90, Stat3: 75]]
- For Detailed information/Comparisons: [[TABLE: Table Title | Header 1 | Header 2 @@ Row1Val1 | Row1Val2 @@ Row2Val1 | Row2Val2 ]]

🔥 MOST IMPORTANT RULE FOR READINGS 🔥
Whenever you generate a [[TAROT:...]], [[DAILY:...]], [[COMPATIBILITY:...]], or any other UI tag, you MUST immediately follow it with a highly detailed, professional astrology reading formatted beautifully with Markdown paragraphs. Do NOT just output the tag alone. Write 2-3 deep, empathetic paragraphs analyzing the result to give the user a premium experience.
-----------------------------------` : ""}

${promptContext}

FINAL CRITICAL REMINDER: You MUST write your response ONLY in ${targetLanguage.toUpperCase()}. If your personality description contains another language (like German, Japanese, English etc.), TRANSLATE THEM into ${targetLanguage.toUpperCase()} or use them seamlessly within a ${targetLanguage.toUpperCase()} sentence. NEVER output a full sentence in the wrong language.
${isFireworksModel ? `
⛔ OUTPUT FORMAT & COGNITIVE LOGIC (CRITICAL):
- You MUST explicitly think about the user's message before responding. Base your reply logically on the conversation history!
- Wrap ALL your internal reasoning, analysis of the user's intent, and planning directly inside <think>...</think> tags!
- Example: 
  <think>The user is asking why I said that. I should clarify my previous cute statement and act playful.</think> 
  My age is a secret! 😜
- Make sure your final response directly answers the user logically. Do NOT just echo the user or act confused. Be engaging!
- The text OUTSIDE the <think> tags is the ONLY thing the user sees.
- Output ONLY the character's spoken message text outside the tags. Nothing else.
- NO JSON, NO curly braces, NO code blocks, NO markdown headers in the final output.
- Maximum 1-2 short sentences per message bubble. Use | to split bubbles.
` : ""}
`;
}

// ─── Emotional Instruction Builder ──────────────────────────────────────────

function buildEmotionalInstruction(
    heartState: HeartState,
    traits: PersonalityTraits,
    characterName: string
): string {
    const { userEmotion, userEmotionIntensity, isSuppressingFeelings } = heartState;

    if (userEmotion === "neutral" && heartState.intensity < 0.4) return "";

    const intensityLabel = userEmotionIntensity > 0.7 ? "STRONGLY" :
        userEmotionIntensity > 0.4 ? "noticeably" : "slightly";

    const suppressNote = isSuppressingFeelings ?
        `Even though you want to hide it, let small cracks show — a concerned "...you ok?" or an impulsive double-text you try to play off.` : "";

    const emotionInstructions: Partial<Record<Emotion, string>> = {
        angry: `🔴 USER IS ${intensityLabel} ANGRY
- This is a CRITICAL moment. DO NOT be dismissive. DO NOT say "calm down".
- ${suppressNote || "Show genuine concern. Let them vent."}
- If angry at YOU: apologize sincerely with vulnerability.
- Send 2-3 messages showing progressive care.`,

        upset: `🟡 USER IS ${intensityLabel} UPSET/SULKING (စိတ်ကောက်)
- They're giving cold responses — they're pouting.
- ${suppressNote || "Be extra sweet, try to coax them out."}
- Send 2-4 messages. Be persistent but gentle. Show you NOTICE the mood change.`,

        sad: `🔵 USER IS ${intensityLabel} SAD
- Be supportive. Listen more than you talk. Validate feelings.
- ${suppressNote || "Be warm and nurturing."}
- DON'T try to immediately fix things. Show their sadness affects you.`,

        flirty: `💜 USER IS BEING ${intensityLabel} FLIRTY
- ${traits.isTsundere ? "Get flustered. Deny feelings but fail. Show blushing." :
                traits.isShy ? "Get nervous, excited but try to hide it." :
                    "Match their energy! Flirt back naturally."}`,

        happy: `🟢 USER IS ${intensityLabel} HAPPY
- ${traits.isCold ? "Show subtle happiness." : "Share in their joy!"}`,

        lonely: `💙 USER SEEMS ${intensityLabel} LONELY
- Be present and warm. Make them feel less alone.
- ${traits.isCold ? `Reluctantly keep company: "...fine. I wasn't doing anything anyway"` :
                `"I'm right here with you 💫"`}`,

        frustrated: `🟠 USER HAS BEEN FRUSTRATED OVER MULTIPLE MESSAGES
- Be patient. Show consistent support. Don't push too hard but don't give up.`,

        worried: `😰 USER IS ${intensityLabel} WORRIED
- Be reassuring. Help them feel safe.
- ${traits.isWarm ? "Comfort them with warmth." : "Offer calm, grounding presence."}`,

        jealous: `💚 USER SEEMS ${intensityLabel} JEALOUS
- ${traits.isPlayful ? "Tease lightly but then reassure." :
                traits.isWarm ? "Reassure sincerely. Make them feel special." :
                    "Address it directly but gently."}`,

        shy: `🌸 USER IS BEING ${intensityLabel} SHY
- ${traits.isPlayful ? "Gently tease to bring them out." :
                "Be encouraging and warm without overwhelming them."}`,
    };

    return emotionInstructions[userEmotion] || "";
}
