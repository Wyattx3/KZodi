"use client";

import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Network } from "@capacitor/network";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChatStore } from "@/lib/chatStore";
import {
    flushPendingSyncQueue,
    writeAppVersionState,
    writeOfflineSnapshot,
    type OfflineConversationSnapshot,
    type PendingSyncItem,
} from "@/lib/offlineSync";

function hasEditableFocus() {
    if (typeof document === "undefined") {
        return false;
    }

    const activeElement = document.activeElement;
    if (!activeElement) {
        return false;
    }

    if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement || activeElement instanceof HTMLSelectElement) {
        return true;
    }

    return activeElement instanceof HTMLElement && activeElement.isContentEditable;
}

function appIsBusy() {
    if (typeof document === "undefined") {
        return false;
    }

    return document.body.dataset.kakoeiBusy === "true" || hasEditableFocus();
}

function buildOfflineSnapshot(
    ownerUserId: string | null,
    activeCharacterId: string | null,
    conversations: ReturnType<typeof useChatStore.getState>["conversations"],
): OfflineConversationSnapshot {
    return {
        ownerUserId,
        activeCharacterId,
        generatedAt: Date.now(),
        conversations: Object.values(conversations)
            .sort((left, right) => right.lastTimestamp - left.lastTimestamp)
            .slice(0, 20)
            .map((conversation) => ({
                characterId: conversation.characterId,
                title: conversation.customName || conversation.groupName || conversation.characterId,
                lastMessage: conversation.lastMessage || "",
                lastTimestamp: conversation.lastTimestamp || 0,
                unreadCount: conversation.messages.filter((message) => message.role === "assistant" && message.status !== "seen").length,
                conversationType: conversation.conversationType,
            })),
    };
}

