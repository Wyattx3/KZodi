import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { CHAT_STORE_STORAGE_KEY, enqueuePendingSync, indexedDbStateStorage, type PendingSyncType } from "@/lib/offlineSync";

export interface WorldData {
    lore: string;
    factions: string[];
    locations: string[];
    powerSystems: string[];
    laws: string[];
    extras: { label: string; value: string }[];
}

export interface CastMember {
    characterId: string;
    name: string;
    image: string;
    description: string;
    personality: string;
    role: "main-npc" | "supporting" | "antagonist" | "mentor" | "love-interest" | "ally";
    isCustom: boolean;
}

export interface CustomCastCharacter {
    id: string;
    name: string;
    description: string;
    image: string;
    personality: string;
}

export interface StoryData {
    synopsis: string;
    genre: string;
    isPublished: boolean;
    playerCharacterName: string;
    playerCharacterDescription: string;
    castIds?: string[];
    cast?: CastMember[];
    creatorCustomCharacters?: CustomCastCharacter[];
    worldRules?: {
        timePeriod: string;
        worldType: string;
        specialRules: string;
        forbiddenTopics: string;
    };
    tone?: string;
    contentRating?: "all-ages" | "teen" | "mature";
    allowUserCharacterCustomization?: boolean;
    currentScene?: string;
    themeColor?: string;
    backgroundImage?: string;
}

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: number;
    status: "queued" | "sending" | "failed" | "sent" | "delivered" | "seen";
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
    hideStoryBackground?: boolean;
    storyBgColor?: string;
    storyTextColor?: string;
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
    upsertConversation: (characterId: string, metadata: Partial<Pick<Conversation, "conversationType" | "isGroup" | "groupName" | "groupImage" | "groupMemberIds" | "worldData" | "storyData" | "creatorId" | "_pendingSync" | "_syncFailedAt" | "lastMessage" | "lastTimestamp">>) => void;
    setMessages: (characterId: string, messages: ChatMessage[]) => void;
    toggleBlock: (characterId: string) => void;
    getConversation: (characterId: string) => Conversation | undefined;
    getConversationList: () => Conversation[];
    setTheme: (characterId: string, theme: string) => void;
    setHideStoryBackground: (characterId: string, hide: boolean) => void;
    setStoryBgColor: (characterId: string, color: string) => void;
    setStoryTextColor: (characterId: string, color: string) => void;
    updateStoryScene: (characterId: string, scene: string) => void;
    setCustomName: (characterId: string, customName: string) => void;
    setMessageStatus: (characterId: string, messageIds: string[], status: ChatMessage["status"]) => void;
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

const MAX_PERSISTED_MESSAGES = 20;
const MAX_PERSISTED_TEXT_LENGTH = 600;
const MAX_PERSISTED_URL_LENGTH = 1024;
const MAX_PERSISTED_STRUCTURED_BYTES = 12_000;
const RECENT_STORY_DRAFT_SYNC_FAILURE_WINDOW_MS = 60 * 60 * 1000;

function trimPersistedText(value: string | undefined, maxLength: number) {
    if (!value) return value;
    return value.slice(0, maxLength);
}

function slimOptionalImageForDraftPersistence(image?: string) {
    if (!image) return image;
    return image.startsWith("data:")
        ? ""
        : image.slice(0, MAX_PERSISTED_URL_LENGTH);
}

