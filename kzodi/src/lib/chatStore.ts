import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WorldData {
    lore: string;
    factions: string[];
    locations: string[];
    powerSystems: string[];
    laws: string[];
    extras: { label: string; value: string }[];
}

export interface StoryData {
    synopsis: string;
    genre: string;
    isPublished: boolean;
    playerCharacterName: string;
    playerCharacterDescription: string;
    castIds?: string[];
}

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: number;
    status: "sent" | "delivered" | "seen";
    replyToId?: string;
    reactions?: Record<string, string[]>;
    attachment?: {
        type: "image" | "audio";
        url: string;
        duration?: number;
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
    customName?: string;
    // Group chat fields
    isGroup?: boolean;
    groupName?: string;
    groupImage?: string;
    groupMemberIds?: string[];  // array of character IDs in the group
    clearedAt?: number;         // timestamp when the conversation was cleared/deleted locally
    conversationType?: "personal" | "group" | "world" | "story";
    worldData?: WorldData;
    storyData?: StoryData;
    creatorId?: string;         // owner user-id for published stories
    /**
     * True while the initial metadata upsert to /api/messages has not yet
     * been acknowledged by the server. Prevents reconciliation from pruning
     * the conversation when it is absent from the server snapshot.
     */
    _pendingSync?: boolean;
    _syncFailedAt?: number;
}

interface ChatStore {
    conversations: Record<string, Conversation>;
    activeCharacterId: string | null;
    /** Persisted owner of this store snapshot. Used to detect cross-account data leakage. */
    ownerUserId: string | null;

    setActiveCharacter: (id: string | null) => void;
    sendMessage: (characterId: string, content: string, attachment?: ChatMessage["attachment"], replyToId?: string) => void;
    addReply: (characterId: string, content: string, attachment?: ChatMessage["attachment"], replyToId?: string) => void;
    markAsSeen: (characterId: string, roleToMark: "user" | "assistant") => void;
    clearConversation: (characterId: string) => void;
    deleteConversation: (characterId: string) => void;
    ensureConversation: (characterId: string) => void;
    /**
     * Merge server-provided metadata into an existing (or new) conversation
     * without dropping messages. Fields like conversationType, isGroup,
     * worldData, storyData, groupName, groupImage, groupMemberIds are patched;
     * messages and timestamps are preserved.
     */
    upsertConversation: (characterId: string, metadata: Partial<Pick<Conversation, "conversationType" | "isGroup" | "groupName" | "groupImage" | "groupMemberIds" | "worldData" | "storyData" | "creatorId">>) => void;
    setMessages: (characterId: string, messages: ChatMessage[]) => void;
    toggleBlock: (characterId: string) => void;
    getConversation: (characterId: string) => Conversation | undefined;
    getConversationList: () => Conversation[];
    setTheme: (characterId: string, theme: string) => void;
    setCustomName: (characterId: string, customName: string) => void;
    /** Stamp the current signed-in user as the store owner. */
    setOwnerUserId: (id: string | null) => void;
    /** Wipe all conversations and reset the owner — called when a different user is detected. */
    resetConversations: () => void;
    /**
     * Remove a single conversation from local state ONLY — no API call.
     * Use this for startup reconciliation so a stale /api/conversations cache
     * cannot trigger irreversible DB deletions via DELETE /api/messages.
     */
    pruneLocalConversation: (characterId: string) => void;

    // Reactions
    addReaction: (characterId: string, messageId: string, emoji: string, userId: string) => void;
    removeReaction: (characterId: string, messageId: string, emoji: string, userId: string) => void;

