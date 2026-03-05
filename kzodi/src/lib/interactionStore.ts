import { create } from "zustand";
import { persist } from "zustand/middleware";

interface InteractionStore {
    likedCharacters: Record<string, boolean>; // characterId -> isLiked

    toggleLike: (characterId: string) => void;
    isLiked: (characterId: string) => boolean;
}

export const useInteractionStore = create<InteractionStore>()(
    persist(
        (set, get) => ({
            likedCharacters: {},

            toggleLike: (characterId) =>
                set((state) => {
                    const current = state.likedCharacters[characterId] || false;
                    return {
                        likedCharacters: {
                            ...state.likedCharacters,
                            [characterId]: !current,
                        },
                    };
                }),

            isLiked: (characterId) => get().likedCharacters[characterId] || false,
        }),
        {
            name: "kakoei-interactions", // unique name for localStorage
        }
    )
);
