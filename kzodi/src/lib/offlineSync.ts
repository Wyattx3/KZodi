"use client";

import { Capacitor } from "@capacitor/core";
import type { StateStorage } from "zustand/middleware";

const OFFLINE_DB_NAME = "KakoeiOfflineV1";
const OFFLINE_DB_VERSION = 1;
const KEY_VALUE_STORE = "kv";
const QUEUE_STORE = "queue";

export const CHAT_STORE_STORAGE_KEY = "kakoei-chat-store";
export const OFFLINE_SNAPSHOT_STORAGE_KEY = "kakoei-offline-shell-snapshot";
export const APP_VERSION_STORAGE_KEY = "kakoei-app-version-state";

export type PendingSyncMethod = "POST" | "DELETE";
export type PendingSyncType =
    | "messages-upsert"
    | "message-status"
    | "message-reaction"
    | "conversation-metadata"
    | "conversation-delete";

export interface PendingSyncItem {
    id: string;
    type: PendingSyncType;
    url: string;
    method: PendingSyncMethod;
    body: Record<string, unknown>;
    queuedAt: number;
    retryCount: number;
    lastAttemptAt?: number;
    dedupeKey?: string;
    conversationId?: string;
    messageIds?: string[];
}

export interface OfflineConversationSnapshot {
    ownerUserId: string | null;
    activeCharacterId: string | null;
    generatedAt: number;
    conversations: Array<{
        characterId: string;
        title: string;
        lastMessage: string;
        lastTimestamp: number;
        unreadCount: number;
        conversationType?: string;
    }>;
}

export interface AppVersionState {
    activeVersion: string;
    waitingVersion?: string | null;
    updatedAt: number;
    lastReloadAt?: number;
}

interface QueueFlushCallbacks {
    onSuccess?: (item: PendingSyncItem, response: Response) => Promise<void> | void;
    onPermanentFailure?: (item: PendingSyncItem, response: Response) => Promise<void> | void;
    onTransientFailure?: (item: PendingSyncItem, error?: unknown) => Promise<void> | void;
}

function isBrowser() {
    return typeof window !== "undefined";
}

function canUseIndexedDb() {
    return isBrowser() && typeof indexedDB !== "undefined";
}

function safeJsonParse<T>(value: string | null | undefined): T | null {
    if (!value) {
        return null;
    }

    try {
        return JSON.parse(value) as T;
    } catch {
        return null;
    }
}

let dbPromise: Promise<IDBDatabase> | null = null;

async function openOfflineDb() {
    if (!canUseIndexedDb()) {
        throw new Error("IndexedDB is unavailable in this environment.");
    }

    if (!dbPromise) {
        dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);

            request.onupgradeneeded = () => {
                const database = request.result;

                if (!database.objectStoreNames.contains(KEY_VALUE_STORE)) {
                    database.createObjectStore(KEY_VALUE_STORE);
                }

                if (!database.objectStoreNames.contains(QUEUE_STORE)) {
                    const store = database.createObjectStore(QUEUE_STORE, { keyPath: "id" });
                    store.createIndex("queuedAt", "queuedAt");
                    store.createIndex("dedupeKey", "dedupeKey", { unique: false });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error ?? new Error("Failed to open offline database."));
        });
    }

    return dbPromise;
}

async function withStore<T>(
    storeName: string,
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => void,
) {
    const database = await openOfflineDb();

    return new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);

        let settled = false;
        const resolveOnce = (value: T) => {
            if (settled) return;
            settled = true;
            resolve(value);
        };
        const rejectOnce = (error: unknown) => {
            if (settled) return;
            settled = true;
            reject(error);
        };

        transaction.onabort = () => rejectOnce(transaction.error ?? new Error(`Transaction aborted for ${storeName}.`));
        transaction.onerror = () => rejectOnce(transaction.error ?? new Error(`Transaction failed for ${storeName}.`));

        try {
            run(store);
        } catch (error) {
            rejectOnce(error);
        }

        transaction.oncomplete = () => {
            if (!settled) {
                resolveOnce(undefined as T);
            }
        };
    });
}