    // Group Chat
    createGroup: (groupName: string, memberIds: string[], groupImage: string) => string;
    createWorldGroup: (groupName: string, memberIds: string[], groupImage: string, worldData: WorldData) => string;
    createStory: (name: string, image: string, storyData: StoryData, worldData?: WorldData, explicitId?: string, creatorId?: string) => string;
    addGroupMember: (groupId: string, memberId: string) => void;
    removeGroupMember: (groupId: string, memberId: string) => void;
    sendGroupMessage: (groupId: string, content: string, senderId: string, senderName: string, attachment?: ChatMessage["attachment"], replyToId?: string) => void;
    addGroupReply: (groupId: string, content: string, senderId: string, senderName: string, attachment?: ChatMessage["attachment"], replyToId?: string) => void;
    // Settings
    responseLanguage: string;
    setResponseLanguage: (lang: string) => void;
}


/**
 * Build a conversationMetadata object from a Conversation for backend sync.
 * Returns undefined if no group/world/story metadata is present, to avoid
 * unnecessary upserts.
 */
function buildConversationMetadata(convo: Conversation | undefined) {
    if (!convo) return undefined;
    if (!convo.groupName && !convo.groupImage && !convo.groupMemberIds && !convo.worldData && !convo.storyData) {
        return undefined;
    }
    return {
        groupName: convo.groupName || null,
        groupImage: convo.groupImage || null,
        groupMemberIds: convo.groupMemberIds || null,
        worldData: convo.worldData || null,
        storyData: convo.storyData || null,
    };
}

