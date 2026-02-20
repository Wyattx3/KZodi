import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: number;
    status: "sent" | "delivered" | "seen";
    attachment?: {
        type: "image";
        url: string;
    };
}

export interface Conversation {
    characterId: string;
    messages: ChatMessage[];
    lastMessage: string;
    lastTimestamp: number;
    isBlocked?: boolean;
}

interface ChatStore {
    conversations: Record<string, Conversation>;
    activeCharacterId: string | null;

    setActiveCharacter: (id: string | null) => void;
    sendMessage: (characterId: string, content: string, attachment?: ChatMessage["attachment"]) => void;
    addReply: (characterId: string, content: string, attachment?: ChatMessage["attachment"]) => void;
    markAsSeen: (characterId: string) => void;
    clearConversation: (characterId: string) => void;
    toggleBlock: (characterId: string) => void;
    getConversation: (characterId: string) => Conversation | undefined;
    getConversationList: () => Conversation[];
}

export const useChatStore = create<ChatStore>()(
    persist(
        (set, get) => ({
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

            toggleBlock: (characterId) => {
                set((state) => {
                    const existing = state.conversations[characterId];
                    if (!existing) {
                        return {
                            conversations: {
                                ...state.conversations,
                                [characterId]: {
                                    characterId,
                                    messages: [],
                                    lastMessage: "",
                                    lastTimestamp: Date.now(),
                                    isBlocked: true,
                                }
                            }
                        };
                    }

                    return {
                        conversations: {
                            ...state.conversations,
                            [characterId]: {
                                ...existing,
                                isBlocked: !existing.isBlocked,
                            }
                        }
                    };
                });
            },

            sendMessage: (characterId, content, attachment) => {
                const msg: ChatMessage = {
                    id: `${Date.now()}-user`,
                    role: "user",
                    content,
                    timestamp: Date.now(),
                    status: "sent",
                    attachment,
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
                                lastMessage: content || (attachment ? "[Image]" : ""),
                                lastTimestamp: msg.timestamp,
                            },
                        },
                    };
                });
            },

            addReply: (characterId, content, attachment) => {
                const msg: ChatMessage = {
                    id: `${Date.now()}-ai`,
                    role: "assistant",
                    content,
                    timestamp: Date.now(),
                    status: "sent",
                    attachment,
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
                                lastMessage: content || (attachment ? "[Image]" : ""),
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
        }),
        {
            name: "kzodi-chat-store",
            partialize: (state) => ({ conversations: state.conversations }),
        }
    )
);
