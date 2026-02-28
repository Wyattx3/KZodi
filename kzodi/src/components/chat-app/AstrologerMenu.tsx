"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Sun, Moon, Heart, Briefcase, Globe,
    Layers, Gem, Compass, UserCog, Settings
} from "lucide-react";

interface AstrologerMenuProps {
    onAction: (prompt: string, displayMessage?: string) => void;
    onOpenStandardMenu: () => void;
    onUpdateProfile?: () => void;
    onClose: () => void;
}

export default function AstrologerMenu({ onAction, onOpenStandardMenu, onUpdateProfile, onClose }: AstrologerMenuProps) {
    const menuItems = [
        {
            id: "daily", icon: <Sun size={18} color="#F59E0B" />, label: "Daily Horoscope",
            prompt: "Please give me my daily horoscope for today. Output a [[DAILY: Title | Score | Body]] tag.",
            display: "Tell me my daily horoscope 🌟"
        },
        {
            id: "tarot", icon: <Layers size={18} color="#8B5CF6" />, label: "Tarot Draw",
            prompt: "Draw a single tarot card for me and explain its meaning right now. Output a [[TAROT: Card Name | Meaning | Upright/Reversed]] tag.",
            display: "Draw a Tarot card for me 🃏"
        },
        {
            id: "love", icon: <Heart size={18} color="#EF4444" />, label: "Love Compatibility",
            prompt: "Give me an in-depth love and compatibility reading based on my chart. Generate a [[COMPATIBILITY: My Sign | Their Sign | Score | Key Aspect]] tag.",
            display: "Check my Love Compatibility ❤️"
        },
        {
            id: "career", icon: <Briefcase size={18} color="#3B82F6" />, label: "Career Insights",
            prompt: "What are my career and wealth insights based on my chart? Generate a [[TABLE: Career Strengths | Trait | Impact]].",
            display: "Give me Career Insights 💼"
        },
        {
            id: "transit", icon: <Globe size={18} color="#10B981" />, label: "Transit Update",
            prompt: "What planetary transits are affecting me right now, and how should I navigate them?",
            display: "What's my current Planetary Transit? 🌐"
        },
        {
            id: "moon", icon: <Moon size={18} color="#6366F1" />, label: "Moon Phase Focus",
            prompt: "Based on the current moon phase and my chart, what should my emotional or spiritual focus be? Output a [[DAILY: Moon Phase Focus | Score | Body]] tag.",
            display: "Focus for this Moon Phase? 🌙"
        },
        {
            id: "crystal", icon: <Gem size={18} color="#EC4899" />, label: "Crystal/Remedy",
            prompt: "Suggest some specific crystals, herbs, or remedies that align with my current astrological needs. Output a [[REMEDY: Material1 | Purpose1 @@ Material2 | Purpose2]] tag.",
            display: "Suggest Crystals/Remedies 💎"
        },
        {
            id: "chart", icon: <Compass size={18} color="#06B6D4" />, label: "Detailed Birth Chart",
            prompt: "Generate a detailed birth chart data layout for me. Please output a [[CHART: BirthChart | Planets]] or table.",
            display: "Show my Detailed Birth Chart 🗺️"
        },
        {
            id: "update", icon: <UserCog size={18} color="#14B8A6" />, label: "Update Profile",
            prompt: "I want to ask about someone else or update my birth details. How can I do that?",
            display: "Update my Reading Data ✨"
        }
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{
                position: "absolute",
                top: "40px",
                right: "0",
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.5)",
                borderRadius: "20px",
                boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0,0,0,0.05)",
                padding: "8px",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                minWidth: "220px",
                zIndex: 100,
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <div style={{ padding: "8px 12px 4px", fontSize: "12px", fontWeight: 800, color: "#8B5CF6", textTransform: "uppercase", letterSpacing: "1px" }}>
                Astrologer Services
            </div>

            <div className="no-scrollbar" style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "2px" }}>
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (item.id === "update" && onUpdateProfile) {
                                onUpdateProfile();
                            } else {
                                onAction(item.prompt, item.display);
                            }
                            onClose();
                        }}
                        style={{
                            display: "flex", alignItems: "center", gap: "10px",
                            background: "transparent", border: "none", padding: "10px 12px",
                            borderRadius: "12px", cursor: "pointer",
                            color: "#374151", fontSize: "14px", fontWeight: 600,
                            transition: "all 0.2s ease",
                            textAlign: "left"
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(139, 92, 246, 0.08)";
                            e.currentTarget.style.color = "#6D28D9";
                            e.currentTarget.style.transform = "translateX(4px)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "#374151";
                            e.currentTarget.style.transform = "translateX(0px)";
                        }}
                    >
                        <span style={{
                            background: "white", padding: "6px", borderRadius: "8px",
                            boxShadow: "0 2px 5px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "center"
                        }}>
                            {item.icon}
                        </span>
                        {item.label}
                    </button>
                ))}
            </div>

            <div style={{ height: "1px", background: "rgba(0,0,0,0.06)", margin: "6px 0" }} />

            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenStandardMenu();
                }}
                style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    background: "transparent", border: "none", padding: "10px 12px",
                    borderRadius: "12px", cursor: "pointer",
                    color: "#6B7280", fontSize: "14px", fontWeight: 500,
                    transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(0, 0, 0, 0.04)";
                    e.currentTarget.style.color = "#111827";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#6B7280";
                }}
            >
                <span style={{
                    background: "white", padding: "6px", borderRadius: "8px",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                    <Settings size={18} color="#6B7280" />
                </span>
                Standard Options
            </button>
        </motion.div>
    );
}
