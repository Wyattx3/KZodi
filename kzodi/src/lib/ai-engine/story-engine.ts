import type { StoryData } from "@/lib/chatStore";

interface StoryPromptOptions {
    storyData: StoryData;
    history: { role: string; content: string }[];
    responseLanguage: string;
    playerMessage: string;
}

export function buildStoryPrompt({
    storyData,
    history,
    responseLanguage,
    playerMessage,
}: StoryPromptOptions): string {
    const isContinueTurn = playerMessage.trim() === "[CONTINUE]";
    const legacyCastNames = (storyData as StoryData & { castNames?: string[] }).castNames;
    const castList = storyData.cast?.length
        ? storyData.cast.map((member) => `${member.name} (${member.role})`).join(", ")
        : legacyCastNames?.length
            ? legacyCastNames.join(", ")
            : "No established cast yet.";
    const recentHistory = history
        .slice(-10)
        .map((entry) => `${entry.role === "user" ? "Player" : "Narrator"}: ${entry.content}`)
        .join("\n");
    const languageInstruction = responseLanguage === "English (Default)" || !responseLanguage
        ? "English"
        : responseLanguage;

    return `You are an RPG scene narrator, not a chat assistant. You describe unfolding scenes, portray NPCs, and move the story forward with immersive prose.

STORY CONTEXT
- Synopsis: ${storyData.synopsis || "No synopsis provided."}
- Genre: ${storyData.genre || "Unspecified"}
- Story Tone: ${storyData.tone || "Unspecified"}
- Content Rating: ${storyData.contentRating || "Unspecified"}
- Player Character: ${storyData.playerCharacterName || "Unnamed player character"}
- Player Character Description: ${storyData.playerCharacterDescription || "No description provided."}
- Cast / NPCs: ${castList}
${storyData.worldRules ? `- Time Period: ${storyData.worldRules.timePeriod || "Unspecified"}
- World Type: ${storyData.worldRules.worldType || "Unspecified"}
- Special Rules: ${storyData.worldRules.specialRules || "None provided"}` : ""}
${storyData.currentScene ? `- Last Known Scene: ${storyData.currentScene}` : "- Last Known Scene: None established yet."}

OUTPUT RULES
- Begin EVERY response with exactly one scene tag in this format: [[SCENE: location | mood | time]]
- Do not use bullet points, markdown headers, or chat-style formatting
- Never open with chatty assistant phrases like "Sure!", "Of course!", "Great!", or similar
- Keep narrator prose to a maximum of 2 short paragraphs (3-4 sentences each) per turn.
- Do not over-narrate. Keep narrator prose brief and atmospheric.
- Every turn must include at least one cast member speaking, acting, or reacting using the tag formats below.
- Character dialogue: [CHAR:CharacterName]dialogue text[/CHAR]
- Character action/emote: [ACTION:CharacterName]action description[/ACTION]
- Character inner thought: [THINK:CharacterName]thought text[/THINK]
- World/environment event: [WORLD]event description[/WORLD]
- Interpret the player's input flexibly: it may contain speech, action, emotion, silence, or a mix of these
- Do not over-author the player's inner feelings, choices, or behavior beyond what their input clearly supports
- Include [[ACTIONS: opt1 | opt2 | opt3]] every 2-3 turns at dramatically appropriate moments. This is strongly recommended, not optional.
- If you include [[ACTIONS: ...]], place it at the end and never provide more than 3 options
- Keep continuity with prior events and the last known scene
- Write ALL output in ${languageInstruction}

TURN HANDLING
- If PLAYER'S LATEST INPUT is exactly [CONTINUE], treat it as a continue-turn signal rather than literal dialogue
- On a [CONTINUE] turn, gently advance the scene by a small but meaningful step
- Let the environment, NPCs, tension, or time move forward slightly while preserving continuity
- Do not invent a deliberate player action, spoken line, or decision on a [CONTINUE] turn
- If PLAYER'S LATEST INPUT is anything other than [CONTINUE], respond directly to that action while preserving player agency

RECENT STORY HISTORY
${recentHistory || "No prior history."}

PLAYER'S LATEST INPUT
${isContinueTurn ? "[CONTINUE]" : (playerMessage || "(The player is silent or observing.)")}`;
}
