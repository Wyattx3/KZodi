"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useChatStore, type ChatMessage, type Conversation } from "@/lib/chatStore";
import StoryRoom from "@/components/story/StoryRoom";

interface ServerConversation {
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

export default function StoryPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [storyId, setStoryId] = useState<string | null>(null);
    const [hasHydrated, setHasHydrated] = useState(() => useChatStore.persist.hasHydrated());
    const [loadState, setLoadState] = useState<"idle" | "loading" | "failed">("idle");
    const conversation = useChatStore((state) => (storyId ? state.conversations[storyId] : undefined));

    useEffect(() => {
        params.then((resolved) => setStoryId(resolved.id));
    }, [params]);

    useEffect(() => {
        const unsubscribeHydrate = useChatStore.persist.onHydrate(() => {
            setHasHydrated(false);
        });
        const unsubscribeFinishHydration = useChatStore.persist.onFinishHydration(() => {
            setHasHydrated(true);
        });

        setHasHydrated(useChatStore.persist.hasHydrated());

        return () => {
            unsubscribeHydrate();
            unsubscribeFinishHydration();
        };
    }, []);

    useEffect(() => {
        if (!storyId) {
            return;
        }

        if (!hasHydrated) {
            return;
        }

        if (conversation?.conversationType === "story") {
            if (loadState === "loading") {
                setLoadState("idle");
            }
            return;
        }

        if (loadState !== "idle") {
            return;
        }

        let isCancelled = false;

        const loadStoryConversation = async () => {
            setLoadState("loading");

            try {
                const conversationsResponse = await fetch("/api/conversations");
                if (!conversationsResponse.ok) {
                    throw new Error(`Conversation lookup failed with ${conversationsResponse.status}`);
                }

                const data = await conversationsResponse.json();
                const serverConversation = ((data?.conversations || []) as ServerConversation[]).find(
                    (entry) => entry.characterId === storyId && entry.conversationType === "story"
                );

                if (!serverConversation) {
                    if (!isCancelled) {
                        setLoadState("failed");
                    }
                    return;
                }

                const store = useChatStore.getState();
                store.upsertConversation(storyId, {
                    conversationType: "story",
                    isGroup: false,
                    groupName: serverConversation.groupName || undefined,
                    groupImage: serverConversation.groupImage || undefined,
                    groupMemberIds: serverConversation.groupMemberIds || undefined,
                    worldData: serverConversation.worldData || undefined,
                    storyData: serverConversation.storyData || undefined,
                    creatorId: serverConversation.creatorId || undefined,
                    lastMessage: serverConversation.lastMessage || undefined,
                    lastTimestamp: serverConversation.lastTimestamp || undefined,
                    _pendingSync: undefined,
                    _syncFailedAt: undefined,
                });

                const messagesResponse = await fetch(`/api/messages?conversationId=${storyId}`);
                if (messagesResponse.ok) {
                    const messagesData = await messagesResponse.json();
                    if (!isCancelled) {
                        store.setMessages(storyId, (messagesData?.messages || []) as ChatMessage[]);
                    }
                }

                if (!isCancelled) {
                    setLoadState("idle");
                }
            } catch (error) {
                console.error("Failed to load story conversation", error);
                if (!isCancelled) {
                    setLoadState("failed");
                }
            }
        };

        void loadStoryConversation();

        return () => {
            isCancelled = true;
        };
    }, [conversation?.conversationType, hasHydrated, loadState, storyId]);

    useEffect(() => {
        if (!storyId || !hasHydrated) {
            return;
        }

        if (conversation?.conversationType === "story") {
            return;
        }

        if (loadState === "failed") {
            router.replace("/chat");
        }
    }, [conversation, hasHydrated, loadState, router, storyId]);

    if (!storyId || !hasHydrated || loadState === "loading") {
        return <div className="min-h-[100dvh]" style={{ backgroundColor: "#0E0C0A" }} />;
    }

    if (!conversation || conversation.conversationType !== "story") {
        return <div className="min-h-[100dvh]" style={{ backgroundColor: "#0E0C0A" }} />;
    }

    return <StoryRoom storyId={storyId} />;
}
