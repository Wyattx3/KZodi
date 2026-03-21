/**
 * AI Engine — Shared Types
 * 
 * Types for the Brain (thinking/reasoning) and Heart (emotion/personality) modules.
 */

// ─── Heart Types ─────────────────────────────────────────────────────────────

export type Emotion =
    | "neutral" | "happy" | "sad" | "angry" | "excited"
    | "flirty" | "confused" | "upset" | "lonely" | "frustrated"
    | "worried" | "jealous" | "shy" | "playful" | "nostalgic"
    | "guilty" | "relieved" | "bored" | "tender";

export type RelationshipLevel = "stranger" | "acquaintance" | "friend" | "close_friend" | "crush" | "lover" | "soulmate";

export interface HeartState {
    /** AI's current primary emotion */
    currentEmotion: Emotion;
    /** Intensity of the emotion (0.0 - 1.0) */
    intensity: number;
    /** How the AI feels about the user specifically */
    emotionTowardUser: Emotion;
    /** Perceived relationship closeness */
    relationshipFeeling: RelationshipLevel;
    /** User's detected emotional state */
    userEmotion: Emotion;
    /** User emotion intensity */
    userEmotionIntensity: number;
    /** Emotional momentum: does the mood carry from recent messages? */
    moodInertia: number; // -1.0 (very negative carryover) to 1.0 (very positive)
    /** Whether the AI character is suppressing their true feelings (tsundere etc) */
    isSuppressingFeelings: boolean;
    /** Internal narrative about the emotional shift */
    moodShift: string;
    /** Comfort need level */
    comfortNeeded: boolean;
}

// ─── Brain Types ─────────────────────────────────────────────────────────────

export interface BrainState {
    /** What the AI understands about the user's message */
    understanding: string;
    /** What the user seems to want (comfort, fun, info, attention, validation, etc.) */
    userIntent: string;
    /** Relevant memories retrieved from RAG */
    relevantMemories: string[];
    /** The AI's planned response strategy */
    strategy: string;
    /** Planned emotional tone for the response */
    tonePlan: string;
    /** Should the AI reference any past memories? */
    memoryToReference: string;
    /** Internal monologue — what the character is "thinking" */
    innerThoughts: string;
    /** Whether the AI should send multiple messages */
    shouldSplitMessages: boolean;
    /** Whether to use a sticker */
    stickerSuggestion: string;
    /** The ID of the message to reply to, if any */
    shouldReplyToId: string;
}

// ─── Combined Cognitive State ────────────────────────────────────────────────

export interface CognitiveState {
    heart: HeartState;
    brain: BrainState;
    /** Timestamp of this cognitive snapshot */
    timestamp: number;
}

// ─── Engine Input/Output ─────────────────────────────────────────────────────

export interface EngineInput {
    /** User's message text */
    message: string;
    /** Character info */
    characterId: string;
    characterName: string;
    characterPersonality: string;
    characterTag: string;
    /** Conversation history */
    history: { id?: string; role: string; content: string; attachment?: { type: string; url: string } }[];
    /**
     * Context of the conversation (reply vs proactive vs reading etc.)
     */
    context: "reply" | "proactive" | "proactive-cold" | "proactive-friendly" | "comfort" | "reading";
    /** Group chat settings */
    isGroupChat: boolean;
    groupMembers: string[];
    /** RAG memory context */
    relevantMemory: string;
    /** Authenticated user ID */
    userId: string;
    /** Astrology reading context for astrologer characters */
    userReadingContext?: string;
    /** User's preferred response language */
    responseLanguage?: string;
    /** User's nickname */
    userNickname?: string;
    /** User's gender */
    userGender?: string;
    /** User's birthday */
    userBirthday?: string;
    /** Is the character an official one (no creatorId) */
    isOfficialCharacter?: boolean;
    /** Inter-character reaction cue for group chats (prompt-building only, never stored in memory) */
    groupCue?: string;
    /** Conversation type */
    conversationType?: "personal" | "group" | "story" | "world";
    /** Data for world building groups */
    worldData?: any;
    /** Data for story groups */
    storyData?: any;
}

export interface EngineOutput {
    /** The final AI reply text */
    reply: string;
    /** Action to take */
    action: "reply" | "ignore";
    /** Detected user emotion */
    detectedEmotion: Emotion;
    /** Whether comfort follow-up is needed */
    needsComfort: boolean;
    /** Typing delay multiplier */
    delayFactor: number;
    /** AI's own sentiment score */
    aiSentiment: number;
    /** Delay before "seen" appears (ms) */
    seenDelay: number;
    /** Delay before typing starts (ms) */
    readDelay: number;
    /** The cognitive state for debugging */
    cognitiveState: CognitiveState;
}

// ─── Personality Traits (for Heart's personality-aware processing) ───────────

export interface PersonalityTraits {
    isCold: boolean;
    isTsundere: boolean;
    isWarm: boolean;
    isClingy: boolean;
    isPlayful: boolean;
    isSerious: boolean;
    isShy: boolean;
    isConfident: boolean;
}

export function analyzePersonalityTraits(personality: string): PersonalityTraits {
    const p = personality.toLowerCase();
    return {
        isCold: /cold|stoic|aloof|distant|reserved|indifferent/i.test(p),
        isTsundere: /tsundere|tough.*(outside|exterior)|secretly.*(car|kind|sweet)|harsh.*gentle/i.test(p),
        isWarm: /warm|kind|gentle|caring|nurturing|sweet|loving|affectionate/i.test(p),
        isClingy: /clingy|needy|attached|possessive|dependent|obsessed/i.test(p),
        isPlayful: /playful|mischievous|teasing|witty|humorous|funny|sarcastic/i.test(p),
        isSerious: /serious|mature|composed|disciplined|strict|formal/i.test(p),
        isShy: /shy|timid|quiet|introverted|nervous|bashful/i.test(p),
        isConfident: /confident|bold|charismatic|outgoing|dominant|assertive/i.test(p),
    };
}