async function readKeyValue(key: string) {
    if (!canUseIndexedDb()) {
        return null;
    }

    try {
        const database = await openOfflineDb();
        return await new Promise<string | null>((resolve) => {
            const transaction = database.transaction(KEY_VALUE_STORE, "readonly");
            const store = transaction.objectStore(KEY_VALUE_STORE);
            const request = store.get(key);
            request.onsuccess = () => resolve(typeof request.result === "string" ? request.result : null);
            request.onerror = () => resolve(null);
        });
    } catch {
        return null;
    }
}

async function writeKeyValue(key: string, value: string) {
    if (!canUseIndexedDb()) {
        return;
    }

    try {
        await withStore<void>(KEY_VALUE_STORE, "readwrite", (store) => {
            store.put(value, key);
        });
    } catch {
        // Ignore offline persistence write failures; the app still works in memory.
    }
}

async function deleteKeyValue(key: string) {
    if (!canUseIndexedDb()) {
        return;
    }

    try {
        await withStore<void>(KEY_VALUE_STORE, "readwrite", (store) => {
            store.delete(key);
        });
    } catch {
        // ignore
    }
}

async function migrateLegacyStorageValue(name: string) {
    if (!isBrowser()) {
        return null;
    }

    const legacyValue = window.localStorage.getItem(name);
    if (!legacyValue) {
        return null;
    }

    await writeKeyValue(name, legacyValue);
    return legacyValue;
}

export const indexedDbStateStorage: StateStorage = {
    async getItem(name) {
        const persistedValue = await readKeyValue(name);
        if (persistedValue !== null) {
            return persistedValue;
        }

        return migrateLegacyStorageValue(name);
    },
    async setItem(name, value) {
        await writeKeyValue(name, value);

        if (isBrowser()) {
            try {
                window.localStorage.removeItem(name);
            } catch {
                // ignore cleanup failures
            }
        }
    },
    async removeItem(name) {
        await deleteKeyValue(name);

        if (isBrowser()) {
            try {
                window.localStorage.removeItem(name);
            } catch {
                // ignore cleanup failures
            }
        }
    },
};

function buildQueueItem(input: Omit<PendingSyncItem, "id" | "queuedAt" | "retryCount" | "lastAttemptAt">) {
    return {
        ...input,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        queuedAt: Date.now(),
        retryCount: 0,
    } satisfies PendingSyncItem;
}

export async function enqueuePendingSync(
    input: Omit<PendingSyncItem, "id" | "queuedAt" | "retryCount" | "lastAttemptAt">,
) {
    const item = buildQueueItem(input);

    if (!canUseIndexedDb()) {
        return item;
    }

    try {
        await withStore<void>(QUEUE_STORE, "readwrite", (store) => {
            if (item.dedupeKey) {
                const dedupeIndex = store.index("dedupeKey");
                const existingRequest = dedupeIndex.getAll(item.dedupeKey);
                existingRequest.onsuccess = () => {
                    const existingItems = (existingRequest.result || []) as PendingSyncItem[];
                    for (const existingItem of existingItems) {
                        store.delete(existingItem.id);
                    }
                    store.put(item);
                };
                existingRequest.onerror = () => {
                    store.put(item);
                };
                return;
            }

            store.put(item);
        });
    } catch {
        // ignore queue write failure
    }

    return item;
}

export async function listPendingSyncItems() {
    if (!canUseIndexedDb()) {
        return [] as PendingSyncItem[];
    }

    try {
        const database = await openOfflineDb();
        return await new Promise<PendingSyncItem[]>((resolve) => {
            const transaction = database.transaction(QUEUE_STORE, "readonly");
            const store = transaction.objectStore(QUEUE_STORE);
            const request = store.getAll();

            request.onsuccess = () => {
                const items = ((request.result || []) as PendingSyncItem[]).sort((left, right) => left.queuedAt - right.queuedAt);
                resolve(items);
            };
            request.onerror = () => resolve([]);
        });
    } catch {
        return [];
    }
}

