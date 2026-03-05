"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CreateCharacterForm from "./CreateCharacterForm";
import AutoSetupForm from "./AutoSetupForm";
import type { Character } from "@/data/characters";

interface CreateTabProps {
    onNavigate?: (tab: "explore" | "chats" | "create" | "profile") => void;
    onSelectCharacter?: (character: any) => void;
    myCharacters: Character[];
    setMyCharacters: (chars: Character[]) => void;
}

export default function CreateTab({ onNavigate, onSelectCharacter, myCharacters = [], setMyCharacters }: CreateTabProps) {
    const [view, setView] = useState<"library" | "setup" | "success">("library");
    const [setupMode, setSetupMode] = useState<"manual" | "auto">("manual");
    const [importedData, setImportedData] = useState<any>(null);
    // myCharacters state removed as it is now a prop
    const [createdChar, setCreatedChar] = useState<Character | null>(null);

    const handleAutoSetupComplete = (data: any) => {
        // If we were editing a character (importedData has ID), we keep that ID to update it.
        // If we were creating (importedData is null or no ID), we ensure the new data DOES NOT have an ID.
        if (importedData?.id) {
            setImportedData({ ...data, id: importedData.id });
        } else {
            // Strip ID to ensure it is treated as a new character
            const { id, ...rest } = data;
            setImportedData(rest);
        }
        setSetupMode("manual");
    };

    const handleCreateSuccess = (character: Character) => {
        // Check if updating or creating
        const exists = myCharacters.find(c => c.id === character.id);
        if (exists) {
            setMyCharacters(myCharacters.map(c => c.id === character.id ? character : c));
        } else {
            setMyCharacters([character, ...myCharacters]);
        }
        setCreatedChar(character);
        setView("success");
    };

    return (
        <div className="no-scrollbar" style={{ height: "100%", overflowY: "auto", position: "relative", padding: "0 18px 120px" }}>
            <AnimatePresence mode="wait">
                {view === "library" && (
                    <LibraryView
                        key="library"
                        onCreateClick={() => {
                            setImportedData(null);
                            setView("setup");
                        }}
                        onEditClick={(char) => {
                            setImportedData(char);
                            setView("setup");
                        }}
                        onChatClick={(char) => {
                            if (onSelectCharacter) onSelectCharacter(char);
                        }}
                        characters={myCharacters}
                    />
                )}
                {view === "setup" && (
                    <SetupView
                        key="setup"
                        mode={setupMode}
                        setMode={setSetupMode}
                        importedData={importedData}
                        onAutoComplete={handleAutoSetupComplete}
                        onSuccess={handleCreateSuccess}
                        onBack={() => setView("library")}
                    />
                )}
                {view === "success" && (
                    <SuccessView
                        key="success"
                        isUpdate={!!importedData?.id}
                        onLibrary={() => setView("library")}
                        onChat={() => {
                            if (createdChar && onSelectCharacter) {
                                onSelectCharacter(createdChar);
                            }
                            // Reset view
                            setView("library");
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

const LibraryView = ({ onCreateClick, onEditClick, onChatClick, characters = [] }: { onCreateClick: () => void, onEditClick: (char: any) => void, onChatClick: (char: any) => void, characters: Character[] }) => {
    return (
        <motion.div
            style={{ paddingBottom: "100px" }}
        >
            <div className="explore-hero" style={{ paddingBottom: '20px' }}>
                <h1 className="explore-hero-title">My Library</h1>
                <p className="explore-hero-subtitle">
                    Manage and chat with your created characters
                </p>
            </div>

            {/* Create New Button */}
            <div style={{ padding: "0 4px", marginBottom: "30px" }}>
                <button
                    onClick={onCreateClick}
                    className="create-card-btn"
                >
                    <div className="create-icon-circle">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </div>
                    <div className="create-text">
                        <span className="create-title">Create New Character</span>
                        <span className="create-subtitle">Design from scratch or import</span>
                    </div>
                </button>
            </div>

            {/* Library Grid */}
            <div style={{ padding: "0 4px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#4A3728", marginBottom: "16px", paddingLeft: "4px" }}>
                    Your Characters
                </h3>

                <div className="explore-grid">
                    {characters.map((char) => (
                        <motion.div
                            key={char.id}
                            className="explore-card"
                            onClick={() => onChatClick(char)}
                            whileTap={{ scale: 0.98 }}
                        >
                            <div className="explore-card-img-wrap">
                                <img src={char.image} alt={char.name} className="explore-card-img" />
                                <div className="explore-card-img-overlay" />
                                <div className="explore-card-float-tag">
                                    <span>{char.tag}</span>
                                </div>
                                <button
                                    className="explore-card-info-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEditClick(char);
                                    }}
                                    aria-label="Edit character"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                </button>
                            </div>
                            <div className="explore-card-body">
                                <div className="explore-card-name-row">
                                    <h3 className="explore-card-name" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {char.name}
                                        {char.nickname && <span style={{ fontSize: '12px', color: '#9CA3AF', marginLeft: '6px', fontWeight: 'normal' }}>"{char.nickname}"</span>}
                                    </h3>
                                    <span className="explore-card-online">
                                        <span className="online-dot-sm" />
                                    </span>
                                </div>
                                <p className="explore-card-desc">{char.description}</p>
                                <div className="explore-card-footer">
                                    <span className="explore-card-chat-btn">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ marginRight: '4px' }}>
                                            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        Chat
                                    </span>
                                    <span className="explore-card-personality">
                                        {char.personality.split(",")[0].trim()}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            <style jsx>{`
                .create-card-btn {
                    width: 100%;
                    background: #fff;
                    border: 2px dashed #E5E7EB;
                    border-radius: 20px;
                    padding: 24px;
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: left;
                }
                .create-card-btn:hover {
                    border-color: #FFE566;
                    background: #FFFDF5;
                    transform: translateY(-2px);
                }
                .create-icon-circle {
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    background: #FFE566;
                    color: #4A3728;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    box-shadow: 0 4px 12px rgba(255, 229, 102, 0.3);
                }
                .create-text {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .create-title {
                    font-size: 16px;
                    font-weight: 700;
                    color: #4A3728;
                }
                .create-subtitle {
                    font-size: 13px;
                    color: #9CA3AF;
                }
            `}</style>
        </motion.div>
    );
};

const SetupView = ({
    mode,
    setMode,
    importedData,
    onAutoComplete,
    onSuccess,
    onBack
}: {
    mode: "manual" | "auto",
    setMode: (m: "manual" | "auto") => void,
    importedData: any,
    onAutoComplete: (data: any) => void,
    onSuccess: (char: Character) => void,
    onBack: () => void
}) => {
    return (
        <motion.div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "20px" }}>
                <button
                    onClick={onBack}
                    style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "8px",
                        borderRadius: "50%",
                        marginRight: "8px",
                        color: "#4B5563"
                    }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                </button>
                <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#1F2937" }}>
                    {importedData?.id ? "Edit Character" : "Setup Character"}
                </h2>
            </div>

            {/* Tab Switcher */}
            <div className="create-tab-switcher" style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
                <div style={{
                    background: '#F3F4F6',
                    padding: '4px',
                    borderRadius: '16px',
                    display: 'flex',
                    position: 'relative'
                }}>
                    {(['manual', 'auto'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setMode(tab)}
                            style={{
                                position: 'relative',
                                padding: '10px 24px',
                                borderRadius: '12px',
                                border: 'none',
                                background: 'transparent',
                                fontSize: '14px',
                                fontWeight: 600,
                                color: mode === tab ? '#4A3728' : '#9CA3AF',
                                cursor: 'pointer',
                                zIndex: 2,
                                transition: 'color 0.2s',
                                textTransform: 'capitalize'
                            }}
                        >
                            {tab === "manual" ? "Manual Setup" : "Auto Import"}
                            {mode === tab && (
                                <motion.div
                                    layoutId="activeTabPill"
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        background: '#fff',
                                        borderRadius: '12px',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                        zIndex: -1
                                    }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <motion.div
                key={mode}
            >
                {mode === "manual" ? (
                    <CreateCharacterForm initialData={importedData} onSuccess={onSuccess} />
                ) : (
                    <AutoSetupForm onComplete={onAutoComplete} />
                )}
            </motion.div>
        </motion.div>
    );
};

const SuccessView = ({ onLibrary, onChat, isUpdate }: { onLibrary: () => void, onChat: () => void, isUpdate?: boolean }) => {
    return (
        <motion.div
            style={{
                height: "80vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: "20px"
            }}
        >
            {/* Custom SVG Animation */}
            <div style={{ marginBottom: "32px", position: "relative" }}>
                <motion.div
                    animate={{
                        scale: [1, 1.05, 1],
                        rotate: [0, 5, -5, 0]
                    }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                >
                    <svg width="180" height="180" viewBox="0 0 200 200" fill="none">
                        <defs>
                            <linearGradient id="successGradient" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#FFE566" />
                                <stop offset="1" stopColor="#FFD700" />
                            </linearGradient>
                            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="5" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                        </defs>

                        {/* Background Circles */}
                        <motion.circle
                            cx="100" cy="100" r="80"
                            stroke="url(#successGradient)"
                            strokeWidth="2"
                            strokeOpacity="0.3"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1.2, opacity: 0 }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                        <motion.circle
                            cx="100" cy="100" r="60"
                            fill="url(#successGradient)"
                            fillOpacity="0.1"
                            animate={{ r: [60, 65, 60] }}
                            transition={{ duration: 3, repeat: Infinity }}
                        />

                        {/* Character Element Placeholder */}
                        <circle cx="100" cy="85" r="35" fill="white" stroke="#4A3728" strokeWidth="4" />
                        <motion.path
                            d="M85 85 Q100 95 115 85"
                            stroke="#4A3728"
                            strokeWidth="3"
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ delay: 0.5, duration: 0.8 }}
                        />
                        <circle cx="90" cy="80" r="4" fill="#4A3728" />
                        <circle cx="110" cy="80" r="4" fill="#4A3728" />

                        {/* Sparkles */}
                        <motion.path
                            d="M150 50 L155 40 L160 50 L170 55 L160 60 L155 70 L150 60 L140 55 Z"
                            fill="#FFD700"
                            animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                        />
                        <motion.path
                            d="M40 140 L45 130 L50 140 L60 145 L50 150 L45 160 L40 150 L30 145 Z"
                            fill="#FFD700"
                            animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: 0.8 }}
                        />

                        {/* Checkmark Badge */}
                        <motion.circle
                            cx="140" cy="140" r="25"
                            fill="#4ADE80"
                            stroke="white" strokeWidth="4"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", delay: 0.3 }}
                        />
                        <motion.path
                            d="M128 140 L136 148 L152 132"
                            stroke="white"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ delay: 0.6, duration: 0.4 }}
                        />
                    </svg>
                </motion.div>
            </div>

            <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#4A3728", marginBottom: "8px" }}>
                {isUpdate ? "Character Updated!" : "Character Created!"}
            </h2>
            <p style={{ color: "#6B7280", marginBottom: "40px", maxWidth: "280px" }}>
                {isUpdate ? "Your character changes have been saved." : "Your new companion is ready to chat."}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", maxWidth: "300px" }}>
                <button
                    onClick={onLibrary}
                    className="btn-primary"
                    style={{
                        background: "#4A3728",
                        color: "#fff",
                        padding: "16px",
                        borderRadius: "16px",
                        fontSize: "16px",
                        fontWeight: "600",
                        border: "none",
                        cursor: "pointer",
                        boxShadow: "0 10px 20px rgba(74, 55, 40, 0.2)"
                    }}
                >
                    View in Library
                </button>
                <button
                    onClick={onChat}
                    style={{
                        background: "transparent",
                        color: "#4A3728",
                        padding: "16px",
                        borderRadius: "16px",
                        fontSize: "16px",
                        fontWeight: "600",
                        border: "2px solid #E5E7EB",
                        cursor: "pointer",
                        transition: "all 0.2s"
                    }}
                >
                    Start a new chat
                </button>
            </div>
        </motion.div>
    );
};
