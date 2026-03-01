import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: number;
    status: "sent" | "delivered" | "seen";
    replyToId?: string;
    reactions?: Record<string, string[]>;
    attachment?: {
        type: "image";
        url: string;
    };
    // Group chat specific
    senderId?: string;     // character ID of the sender (for group chats)
    senderName?: string;   // display name of sender
}

export interface Conversation {
    characterId: string;
    messages: ChatMessage[];
    lastMessage: string;
    lastTimestamp: number;
    isBlocked?: boolean;
    theme?: string;
    // Group chat fields
    isGroup?: boolean;
    groupName?: string;
    groupImage?: string;
    groupMemberIds?: string[];  // array of character IDs in the group
}

interface ChatStore {
    conversations: Record<string, Conversation>;
    activeCharacterId: string | null;

    setActiveCharacter: (id: string | null) => void;
    sendMessage: (characterId: string, content: string, attachment?: ChatMessage["attachment"], replyToId?: string) => void;
    addReply: (characterId: string, content: string, attachment?: ChatMessage["attachment"], replyToId?: string) => void;
    markAsSeen: (characterId: string, roleToMark: "user" | "assistant") => void;
    clearConversation: (characterId: string) => void;
    deleteConversation: (characterId: string) => void;
    ensureConversation: (characterId: string) => void;
    setMessages: (characterId: string, messages: ChatMessage[]) => void;
    toggleBlock: (characterId: string) => void;
    getConversation: (characterId: string) => Conversation | undefined;
    getConversationList: () => Conversation[];
    setTheme: (characterId: string, theme: string) => void;

    // Reactions
    addReaction: (characterId: string, messageId: string, emoji: string, userId: string) => void;
    removeReaction: (characterId: string, messageId: string, emoji: string, userId: string) => void;

    // Group Chat
    createGroup: (groupName: string, memberIds: string[], groupImage: string) => string;
    addGroupMember: (groupId: string, memberId: string) => void;
    // Settings
    responseLanguage: string;
    setResponseLanguage: (lang: string) => void;
}