export const useChatStore = create<ChatStore>()(
    persist(
        (set, get) => ({
            conversations: {},
            activeCharacterId: null,
            ownerUserId: null,
            responseLanguage: "English (Default)",

            setResponseLanguage: (lang) => {
                set({ responseLanguage: lang });
                // Sync language to backend
                fetch("/api/user/language", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ language: lang })
                }).catch(err => console.error("Failed to sync language to DB", err));
            },
            setActiveCharacter: (id) => set({ activeCharacterId: id }),

            setOwnerUserId: (id) => set({ ownerUserId: id }),

            resetConversations: () => set({ conversations: {}, ownerUserId: null }),

            // Local-only prune: removes a conversation from state without touching the DB.
            // Safe to call during startup reconciliation against potentially-stale server snapshots.
            pruneLocalConversation: (characterId) => {
                set((state) => {
                    const newConvos = { ...state.conversations };
                    delete newConvos[characterId];
                    return { conversations: newConvos };
                });
            },

            clearConversation: (characterId) => {
                set((state) => {
                    const newConvos = { ...state.conversations };
                    if (newConvos[characterId]) {
                        newConvos[characterId] = {
                            ...newConvos[characterId],
                            messages: [],
                            lastMessage: "",
                            clearedAt: Date.now()
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
                // Track deletion in localStorage so syncFromDB won't revive the conversation
                try {
                    const deletedMap = JSON.parse(localStorage.getItem("kakoei-deleted-convos") || "{}");
                    deletedMap[characterId] = Date.now();
                    localStorage.setItem("kakoei-deleted-convos", JSON.stringify(deletedMap));
                } catch {}

                set((state) => {
                    const newConvos = { ...state.conversations };
                    delete newConvos[characterId];
                    return { conversations: newConvos };
                });

                // Sync deletion to backend — true delete removes metadata too
                fetch("/api/messages", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ conversationId: characterId, deleteConversation: true })
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

            upsertConversation: (characterId, metadata) => {
                set((state) => {
                    const existing = state.conversations[characterId];
                    // Derive isGroup from conversationType when not explicitly provided
                    const derivedIsGroup = metadata.isGroup ?? (
                        metadata.conversationType === "group" || metadata.conversationType === "world"
                    );
                    if (existing) {
                        // Merge only metadata fields; preserve messages and timestamps
                        return {
                            conversations: {
                                ...state.conversations,
                                [characterId]: {
                                    ...existing,
                                    conversationType: metadata.conversationType ?? existing.conversationType,
                                    isGroup: derivedIsGroup ?? existing.isGroup,
                                    groupName: metadata.groupName ?? existing.groupName,
                                    groupImage: metadata.groupImage ?? existing.groupImage,
                                    groupMemberIds: metadata.groupMemberIds ?? existing.groupMemberIds,
                                    worldData: metadata.worldData ?? existing.worldData,
                                    storyData: metadata.storyData ?? existing.storyData,
                                    creatorId: metadata.creatorId ?? existing.creatorId,
                                }
                            }
                        };
                    }
                    // Create a minimal conversation with the supplied metadata
                    return {
                        conversations: {
                            ...state.conversations,
                            [characterId]: {
                                characterId,
                                messages: [],
                                lastMessage: "",
                                lastTimestamp: Date.now(),
                                conversationType: metadata.conversationType,
                                isGroup: derivedIsGroup,
                                groupName: metadata.groupName,
                                groupImage: metadata.groupImage,
                                groupMemberIds: metadata.groupMemberIds,
                                worldData: metadata.worldData,
                                storyData: metadata.storyData,
                                creatorId: metadata.creatorId,
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

            setCustomName: (characterId, customName) => {
                // Limit custom names to 30 characters to prevent layout overflow
                const trimmedName = customName.slice(0, 30);
                set((state) => {
                    const existing = state.conversations[characterId];
                    if (!existing) return state;

                    return {
                        conversations: {
                            ...state.conversations,
                            [characterId]: {
                                ...existing,
                                customName: trimmedName,
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
                const convo = get().conversations[characterId];
                fetch("/api/messages", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ conversationId: characterId, messages: [msg], conversationType: convo?.conversationType || "personal", conversationMetadata: buildConversationMetadata(convo) })
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
                const convo = get().conversations[characterId];
                fetch("/api/messages", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ conversationId: characterId, messages: [msg], conversationType: convo?.conversationType || "personal", conversationMetadata: buildConversationMetadata(convo) })
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
                            body: JSON.stringify({ conversationId: characterId, messages: [updatedMsg], conversationType: get().conversations[characterId]?.conversationType || "personal" })
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
                            body: JSON.stringify({ conversationId: characterId, messages: [updatedMsg], conversationType: get().conversations[characterId]?.conversationType || "personal" })
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
                            body: JSON.stringify({ conversationId: characterId, messages: msgsToSync, conversationType: get().conversations[characterId]?.conversationType || "personal" })
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
                            conversationType: "group",
                        }
                    }
                }));

                return groupId;
            },

            createWorldGroup: (groupName, memberIds, groupImage, worldData) => {
                const groupId = `world-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

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
                            conversationType: "world",
                            worldData: worldData,
                            _pendingSync: true,
                        }
                    }
                }));

                // Persist metadata to backend with retry so transient failures
                // don't leave an unsynced conversation that reconciliation prunes.
                const syncPayload = {
                    conversationId: groupId,
                    conversationType: "world" as const,
                    conversationMetadata: {
                        groupName,
                        groupImage,
                        groupMemberIds: memberIds,
                        worldData,
                        storyData: null,
                    }
                };
                const attemptSync = async (attempt = 0): Promise<void> => {
                    try {
                        const res = await fetch("/api/messages", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(syncPayload)
                        });
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        // Success — clear pending flag
                        set((state) => {
                            const convo = state.conversations[groupId];
                            if (!convo) return state;
                            return { conversations: { ...state.conversations, [groupId]: { ...convo, _pendingSync: undefined, _syncFailedAt: undefined } } };
                        });
                    } catch (err) {
                        if (attempt < 3) {
                            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
                            return attemptSync(attempt + 1);
                        }
                        console.error("Failed to persist world metadata after retries", err);
                        set((state) => {
                            const convo = state.conversations[groupId];
                            if (!convo) return state;
                            return { conversations: { ...state.conversations, [groupId]: { ...convo, _pendingSync: undefined, _syncFailedAt: Date.now() } } };
                        });
                    }
                };
                attemptSync();

                return groupId;
            },

            createStory: (name, image, storyData, worldData, explicitId, creatorId) => {
                const storyId = explicitId || `story-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

                set((state) => {
                    const existing = state.conversations[storyId];
                    if (existing) {
                        // Preserve messages, lastMessage, lastTimestamp; merge metadata only
                        return {
                            conversations: {
                                ...state.conversations,
                                [storyId]: {
                                    ...existing,
                                    groupName: name,
                                    groupImage: image,
                                    conversationType: "story",
                                    storyData: storyData,
                                    worldData: worldData ?? existing.worldData,
                                    creatorId: creatorId ?? existing.creatorId,
                                    _pendingSync: true,
                                }
                            }
                        };
                    }
                    // New conversation
                    return {
                        conversations: {
                            ...state.conversations,
                            [storyId]: {
                                characterId: storyId,
                                messages: [],
                                lastMessage: "",
                                lastTimestamp: Date.now(),
                                isGroup: false,
                                groupName: name,
                                groupImage: image,
                                conversationType: "story",
                                storyData: storyData,
                                worldData: worldData,
                                creatorId: creatorId,
                                _pendingSync: true,
                            }
                        }
                    };
                });

                // Persist metadata to backend with retry so transient failures
                // don't leave an unsynced conversation that reconciliation prunes.
                const syncPayload = {
                    conversationId: storyId,
                    conversationType: "story" as const,
                    conversationMetadata: {
                        groupName: name,
                        groupImage: image,
                        groupMemberIds: null,
                        worldData: worldData || null,
                        storyData: storyData,
                    }
                };
                const attemptSync = async (attempt = 0): Promise<void> => {
                    try {
                        const res = await fetch("/api/messages", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(syncPayload)
                        });
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        // Success — clear pending flag
                        set((state) => {
                            const convo = state.conversations[storyId];
                            if (!convo) return state;
                            return { conversations: { ...state.conversations, [storyId]: { ...convo, _pendingSync: undefined, _syncFailedAt: undefined } } };
                        });
                    } catch (err) {
                        if (attempt < 3) {
                            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
                            return attemptSync(attempt + 1);
                        }
                        console.error("Failed to persist story metadata after retries", err);
                        set((state) => {
                            const convo = state.conversations[storyId];
                            if (!convo) return state;
                            return { conversations: { ...state.conversations, [storyId]: { ...convo, _pendingSync: undefined, _syncFailedAt: Date.now() } } };
                        });
                    }
                };
                attemptSync();

                return storyId;
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
                const convo = get().conversations[groupId];
                fetch("/api/messages", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ conversationId: groupId, messages: [msg], conversationType: convo?.conversationType || "group", conversationMetadata: buildConversationMetadata(convo) })
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
                const convo = get().conversations[groupId];
                fetch("/api/messages", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ conversationId: groupId, messages: [msg], conversationType: convo?.conversationType || "group", conversationMetadata: buildConversationMetadata(convo) })
                }).catch(err => console.error("Failed to sync group message", err));

                // AI replied → mark user's messages as "seen" (the AI has read them)
                get().markAsSeen(groupId, "user");
            },
        }),
        {
            name: "kakoei-chat-store",
            // Keep all conversations but truncate messages to the last 50 
            // so we don't blow up the 5MB localStorage limit, while preserving 
            // unread notifications and the last message preview for the Chats tab.
            // ownerUserId is also persisted so we can detect cross-account reuse on next load.

            // Compatibility backfill: legacy group conversations created before
            // conversationType was introduced may only have isGroup: true.
            // Stamp them with conversationType: "group" during hydration so
            // reconciliation and filtering logic works consistently.
            onRehydrateStorage: () => (state) => {
                if (!state) return;
                let changed = false;
                const patched = { ...state.conversations };
                for (const [id, convo] of Object.entries(patched)) {
                    if (convo.isGroup === true && !convo.conversationType) {
                        patched[id] = { ...convo, conversationType: "group" };
                        changed = true;
                    }
                }
                if (changed) {
                    useChatStore.setState({ conversations: patched });
                }
            },

            partialize: (state) => ({
                ownerUserId: state.ownerUserId,
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
