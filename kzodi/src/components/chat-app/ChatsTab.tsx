"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatStore, type Conversation } from "@/lib/chatStore";
import { CHARACTERS, type Character } from "@/data/characters";

interface ChatsTabProps {
    onSelectCharacter: (character: Character) => void;
}

function formatTime(ts: number): string {
    const now = Date.now();
    const diff = now - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export default function ChatsTab({ onSelectCharacter }: ChatsTabProps) {
    const [conversations, setConversations] = React.useState<Conversation[]>([]);
    const [searchQuery, setSearchQuery] = React.useState("");

    React.useEffect(() => {
        const update = () => {
            const convos = Object.values(useChatStore.getState().conversations);
            convos.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
            setConversations(convos);
        };
        update();
        const unsub = useChatStore.subscribe(update);
        return unsub;
    }, []);

    const charMap = React.useMemo(() => {
        const map: Record<string, Character> = {};
        CHARACTERS.forEach((c) => (map[c.id] = c));
        return map;
    }, []);

    const filteredConvos = React.useMemo(() => {
        if (!searchQuery.trim()) return conversations;
        const q = searchQuery.toLowerCase();
        return conversations.filter((convo) => {
            const char = charMap[convo.characterId];
            if (!char) return false;
            return char.name.toLowerCase().includes(q);
        });
    }, [conversations, searchQuery, charMap]);

    return (
        <div className="chats-container">
            {/* Header */}
            <div className="chats-header">
                <div>
                    <h1 className="chats-title">Messages</h1>
                    <p className="chats-header-sub">
                        {conversations.length > 0
                            ? `${conversations.length} conversation${conversations.length > 1 ? "s" : ""}`
                            : "Start a conversation"}
                    </p>
                </div>
                <button className="chats-new-btn" aria-label="New chat">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                </button>
            </div>

            {/* Search bar for conversations */}
            {conversations.length > 0 && (
                <motion.div
                    className="chats-search-wrap"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="chats-search-box">
                        <svg className="chats-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                            <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <input
                            className="chats-search-input"
                            type="text"
                            placeholder="Search conversations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </motion.div>
            )}

            {/* Online avatars strip */}
            {conversations.length > 0 && (
                <motion.div
                    className="chats-online-strip no-scrollbar"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {conversations.map((convo) => {
                        const char = charMap[convo.characterId];
                        if (!char) return null;
                        return (
                            <motion.div
                                key={convo.characterId}
                                className="chats-online-item"
                                onClick={() => onSelectCharacter(char)}
                                whileTap={{ scale: 0.9 }}
                            >
                                <div className="chats-online-avatar-ring">
                                    <img src={char.image} alt={char.name} />
                                </div>
                                <span className="chats-online-name">{char.name.split(" ")[0]}</span>
                            </motion.div>
                        );
                    })}
                </motion.div>
            )}

            {/* Divider */}
            {conversations.length > 0 && <div className="chats-divider" />}

            {/* Conversation list */}
            <div className="chats-list">
                <AnimatePresence>
                    {filteredConvos.map((convo, i) => {
                        const char = charMap[convo.characterId];
                        if (!char) return null;
                        const lastMsg = convo.messages[convo.messages.length - 1];
                        const isAiLast = lastMsg?.role === "assistant";
                        const msgCount = convo.messages.length;
                        return (
                            <motion.div
                                key={convo.characterId}
                                className="chats-item"
                                onClick={() => onSelectCharacter(char)}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.3, delay: i * 0.05 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="chats-item-avatar">
                                    <img src={char.image} alt={char.name} />
                                    <span className="chats-item-online-dot" />
                                </div>
                                <div className="chats-item-info">
                                    <div className="chats-item-top">
                                        <span className="chats-item-name">{char.name}</span>
                                        <span className="chats-item-time">{formatTime(convo.lastTimestamp)}</span>
                                    </div>
                                    <div className="chats-item-bottom">
                                        <p className="chats-item-preview">
                                            {isAiLast && <span className="chats-item-preview-label">{char.name.split(" ")[0]}: </span>}
                                            {convo.lastMessage.length > 45
                                                ? convo.lastMessage.slice(0, 45) + "..."
                                                : convo.lastMessage}
                                        </p>
                                        <div className="chats-item-meta">
                                            <span className="chats-item-msg-count">{msgCount}</span>
                                            {isAiLast && <span className="chats-item-unread" />}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Empty state */}
            {conversations.length === 0 && (
                <motion.div
                    key="chats-empty-state-final"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    style={{
                        padding: "80px 24px",
                        textAlign: "center",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "transparent"
                    }}
                >
                    <div style={{
                        position: "relative",
                        width: "140px",
                        height: "140px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: "24px",
                        background: "transparent"
                    }}>
                        <svg width="140" height="140" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <style>
                                {`
                                @keyframes k-blink {
                                    0%, 96%, 100% { transform: scaleY(1); }
                                    98% { transform: scaleY(0.1); }
                                }
                                .eyes-anim {
                                    animation: k-blink 4s infinite;
                                    transform-origin: center;
                                    transform-box: fill-box;
                                }
                                `}
                            </style>

                            <path
                                d="M60 20C32.3858 20 10 39.0294 10 62.5C10 73.1 14.6 82.6 22 89.8L18 106C17.8 106.8 18.6 107.5 19.4 107.2L38 100.5C44.7 103.4 52.1 105 60 105C87.6142 105 110 85.9706 110 62.5C110 39.0294 87.6142 20 60 20Z"
                                fill="#FFE566"
                                stroke="#4A3728"
                                strokeWidth="3.5"
                                strokeLinejoin="round"
                            />
                            <g className="eyes-anim">
                                <circle cx="42" cy="62" r="5.5" fill="#4A3728" />
                                <circle cx="78" cy="62" r="5.5" fill="#4A3728" />
                            </g>
                            <path
                                d="M52 72C52 74 54 76 56 76C58 76 60 74 60 72C60 74 62 76 64 76C66 76 68 74 68 72"
                                stroke="#4A3728"
                                strokeWidth="3"
                                strokeLinecap="round"
                            />
                            <path
                                d="M35 35C45 28 65 28 75 35"
                                stroke="white"
                                strokeWidth="4"
                                strokeLinecap="round"
                                opacity="0.4"
                            />
                        </svg>
                    </div>
                    <h3 style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 900,
                        fontSize: "22px",
                        color: "#4A3728",
                        marginBottom: "8px",
                        letterSpacing: "-0.02em"
                    }}>
                        No messages yet
                    </h3>
                    <p style={{
                        fontSize: "15px",
                        color: "#8B8680",
                        lineHeight: 1.5,
                        maxWidth: "240px",
                        margin: "0 auto"
                    }}>
                        Find a character in Explore and start a fun conversation!
                    </p>
                </motion.div>
            )}

            {/* Search empty */}
            {conversations.length > 0 && filteredConvos.length === 0 && searchQuery && (
                <motion.div
                    className="chats-empty-search"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ padding: "40px 24px", textAlign: "center" }}
                >
                    <p style={{ fontWeight: 700, color: "#4A3728", fontSize: "18px" }}>No results</p>
                    <p style={{ color: "#9CA3AF", fontSize: "14px" }}>No conversations match &quot;{searchQuery}&quot;</p>
                </motion.div>
            )}
        </div>
    );
}
