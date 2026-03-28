"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useChatStore, type ChatMessage } from "@/lib/chatStore";
import StoryRoom from "@/components/story/StoryRoom";
import { fetchServerStoryConversation } from "@/lib/storyConversation";

export default function StoryPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [storyId, setStoryId] = useState<string | null>(null);
    const [hasHydrated, setHasHydrated] = useState(() => useChatStore.persist.hasHydrated());
    const [loadState, setLoadState] = useState<"idle" | "loading" | "failed">("idle");
    const [hasAttemptedServerHydration, setHasAttemptedServerHydration] = useState(false);
    const conversation = useChatStore((state) => (storyId ? state.conversations[storyId] : undefined));
    const localStoryConversation = conversation?.conversationType === "story" ? conversation : undefined;
    const shouldHydrateOptimisticLocalStory =
        localStoryConversation?._pendingSync === true ||
        typeof localStoryConversation?._syncFailedAt === "number";
    const shouldHydrateFromServer =
        !localStoryConversation ||
        shouldHydrateOptimisticLocalStory ||
        localStoryConversation.messages.length === 0;

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
        setHasAttemptedServerHydration(false);
        setLoadState("idle");
    }, [storyId]);

    useEffect(() => {
        if (!storyId || !hasHydrated || !shouldHydrateFromServer) {
            return;
        }

        setHasAttemptedServerHydration(false);
    }, [
        hasHydrated,
        localStoryConversation?.messages.length,
        localStoryConversation?._pendingSync,
        localStoryConversation?._syncFailedAt,
        shouldHydrateFromServer,
        storyId,
    ]);

    useEffect(() => {
        if (!storyId || !hasHydrated) {
            return;
        }

        const shouldLoadFromServer = !hasAttemptedServerHydration && shouldHydrateFromServer;

        if (!shouldLoadFromServer) {
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
                const serverConversation = await fetchServerStoryConversation(storyId);

                if (!serverConversation) {
                    if (!isCancelled) {
                        setHasAttemptedServerHydration(true);
                        setLoadState(localStoryConversation ? "idle" : "failed");
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

                const messagesResponse = await fetch(`/api/messages?conversationId=${storyId}`, {
                    cache: "no-store",
                });
                if (messagesResponse.ok) {
                    const messagesData = await messagesResponse.json();
                    if (!isCancelled) {
                        store.setMessages(storyId, (messagesData?.messages || []) as ChatMessage[]);
                    }
                }

                if (!isCancelled) {
                    setHasAttemptedServerHydration(true);
                    setLoadState("idle");
                }
            } catch (error) {
                console.error("Failed to load story conversation", error);
                if (!isCancelled) {
                    setHasAttemptedServerHydration(true);
                    setLoadState(localStoryConversation ? "idle" : "failed");
                }
            }
        };

        void loadStoryConversation();

        return () => {
            isCancelled = true;
        };
    }, [hasHydrated, hasAttemptedServerHydration, loadState, localStoryConversation, shouldHydrateFromServer, storyId]);

    useEffect(() => {
        if (!storyId || !hasHydrated) {
            return;
        }

        if (localStoryConversation) {
            return;
        }

        if (loadState === "failed") {
            router.replace("/chat");
        }
    }, [hasHydrated, loadState, localStoryConversation, router, storyId]);

    if (!storyId || !hasHydrated || (!localStoryConversation && loadState === "loading")) {
        return <div className="min-h-[100dvh]" style={{ backgroundColor: "#0E0C0A" }} />;
    }

    if (!localStoryConversation) {
        return <div className="min-h-[100dvh]" style={{ backgroundColor: "#0E0C0A" }} />;
    }

    return <StoryRoom storyId={storyId} />;
}
