"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Character } from "@/data/characters";
import { useChatStore } from "@/lib/chatStore";
import { useInteractionStore } from "@/lib/interactionStore";

interface CharacterProfileProps {
    character: Character;
    onBack: () => void;
    messageCount: number;
}

export default function CharacterProfile({ character, onBack, messageCount }: CharacterProfileProps) {
    const [showOptions, setShowOptions] = useState(false);
    const { deleteConversation } = useChatStore();
    const { likedCharacters, toggleLike } = useInteractionStore();

    const isLiked = likedCharacters[character.id] || false;

    // Calculate display values
    const displayLikes = (character.likes || 0) + (isLiked ? 1 : 0);

    const formatLikes = (num: number) => {
        if (num >= 1000) return (num / 1000).toFixed(1) + "k";
        return num.toString();
    };


    const handleResetChat = async () => {
        if (window.confirm(`Are you sure you want to reset your conversation with ${character.name}?`)) {
            deleteConversation(character.id);
            setShowOptions(false);
            onBack();
            try {
                await fetch("/api/memory", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ characterId: character.id })
                });
            } catch (err) { }
        }
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: `Chat with ${character.name} on K-Zodi`,
                text: character.description,
                url: window.location.href,
            }).catch(() => { });
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert("Link copied to clipboard!");
        }
        setShowOptions(false);
    };

    return (
        <motion.div
            className="profile-page"
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={() => setShowOptions(false)}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ right: 0.5, left: 0 }}
            onPointerDown={(e) => {
                // Ensure drag doesn't conflict with button clicks
            }}
            onDragEnd={(e, info) => {
                if (info.offset.x > 80 || info.velocity.x > 300) {
                    onBack();
                }
            }}
            style={{ touchAction: "pan-y" }}
        >
            {/* Header / Hero */}
            <div className="profile-hero">
                <div className="profile-hero-bg">
                    <img src={character.image} alt="" />
                    <div className="profile-hero-overlay" />
                </div>

                <div className="profile-nav">
                    <motion.button className="profile-back-btn"
                        onTap={() => setTimeout(() => onBack(), 10)}
                        whileTap={{ scale: 0.9 }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5" />
                            <path d="M12 19l-7-7 7-7" />
                        </svg>
                    </motion.button>

                    <div style={{ position: "relative" }}>
                        <button
                            className="profile-option-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setShowOptions(!showOptions);
                            }}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="1" />
                                <circle cx="12" cy="5" r="1" />
                                <circle cx="12" cy="19" r="1" />
                            </svg>
                        </button>

                        <AnimatePresence>
                            {showOptions && (
                                <motion.div
                                    className="profile-options-dropdown"
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button className="profile-option-item" onClick={handleShare}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                                            <polyline points="16 6 12 2 8 6" />
                                            <line x1="12" y1="2" x2="12" y2="15" />
                                        </svg>
                                        Share Character
                                    </button>
                                    <button className="profile-option-item profile-option-item-danger" onClick={handleResetChat}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M3 6h18" />
                                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                        </svg>
                                        Reset Chat
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="profile-hero-content">
                    <motion.div
                        className="profile-avatar-container"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <img src={character.image} alt={character.name} className="profile-avatar" />
                        <div className="profile-online-badge" />
                    </motion.div>

                    <motion.div
                        className="profile-title-block"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <h1 className="profile-name">{character.name}</h1>
                        <div className="profile-tags">
                            <span className="profile-tag-pill">{character.tag}</span>
                            <span className="profile-status">Online Now</span>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="profile-body no-scrollbar">

                {/* Stats Row */}
                <motion.div
                    className="profile-stats"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    <div className="profile-stat-item">
                        <span className="profile-stat-value">{messageCount}</span>
                        <span className="profile-stat-label">Messages</span>
                    </div>
                    <div className="profile-stat-sep" />
                    <button
                        className="profile-stat-item profile-stat-btn"
                        onClick={() => toggleLike(character.id)}
                        style={{ background: "none", border: "none", cursor: "pointer" }}
                    >
                        <span className="profile-stat-value" style={{ display: "flex", alignItems: "center", gap: "4px", color: isLiked ? "#EF4444" : "inherit" }}>
                            {formatLikes(displayLikes)}
                            <svg width="16" height="16" viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                        </span>
                        <span className="profile-stat-label">{isLiked ? "Liked" : "Likes"}</span>
                    </button>
                    <div className="profile-stat-sep" />
                    <div className="profile-stat-item">
                        <span className="profile-stat-value" style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                            {character.totalUsers ? (character.totalUsers >= 1000 ? (character.totalUsers / 1000).toFixed(1) + "k" : character.totalUsers) : "0"}
                        </span>
                        <span className="profile-stat-label">Talking</span>
                    </div>
                </motion.div>

                <div className="profile-divider" />

                {/* About Section - Prefer Long Description */}
                <motion.div
                    className="profile-section"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    <h3 className="profile-section-title">About</h3>
                    <p className="profile-description" style={{ whiteSpace: "pre-wrap" }}>
                        {character.longDescription || character.description}
                    </p>
                </motion.div>

                {/* Tags Section */}
                {character.tags && character.tags.length > 0 && (
                    <motion.div
                        className="profile-section"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.55 }}
                    >
                        <h3 className="profile-section-title">Tags</h3>
                        <div className="profile-traits">
                            {character.tags.map(tag => (
                                <span key={tag} className="profile-trait" style={{ background: "#FFF8D6", border: "1px solid #FCE57C" }}>#{tag}</span>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Personality Section */}
                <motion.div
                    className="profile-section"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                >
                    <h3 className="profile-section-title">Personality</h3>
                    <div className="profile-traits">
                        {character.personality.split(',').map(trait => (
                            <span key={trait} className="profile-trait">{trait.trim()}</span>
                        ))}
                    </div>
                </motion.div>

                {/* Scenario Section */}
                {character.scenario && (
                    <motion.div
                        className="profile-section"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.65 }}
                    >
                        <h3 className="profile-section-title">Scenario</h3>
                        <p className="profile-description" style={{ fontSize: "14px", fontStyle: "italic", background: "#FFF", padding: "12px", borderRadius: "12px", border: "1px solid #FCE57C" }}>
                            {character.scenario}
                        </p>
                    </motion.div>
                )}

                {/* First Message */}
                <motion.div
                    className="profile-section"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.7 }}
                >
                    <h3 className="profile-section-title">First Message</h3>
                    <div className="profile-greeting-card">
                        <p>“{character.greeting}”</p>
                    </div>
                </motion.div>

                {/* Example Dialogue - Collapsible or Card */}
                {character.exampleDialogue && (
                    <motion.div
                        className="profile-section"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.75 }}
                    >
                        <h3 className="profile-section-title">Example Dialogue</h3>
                        <div className="profile-description" style={{
                            fontSize: "13px",
                            whiteSpace: "pre-wrap",
                            background: "#FFF8D6",
                            padding: "16px",
                            borderRadius: "16px",
                            border: "1px solid #FFE566",
                            color: "#4A3728"
                        }}>
                            {character.exampleDialogue}
                        </div>
                    </motion.div>
                )}

                <div className="profile-spacer" />
            </div>

            {/* Floating Action Button */}
            <motion.div
                className="profile-footer"
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                transition={{ delay: 0.8 }}
            >
                <motion.button className="profile-chat-btn"
                    onTap={() => setTimeout(() => onBack(), 10)}
                    whileTap={{ scale: 0.95 }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    Continue Chatting
                </motion.button>
            </motion.div>
        </motion.div>
    );
}
