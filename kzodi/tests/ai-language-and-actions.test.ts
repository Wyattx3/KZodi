import test from "node:test";
import assert from "node:assert/strict";
import { buildCognitivePrompt } from "../src/lib/ai-engine/brain";
import { buildRuntimeLanguageReminder, shouldGenerateDynamicIntro, shouldRepairResponseLanguage } from "../src/lib/ai-engine/language";
import { ensureVisibleReplyContent, hasVisibleReplyText } from "../src/lib/ai-engine/replyIntegrity";
import { getRoleplayModelPlan } from "../src/lib/ai-engine/routing";
import type { BrainState, HeartState } from "../src/lib/ai-engine/types";

const heartState: HeartState = {
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

const brainState: BrainState = {
    understanding: "The user is asking something direct.",
    userIntent: "conversation",
    relevantMemories: [],
    strategy: "Answer directly and stay in character.",
    tonePlan: "calm and in-character",
    memoryToReference: "",
    innerThoughts: "Stay consistent.",
    shouldSplitMessages: false,
    stickerSuggestion: "",
    shouldReplyToId: "",
};

test("Roleplay routes thinking and reply generation to unified Cloudflare models", () => {
    const englishPlan = getRoleplayModelPlan("English (Default)", "reply");
    const burmesePlan = getRoleplayModelPlan("Burmese (Unicode)", "reply");
    const mixPlan = getRoleplayModelPlan("Mix (Burmese + English)", "reply");

    assert.equal(englishPlan.generationModel, englishPlan.brainModel);
    assert.equal(burmesePlan.generationModel, burmesePlan.brainModel);
    assert.equal(mixPlan.generationModel, mixPlan.brainModel);
    assert.equal(burmesePlan.generationModel, englishPlan.generationModel);
    assert.equal(burmesePlan.fallbackModel, undefined);
    assert.equal(mixPlan.fallbackModel, undefined);
    assert.equal(englishPlan.fallbackModel, undefined);
});

test("buildCognitivePrompt keeps personality fixed across language switches", () => {
    const prompt = buildCognitivePrompt({
        characterName: "Minato",
        characterPersonality: "cold, proud, loyal once attached",
        characterTag: "Tsundere",
        heartState,
        brainState,
        relevantMemory: "",
        context: "reply",
        isGroupChat: false,
        groupMembers: [],
        userReadingContext: "",
        responseLanguage: "Burmese (Unicode)",
        generationModel: "moonshotai/kimi-k2-instruct-0905",
        userNickname: "",
        userGender: "",
        userBirthday: "",
        isOfficialCharacter: false,
        conversationType: "personal",
        worldData: undefined,
        storyData: undefined,
    });

    assert.match(prompt, /Your CHARACTER IDENTITY is fixed/i);
    assert.match(prompt, /Translate the words, not the personality/i);
    assert.match(prompt, /If the user types in English/i);
    assert.match(prompt, /ANSWER THE LATEST MESSAGE DIRECTLY/i);
});

test("reaction-only content is detected as missing visible reply text", () => {
    assert.equal(hasVisibleReplyText("[[REACT:123-user-abc:love]]"), false);
    assert.equal(hasVisibleReplyText("[[REACT:123-user-abc:love]] i mean it."), true);
});

test("ensureVisibleReplyContent adds fallback text after action-only replies", () => {
    assert.equal(
        ensureVisibleReplyContent("[[REACT:123-user-abc:love]]", "i mean it."),
        "[[REACT:123-user-abc:love]] i mean it.",
    );

    assert.equal(
        ensureVisibleReplyContent("[[STICKER: smiling shyly]]", "hey."),
        "[[STICKER: smiling shyly]] | hey.",
    );

    assert.equal(
        ensureVisibleReplyContent("[[REACT:123-user-abc:love]] already said it", "fallback"),
        "[[REACT:123-user-abc:love]] already said it",
    );
});

test("language repair detects English leakage when Myanmar reply mode is active", () => {
    assert.equal(shouldRepairResponseLanguage("Hey again, something on your mind?", "Burmese (Unicode)"), true);
    assert.equal(shouldRepairResponseLanguage("ဟုတ်တယ် နင်ဘာလုပ်နေတာလဲ", "Burmese (Unicode)"), false);
    assert.equal(shouldRepairResponseLanguage("ဒါက really cute နော်", "Mix (Burmese + English)"), false);
});

test("runtime language reminder forbids mirroring English input for Myanmar mode", () => {
    const reminder = buildRuntimeLanguageReminder("Burmese (Unicode)");

    assert.ok(reminder);
    assert.match(reminder || "", /do not mirror English/i);
    assert.match(reminder || "", /Myanmar language/i);
});

test("dynamic intro is generated for Myanmar mode so first messages honor the selected language", () => {
    assert.equal(shouldGenerateDynamicIntro("Burmese (Unicode)", "Hello there"), true);
    assert.equal(shouldGenerateDynamicIntro("English (Default)", "Hello there"), false);
    assert.equal(shouldGenerateDynamicIntro("English (Default)", ""), true);
});

test("buildCognitivePrompt regression test for anti-evasion and voice differentiation", () => {
    const prompt = buildCognitivePrompt({
        characterName: "TestChar",
        characterPersonality: "shrewd, cunning",
        characterTag: "Mastermind",
        characterExampleDialogue: "This is a test speech style.",
        heartState: {
            ...heartState,
            userEmotion: "lonely",
            userEmotionIntensity: 0.8
        },
        brainState,
        relevantMemory: "",
        context: "reply",
        isGroupChat: false,
        groupMembers: [],
        userReadingContext: "",
        responseLanguage: "English (Default)",
        generationModel: "test-model",
        userNickname: "",
        userGender: "",
        userBirthday: "",
        isOfficialCharacter: false,
        conversationType: "personal",
        worldData: undefined,
        storyData: undefined,
    });

    // Assert YOUR SPEECH STYLE with characterExampleDialogue is present
    assert.match(prompt, /YOUR SPEECH STYLE[^\n]*\nThis is a test speech style\./);

    // Assert HONESTY OVER PERSISTENCE section
    assert.match(prompt, /HONESTY OVER PERSISTENCE \(HIGHEST PRIORITY\):/);

    // Assert semantic/compliment-deflection no-repeat directives
    assert.match(prompt, /SEMANTIC REPETITION IS ALSO BANNED/);
    assert.match(prompt, /COMPLIMENT-AS-DEFLECTION IS BANNED/);

    // Assert old literal lonely phrases are not present
    assert.doesNotMatch(prompt, /\.\.\.fine\. I wasn't doing anything anyway/i);
    assert.doesNotMatch(prompt, /I'm right here with you/i);
});