export const useChatStore = create<ChatStore>()(
    persist(
        (set, get) => ({
            conversations: {},
            activeCharacterId: null,
            responseLanguage: "English (Default)",

            setResponseLanguage: (lang) => set({ responseLanguage: lang }),
            setActiveCharacter: (id) => set({ activeCharacterId: id }),

            clearConversation: (characterId) => {
                set((state) => {
                    const newConvos = { ...state.conversations };
                    if (newConvos[characterId]) {
                        newConvos[characterId] = {
                            ...newConvos[characterId],
                            messages: [],
                            lastMessage: ""
                        };
                    }
                    return { conversations: newConvos };
                });

                // Sync deletion to backend
                fetch("/api/messages", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ conversationId: characterId })
                }).catch(err => console.error("Failed to clear conversation in DB", err));
            },
            deleteConversation: (characterId) => {
                set((state) => {
                    const newConvos = { ...state.conversations };
                    delete newConvos[characterId];
                    return { conversations: newConvos };
                });

                // Sync deletion to backend
                fetch("/api/messages", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ conversationId: characterId })
                }).catch(err => console.error("Failed to delete conversation in DB", err));
            },

            ensureConversation: (characterId) => {
                set((state) => {
                    if (state.conversations[characterId]) return state;
                    return {
                        conversations: {
                            ...state.conversations,
                            [characterId]: {
                                characterId,
                                messages: [],
                                lastMessage: "",
                                lastTimestamp: Date.now(),
                            }
                        }
                    };
                });
            },

            setMessages: (characterId, messages) => {
                set((state) => {
                    const existing = state.conversations[characterId] || {
                        characterId,
                        messages: [],
                        lastMessage: "",
                        lastTimestamp: Date.now(),
                    };

                    if (messages === existing.messages) return state;

                    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

                    return {
                        conversations: {
                            ...state.conversations,
                            [characterId]: {
                                ...existing,
                                messages,
                                lastMessage: lastMessage ? (lastMessage.content || (lastMessage.attachment ? "[Image]" : "")) : "",
                                lastTimestamp: lastMessage ? lastMessage.timestamp : existing.lastTimestamp,
                            }
                        }
                    };
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

            setTheme: (characterId, theme) => {
                set((state) => {
                    const existing = state.conversations[characterId];
                    if (!existing) return state;

                    return {
                        conversations: {
                            ...state.conversations,
                            [characterId]: {
                                ...existing,
                                theme,
                            }
                        }
                    };
                });
            },

            sendMessage: (characterId, content, attachment, replyToId) => {
                const msg: ChatMessage = {
                    id: `${Date.now()}-user-${Math.random().toString(36).substr(2, 6)}`,
                    role: "user",
                    content,
                    timestamp: Date.now(),
                    status: "sent",
                    attachment,
                    replyToId,
                };

                set((state) => {
                    const existing = state.conversations[characterId];
                    const messages = existing ? [...existing.messages, msg] : [msg];
                    return {
                        conversations: {
                            ...state.conversations,
                            [characterId]: {
                                ...(existing || { characterId }),
                                characterId,
                                messages,
                                lastMessage: content || (attachment ? "[Image]" : ""),
                                lastTimestamp: msg.timestamp,
                            },
                        },
                    };
                });

                // Sync new message to backend
                fetch("/api/messages", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ conversationId: characterId, messages: [msg] })
                }).catch(err => console.error("Failed to sync message", err));
            },

            addReply: (characterId, content, attachment, replyToId) => {
                const msg: ChatMessage = {
                    id: `${Date.now()}-ai-${Math.random().toString(36).substr(2, 6)}`,
                    role: "assistant",
                    content,
                    timestamp: Date.now(),
                    status: "sent",
                    attachment,
                    replyToId,
                };

                set((state) => {
                    const existing = state.conversations[characterId];
                    // Don't create a new conversation if one doesn't exist (e.g., was deleted)
                    if (!existing) return state;
                    const messages = [...existing.messages, msg];

                    return {
                        conversations: {
                            ...state.conversations,
                            [characterId]: {
                                ...existing,
                                characterId,
                                messages,
                                lastMessage: content || (attachment ? "[Image]" : ""),
                                lastTimestamp: msg.timestamp,
                            },
                        },
                    };
                });

                // Sync AI reply to backend
                fetch("/api/messages", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ conversationId: characterId, messages: [msg] })
                }).catch(err => console.error("Failed to sync message", err));

                // AI replied → mark user's messages as "seen" (the AI has read them)
                get().markAsSeen(characterId, "user");
            },

            addReaction: (characterId, messageId, emoji, userId) => {
                set((state) => {
                    const convo = state.conversations[characterId];
                    if (!convo) return state;

                    const newMessages = convo.messages.map(msg => {
                        if (msg.id !== messageId) return msg;

                        const reactions = msg.reactions ? { ...msg.reactions } : {};
                        if (!reactions[emoji]) reactions[emoji] = [];
                        if (!reactions[emoji].includes(userId)) {
                            reactions[emoji].push(userId);
                        }

                        return { ...msg, reactions };
                    });

                    // Sync updated reaction to DB
                    const updatedMsg = newMessages.find(m => m.id === messageId);
                    if (updatedMsg) {
                        fetch("/api/messages", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ conversationId: characterId, messages: [updatedMsg] })
                        }).catch(err => console.error("Failed to sync reaction", err));
                    }

                    return {
                        conversations: {
                            ...state.conversations,
                            [characterId]: { ...convo, messages: newMessages }
                        }
                    };
                });
            },

            removeReaction: (characterId, messageId, emoji, userId) => {
                set((state) => {
                    const convo = state.conversations[characterId];
                    if (!convo) return state;

                    const newMessages = convo.messages.map(msg => {
                        if (msg.id !== messageId) return msg;

                        if (!msg.reactions || !msg.reactions[emoji]) return msg;

                        const reactions = { ...msg.reactions };
                        reactions[emoji] = reactions[emoji].filter(id => id !== userId);
                        if (reactions[emoji].length === 0) {
                            delete reactions[emoji];
                        }

                        return { ...msg, reactions };
                    });

                    // Sync updated reaction to DB
                    const updatedMsg = newMessages.find(m => m.id === messageId);
                    if (updatedMsg) {
                        fetch("/api/messages", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ conversationId: characterId, messages: [updatedMsg] })
                        }).catch(err => console.error("Failed to sync reaction removal", err));
                    }

                    return {
                        conversations: {
                            ...state.conversations,
                            [characterId]: { ...convo, messages: newMessages }
                        }
                    };
                });
            },

            markAsSeen: (characterId, roleToMark) => {
                set((state) => {
                    const existing = state.conversations[characterId];
                    if (!existing) return state;

                    const updatedMessages = existing.messages.map((m) => {
                        if (m.role === roleToMark && m.status !== "seen") {
                            return { ...m, status: "seen" as const };
                        }
                        return m;
                    });

                    // Sync seen status to DB for any messages that actually changed their status to seen
                    const msgsToSync = updatedMessages.filter(m => {
                        const oldMsg = existing.messages.find(old => old.id === m.id);
                        return oldMsg && oldMsg.status !== "seen" && m.status === "seen";
                    });

                    if (msgsToSync.length > 0) {
                        fetch("/api/messages", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ conversationId: characterId, messages: msgsToSync })
                        }).catch(err => console.error("Failed to sync seen status", err));
                    }

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

            // ─── Group Chat Methods ─────────────────────────────────────

            createGroup: (groupName, memberIds, groupImage) => {
                const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

                set((state) => ({
                    conversations: {
                        ...state.conversations,
                        [groupId]: {
                            characterId: groupId,
                            messages: [],
                            lastMessage: "",
                            lastTimestamp: Date.now(),
                            isGroup: true,
                            groupName: groupName,
                            groupImage: groupImage,
                            groupMemberIds: memberIds,
                        }
                    }
                }));

                return groupId;
            },

            addGroupMember: (groupId, memberId) => {
                set((state) => {
                    const group = state.conversations[groupId];
                    if (!group || !group.isGroup) return state;

                    const members = group.groupMemberIds || [];
                    if (members.includes(memberId)) return state;

                    return {
                        conversations: {
                            ...state.conversations,
                            [groupId]: {
                                ...group,
                                groupMemberIds: [...members, memberId],
                            }
                        }
                    };
                });
            },

            removeGroupMember: (groupId, memberId) => {
                set((state) => {
                    const group = state.conversations[groupId];
                    if (!group || !group.isGroup) return state;

                    return {
                        conversations: {
                            ...state.conversations,
                            [groupId]: {
                                ...group,
                                groupMemberIds: (group.groupMemberIds || []).filter(id => id !== memberId),
                            }
                        }
                    };
                });
            },

            sendGroupMessage: (groupId, content, senderId, senderName, attachment, replyToId) => {
                const msg: ChatMessage = {
                    id: `${Date.now()}-user-${Math.random().toString(36).substr(2, 6)}`,
                    role: "user",
                    content,
                    timestamp: Date.now(),
                    status: "sent",
                    attachment,
                    replyToId,
                    senderId,
                    senderName,
                };

                set((state) => {
                    const existing = state.conversations[groupId];
                    if (!existing) return state;
                    const messages = [...existing.messages, msg];
                    return {
                        conversations: {
                            ...state.conversations,
                            [groupId]: {
                                ...existing,
                                messages,
                                lastMessage: `${senderName}: ${content || (attachment ? "[Image]" : "")}`,
                                lastTimestamp: msg.timestamp,
                            },
                        },
                    };
                });

                // Sync new message to backend
                fetch("/api/messages", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ conversationId: groupId, messages: [msg] })
                }).catch(err => console.error("Failed to sync group message", err));
            },

            addGroupReply: (groupId, content, senderId, senderName, attachment, replyToId) => {
                const msg: ChatMessage = {
                    id: `${Date.now()}-ai-${Math.random().toString(36).substr(2, 6)}`,
                    role: "assistant",
                    content,
                    timestamp: Date.now(),
                    status: "sent",
                    attachment,
                    replyToId,
                    senderId,
                    senderName,
                };

                set((state) => {
                    const existing = state.conversations[groupId];
                    if (!existing) return state;
                    const messages = [...existing.messages, msg];
                    return {
                        conversations: {
                            ...state.conversations,
                            [groupId]: {
                                ...existing,
                                messages,
                                lastMessage: `${senderName}: ${content || (attachment ? "[Image]" : "")}`,
                                lastTimestamp: msg.timestamp,
                            },
                        },
                    };
                });

                // Sync AI reply to backend
                fetch("/api/messages", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ conversationId: groupId, messages: [msg] })
                }).catch(err => console.error("Failed to sync group message", err));

                // AI replied → mark user's messages as "seen" (the AI has read them)
                get().markAsSeen(groupId, "user");
            },
        }),
        {
            name: "kzodi-chat-store",
            // Keep all conversations but truncate messages to the last 50 
            // so we don't blow up the 5MB localStorage limit, while preserving 
            // unread notifications and the last message preview for the Chats tab.
            partialize: (state) => ({
                conversations: Object.fromEntries(
                    Object.entries(state.conversations).map(([key, conv]) => [
                        key,
                        {
                            ...conv,
                            messages: (conv.messages || []).slice(-50)
                        }
                    ])
                ),
            }),
        }
    )
);
