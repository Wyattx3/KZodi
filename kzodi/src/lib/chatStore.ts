import { create } from "zustand";

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: number;
    status: "sent" | "delivered" | "seen";
}

export interface Conversation {
    characterId: string;
    messages: ChatMessage[];
    lastMessage: string;
    lastTimestamp: number;
}

interface ChatStore {
    conversations: Record<string, Conversation>;
    activeCharacterId: string | null;

    setActiveCharacter: (id: string | null) => void;
    sendMessage: (characterId: string, content: string) => void;
    addReply: (characterId: string, content: string) => void;
    markAsSeen: (characterId: string) => void;
    clearConversation: (characterId: string) => void;
    getConversation: (characterId: string) => Conversation | undefined;
    getConversationList: () => Conversation[];
}

export const useChatStore = create<ChatStore>((set, get) => ({
    conversations: {},
    activeCharacterId: null,

    setActiveCharacter: (id) => set({ activeCharacterId: id }),

    clearConversation: (characterId) => {
        set((state) => {
            const newConvos = { ...state.conversations };
            delete newConvos[characterId];
            return { conversations: newConvos };
        });
    },

    sendMessage: (characterId, content) => {
        const msg: ChatMessage = {
            id: `${Date.now()}-user`,
            role: "user",
            content,
            timestamp: Date.now(),
            status: "sent",
        };

        set((state) => {
            const existing = state.conversations[characterId];
            const messages = existing ? [...existing.messages, msg] : [msg];
            return {
                conversations: {
                    ...state.conversations,
                    [characterId]: {
                        characterId,
                        messages,
                        lastMessage: content,
                        lastTimestamp: msg.timestamp,
                    },
                },
            };
        });
    },

    addReply: (characterId, content) => {
        const msg: ChatMessage = {
            id: `${Date.now()}-ai`,
            role: "assistant",
            content,
            timestamp: Date.now(),
            status: "sent",
        };

        set((state) => {
            const existing = state.conversations[characterId];
            const messages = existing ? [...existing.messages, msg] : [msg];

            return {
                conversations: {
                    ...state.conversations,
                    [characterId]: {
                        characterId,
                        messages,
                        lastMessage: content,
                        lastTimestamp: msg.timestamp,
                    },
                },
            };
        });
    },

    markAsSeen: (characterId) => {
        set((state) => {
            const existing = state.conversations[characterId];
            if (!existing) return state;

            // Mark all messages as seen (both user and AI, assuming passing through means seen)
            // Or specifically mark the last message as seen
            const updatedMessages = existing.messages.map((m) => ({
                ...m,
                status: "seen" as const,
            }));

            return {
                conversations: {
                    ...state.conversations,
                    [characterId]: {
                        ...existing,
                        messages: updatedMessages,
                    },
                },
            };
        });
    },

    getConversation: (characterId) => get().conversations[characterId],

    getConversationList: () => {
        const convos = Object.values(get().conversations);
        return convos.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
    },
}));
