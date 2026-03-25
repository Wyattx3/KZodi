"use client";
import React, { useRef, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useChatStore, type Conversation } from "@/lib/chatStore";
import { Character } from "@/data/characters";

interface StoryCreateModalProps {
    charMap: Record<string, Character>;
    conversations: Conversation[];
    onClose: () => void;
    onCreated: (storyId: string) => void;
}

export default function StoryCreateModal({ charMap, conversations, onClose, onCreated }: StoryCreateModalProps) {
    const [step, setStep] = useState<"info" | "character" | "cast">("info");
    
    // Step 1: Info
    const [title, setTitle] = useState("");
    const [genre, setGenre] = useState("");
    const [synopsis, setSynopsis] = useState("");
    const [coverImage, setCoverImage] = useState("");
    const [backgroundImage, setBackgroundImage] = useState("");
    const [themeColor, setThemeColor] = useState("#E8E1D5"); // Default Ivory/Gold
    
    // Step 2: Player Character
    const [playerCharacterName, setPlayerCharacterName] = useState("");
    const [playerCharacterDescription, setPlayerCharacterDescription] = useState("");

    // Step 3: Cast
    const [selectedCastIds, setSelectedCastIds] = useState<string[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const availableCharacters = useMemo(() => {
        return conversations
            .filter(c => !c.isGroup && c.conversationType !== "story")
            .map(c => charMap[c.characterId])
            .filter(Boolean);
    }, [conversations, charMap]);

    const toggleCast = (charId: string) => {
        setSelectedCastIds(prev =>
            prev.includes(charId) ? prev.filter(id => id !== charId) : [...prev, charId]
        );
    };

    const handleCreate = () => {
        if (!title.trim() || !coverImage) return;
        
        const storyData = {
            synopsis,
            genre,
            isPublished: false,
            playerCharacterName,
            playerCharacterDescription,
            castIds: selectedCastIds,
            themeColor,
            backgroundImage,
        };

        const storyId = useChatStore.getState().createStory(title, coverImage, storyData);
        onCreated(storyId);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isCover: boolean) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            if (isCover) {
                setCoverImage(ev.target?.result as string);
            } else {
                setBackgroundImage(ev.target?.result as string);
            }
        };
        reader.readAsDataURL(file);
    };

    const GENRES = ["Fantasy", "Sci-Fi", "Romance", "Mystery", "Horror", "Adventure", "Slice of Life", "Isekai"];

    const stepLabels: Record<string, { title: string; subtitle: string }> = {
        info: { title: "Story Info", subtitle: "Title & Plot" },
        character: { title: "Your Character", subtitle: "Persona Setup" },
        cast: { title: "Story Cast", subtitle: "Select Characters (Optional)" },
    };

    const handleBack = () => {
        if (step === "cast") setStep("character");
        else if (step === "character") setStep("info");
        else onClose();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
                position: "fixed", inset: 0, zIndex: 1000,
                background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)",
                display: "flex", alignItems: "flex-end", justifyContent: "center"
            }}
            onClick={onClose}
        >
            <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                onClick={e => e.stopPropagation()}
                style={{
                    width: "100%", maxWidth: "480px", height: "85vh",
                    background: "#FFFDF5", borderRadius: "24px 24px 0 0",
                    display: "flex", flexDirection: "column", overflow: "hidden"
                }}
            >
                <div style={{
                    padding: "20px 20px 12px", borderBottom: "1px solid rgba(0,0,0,0.06)",
                    display: "flex", alignItems: "center", justifyContent: "space-between"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <button
                            onClick={handleBack}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#4A3728", padding: "4px" }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M15 4L7 12L15 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <div>
                            <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#4A3728", margin: 0 }}>
                                {stepLabels[step].title}
                            </h2>
                            <p style={{ fontSize: "13px", color: "#8B8680", margin: 0 }}>
                                {stepLabels[step].subtitle}
                            </p>
                        </div>
                    </div>

                    {step === "info" && (
                        <motion.button onClick={() => setStep("character")} disabled={!title || !coverImage} style={{ background: (title && coverImage) ? "#4A3728" : "#ccc", color: "#fff", border: "none", borderRadius: "20px", padding: "8px 20px", fontSize: "14px", fontWeight: 600, cursor: (title && coverImage) ? "pointer" : "default" }}>
                            Next →
                        </motion.button>
                    )}

                    {step === "character" && (
                        <motion.button onClick={() => setStep("cast")} style={{ background: "#4A3728", color: "#fff", border: "none", borderRadius: "20px", padding: "8px 20px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
                            Next →
                        </motion.button>
                    )}

                    {step === "cast" && (
                        <motion.button onClick={handleCreate} style={{ background: "#4A3728", color: "#fff", border: "none", borderRadius: "20px", padding: "8px 20px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
                            Create ✨
                        </motion.button>
                    )}
                </div>

                {step === "info" && (
                    <div style={{ flex: 1, padding: "24px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>
                        <div style={{ display: "flex", justifyContent: "center", gap: "20px" }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                                <label style={{ fontSize: "12px", fontWeight: 600, color: "#8B8680" }}>COVER IMAGE</label>
                                <input type="file" accept="image/*" ref={fileInputRef} style={{ display: "none" }} onChange={(e) => handleFileChange(e, true)} />
                                <div onClick={() => fileInputRef.current?.click()} style={{ width: "80px", height: "110px", borderRadius: "10px", background: coverImage ? `url(${coverImage}) center/cover` : "linear-gradient(135deg, #eee, #ddd)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "2px dashed #bbb" }}>
                                    {!coverImage && "Cover"}
                                </div>
                            </div>
                            
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                                <label style={{ fontSize: "12px", fontWeight: 600, color: "#8B8680" }}>CHAT BACKGROUND (OPTIONAL)</label>
                                <input type="file" accept="image/*" id="bg-upload" style={{ display: "none" }} onChange={(e) => handleFileChange(e, false)} />
                                <div onClick={() => document.getElementById('bg-upload')?.click()} style={{ width: "80px", height: "110px", borderRadius: "10px", background: backgroundImage ? `url(${backgroundImage}) center/cover` : "linear-gradient(135deg, #eee, #ddd)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "2px dashed #bbb" }}>
                                    {!backgroundImage && "BG"}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: "13px", fontWeight: 600, color: "#8B8680", marginBottom: "8px", display: "block" }}>THEME COLOR</label>
                            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                {["#E8E1D5", "#E69A8D", "#8DA8E6", "#8DE6A8", "#E6D88D"].map(color => (
                                    <button 
                                        key={color} 
                                        onClick={() => setThemeColor(color)}
                                        style={{ width: "32px", height: "32px", borderRadius: "50%", background: color, border: themeColor === color ? "3px solid #4A3728" : "2px solid #ddd", cursor: "pointer" }}
                                    />
                                ))}
                                <input type="color" value={themeColor} onChange={e => setThemeColor(e.target.value)} style={{ width: "32px", height: "32px", border: "none", padding: 0, cursor: "pointer", borderRadius: "8px" }} title="Custom Color" />
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: "13px", fontWeight: 600, color: "#8B8680", marginBottom: "8px", display: "block" }}>STORY TITLE</label>
                            <input type="text" placeholder="Enter title..." value={title} onChange={e => setTitle(e.target.value)} style={{ width: "100%", padding: "14px 16px", fontSize: "16px", border: "1.5px solid rgba(0,0,0,0.08)", borderRadius: "14px", outline: "none" }} />
                        </div>

                        <div>
                            <label style={{ fontSize: "13px", fontWeight: 600, color: "#8B8680", marginBottom: "8px", display: "block" }}>GENRE</label>
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                {GENRES.map(g => (
                                    <button key={g} onClick={() => setGenre(g)} style={{ padding: "6px 14px", borderRadius: "20px", border: "none", background: genre === g ? "#4A3728" : "rgba(0,0,0,0.05)", color: genre === g ? "#fff" : "#4A3728", cursor: "pointer", fontSize: "13px", fontWeight: 500 }}>
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: "13px", fontWeight: 600, color: "#8B8680", marginBottom: "8px", display: "block" }}>SYNOPSIS</label>
                            <textarea placeholder="Write a brief summary of the story..." value={synopsis} onChange={e => setSynopsis(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "1px solid #ddd", minHeight: "100px", outline: "none", resize: "vertical" }} />
                        </div>
                    </div>
                )}

                {step === "character" && (
                    <div style={{ flex: 1, padding: "24px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>
                        <div>
                            <label style={{ fontSize: "13px", fontWeight: 600, color: "#8B8680", marginBottom: "8px", display: "block" }}>PLAYER CHARACTER NAME</label>
                            <input type="text" placeholder="e.g. Arthur Pendragon" value={playerCharacterName} onChange={e => setPlayerCharacterName(e.target.value)} style={{ width: "100%", padding: "14px 16px", fontSize: "16px", border: "1.5px solid rgba(0,0,0,0.08)", borderRadius: "14px", outline: "none" }} />
                        </div>

                        <div>
                            <label style={{ fontSize: "13px", fontWeight: 600, color: "#8B8680", marginBottom: "8px", display: "block" }}>CHARACTER DESCRIPTION</label>
                            <textarea placeholder="Appearance, class, backstory, abilities..." value={playerCharacterDescription} onChange={e => setPlayerCharacterDescription(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "1px solid #ddd", minHeight: "150px", outline: "none", resize: "vertical" }} />
                        </div>
                    </div>
                )}

                {step === "cast" && (
                    <div style={{ flex: 1, padding: "24px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
                        <p style={{ fontSize: "13px", color: "#8B8680", margin: 0 }}>
                            Select characters to participate in your story. They will appear as NPCs the narrator can control.
                        </p>
                        {availableCharacters.length === 0 && (
                            <div style={{ textAlign: "center", padding: "40px 20px", color: "#8B8680" }}>
                                <p style={{ fontSize: "14px" }}>No characters available.</p>
                                <p style={{ fontSize: "12px" }}>Create or discover characters first.</p>
                            </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {availableCharacters.map(char => {
                                const isSelected = selectedCastIds.includes(char.id);
                                return (
                                    <div
                                        key={char.id}
                                        onClick={() => toggleCast(char.id)}
                                        style={{
                                            display: "flex", alignItems: "center", gap: "12px",
                                            padding: "10px 14px", borderRadius: "14px",
                                            background: isSelected ? "rgba(74, 55, 40, 0.08)" : "rgba(0,0,0,0.02)",
                                            border: isSelected ? "2px solid #4A3728" : "2px solid transparent",
                                            cursor: "pointer", transition: "all 0.2s ease",
                                        }}
                                    >
                                        <img
                                            src={char.image}
                                            alt={char.name}
                                            style={{
                                                width: "42px", height: "42px", borderRadius: "50%",
                                                objectFit: "cover", flexShrink: 0,
                                            }}
                                        />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: "14px", color: "#4A3728" }}>
                                                {char.name}
                                            </div>
                                            <div style={{ fontSize: "12px", color: "#8B8680", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {char.tag} · {char.personality?.split(",")[0]?.trim() || ""}
                                            </div>
                                        </div>
                                        <div style={{
                                            width: "22px", height: "22px", borderRadius: "50%",
                                            border: isSelected ? "none" : "2px solid #ccc",
                                            background: isSelected ? "#4A3728" : "transparent",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            flexShrink: 0, transition: "all 0.2s ease",
                                        }}>
                                            {isSelected && (
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                                    <path d="M20 6L9 17L4 12" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {selectedCastIds.length > 0 && (
                            <p style={{ fontSize: "12px", color: "#4A3728", fontWeight: 600, margin: "4px 0 0" }}>
                                {selectedCastIds.length} character{selectedCastIds.length > 1 ? "s" : ""} selected
                            </p>
                        )}
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}
