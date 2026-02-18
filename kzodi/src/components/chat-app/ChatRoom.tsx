"use client";
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatStore, type ChatMessage } from "@/lib/chatStore";
import { type Character } from "@/data/characters";
import CharacterProfile from "./CharacterProfile";

interface ChatRoomProps {
    character: Character;
    onBack: () => void;
}


// Sticker Component
const Sticker = ({ prompt }: { prompt: string }) => {
    const [stickerData, setStickerData] = useState<{ image?: string; svg?: string; type?: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        fetch("/api/sticker", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (mounted) {
                    setStickerData(data);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (mounted) setLoading(false);
            });
        return () => { mounted = false; };
    }, [prompt]);

    const stickerStyle: React.CSSProperties = {
        maxWidth: "150px",
        maxHeight: "150px",
        filter: "drop-shadow(0px 0px 3px rgba(255,255,255,0.8)) drop-shadow(0px 1px 2px rgba(0,0,0,0.15))",
        transition: "transform 0.2s ease",
        cursor: "pointer",
    };

    if (loading) {
        return (
            <span style={{ fontSize: "12px", color: "#aaa", display: "block", margin: "4px 0" }}>
                ✨ {prompt}
            </span>
        );
    }

    if (stickerData?.image) {
        return (
            <img
                src={stickerData.image}
                alt={prompt}
                style={{ ...stickerStyle, borderRadius: "8px" }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            />
        );
    }

    if (stickerData?.svg) {
        return (
            <div
                dangerouslySetInnerHTML={{ __html: stickerData.svg }}
                style={{ ...stickerStyle, overflow: "visible" }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            />
        );
    }

    return null;
};

// Parse message content for sticker tags
const STICKER_REGEX = /\[\[STICKER:\s*(.+?)\]\]/g;

const renderMessageContent = (content: string) => {
    // Split by sticker tags, keeping the delimiters
    const parts = content.split(/(\[\[STICKER:\s*.+?\]\])/g);

    return parts.map((part, i) => {
        const stickerMatch = part.match(/\[\[STICKER:\s*(.+?)\]\]/);
        if (stickerMatch) {
            const stickerPrompt = stickerMatch[1].trim();
            return <Sticker key={i} prompt={stickerPrompt} />;
        }
        if (!part || !part.trim()) return null;
        return <span key={i}>{part}</span>;
    });
};

export default function ChatRoom({ character, onBack }: ChatRoomProps) {
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [showCharInfo, setShowCharInfo] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const { sendMessage, addReply, markAsSeen } = useChatStore.getState();

    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        const convo = useChatStore.getState().conversations[character.id];
        return convo?.messages || [];
    });

    useEffect(() => {
        const unsub = useChatStore.subscribe((state) => {
            const convo = state.conversations[character.id];
            setMessages(convo?.messages || []);
        });
        return unsub;
    }, [character.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length, isTyping]);

    useEffect(() => {
        const convo = useChatStore.getState().conversations[character.id];
        if (!convo || convo.messages.length === 0) {
            // No conversation yet — add the greeting once
            addReply(character.id, character.greeting);
        } else {
            // Clean up duplicate greetings left over from the previous bug
            const msgs = convo.messages;
            if (
                msgs.length >= 2 &&
                msgs[0].role === "assistant" &&
                msgs[1].role === "assistant" &&
                msgs[0].content === msgs[1].content
            ) {
                // Remove the duplicate (keep only one copy + rest of conversation)
                useChatStore.setState((state) => ({
                    conversations: {
                        ...state.conversations,
                        [character.id]: {
                            ...state.conversations[character.id],
                            messages: [msgs[0], ...msgs.slice(2)],
                        },
                    },
                }));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [character.id]);

    // Auto-resize textarea
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = "auto";
            inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
        }
    }, [input]);

    const handleSend = async () => {
        const text = input.trim();
        if (!text) return;

        setInput("");
        sendMessage(character.id, text);

        // 1. Realistic Reading Delay (1.5s - 3s)
        const readingDelay = 1500 + Math.random() * 1500;
        await new Promise((resolve) => setTimeout(resolve, readingDelay));

        // 2. Mark as Seen
        markAsSeen(character.id);

        // 3. Reaction Delay (Thinking before typing)
        const reactionDelay = 500 + Math.random() * 1000;
        await new Promise((resolve) => setTimeout(resolve, reactionDelay));

        setIsTyping(true);
        setTimeout(() => inputRef.current?.focus(), 50);

        try {
            const history = messages.map((m) => ({
                role: m.role,
                content: m.content,
            }));

            const res = await fetch("/api/roleplay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: text,
                    characterName: character.name,
                    characterPersonality: character.personality,
                    characterTag: character.tag,
                    history: history.slice(-10),
                    context: "reply",
                }),
            });

            if (res.ok) {
                const data = await res.json();
                // Handle "ignore" action (Seen but no reply)
                if (data.action === "ignore") {
                    // Simulate typing for a bit then stopping (Ghosting/Decided not to send)
                    await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 2500));
                    setIsTyping(false);
                } else {
                    await processAiResponse(data.reply || "...");
                }
            } else {
                addReply(character.id, "Hmm, I lost my train of thought. Can you try again?");
                setIsTyping(false);
            }
        } catch {
            addReply(character.id, "Something went wrong. Let's try again!");
            setIsTyping(false);
        }
    };

    // Process AI response and handle splitting
    const processAiResponse = async (responseText: string) => {
        const parts = responseText
            .split("|")
            .map((p) => p.trim().replace(/^["']+|["']+$/g, "").trim())
            .filter((p) => p);
        await sendAiSequence(parts);
    };

    // Send AI messages sequentially with typing delay
    const sendAiSequence = async (parts: string[]) => {
        if (parts.length === 0) {
            setIsTyping(false);
            return;
        }

        setIsTyping(true);

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            // Simulate typing time: base 800ms + 30ms per char (capped/randomized)
            const typingTime = 600 + part.length * 20 + Math.random() * 500;

            await new Promise((resolve) => setTimeout(resolve, typingTime));

            addReply(character.id, part);

            // If there are more messages, keep "typing" or briefly pause
            if (i < parts.length - 1) {
                // Optional: brief pause between bubbles
                await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 200));
            }
        }

        setIsTyping(false);
    };

    // Proactive messaging (Double texting)
    useEffect(() => {
        if (messages.length === 0) return;

        const lastMsg = messages[messages.length - 1];

        let timer: NodeJS.Timeout;

        // Only activate if the last message was from AI
        if (lastMsg.role === "assistant") {
            // Determine if character is cold/stoic
            const isCold = /cold|stoic|tsundere|quiet|mysterious|aloof|shy/i.test(
                character.tag + character.personality
            );

            // Cold: wait 3-5 minutes, Regular: wait 1.5-3 minutes
            const delay = isCold
                ? 180000 + Math.random() * 120000   // 3-5 min
                : 90000 + Math.random() * 90000;    // 1.5-3 min

            timer = setTimeout(async () => {
                // Don't double text if AI is typing or User has typed something
                if (isTyping || input.trim()) return;

                // Probability gate: Cold = 5%, Regular = 50%
                const chance = isCold ? 0.05 : 0.5;
                if (Math.random() > chance) return;

                setIsTyping(true);
                try {
                    const history = messages.map((m) => ({
                        role: m.role,
                        content: m.content,
                    }));

                    const res = await fetch("/api/roleplay", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            message: "", // No new user message
                            characterName: character.name,
                            characterPersonality: character.personality,
                            characterTag: character.tag,
                            history: history.slice(-10),
                            context: "proactive",
                        }),
                    });

                    if (res.ok) {
                        const data = await res.json();
                        if (data.reply && data.reply !== "...") {
                            await processAiResponse(data.reply);
                        } else {
                            setIsTyping(false);
                        }
                    } else {
                        setIsTyping(false);
                    }
                } catch {
                    setIsTyping(false);
                }
            }, delay);
        }

        return () => clearTimeout(timer);
    }, [messages, character, isTyping, input]); // Reset timer on message or input change

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="chatroom">
            <div className="chatroom-bg-pattern" />
            {/* ── Header ─────────────────────────── */}
            <motion.div
                className="chatroom-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <button className="chatroom-back" onClick={onBack} aria-label="Go back">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M15 4L7 12L15 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <div
                    className="chatroom-header-center"
                    onClick={() => setShowCharInfo(true)}
                    style={{ cursor: "pointer" }}
                >
                    <div className="chatroom-header-avatar-wrap">
                        <div className="chatroom-header-avatar">
                            <img src={character.image} alt={character.name} />
                        </div>
                        <span className="chatroom-header-online-ring" />
                    </div>
                    <div className="chatroom-header-info">
                        <span className="chatroom-header-name">{character.name}</span>
                        <span className="chatroom-header-status">
                            <span className="chatroom-status-dot" />
                            Online
                        </span>
                    </div>
                </div>
                <div className="chatroom-header-actions">
                    <button
                        className="chatroom-action-btn"
                        aria-label="Character info"
                        onClick={() => setShowCharInfo(true)}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                    <button className="chatroom-action-btn" aria-label="More">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="6" r="1.5" fill="currentColor" />
                            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                            <circle cx="12" cy="18" r="1.5" fill="currentColor" />
                        </svg>
                    </button>
                </div>
            </motion.div>

            {/* ── Messages Area ──────────────────── */}
            <div className="chatroom-messages-area">

                <div className="chatroom-messages no-scrollbar">
                    {/* Date separator */}
                    <div className="chatroom-date-sep">
                        <span>Today</span>
                    </div>

                    <AnimatePresence initial={false}>
                        {messages.map((msg, i) => (
                            <MessageBubble
                                key={msg.id}
                                message={msg}
                                characterImage={character.image}
                                characterName={character.name}
                                isFirst={i === 0 || messages[i - 1]?.role !== msg.role}
                                isLast={i === messages.length - 1 || messages[i + 1]?.role !== msg.role}
                            />
                        ))}
                    </AnimatePresence>

                    {/* Typing indicator */}
                    <AnimatePresence>
                        {isTyping && (
                            <motion.div
                                className="chatroom-typing"
                                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="chatroom-typing-avatar">
                                    <img src={character.image} alt="" />
                                </div>
                                <div className="chatroom-typing-bubble">
                                    <span className="chatroom-typing-name">{character.name.split(" ")[0]}</span>
                                    <div className="typing-dots">
                                        <span />
                                        <span />
                                        <span />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* ── Input Bar ──────────────────────── */}
            <motion.div
                className="chatroom-input-bar"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
            >
                <div className="chatroom-input-wrap">
                    <button className="chatroom-input-attach" aria-label="Attach">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <textarea
                        ref={inputRef}
                        className="chatroom-input"
                        placeholder={`Message ${character.name.split(" ")[0]}...`}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isTyping}
                        rows={1}
                    />
                </div>
                <AnimatePresence>
                    {input.trim() && (
                        <motion.button
                            key="send-button"
                            className="chatroom-send chatroom-send-active"
                            onClick={handleSend}
                            disabled={isTyping}
                            initial={{ opacity: 1, scale: 1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0 }}
                            aria-label="Send message"
                            whileTap={{ scale: 0.95 }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </motion.button>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* ── Character Info Drawer ────────── */}
            {/* ── Character Profile Page ────────── */}
            <AnimatePresence>
                {showCharInfo && (
                    <CharacterProfile
                        character={character}
                        onBack={() => setShowCharInfo(false)}
                        messageCount={messages.length}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

/* ── Message Bubble ─────────────────────────────────── */
function MessageBubble({
    message,
    characterImage,
    characterName,
    isFirst,
    isLast,
}: {
    message: ChatMessage;
    characterImage: string;
    characterName: string;
    isFirst: boolean;
    isLast: boolean;
}) {
    const isUser = message.role === "user";
    const [showActions, setShowActions] = useState(false);
    const isStickerOnly = /^\[\[STICKER:\s*.+?\]\]$/.test(message.content.trim());

    return (
        <motion.div
            className={`chatroom-msg ${isUser ? "chatroom-msg-user" : "chatroom-msg-ai"} ${isFirst ? "chatroom-msg-first" : ""} ${isLast ? "chatroom-msg-last" : ""}`}
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            onContextMenu={(e) => {
                e.preventDefault();
                setShowActions(!showActions);
            }}
        >
            {!isUser && isLast && (
                <div className="chatroom-msg-avatar">
                    <img src={characterImage} alt="" />
                </div>
            )}
            {!isUser && !isLast && <div className="chatroom-msg-avatar-spacer" />}
            <div className="chatroom-bubble-wrap">
                <div
                    className={`chatroom-bubble ${isUser ? "chatroom-bubble-user" : "chatroom-bubble-ai"}`}
                    style={isStickerOnly ? { background: "transparent", boxShadow: "none", padding: 0, border: "none" } : undefined}
                >
                    {!isUser && isFirst && (
                        <span className="chatroom-bubble-sender">{characterName}</span>
                    )}
                    <div className="chatroom-message-content">
                        {renderMessageContent(message.content)}
                    </div>
                    <div className="chatroom-bubble-meta">
                        <span className="chatroom-bubble-time">
                            {new Date(message.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </span>
                        {isUser && (
                            <span className="chatroom-status-icon">
                                {message.status === "seen" ? (
                                    <span className="status-seen">Seen</span>
                                ) : (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </span>
                        )}
                    </div>
                </div>
                {/* Quick action row on context menu */}
                <AnimatePresence>
                    {showActions && (
                        <motion.div
                            className="chatroom-msg-actions"
                            initial={{ opacity: 0, y: -6, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.9 }}
                            transition={{ duration: 0.15 }}
                        >
                            <button className="chatroom-msg-action-btn" onClick={() => { navigator.clipboard.writeText(message.content); setShowActions(false); }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                    <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
                                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="1.5" />
                                </svg>
                                Copy
                            </button>
                            <button className="chatroom-msg-action-btn" onClick={() => setShowActions(false)}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                                Close
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