async function removePendingSync(id: string) {
    if (!canUseIndexedDb()) {
        return;
    }

    try {
        await withStore<void>(QUEUE_STORE, "readwrite", (store) => {
            store.delete(id);
        });
    } catch {
        // ignore
    }
}

async function updatePendingSync(item: PendingSyncItem) {
    if (!canUseIndexedDb()) {
        return;
    }

    try {
        await withStore<void>(QUEUE_STORE, "readwrite", (store) => {
            store.put(item);
        });
    } catch {
        // ignore
    }
}

function isPermanentSyncFailure(response: Response) {
    return response.status === 400 || response.status === 401 || response.status === 403 || response.status === 404 || response.status === 422;
}

export async function flushPendingSyncQueue(callbacks: QueueFlushCallbacks = {}) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return { processed: 0, remaining: await listPendingSyncItems() };
    }

    const queue = await listPendingSyncItems();
    let processed = 0;

    for (const item of queue) {
        try {
            const response = await fetch(item.url, {
                method: item.method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(item.body),
            });

            if (!response.ok) {
                if (isPermanentSyncFailure(response)) {
                    await removePendingSync(item.id);
                    await callbacks.onPermanentFailure?.(item, response);
                    processed += 1;
                    continue;
                }

                throw new Error(`HTTP ${response.status}`);
            }

            await removePendingSync(item.id);
            await callbacks.onSuccess?.(item, response);
            processed += 1;
        } catch (error) {
            const updatedItem: PendingSyncItem = {
                ...item,
                retryCount: item.retryCount + 1,
                lastAttemptAt: Date.now(),
            };
            await updatePendingSync(updatedItem);
            await callbacks.onTransientFailure?.(updatedItem, error);
        }
    }

    return { processed, remaining: await listPendingSyncItems() };
}

export async function writeOfflineSnapshot(snapshot: OfflineConversationSnapshot) {
    const serialized = JSON.stringify(snapshot);
    await writeKeyValue(OFFLINE_SNAPSHOT_STORAGE_KEY, serialized);

    if (isBrowser()) {
        try {
            window.localStorage.setItem(OFFLINE_SNAPSHOT_STORAGE_KEY, serialized);
        } catch {
            // ignore
        }
    }

    if (Capacitor.isNativePlatform()) {
        try {
            const { Preferences } = await import("@capacitor/preferences");
            await Preferences.set({
                key: OFFLINE_SNAPSHOT_STORAGE_KEY,
                value: serialized,
            });
        } catch {
            // ignore native mirror failures
        }
    }
}

export async function readOfflineSnapshot() {
    const persisted = await readKeyValue(OFFLINE_SNAPSHOT_STORAGE_KEY);
    const parsedPersisted = safeJsonParse<OfflineConversationSnapshot>(persisted);
    if (parsedPersisted) {
        return parsedPersisted;
    }

    if (isBrowser()) {
        const localValue = window.localStorage.getItem(OFFLINE_SNAPSHOT_STORAGE_KEY);
        const parsedLocal = safeJsonParse<OfflineConversationSnapshot>(localValue);
        if (parsedLocal) {
            return parsedLocal;
        }
    }

    if (Capacitor.isNativePlatform()) {
        try {
            const { Preferences } = await import("@capacitor/preferences");
            const { value } = await Preferences.get({ key: OFFLINE_SNAPSHOT_STORAGE_KEY });
            return safeJsonParse<OfflineConversationSnapshot>(value);
        } catch {
            return null;
        }
    }

    return null;
}

export async function writeAppVersionState(state: AppVersionState) {
    await writeKeyValue(APP_VERSION_STORAGE_KEY, JSON.stringify(state));
}

export async function readAppVersionState() {
    const persisted = await readKeyValue(APP_VERSION_STORAGE_KEY);
    return safeJsonParse<AppVersionState>(persisted);
}
