"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import ExploreTab from "./ExploreTab";
import ChatsTab from "./ChatsTab";
import CreateTab from "./CreateTab";
import ProfileTab from "./ProfileTab";
import ChatRoom from "./ChatRoom";
import { CHARACTERS, type Character } from "@/data/characters";
import { useChatStore } from "@/lib/chatStore";

type Tab = "explore" | "chats" | "create" | "profile";

export default function ChatApp() {
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>("explore");
    const [activeCharacter, setActiveCharacter] = useState<Character | null>(null);
    const [showProfileOnLoad, setShowProfileOnLoad] = useState<boolean>(false);
    const [myCharacters, setMyCharacters] = useState<Character[]>(CHARACTERS.slice(0, 3));
    const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

    // Proactive Messaging Hook (Background — when user is NOT in a chat)
    useEffect(() => {
        if (!mounted) return;

        const interval = setInterval(async () => {
            const { conversations, addReply } = useChatStore.getState();

            if (myCharacters.length === 0) return;
            const char = myCharacters[Math.floor(Math.random() * myCharacters.length)];

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
            const lastTime = convo?.lastTimestamp || 0;
            const now = Date.now();

            // 3. Cooldown Check
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
                        addReply(char.id, cleanReply);
                    }
                }
            } catch (error) {
                console.error("Proactive msg error", error);
            }

        }, 300000); // Check every 5 minutes (300s)

        return () => clearInterval(interval);
    }, [mounted, myCharacters, activeCharacter]);

    useEffect(() => {
        setMounted(true);
    }, []);
    // ... rest of component

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
                    />
                </div>
            ) : (
                <motion.div
                    key="tabs"
                    className="chat-app-view"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.25 }}
                >
                    {/* Tab content */}
                    <div className="chat-app-content no-scrollbar">
                        <AnimatePresence mode="wait">
                            {activeTab === "explore" && (
                                <motion.div
                                    key="explore"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    style={{ width: "100%" }}
                                >
                                    <ExploreTab onSelectCharacter={handleSelectCharacter} />
                                </motion.div>
                            )}
                            {activeTab === "chats" && (
                                <motion.div
                                    key="chats"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    style={{ width: "100%" }}
                                >
                                    <ChatsTab onSelectCharacter={handleSelectCharacter} onSelectGroup={handleSelectGroup} />
                                </motion.div>
                            )}
                            {activeTab === "create" && (
                                <motion.div
                                    key="create"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    style={{ width: "100%" }}
                                >
                                    <CreateTab
                                        onNavigate={(tab: Tab) => setActiveTab(tab)}
                                        onSelectCharacter={handleSelectCharacter}
                                        myCharacters={myCharacters}
                                        setMyCharacters={setMyCharacters}
                                    />
                                </motion.div>
                            )}
                            {activeTab === "profile" && (
                                <motion.div
                                    key="profile"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    style={{ width: "100%" }}
                                >
                                    <ProfileTab />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Premium bottom tab bar */}
                    <LayoutGroup>
                        <div className="chat-tab-bar">
                            <motion.button
                                className={`chat-tab-item ${activeTab === "explore" ? "chat-tab-active" : ""}`}
                                onClick={() => setActiveTab("explore")}
                                whileTap={{ scale: 0.9 }}
                            >
                                {activeTab === "explore" && (
                                    <motion.div
                                        className="chat-tab-indicator"
                                        layoutId="activeTab"
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

                            <motion.button
                                className={`chat-tab-item ${activeTab === "create" ? "chat-tab-active" : ""}`}
                                onClick={() => setActiveTab("create")}
                                whileTap={{ scale: 0.9 }}
                            >
                                {activeTab === "create" && (
                                    <motion.div
                                        className="chat-tab-indicator"
                                        layoutId="activeTab"
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

                            <motion.button
                                className={`chat-tab-item ${activeTab === "chats" ? "chat-tab-active" : ""}`}
                                onClick={() => setActiveTab("chats")}
                                whileTap={{ scale: 0.9 }}
                            >
                                {activeTab === "chats" && (
                                    <motion.div
                                        className="chat-tab-indicator"
                                        layoutId="activeTab"
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}
                                <motion.div
                                    className="chat-tab-icon-wrap"
                                    animate={activeTab === "chats" ? { scale: 1.1 } : { scale: 1 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
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
                                        layoutId="activeTab"
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
                    </LayoutGroup>
                </motion.div>
            )}
        </div>
    );
}
