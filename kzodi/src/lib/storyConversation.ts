import type { Conversation } from "@/lib/chatStore";

export interface ServerStoryConversation {
    characterId: string;
    lastMessage?: string;
    lastTimestamp?: number;
    conversationType?: string;
    groupName?: string | null;
    groupImage?: string | null;
    groupMemberIds?: string[] | null;
    worldData?: Conversation["worldData"];
    storyData?: Conversation["storyData"];
    creatorId?: string | null;
}

export async function fetchServerStoryConversation(storyId: string): Promise<ServerStoryConversation | null> {
    const response = await fetch("/api/conversations?fresh=1", {
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`Conversation lookup failed with ${response.status}`);
    }

    const data = await response.json();
    return ((data?.conversations || []) as ServerStoryConversation[]).find(
        (entry) => entry.characterId === storyId && entry.conversationType === "story"
    ) || null;
}