function buildRecoverableStoryDraftData(storyData?: StoryData): StoryData | undefined {
    if (!storyData) return undefined;
    return {
        synopsis: trimPersistedText(storyData.synopsis, 4_000) || "",
        genre: trimPersistedText(storyData.genre, 200) || "",
        isPublished: storyData.isPublished,
        playerCharacterName: trimPersistedText(storyData.playerCharacterName, 200) || "",
        playerCharacterDescription: trimPersistedText(storyData.playerCharacterDescription, 4_000) || "",
        castIds: storyData.castIds?.slice(0, 24),
        cast: storyData.cast?.slice(0, 24).map((member) => ({
            ...member,
            name: trimPersistedText(member.name, 200) || "",
            image: slimOptionalImageForDraftPersistence(member.image) || "",
            description: trimPersistedText(member.description, 1_500) || "",
            personality: trimPersistedText(member.personality, 1_000) || "",
        })),
        creatorCustomCharacters: storyData.creatorCustomCharacters?.slice(0, 24).map((character) => ({
            ...character,
            name: trimPersistedText(character.name, 200) || "",
            description: trimPersistedText(character.description, 1_500) || "",
            image: slimOptionalImageForDraftPersistence(character.image) || "",
            personality: trimPersistedText(character.personality, 1_000) || "",
        })),
        worldRules: storyData.worldRules
            ? {
                timePeriod: trimPersistedText(storyData.worldRules.timePeriod, 300) || "",
                worldType: trimPersistedText(storyData.worldRules.worldType, 200) || "",
                specialRules: trimPersistedText(storyData.worldRules.specialRules, 2_500) || "",
                forbiddenTopics: trimPersistedText(storyData.worldRules.forbiddenTopics, 1_500) || "",
            }
            : undefined,
        tone: trimPersistedText(storyData.tone, 200),
        contentRating: storyData.contentRating,
        allowUserCharacterCustomization: storyData.allowUserCharacterCustomization,
        currentScene: trimPersistedText(storyData.currentScene, 300),
        themeColor: trimPersistedText(storyData.themeColor, 32),
        // Preserve the background image for draft recovery, even when it is a data URL.
        backgroundImage: storyData.backgroundImage,
    };
}

function slimAttachmentForPersistence(attachment?: ChatMessage["attachment"]) {
    if (!attachment) return undefined;
    const isDataUrl = attachment.url.startsWith("data:");
    return {
        type: attachment.type,
        duration: attachment.duration,
        // Base64 payloads are the fastest way to blow localStorage quota.
        url: isDataUrl ? "" : attachment.url.slice(0, MAX_PERSISTED_URL_LENGTH),
    };
}

function slimStructuredDataForPersistence<T>(
    value?: T,
    options?: { fallback?: (value: T) => T | undefined }
): T | undefined {
    if (!value) return undefined;
    try {
        const serialized = JSON.stringify(value);
        if (serialized.length > MAX_PERSISTED_STRUCTURED_BYTES) {
            if (!options?.fallback) {
                return undefined;
            }
            const fallbackValue = options.fallback(value);
            if (!fallbackValue) {
                return undefined;
            }
            return JSON.parse(JSON.stringify(fallbackValue)) as T;
        }
        return JSON.parse(serialized) as T;
    } catch {
        return undefined;
    }
}

function slimConversationForPersistence(conv: Conversation): Conversation {
    const hasRecentStorySyncFailure =
        typeof conv._syncFailedAt === "number" &&
        Date.now() - conv._syncFailedAt < RECENT_STORY_DRAFT_SYNC_FAILURE_WINDOW_MS;
    const shouldPreserveStoryDraftMetadata =
        conv.conversationType === "story" &&
        (conv._pendingSync === true || hasRecentStorySyncFailure);

    return {
        ...conv,
        groupImage: shouldPreserveStoryDraftMetadata
            ? conv.groupImage
            : conv.groupImage?.startsWith("data:")
                ? undefined
                : conv.groupImage?.slice(0, MAX_PERSISTED_URL_LENGTH),
        worldData: slimStructuredDataForPersistence(conv.worldData),
        storyData: shouldPreserveStoryDraftMetadata
            ? slimStructuredDataForPersistence(conv.storyData, {
                fallback: (storyData) => buildRecoverableStoryDraftData(storyData as StoryData) as typeof storyData,
            })
            : slimStructuredDataForPersistence(conv.storyData),
        messages: (conv.messages || []).slice(-MAX_PERSISTED_MESSAGES).map((msg) => ({
            ...msg,
            content: msg.content.slice(0, MAX_PERSISTED_TEXT_LENGTH),
            attachment: slimAttachmentForPersistence(msg.attachment),
        })),
    };
}

