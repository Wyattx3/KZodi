import type { StoryData } from "@/lib/chatStore";

type StoryDataDefaults = Pick<StoryData, "synopsis" | "genre"> & Partial<Pick<StoryData, "isPublished" | "castIds">>;
type StoryPlayerOverrides = Pick<StoryData, "playerCharacterName" | "playerCharacterDescription">;

export function buildCreateStoryData(
    storyData: Partial<StoryData> | null | undefined,
    defaults: StoryDataDefaults,
    playerOverrides: StoryPlayerOverrides
): StoryData {
    return {
        ...storyData,
        synopsis: defaults.synopsis ?? storyData?.synopsis ?? "",
        genre: defaults.genre ?? storyData?.genre ?? "",
        isPublished: defaults.isPublished ?? storyData?.isPublished ?? true,
        playerCharacterName: playerOverrides.playerCharacterName ?? storyData?.playerCharacterName ?? "",
        playerCharacterDescription: playerOverrides.playerCharacterDescription ?? storyData?.playerCharacterDescription ?? "",
        castIds: defaults.castIds ?? storyData?.castIds ?? [],
    };
}
