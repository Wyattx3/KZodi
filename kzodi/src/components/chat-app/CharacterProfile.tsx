"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Character } from "@/data/characters";
import { useChatStore } from "@/lib/chatStore";


interface CharacterProfileProps {
    character: Character;
    onBack: () => void;
    messageCount: number;
}

export default function CharacterProfile({ character, onBack, messageCount }: CharacterProfileProps) {
    const [showOptions, setShowOptions] = useState(false);
    const [showNicknameModal, setShowNicknameModal] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [nicknameInput, setNicknameInput] = useState("");
    const { deleteConversation, setCustomName, conversations } = useChatStore();
    
    const customName = conversations[character.id]?.customName || "";
    const displayName = customName || character.name;

    const [isLiked, setIsLiked] = useState<boolean>(character.userHasLiked || false);
    const [likesCount, setLikesCount] = useState<number>(character.likesCount || character.likes || 0);

    React.useEffect(() => {
        const handleLikeUpdate = (e: Event) => {
            const customEvent = e as CustomEvent<{ id: string, likesCount: number, liked: boolean }>;
            if (customEvent.detail.id === character.id) {
                setIsLiked(customEvent.detail.liked);
                setLikesCount(customEvent.detail.likesCount);
            }
        };
        window.addEventListener('characterLikeUpdate', handleLikeUpdate);
        return () => window.removeEventListener('characterLikeUpdate', handleLikeUpdate);
    }, [character.id]);

    const handleToggleLike = async () => {
        const wasLiked = isLiked;
        const newLikes = likesCount + (wasLiked ? -1 : 1);

        // Optimistic UI
        setIsLiked(!wasLiked);
        setLikesCount(Math.max(0, newLikes));

        try {
            const res = await fetch(`/api/characters/${character.id}/like`, { method: "POST" });
            if (!res.ok) throw new Error(res.status === 401 ? "unauthorized" : "failed");

            const data = await res.json();
            if (data.success && typeof data.likesCount === 'number') {
                setIsLiked(data.liked);
                setLikesCount(data.likesCount);
                window.dispatchEvent(new CustomEvent('characterLikeUpdate', {
                    detail: { id: character.id, likesCount: data.likesCount, liked: data.liked }
                }));
            }
        } catch (err: any) {
            setIsLiked(wasLiked);
            setLikesCount(likesCount);
            if (err.message === "unauthorized") alert("Please log in to like this character.");
        }
    };

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
        const shareUrl = `${window.location.origin}/chat/character/${character.id}`;
        if (navigator.share) {
            navigator.share({
                title: `Chat with ${character.name} on K-Zodi`,
                text: character.description,
                url: shareUrl,
            }).catch(() => { });
        } else {
            navigator.clipboard.writeText(shareUrl);
            alert("Link copied to clipboard!");
        }
        setShowOptions(false);
    };

    const handleSaveNickname = () => {
        setCustomName(character.id, nicknameInput.trim());
        setShowNicknameModal(false);
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
                                    <button className="profile-option-item" onClick={() => {
                                        setNicknameInput(customName);
                                        setShowOptions(false);
                                        setShowNicknameModal(true);
                                    }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2-2v-7" />
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                        </svg>
                                        Edit Nickname
                                    </button>
                                    <button className="profile-option-item" onClick={handleShare}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                                            <polyline points="16 6 12 2 8 6" />
                                            <line x1="12" y1="2" x2="12" y2="15" />
                                        </svg>
                                        Share Character
                                    </button>
                                    <button className="profile-option-item profile-option-item-danger" onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setShowOptions(false);
                                        setShowResetModal(true);
                                    }}>
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
                    >
                        <img src={character.image} alt={character.name} className="profile-avatar" />
                        <div className="profile-online-badge" />
                    </motion.div>

                    <motion.div
                        className="profile-title-block"
                    >
                        <h1 className="profile-name">{displayName}</h1>
                        {character.nickname && (
                            <div style={{ fontSize: '15px', color: '#6B7280', fontWeight: 500, marginBottom: '8px' }}>
                                "{character.nickname}"
                            </div>
                        )}
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
                >
                    <div className="profile-stat-item">
                        <span className="profile-stat-value">{messageCount}</span>
                        <span className="profile-stat-label">Messages</span>
                    </div>
                    <div className="profile-stat-sep" />
                    <button
                        className="profile-stat-item profile-stat-btn"
                        onClick={handleToggleLike}
                        style={{ background: "none", border: "none", cursor: "pointer" }}
                    >
                        <span className="profile-stat-value" style={{ display: "flex", alignItems: "center", gap: "4px", color: isLiked ? "#EF4444" : "inherit" }}>
                            {formatLikes(likesCount)}
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

                {/* Additional Info Row: Zodiac & Birthday */}
                {(character.zodiac_sign || character.birthday) && (
                    <>
                        <motion.div
                            className="profile-stats"
                            style={{ padding: "0 16px", gap: "12px", flexWrap: "wrap", justifyContent: "center", borderBottom: "none" }}
                        >
                            {character.zodiac_sign && (
                                <div className="profile-stat-item" style={{ background: "transparent", padding: "4px 8px" }}>
                                    <span className="profile-stat-value" style={{ fontSize: "14px" }}>{character.zodiac_sign}</span>
                                    <span className="profile-stat-label">Zodiac Sign</span>
                                </div>
                            )}
                            {character.zodiac_sign && character.birthday && (
                                <div className="profile-stat-sep" />
                            )}
                            {character.birthday && (
                                <div className="profile-stat-item" style={{ background: "transparent", padding: "4px 8px" }}>
                                    <span className="profile-stat-value" style={{ fontSize: "14px" }}>{character.birthday}</span>
                                    <span className="profile-stat-label">Birthday</span>
                                </div>
                            )}
                        </motion.div>
                        <div className="profile-divider" />
                    </>
                )}

                {/* About Section - Prefer Long Description */}
                <motion.div
                    className="profile-section"
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
                    >
                        <h3 className="profile-section-title">Tags</h3>
                        <div className="profile-traits">
                            {character.tags.map(tag => (
                                <span key={tag} className="profile-trait" style={{ background: "transparent", border: "1px solid #E5E7EB", padding: "4px 10px", fontSize: "12px" }}>#{tag}</span>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Personality Section */}
                <motion.div
                    className="profile-section"
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
                    >
                        <h3 className="profile-section-title">Scenario</h3>
                        <p className="profile-description" style={{ fontSize: "14px", fontStyle: "italic", background: "transparent", padding: "0" }}>
                            {character.scenario}
                        </p>
                    </motion.div>
                )}

                {/* First Message */}
                <motion.div
                    className="profile-section"
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
                    >
                        <h3 className="profile-section-title">Example Dialogue</h3>
                        <div className="profile-description" style={{
                            fontSize: "13px",
                            whiteSpace: "pre-wrap",
                            background: "rgba(0,0,0,0.02)",
                            padding: "10px",
                            borderRadius: "10px",
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

            {/* Custom Nickname Modal */}
            <AnimatePresence>
                {showNicknameModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "transparent",
                            zIndex: 1000,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "20px"
                        }}
                        onClick={() => setShowNicknameModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{
                                backgroundColor: "white",
                                borderRadius: "16px",
                                padding: "24px",
                                width: "100%",
                                maxWidth: "340px",
                                boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
                                display: "flex",
                                flexDirection: "column",
                                gap: "16px"
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 style={{ margin: 0, color: "#4A3728", fontSize: "18px", fontWeight: 700 }}>Edit Nickname</h3>
                            <p style={{ margin: 0, color: "#6B7280", fontSize: "14px" }}>
                                Set a personal nickname for {character.name}. This is only visible to you.
                            </p>
                            <input
                                autoFocus
                                type="text"
                                value={nicknameInput}
                                onChange={(e) => setNicknameInput(e.target.value)}
                                placeholder="Enter nickname"
                                style={{
                                    width: "100%",
                                    padding: "12px 16px",
                                    borderRadius: "12px",
                                    border: "1px solid #E5E7EB",
                                    fontSize: "16px",
                                    outline: "none",
                                    transition: "border-color 0.2s",
                                }}
                                onFocus={(e) => e.target.style.borderColor = "#38A3FD"}
                                onBlur={(e) => e.target.style.borderColor = "#E5E7EB"}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleSaveNickname();
                                    }
                                }}
                            />
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
                                <button
                                    onClick={() => setShowNicknameModal(false)}
                                    style={{
                                        padding: "10px 16px",
                                        borderRadius: "10px",
                                        border: "none",
                                        backgroundColor: "rgba(0,0,0,0.05)",
                                        color: "#4A3728",
                                        fontWeight: 600,
                                        fontSize: "14px",
                                        cursor: "pointer"
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveNickname}
                                    style={{
                                        padding: "10px 16px",
                                        borderRadius: "10px",
                                        border: "none",
                                        backgroundColor: "#4A3728",
                                        color: "white",
                                        fontWeight: 600,
                                        fontSize: "14px",
                                        cursor: "pointer"
                                    }}
                                >
                                    Save
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Custom Reset Chat Modal */}
            <AnimatePresence>
                {showResetModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "rgba(0, 0, 0, 0.5)",
                            backdropFilter: "blur(4px)",
                            zIndex: 1000,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "20px"
                        }}
                        onClick={() => setShowResetModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{
                                backgroundColor: "white",
                                borderRadius: "16px",
                                padding: "24px",
                                width: "100%",
                                maxWidth: "340px",
                                boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
                                display: "flex",
                                flexDirection: "column",
                                gap: "16px"
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 style={{ margin: 0, color: "#4A3728", fontSize: "18px", fontWeight: 700 }}>Reset Chat</h3>
                            <p style={{ margin: 0, color: "#6B7280", fontSize: "14px" }}>
                                Are you sure you want to reset your conversation with {character.name}? Your previous messages will be cleared.
                            </p>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
                                <button
                                    onClick={() => setShowResetModal(false)}
                                    style={{
                                        padding: "10px 16px",
                                        borderRadius: "10px",
                                        border: "none",
                                        backgroundColor: "rgba(0,0,0,0.05)",
                                        color: "#4A3728",
                                        fontWeight: 600,
                                        fontSize: "14px",
                                        cursor: "pointer",
                                        transition: "background 0.2s"
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        setShowResetModal(false);
                                        deleteConversation(character.id);
                                        onBack();
                                        try {
                                            await fetch("/api/memory", {
                                                method: "DELETE",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ characterId: character.id })
                                            });
                                        } catch (err) { }
                                    }}
                                    style={{
                                        padding: "10px 16px",
                                        borderRadius: "10px",
                                        border: "none",
                                        backgroundColor: "#EF4444",
                                        color: "white",
                                        fontWeight: 600,
                                        fontSize: "14px",
                                        cursor: "pointer",
                                        transition: "background 0.2s"
                                    }}
                                >
                                    Reset
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