export const useChatStore = create<ChatStore>()(
    persist(
        (set, get) => {
            const setMessageStatusInState = (characterId: string, messageIds: string[], status: ChatMessage["status"]) => {
                if (messageIds.length === 0) return;

                set((state) => {
                    const existing = state.conversations[characterId];
                    if (!existing) return state;

                    const trackedIds = new Set(messageIds);
                    const nextMessages = existing.messages.map((message) => (
                        trackedIds.has(message.id)
                            ? { ...message, status }
                            : message
                    ));

                    return {
                        conversations: {
                            ...state.conversations,
                            [characterId]: {
                                ...existing,
                                messages: nextMessages,
                            },
                        },
                    };
                });
            };

            const setConversationSyncMarkers = (characterId: string, patch: Pick<Conversation, "_pendingSync" | "_syncFailedAt">) => {
                set((state) => {
                    const existing = state.conversations[characterId];
                    if (!existing) return state;

                    return {
                        conversations: {
                            ...state.conversations,
                            [characterId]: {
                                ...existing,
                                ...patch,
                            },
                        },
                    };
                });
            };

            const shouldQueueRequest = () => typeof navigator !== "undefined" && navigator.onLine === false;
            const nativeFetch = globalThis.fetch.bind(globalThis);

            const inferPendingSyncType = (method: "POST" | "DELETE", body: Record<string, unknown>): PendingSyncType => {
                if (method === "DELETE") {
                    return "conversation-delete";
                }

                const messages = Array.isArray(body.messages) ? body.messages as Array<Record<string, unknown>> : null;
                if (messages && messages.length > 0) {
                    if (messages.some((message) => typeof message?.reactions === "object" && message.reactions !== null)) {
                        return "message-reaction";
                    }
                    if (messages.every((message) => message?.status === "seen")) {
                        return "message-status";
                    }
                    return "messages-upsert";
                }

                return "conversation-metadata";
            };

            const fetch = async (input: string | URL | Request, init?: RequestInit) => {
                if (
                    shouldQueueRequest() &&
                    typeof input === "string" &&
                    input === "/api/messages" &&
                    init?.body &&
                    (init?.method === "POST" || init?.method === "DELETE")
                ) {
                    try {
                        const parsedBody = JSON.parse(String(init.body)) as Record<string, unknown>;
                        await enqueuePendingSync({
                            type: inferPendingSyncType(init.method, parsedBody),
                            url: "/api/messages",
                            method: init.method,
                            body: parsedBody,
                            conversationId: typeof parsedBody.conversationId === "string" ? parsedBody.conversationId : undefined,
                        });

                        return new Response(JSON.stringify({ queued: true, success: true }), {
                            status: 202,
                            headers: { "Content-Type": "application/json" },
                        });
                    } catch {
                        // Fall through to the native fetch when we cannot serialize the request body safely.
                    }
                }

                return nativeFetch(input, init);
            };

            const syncMessagesApi = async ({
                type,
                method,
                body,
                conversationId,
                messageIds,
                dedupeKey,
                onQueue,
                onSuccess,
                onPermanentFailure,
            }: {
                type: PendingSyncType;
                method: "POST" | "DELETE";
                body: Record<string, unknown>;
                conversationId?: string;
                messageIds?: string[];
                dedupeKey?: string;
                onQueue?: () => void;
                onSuccess?: () => void;
                onPermanentFailure?: () => void;
            }) => {
                if (shouldQueueRequest()) {
                    await enqueuePendingSync({
                        type,
                        url: "/api/messages",
                        method,
                        body,
                        dedupeKey,
                        conversationId,
                        messageIds,
                    });
                    onQueue?.();
                    return;
                }

                try {
                    const response = await nativeFetch("/api/messages", {
                        method,
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(body),
                    });

                    if (!response.ok) {
                        if ([400, 401, 403, 404, 422].includes(response.status)) {
                            onPermanentFailure?.();
                            return;
                        }

                        throw new Error(`HTTP ${response.status}`);
                    }

                    onSuccess?.();
                } catch (error) {
                    await enqueuePendingSync({
                        type,
                        url: "/api/messages",
                        method,
                        body,
                        dedupeKey,
                        conversationId,
                        messageIds,
                    });
                    onQueue?.();
                    console.error("Deferred chat sync due to temporary failure", error);
                }
            };

            return {
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

                void syncMessagesApi({
                    type: "conversation-delete",
                    method: "DELETE",
                    body: { conversationId: characterId },
                    conversationId: characterId,
                    dedupeKey: `clear:${characterId}`,
                });
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
                void syncMessagesApi({
                    type: "conversation-delete",
                    method: "DELETE",
                    body: { conversationId: characterId, deleteConversation: true },
                    conversationId: characterId,
                    dedupeKey: `delete:${characterId}`,
                });
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
                        metadata.conversationType !== undefined 
                            ? (metadata.conversationType === "group" || metadata.conversationType === "world")
                            : undefined
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
                                    _pendingSync: metadata._pendingSync !== undefined ? metadata._pendingSync : existing._pendingSync,
                                    _syncFailedAt: metadata._syncFailedAt !== undefined ? metadata._syncFailedAt : existing._syncFailedAt,
                                    lastMessage: metadata.lastMessage ?? existing.lastMessage,
                                    lastTimestamp: metadata.lastTimestamp ?? existing.lastTimestamp,
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
                                lastMessage: metadata.lastMessage ?? "",
                                lastTimestamp: metadata.lastTimestamp ?? Date.now(),
                                conversationType: metadata.conversationType,
                                isGroup: derivedIsGroup,
                                groupName: metadata.groupName,
                                groupImage: metadata.groupImage,
                                groupMemberIds: metadata.groupMemberIds,
                                worldData: metadata.worldData,
                                storyData: metadata.storyData,
                                creatorId: metadata.creatorId,
                                _pendingSync: metadata._pendingSync,
                                _syncFailedAt: metadata._syncFailedAt,
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

            setHideStoryBackground: (characterId, hide) => {
                set((state) => {
                    const existing = state.conversations[characterId];
                    if (!existing) return state;

                    return {
                        conversations: {
                            ...state.conversations,
                            [characterId]: {
                                ...existing,
                                hideStoryBackground: hide,
                            }
                        }
                    };
                });
            },

            setStoryBgColor: (characterId, color) => {
                set((state) => {
                    const existing = state.conversations[characterId];
                    if (!existing) return state;
                    return {
                        conversations: {
                            ...state.conversations,
                            [characterId]: { ...existing, storyBgColor: color },
                        },
                    };
                });
            },

            setStoryTextColor: (characterId, color) => {
                set((state) => {
                    const existing = state.conversations[characterId];
                    if (!existing) return state;
                    return {
                        conversations: {
                            ...state.conversations,
                            [characterId]: { ...existing, storyTextColor: color },
                        },
                    };
                });
            },

            updateStoryScene: (characterId, scene) => {
                set((state) => {
                    const existing = state.conversations[characterId];
                    if (!existing) return state;
                    return {
                        conversations: {
                            ...state.conversations,
                            [characterId]: {
                                ...existing,
                                storyData: {
                                    ...(existing.storyData || {
                                        synopsis: "",
                                        genre: "",
                                        isPublished: false,
                                        playerCharacterName: "",
                                        playerCharacterDescription: "",
                                    }),
                                    currentScene: scene,
                                },
                            },
                        },
                    };
                });

                const convo = get().conversations[characterId];
                setConversationSyncMarkers(characterId, { _pendingSync: true, _syncFailedAt: undefined });
                void syncMessagesApi({
                    type: "conversation-metadata",
                    method: "POST",
                    body: {
                        conversationId: characterId,
                        conversationType: convo?.conversationType || "story",
                        conversationMetadata: buildConversationMetadata(convo),
                    },
                    conversationId: characterId,
                    dedupeKey: `story-scene:${characterId}`,
                    onQueue: () => {
                        setConversationSyncMarkers(characterId, { _pendingSync: true, _syncFailedAt: Date.now() });
                    },
                    onSuccess: () => {
                        setConversationSyncMarkers(characterId, { _pendingSync: undefined, _syncFailedAt: undefined });
                    },
                    onPermanentFailure: () => {
                        setConversationSyncMarkers(characterId, { _pendingSync: undefined, _syncFailedAt: Date.now() });
                    },
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

            setMessageStatus: (characterId, messageIds, status) => {
                setMessageStatusInState(characterId, messageIds, status);
            },

            sendMessage: (characterId, content, attachment, replyToId) => {
                const msg: ChatMessage = {
                    id: `${Date.now()}-user-${Math.random().toString(36).substr(2, 6)}`,
                    role: "user",
                    content,
                    timestamp: Date.now(),
                    status: shouldQueueRequest() ? "queued" : "sending",
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
                const syncedMessage = { ...msg, status: "sent" as const };
                void syncMessagesApi({
                    type: "messages-upsert",
                    method: "POST",
                    body: {
                        conversationId: characterId,
                        messages: [syncedMessage],
                        conversationType: convo?.conversationType || "personal",
                        conversationMetadata: buildConversationMetadata(convo),
                    },
                    conversationId: characterId,
                    messageIds: [msg.id],
                    onQueue: () => {
                        setMessageStatusInState(characterId, [msg.id], "queued");
                    },
                    onSuccess: () => {
                        setMessageStatusInState(characterId, [msg.id], "sent");
                        setConversationSyncMarkers(characterId, { _pendingSync: undefined, _syncFailedAt: undefined });
                    },
                    onPermanentFailure: () => {
                        setMessageStatusInState(characterId, [msg.id], "failed");
                    },
                });
            },

            addReply: (characterId, content, attachment, replyToId) => {
                const msg: ChatMessage = {
                    id: `${Date.now()}-ai-${Math.random().toString(36).substr(2, 6)}`,
                    role: "assistant",
                    content,
                    timestamp: Date.now(),
                    status: shouldQueueRequest() ? "queued" : "sending",
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
                const syncedMessage = { ...msg, status: "sent" as const };
                void syncMessagesApi({
                    type: "messages-upsert",
                    method: "POST",
                    body: {
                        conversationId: characterId,
                        messages: [syncedMessage],
                        conversationType: convo?.conversationType || "personal",
                        conversationMetadata: buildConversationMetadata(convo),
                    },
                    conversationId: characterId,
                    messageIds: [msg.id],
                    onQueue: () => {
                        setMessageStatusInState(characterId, [msg.id], "queued");
                    },
                    onSuccess: () => {
                        setMessageStatusInState(characterId, [msg.id], "sent");
                        setConversationSyncMarkers(characterId, { _pendingSync: undefined, _syncFailedAt: undefined });
                    },
                    onPermanentFailure: () => {
                        setMessageStatusInState(characterId, [msg.id], "failed");
                    },
                });

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
                        void syncMessagesApi({
                            type: "message-reaction",
                            method: "POST",
                            body: {
                                conversationId: characterId,
                                messages: [{ ...updatedMsg, status: updatedMsg.status === "seen" ? "seen" : "sent" }],
                                conversationType: get().conversations[characterId]?.conversationType || "personal",
                            },
                            conversationId: characterId,
                            messageIds: [messageId],
                            dedupeKey: `reaction:${characterId}:${messageId}`,
                        });
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
                        void syncMessagesApi({
                            type: "message-reaction",
                            method: "POST",
                            body: {
                                conversationId: characterId,
                                messages: [{ ...updatedMsg, status: updatedMsg.status === "seen" ? "seen" : "sent" }],
                                conversationType: get().conversations[characterId]?.conversationType || "personal",
                            },
                            conversationId: characterId,
                            messageIds: [messageId],
                            dedupeKey: `reaction:${characterId}:${messageId}`,
                        });
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
                        void syncMessagesApi({
                            type: "message-status",
                            method: "POST",
                            body: {
                                conversationId: characterId,
                                messages: msgsToSync.map((message) => ({ ...message, status: "seen" as const })),
                                conversationType: get().conversations[characterId]?.conversationType || "personal",
                            },
                            conversationId: characterId,
                            messageIds: msgsToSync.map((message) => message.id),
                            dedupeKey: `seen:${characterId}:${roleToMark}`,
                        });
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
                        if (res.status === 202) {
                            set((state) => {
                                const convo = state.conversations[groupId];
                                if (!convo) return state;
                                return { conversations: { ...state.conversations, [groupId]: { ...convo, _pendingSync: true, _syncFailedAt: Date.now() } } };
                            });
                            return;
                        }
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
                            return { conversations: { ...state.conversations, [groupId]: { ...convo, _syncFailedAt: Date.now(), _pendingSync: undefined } } };
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
                        if (res.status === 202) {
                            set((state) => {
                                const convo = state.conversations[storyId];
                                if (!convo) return state;
                                return { conversations: { ...state.conversations, [storyId]: { ...convo, _pendingSync: true, _syncFailedAt: Date.now() } } };
                            });
                            return;
                        }
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
                            return { conversations: { ...state.conversations, [storyId]: { ...convo, _syncFailedAt: Date.now(), _pendingSync: undefined } } };
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
                    status: shouldQueueRequest() ? "queued" : "sending",
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
                })
                .then((res) => {
                    if (res.status === 202) {
                        setMessageStatusInState(groupId, [msg.id], "queued");
                        return;
                    }
                    if (res.ok) {
                        setMessageStatusInState(groupId, [msg.id], "sent");
                        return;
                    }
                    setMessageStatusInState(groupId, [msg.id], "failed");
                })
                .catch(err => {
                    setMessageStatusInState(groupId, [msg.id], "failed");
                    console.error("Failed to sync group message", err);
                });
            },

            addGroupReply: (groupId, content, senderId, senderName, attachment, replyToId) => {
                const msg: ChatMessage = {
                    id: `${Date.now()}-ai-${Math.random().toString(36).substr(2, 6)}`,
                    role: "assistant",
                    content,
                    timestamp: Date.now(),
                    status: shouldQueueRequest() ? "queued" : "sending",
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
                })
                .then((res) => {
                    if (res.status === 202) {
                        setMessageStatusInState(groupId, [msg.id], "queued");
                        return;
                    }
                    if (res.ok) {
                        setMessageStatusInState(groupId, [msg.id], "sent");
                        return;
                    }
                    setMessageStatusInState(groupId, [msg.id], "failed");
                })
                .catch(err => {
                    setMessageStatusInState(groupId, [msg.id], "failed");
                    console.error("Failed to sync group message", err);
                });

                // AI replied → mark user's messages as "seen" (the AI has read them)
                get().markAsSeen(groupId, "user");
            },
            };
        },
        {
            name: CHAT_STORE_STORAGE_KEY,
            storage: createJSONStorage(() => indexedDbStateStorage),
            // Keep all conversations but aggressively slim persisted payloads
            // so data URLs, attachments, and large world/story blobs do not
            // blow up the 5MB localStorage limit.
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
                responseLanguage: state.responseLanguage,
                conversations: Object.fromEntries(
                    Object.entries(state.conversations).map(([key, conv]) => [
                        key,
                        slimConversationForPersistence(conv)
                    ])
                ),
            }),
        }
    )
);