export default function AppRuntimeBridge() {
    const conversations = useChatStore((state) => state.conversations);
    const ownerUserId = useChatStore((state) => state.ownerUserId);
    const activeCharacterId = useChatStore((state) => state.activeCharacterId);
    const setOwnerUserId = useChatStore((state) => state.setOwnerUserId);
    const resetConversations = useChatStore((state) => state.resetConversations);
    const setMessageStatus = useChatStore((state) => state.setMessageStatus);
    const upsertConversation = useChatStore((state) => state.upsertConversation);
    const [hasHydrated, setHasHydrated] = useState(() => useChatStore.persist.hasHydrated());
    const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
    const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
    const waitingWorkerRef = useRef<ServiceWorker | null>(null);
    const attemptApplyWaitingWorkerRef = useRef<() => void>(() => {});
    const updateRetryTimerRef = useRef<number | null>(null);
    const shouldReloadOnControllerChangeRef = useRef(false);
    const isNativeApp = useMemo(() => Capacitor.isNativePlatform(), []);

    const clearQueuedUpdateRetry = useCallback(() => {
        if (updateRetryTimerRef.current !== null) {
            window.clearTimeout(updateRetryTimerRef.current);
            updateRetryTimerRef.current = null;
        }
    }, []);

    const applySyncSuccess = useCallback((item: PendingSyncItem) => {
        if (item.conversationId && item.messageIds && item.messageIds.length > 0) {
            setMessageStatus(item.conversationId, item.messageIds, "sent");
        }

        if (item.type === "conversation-metadata" && item.conversationId) {
            upsertConversation(item.conversationId, {
                _pendingSync: undefined,
                _syncFailedAt: undefined,
            });
        }
    }, [setMessageStatus, upsertConversation]);

    const applySyncPermanentFailure = useCallback((item: PendingSyncItem) => {
        if (item.conversationId && item.messageIds && item.messageIds.length > 0) {
            setMessageStatus(item.conversationId, item.messageIds, "failed");
        }

        if (item.type === "conversation-metadata" && item.conversationId) {
            upsertConversation(item.conversationId, {
                _pendingSync: undefined,
                _syncFailedAt: Date.now(),
            });
        }
    }, [setMessageStatus, upsertConversation]);

    const flushQueue = useCallback(async () => {
        if (!hasHydrated || !isOnline) {
            return;
        }

        await flushPendingSyncQueue({
            onSuccess: applySyncSuccess,
            onPermanentFailure: applySyncPermanentFailure,
        });
    }, [applySyncPermanentFailure, applySyncSuccess, hasHydrated, isOnline]);

    const verifyOwner = useCallback(async () => {
        if (!hasHydrated || !isOnline) {
            return;
        }

        try {
            const response = await fetch("/api/user/me", { cache: "no-store" });

            if (response.status === 401) {
                resetConversations();
                return;
            }

            if (!response.ok) {
                return;
            }

            const payload = await response.json();
            const currentUserId = payload?.userId ?? payload?.id ?? null;

            if (currentUserId && ownerUserId && currentUserId !== ownerUserId) {
                resetConversations();
                return;
            }

            if (currentUserId) {
                setOwnerUserId(currentUserId);
            }
        } catch {
            // Offline/temporary network failures should not evict cached state.
        }
    }, [hasHydrated, isOnline, ownerUserId, resetConversations, setOwnerUserId]);

    const attemptApplyWaitingWorker = useCallback(() => {
        const waitingWorker = waitingWorkerRef.current;
        if (!waitingWorker) {
            return;
        }

        if (typeof document !== "undefined" && document.visibilityState === "hidden") {
            clearQueuedUpdateRetry();
            updateRetryTimerRef.current = window.setTimeout(() => {
                attemptApplyWaitingWorkerRef.current();
            }, 2500);
            return;
        }

        if (appIsBusy()) {
            clearQueuedUpdateRetry();
            updateRetryTimerRef.current = window.setTimeout(() => {
                attemptApplyWaitingWorkerRef.current();
            }, 2500);
            return;
        }

        clearQueuedUpdateRetry();
        shouldReloadOnControllerChangeRef.current = true;
        waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }, [clearQueuedUpdateRetry]);

    useEffect(() => {
        attemptApplyWaitingWorkerRef.current = attemptApplyWaitingWorker;
    }, [attemptApplyWaitingWorker]);

    const refreshRuntimeState = useCallback(async () => {
        await verifyOwner();
        await flushQueue();

        if (registrationRef.current) {
            try {
                await registrationRef.current.update();
            } catch {
                // ignore
            }
        }

        attemptApplyWaitingWorker();
    }, [attemptApplyWaitingWorker, flushQueue, verifyOwner]);

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
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        let removeNetworkListener: (() => void) | null = null;

        if (isNativeApp) {
            void Network.getStatus().then((status) => {
                setIsOnline(status.connected);
            }).catch(() => {
                // ignore
            });

            void Network.addListener("networkStatusChange", (status) => {
                setIsOnline(status.connected);
            }).then((listener) => {
                removeNetworkListener = () => {
                    void listener.remove();
                };
            }).catch(() => {
                // ignore
            });
        }

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
            removeNetworkListener?.();
        };
    }, [isNativeApp]);

    useEffect(() => {
        if (!hasHydrated) {
            return;
        }

        const snapshot = buildOfflineSnapshot(ownerUserId, activeCharacterId, conversations);
        void writeOfflineSnapshot(snapshot);
    }, [activeCharacterId, conversations, hasHydrated, ownerUserId]);

    useEffect(() => {
        if (!hasHydrated || !isOnline) {
            return;
        }

        void refreshRuntimeState();
    }, [hasHydrated, isOnline, refreshRuntimeState]);

    useEffect(() => {
        if (!("serviceWorker" in navigator)) {
            return;
        }

        let isDisposed = false;

        const handleControllerChange = () => {
            if (!shouldReloadOnControllerChangeRef.current) {
                return;
            }

            shouldReloadOnControllerChangeRef.current = false;
            void writeAppVersionState({
                activeVersion: `sw-${Date.now()}`,
                waitingVersion: null,
                updatedAt: Date.now(),
                lastReloadAt: Date.now(),
            });
            window.location.reload();
        };

        const handleServiceWorkerMessage = (event: MessageEvent) => {
            const data = event.data as { type?: string; activatedAt?: number } | undefined;
            if (!data?.type) {
                return;
            }

            if (data.type === "KAKOEI_SW_ACTIVATED") {
                void writeAppVersionState({
                    activeVersion: `sw-${data.activatedAt ?? Date.now()}`,
                    waitingVersion: null,
                    updatedAt: data.activatedAt ?? Date.now(),
                });
            }
        };

        const rememberWaitingWorker = async (registration: ServiceWorkerRegistration) => {
            if (!registration.waiting) {
                return;
            }

            waitingWorkerRef.current = registration.waiting;
            await writeAppVersionState({
                activeVersion: "current",
                waitingVersion: `waiting-${Date.now()}`,
                updatedAt: Date.now(),
            });
            attemptApplyWaitingWorker();
        };

        const registerWorker = async () => {
            try {
                const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
                if (isDisposed) {
                    return;
                }

                registrationRef.current = registration;
                await rememberWaitingWorker(registration);

                registration.addEventListener("updatefound", () => {
                    const installingWorker = registration.installing;
                    if (!installingWorker) {
                        return;
                    }

                    installingWorker.addEventListener("statechange", () => {
                        if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                            void rememberWaitingWorker(registration);
                        }
                    });
                });
            } catch {
                // ignore service worker registration failures
            }
        };

        navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
        navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
        void registerWorker();

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                void refreshRuntimeState();
            }
        };
        const handleFocus = () => {
            void refreshRuntimeState();
        };

        window.addEventListener("focus", handleFocus);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        let removeAppListener: (() => void) | null = null;
        if (isNativeApp) {
            void CapacitorApp.addListener("appStateChange", ({ isActive }) => {
                if (isActive) {
                    void refreshRuntimeState();
                }
            }).then((listener) => {
                removeAppListener = () => {
                    void listener.remove();
                };
            }).catch(() => {
                // ignore
            });
        }

        return () => {
            isDisposed = true;
            clearQueuedUpdateRetry();
            navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
            navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
            window.removeEventListener("focus", handleFocus);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            removeAppListener?.();
        };
    }, [attemptApplyWaitingWorker, clearQueuedUpdateRetry, isNativeApp, refreshRuntimeState]);

    return null;
}
