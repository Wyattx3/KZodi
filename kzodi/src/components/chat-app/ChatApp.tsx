"use client";
import React, { useState, useEffect } from "react";
import { motion, LayoutGroup } from "framer-motion";
import ExploreTab from "./ExploreTab";
import ChatsTab from "./ChatsTab";
import CreateTab from "./CreateTab";
import ProfileTab from "./ProfileTab";
import ChatRoom from "./ChatRoom";
import { CHARACTERS, type Character } from "@/data/characters";
import { useChatStore } from "@/lib/chatStore";
import { useSearchParams, useRouter } from "next/navigation";
import { App } from '@capacitor/app';

type Tab = "explore" | "chats" | "create" | "profile";

export default function ChatApp() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>("explore");
    const [activeCharacter, setActiveCharacter] = useState<Character | null>(null);
    const [showProfileOnLoad, setShowProfileOnLoad] = useState<boolean>(false);
    const [myCharacters, setMyCharacters] = useState<Character[]>([]);
    const [allCharacters, setAllCharacters] = useState<Character[]>([]);
    const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
    // `isLoadingChats` starts false (persisted fast-path) ONLY when:
    //   1. The store already has conversations, AND
    //   2. ownerUserId is stamped (i.e., the identity has been verified at least once).
    // If ownerUserId is null (legacy/untrusted store), we keep the skeleton until
    // identity verification completes to avoid flashing mismatched data.
    const [isLoadingChats, setIsLoadingChats] = useState(() => {
        const state = useChatStore.getState();
        const hasConversations = Object.keys(state.conversations).length > 0;
        const isIdentityTrusted = state.ownerUserId !== null;
        // Show persisted list immediately only when both conditions are met
        return !(hasConversations && isIdentityTrusted);
    });

    // Compute total unread count across all conversations
    const conversations = useChatStore((s) => s.conversations);
    const totalUnread = React.useMemo(() => {
        return Object.values(conversations).reduce((sum, convo) => {
            return sum + convo.messages.filter((m) => m.role === "assistant" && m.status !== "seen").length;
        }, 0);
    }, [conversations]);

    // Proactive Messaging Hook (Background — when user is NOT in a chat)
    useEffect(() => {
        if (!mounted) return;

        const interval = setInterval(async () => {
            const { conversations, addReply } = useChatStore.getState();

            if (allCharacters.length === 0) return;
            const char = allCharacters[Math.floor(Math.random() * allCharacters.length)];

            // Determine Personality
            const isCold = /cold|stoic|tsundere|quiet|mysterious|aloof|shy/i.test(char.tag + char.personality);

            // Probability: Cold = 5%, Regular = 50%
            const probability = isCold ? 0.05 : 0.5;

            // Cooldown: Cold = 8 hours, Regular = 3 hours
            const minCooldown = isCold
                ? 8 * 60 * 60 * 1000    // 8 hours
                : 3 * 60 * 60 * 1000;   // 3 hours

            // 1. Random Check
            if (Math.random() > probability) return;

            // 2. Active Check — don't send if user is chatting with this character
            if (activeCharacter?.id === char.id) return;

            const convo = conversations[char.id];

            // 3. Deleted Check — don't send if conversation was deleted / doesn't exist
            if (!convo) return;

            const lastTime = convo.lastTimestamp || 0;
            const now = Date.now();

            // 4. Cooldown Check
            if (lastTime > 0 && now - lastTime < minCooldown) return;

            try {
                const history = convo?.messages || [];
                const context = isCold ? "proactive-cold" : "proactive-friendly";

                const res = await fetch("/api/roleplay", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        message: "",
                        characterName: char.name,
                        characterPersonality: char.personality,
                        characterTag: char.tag,
                        history: history.slice(-5),
                        context,
                    }),
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.reply && data.reply !== "...") {
                        const cleanReply = data.reply.replace(/\|/g, " ");

                        // Match ChatRoom's splitting logic
                        const reactRegex = /\[\[\s*REACT\s*:\s*([^:]+)\s*:\s*([^\]]+)\s*\]\]/gi;
                        let text = cleanReply.replace(reactRegex, "");
                        const replyRegex = /\[\[\s*REPLY\s*:\s*([^\]]+)\s*\]\]/i;
                        text = text.replace(replyRegex, "");

                        const initialParts = text.split("|").map((p: string) => p.trim().replace(/^["']+|["']+$/g, "").trim()).filter(Boolean);

                        // Robust sticker split using non-greedy match to handle ']' inside stickers
                        const stickerRegex = /(\[\[\s*STICKER\s*:.*?\]\])/gi;
                        const finalParts: string[] = [];

                        for (const part of initialParts) {
                            const subParts = part.split(stickerRegex).map((p: string) => p.trim()).filter(Boolean);
                            finalParts.push(...subParts);
                        }

                        if (finalParts.length > 0) {
                            for (const p of finalParts) {
                                addReply(char.id, p);
                            }
                        } else {
                            addReply(char.id, "...");
                        }
                    }
                }
            } catch (error) {
                console.error("Proactive msg error", error);
            }

        }, 300000); // Check every 5 minutes (300s)

        return () => clearInterval(interval);
    }, [mounted, allCharacters, activeCharacter]);

    /**
     * Merge helper — always prefer the richer (API) record over a placeholder.
     * A record is considered a placeholder when personality === "Unknown".
     * When merging:
     *  - If the incoming record is richer (non-placeholder) it replaces the existing entry.
     *  - If the existing record is already richer, keep it.
     *  - If an ID has no existing entry, add it.
     */
    const mergeCharacters = (prev: Character[], incoming: Character[]): Character[] => {
        const map = new Map(prev.map(c => [c.id, c]));
        for (const c of incoming) {
            const existing = map.get(c.id);
            if (!existing) {
                map.set(c.id, c);
            } else {
                // Prefer whichever record is non-placeholder; if both are the same tier, prefer incoming
                const existingIsPlaceholder = existing.personality === "Unknown";
                const incomingIsPlaceholder = c.personality === "Unknown";
                if (!incomingIsPlaceholder || existingIsPlaceholder) {
                    // incoming is richer, OR both are placeholders → take incoming
                    map.set(c.id, c);
                }
                // else: existing is richer and incoming is placeholder → keep existing
            }
        }
        return Array.from(map.values());
    };

    // Hydrate conversation list from Aiven PostgreSQL on mount
    // This also reconciles the local store: conversations that are no longer
    // returned by the server (deleted on another device, belong to a previous
    // account, etc.) are removed so the user only sees their own data.
    const loadConversations = async () => {
        try {
            const res = await fetch("/api/conversations");
            if (res.ok) {
                const data = await res.json();
                const serverConvos: Array<{ characterId: string; character?: Character & { tags?: string[] } }> =
                    data.conversations || [];

                const store = useChatStore.getState();
                const serverIds = new Set(serverConvos.map((c) => c.characterId));
                const localIds = Object.keys(store.conversations);

                // Remove local conversations that the server no longer reports
                // (covers deleted-on-another-device and cross-account leakage).
                // IMPORTANT: use pruneLocalConversation (local-only) instead of
                // deleteConversation so we never fire DELETE /api/messages against
                // a potentially stale /api/conversations cache. The convos cache is
                // now invalidated on every message write, making this safe.
                for (const localId of localIds) {
                    // Preserve locally-created group chats (they are not synced to the
                    // conversation API and would be wrongly pruned otherwise).
                    const isGroup = store.conversations[localId]?.isGroup;
                    if (!isGroup && !serverIds.has(localId)) {
                        store.pruneLocalConversation(localId);
                    }
                }

                if (serverConvos.length > 0) {
                    const newChars: Character[] = [];

                    for (const conv of serverConvos) {
                        // Ensure each server-reported conversation exists locally.
                        store.ensureConversation(conv.characterId);

                        if (conv.character && !newChars.some((c) => c.id === conv.character!.id)) {
                            newChars.push({
                                ...conv.character,
                                description: conv.character.description || "Conversation history",
                                greeting: conv.character.greeting || "Hello",
                                personality: conv.character.personality || "Unknown",
                                tags: conv.character.tags || [conv.character.tag],
                                isPublic: true,
                            } as Character);
                        }
                    }

                    if (newChars.length > 0) {
                        setAllCharacters((prev) => mergeCharacters(prev, newChars));
                    }
                }
            }
        } catch (err) {
            console.error("Failed to load conversations from DB:", err);
        }
    };

    // Load User Preferences (Language etc.)
    const loadUserPreferences = async () => {
        try {
            const res = await fetch("/api/user/language");
            if (res.ok) {
                const data = await res.json();
                if (data.language) {
                    useChatStore.getState().setResponseLanguage(data.language);
                }
            }
        } catch (err) {
            console.error("Failed to load user preferences:", err);
        }
    };

    // Load user's own characters for "Your Characters" tab
    const loadMyCharacters = async () => {
        try {
            const res = await fetch("/api/characters?mine=true");
            if (res.ok) {
                const data = await res.json();
                setMyCharacters(data.characters || data);
            }
        } catch (err) {
            console.error("Failed to load my characters:", err);
        }
    };

    // Load all available characters for proactive messaging
    const loadAllCharacters = async () => {
        try {
            const res = await fetch("/api/characters?limit=200");
            if (res.ok) {
                const data = await res.json();
                const incoming = (data.characters || data) as Character[];
                // Always let richer API records replace any placeholder conversation entries
                setAllCharacters(prev => mergeCharacters(prev, incoming));
            }
        } catch (err) {
            console.error("Failed to load characters:", err);
        }
    };

    useEffect(() => {
        setMounted(true);
        loadUserPreferences();

        // ── User-identity guard ──────────────────────────────────────────
        // Fetch the current session user before trusting the persisted store.
        // If the persisted owner differs (or is absent), wipe stale data first.
        const initWithIdentityCheck = async () => {
            try {
                const meRes = await fetch("/api/user/me");
                if (meRes.ok) {
                    const meData = await meRes.json();
                    const currentUserId: string | null = meData?.userId ?? meData?.id ?? null;
                    const storedOwner = useChatStore.getState().ownerUserId;

                    if (currentUserId && storedOwner && storedOwner !== currentUserId) {
                        // Different user → clear stale persisted data before hydrating.
                        useChatStore.getState().resetConversations();
                    }

                    // Stamp the store with the active user so the next session can
                    // detect a mismatch without a network round-trip.
                    if (currentUserId) {
                        useChatStore.getState().setOwnerUserId(currentUserId);
                    }
                }
            } catch {
                // If /api/user/me fails we proceed normally — identity check is
                // best-effort; it must not block the UI entirely.
            }

            await Promise.all([
                loadConversations(),
                loadMyCharacters(),
                loadAllCharacters(),
            ]);

            setIsLoadingChats(false);
        };

        initWithIdentityCheck();
    }, []);


    // Handle Astrologer Redirect
    useEffect(() => {
        if (!mounted || allCharacters.length === 0) return;

        const isAstrologer = searchParams.get("astrologer") === "true";
        if (isAstrologer) {
            const sid = localStorage.getItem("kakoei_session_id") || localStorage.getItem("pendingAstrologerRedirect");

            // Link the reading to the user
            if (sid) {
                fetch("/api/user/link-reading", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sessionId: sid }),
                })
                    .then(res => res.json())
                    .then(() => {
                        localStorage.removeItem("pendingAstrologerRedirect");
                    })
                    .catch(err => console.error("Failed to link reading:", err));
            }

            // Find an astrologer character
            const astrologer =
                allCharacters.find(c => c.tag?.toLowerCase().includes("astrology") || c.name?.toLowerCase().includes("oracle")) ||
                myCharacters.find(c => c.tag?.toLowerCase().includes("astrology") || c.name?.toLowerCase().includes("oracle")) ||
                allCharacters[0];

            if (astrologer) {
                handleSelectCharacter(astrologer, false);
            }

            // Clean up the URL
            router.replace("/chat");
        }
    }, [mounted, allCharacters, myCharacters, searchParams, router]);

    // Handle Shared Character Link Routing
    useEffect(() => {
        if (!mounted) return;
        const charId = searchParams.get("character");
        if (!charId) return;

        const loadSharedCharacter = async () => {
            // 1. Check if already loaded in our arrays
            let charToRoute = allCharacters.find(c => c.id === charId) || myCharacters.find(c => c.id === charId);

            // 2. If not, fetch it directly
            if (!charToRoute) {
                try {
                    const res = await fetch(`/api/characters/${charId}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.character) {
                            charToRoute = data.character;
                            // Optionally push to local state so charMap has it, though charMap relies on the arrays
                            // Since we don't have a state for one-off fetched chars, let's append it to allCharacters
                            setAllCharacters(prev => [...prev, data.character]);
                        }
                    }
                } catch (err) {
                    console.error("Failed to load shared character param", err);
                }
            }

            if (charToRoute) {
                // Ensure conversation exists in store
                const store = useChatStore.getState();
                if (!store.conversations[charToRoute.id]) {
                    store.ensureConversation(charToRoute.id);
                }
                // Auto select and jump into chat
                handleSelectCharacter(charToRoute, false);
                // Clean up URL so refresh doesn't trigger it again
                router.replace("/chat");
            }
        };

        loadSharedCharacter();
    }, [mounted, searchParams, router, allCharacters, myCharacters]);

    // Handle Capacitor Hardware Back Button (Android)
    useEffect(() => {
        if (!mounted) return;

        const setupBackButton = async () => {
            await App.addListener('backButton', () => {
                // If a chat is open, close it and go back to the tab view
                if (activeCharacter || activeGroupId) {
                    handleBack();
                } else {
                    // We are at the root tabs level. Let Capacitor minimize the app.
                    App.minimizeApp();
                }
            });
        };

        setupBackButton();

        return () => {
            App.removeAllListeners();
        };
    }, [mounted, activeCharacter, activeGroupId]);

    const handleSelectCharacter = (char: Character, openProfile = false) => {
        setShowProfileOnLoad(openProfile);
        setActiveCharacter(char);
    };

    const handleBack = () => {
        setActiveCharacter(null);
        setActiveGroupId(null);
        setShowProfileOnLoad(false);
    };

    const handleSelectGroup = (groupId: string) => {
        setActiveGroupId(groupId);
    };

    const charMap = React.useMemo(() => {
        const map: Record<string, Character> = {};
        allCharacters.forEach((c) => (map[c.id] = c));
        myCharacters.forEach((c) => (map[c.id] = c));
        return map;
    }, [allCharacters, myCharacters]);

    if (!mounted) {
        return <div className="chat-app" style={{ background: "#FFFDF5" }} />;
    }

    let effectiveCharacter = activeCharacter;
    if (!effectiveCharacter && activeGroupId) {
        const convo = useChatStore.getState().conversations[activeGroupId];
        if (convo) {
            effectiveCharacter = {
                id: activeGroupId,
                name: convo.groupName || "Group Chat",
                tag: "Original",
                description: "Group Conversation",
                longDescription: "A group conversation",
                tags: ["group"],
                personality: "Mixed",
                greeting: "",
                image: convo.groupImage || `https://api.dicebear.com/7.x/identicon/svg?seed=${activeGroupId}`
            };
        }
    }

    return (
        <div className="chat-app">
            {effectiveCharacter ? (
                <div
                    key={`chatroom-${effectiveCharacter.id}`}
                    className="chat-app-view"
                >
                    <ChatRoom
                        character={effectiveCharacter}
                        onBack={handleBack}
                        initialShowProfile={showProfileOnLoad}
                        charMap={charMap}
                    />
                </div>
            ) : (
                <div
                    key="tabs"
                    className="chat-app-view"
                >
                    {/* Tab content — all tabs stay mounted to preserve state/data */}
                    <div className="chat-app-content no-scrollbar">
                        <div style={{ width: "100%", display: activeTab === "explore" ? "block" : "none" }}>
                            <ExploreTab onSelectCharacter={handleSelectCharacter} />
                        </div>
                        <div style={{ width: "100%", display: activeTab === "chats" ? "block" : "none" }}>
                            <ChatsTab onSelectCharacter={handleSelectCharacter} onSelectGroup={handleSelectGroup} myCharacters={myCharacters} allCharacters={allCharacters} isLoading={isLoadingChats} />
                        </div>
                        <div style={{ width: "100%", display: activeTab === "create" ? "block" : "none" }}>
                            <CreateTab
                                onNavigate={(tab: Tab) => setActiveTab(tab)}
                                onSelectCharacter={handleSelectCharacter}
                                myCharacters={myCharacters}
                                setMyCharacters={setMyCharacters}
                            />
                        </div>
                        <div style={{ width: "100%", display: activeTab === "profile" ? "block" : "none" }}>
                            <ProfileTab />
                        </div>
                    </div>

                    {/* Premium floating tab layout */}
                    <LayoutGroup>
                        <div className="chat-nav-wrapper">
                            {/* Left FAB: Explore */}
                            <motion.button
                                className={`chat-nav-fab ${activeTab === "explore" ? "chat-nav-fab-active" : ""}`}
                                onClick={() => setActiveTab("explore")}
                                whileTap={{ scale: 0.9 }}
                            >
                                {activeTab === "explore" && (
                                    <motion.div
                                        className="chat-tab-indicator"
                                        layoutId="activeTabExplore"
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}
                                <motion.div
                                    className="chat-tab-icon-wrap"
                                    animate={activeTab === "explore" ? { scale: 1.1 } : { scale: 1 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                                        <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                </motion.div>
                            </motion.button>

                            {/* Center Pill: Chats & Profile */}
                            <div className="chat-tab-bar">
                                <motion.button
                                    className={`chat-tab-item ${activeTab === "chats" ? "chat-tab-active" : ""}`}
                                    onClick={() => setActiveTab("chats")}
                                    whileTap={{ scale: 0.9 }}
                                    style={{ position: "relative" }}
                                >
                                    {activeTab === "chats" && (
                                        <motion.div
                                            className="chat-tab-indicator"
                                            layoutId="activeTabCenter"
                                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                        />
                                    )}
                                    <motion.div
                                        className="chat-tab-icon-wrap"
                                        animate={activeTab === "chats" ? { scale: 1.1 } : { scale: 1 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                        style={{ position: "relative" }}
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <path
                                                d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                        {totalUnread > 0 && (
                                            <motion.span
                                                className="chat-tab-badge"
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                exit={{ scale: 0 }}
                                                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                            >
                                                {totalUnread > 99 ? "99+" : totalUnread}
                                            </motion.span>
                                        )}
                                    </motion.div>
                                </motion.button>

                                <motion.button
                                    className={`chat-tab-item ${activeTab === "profile" ? "chat-tab-active" : ""}`}
                                    onClick={() => setActiveTab("profile")}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    {activeTab === "profile" && (
                                        <motion.div
                                            className="chat-tab-indicator"
                                            layoutId="activeTabCenter"
                                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                        />
                                    )}
                                    <motion.div
                                        className="chat-tab-icon-wrap"
                                        animate={activeTab === "profile" ? { scale: 1.1 } : { scale: 1 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                                            <path d="M20 21C20 16.5817 16.4183 13 12 13C7.58172 13 4 16.5817 4 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                    </motion.div>
                                </motion.button>
                            </div>

                            {/* Right FAB: Create */}
                            <motion.button
                                className={`chat-nav-fab ${activeTab === "create" ? "chat-nav-fab-active" : ""}`}
                                onClick={() => setActiveTab("create")}
                                whileTap={{ scale: 0.9 }}
                            >
                                {activeTab === "create" && (
                                    <motion.div
                                        className="chat-tab-indicator"
                                        layoutId="activeTabCreate"
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}
                                <motion.div
                                    className="chat-tab-icon-wrap"
                                    animate={activeTab === "create" ? { scale: 1.1, rotate: 90 } : { scale: 1, rotate: 0 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </motion.div>
                            </motion.button>
                        </div>
                    </LayoutGroup>
                </div>
            )}
        </div>
    );
}
