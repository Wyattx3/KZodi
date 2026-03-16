"use client";
import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import { useChatStore } from "@/lib/chatStore";

export default function ProfileTab() {
    const { data: session } = useSession();
    const [isLangOpen, setIsLangOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const responseLanguage = useChatStore(state => state.responseLanguage);
    const setResponseLanguage = useChatStore(state => state.setResponseLanguage);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsLangOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="safe-top" style={{ padding: "0 18px 120px" }}>
            <div className="explore-hero">
                <div className="explore-hero-content">
                    <motion.h1
                        className="explore-hero-title"
                    >
                        Profile
                    </motion.h1>
                    <motion.p
                        className="explore-hero-subtitle"
                    >
                        Your identity and settings
                    </motion.p>
                </div>
            </div>

            <motion.div
                className="explore-section"
            >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "32px 0" }}>
                    {session?.user ? (
                        <>
                            <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
                                {session.user.image ? (
                                    <Image
                                        src={session.user.image}
                                        alt={session.user.name || "User"}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-blue-100 flex items-center justify-center text-3xl">
                                        {session.user.name?.[0]?.toUpperCase() || "U"}
                                    </div>
                                )}
                            </div>
                            <div className="text-center">
                                <h3 className="explore-section-title" style={{ textAlign: "center", fontSize: "20px" }}>
                                    {session.user.name}
                                </h3>
                                <p className="chats-header-sub" style={{ textAlign: "center" }}>
                                    {session.user.email}
                                </p>
                            </div>
                            <button
                                onClick={() => signOut()}
                                className="chat-landing-btn"
                                style={{
                                    marginTop: "16px",
                                    width: "100%",
                                    background: "#FFE566",
                                    color: "#111",
                                    border: "none"
                                }}
                            >
                                Sign Out
                            </button>
                        </>
                    ) : (
                        <>
                            <div style={{
                                width: "80px",
                                height: "80px",
                                borderRadius: "50%",
                                backgroundColor: "#E5E7EB",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "32px"
                            }}>
                                👤
                            </div>
                            <div>
                                <h3 className="explore-section-title" style={{ textAlign: "center", fontSize: "20px" }}>
                                    Guest User
                                </h3>
                                <p className="chats-header-sub" style={{ textAlign: "center" }}>
                                    Sign in to sync your chats
                                </p>
                            </div>

                            <button
                                onClick={() => signIn("google")}
                                className="chat-landing-btn"
                                style={{ marginTop: "16px", width: "100%" }}
                            >
                                Sign In with Google
                            </button>
                        </>
                    )}
                </div>

                <div className="chats-list" style={{ paddingBottom: 0, borderRadius: "20px", border: "1px solid #F3F4F6", background: "#FFFFFF", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
                    <div className="chats-item" style={{ background: "transparent", borderBottom: "1px solid #F3F4F6", cursor: "default", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", position: "relative", zIndex: 50, borderTopLeftRadius: "20px", borderTopRightRadius: "20px" }}>
                        <div className="chats-item-info">
                            <span className="chats-item-name" style={{ fontSize: "15px", fontWeight: "700" }}>Response Language</span>
                            <span className="chats-header-sub" style={{ display: "block", marginTop: "2px", fontSize: "12px", color: "var(--color-warm-gray)" }}>
                                Characters will reply in this language
                            </span>
                        </div>
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsLangOpen(!isLangOpen)}
                                className="flex items-center gap-2"
                                style={{
                                    background: isLangOpen ? "var(--color-cream)" : "var(--color-cream-dark)",
                                    border: `1px solid ${isLangOpen ? "var(--color-primary-light)" : "var(--color-border-soft)"}`,
                                    borderRadius: "14px",
                                    padding: "8px 16px",
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    color: "var(--color-warm-black)",
                                    cursor: "pointer",
                                    outline: "none",
                                    transition: "all 0.2s ease",
                                    minWidth: "140px",
                                    justifyContent: "space-between"
                                }}
                            >
                                <span className="truncate">
                                    {responseLanguage === "English (Default)" ? "English" :
                                        responseLanguage === "Burmese (Unicode)" ? "Myanmar (Unicode)" :
                                            responseLanguage === "Burmese (Zawgyi)" ? "Myanmar (Zawgyi)" :
                                                responseLanguage === "Mix (Burmese + English)" ? "Minglish (Mix)" :
                                                    responseLanguage}
                                </span>
                                <motion.svg
                                    animate={{ rotate: isLangOpen ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                    style={{ color: "var(--color-warm-gray)" }}
                                >
                                    <path d="m6 9 6 6 6-6" />
                                </motion.svg>
                            </button>

                            {/* Dropdown Menu */}
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: isLangOpen ? 1 : 0, y: isLangOpen ? 4 : -10, scale: isLangOpen ? 1 : 0.95 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                style={{
                                    position: "absolute",
                                    top: "100%",
                                    right: 0,
                                    width: "200px",
                                    background: "#FFFFFF",
                                    borderRadius: "16px",
                                    boxShadow: "0 10px 40px rgba(0,0,0,0.1), 0 2px 10px rgba(0,0,0,0.05)",
                                    border: "1px solid var(--color-border-soft)",
                                    overflowY: "auto",
                                    overflowX: "hidden",
                                    maxHeight: "240px",
                                    pointerEvents: isLangOpen ? "auto" : "none",
                                    zIndex: 50,
                                    transformOrigin: "top right"
                                }}
                            >
                                {[
                                    { id: "English (Default)", label: "English" },
                                    { id: "Burmese (Unicode)", label: "Myanmar (Unicode)" },
                                    { id: "Burmese (Zawgyi)", label: "Myanmar (Zawgyi)" },
                                    { id: "Mix (Burmese + English)", label: "Minglish (Mix)" },
                                    { id: "Japanese", label: "日本語 (Japanese)" },
                                    { id: "Korean", label: "한국어 (Korean)" },
                                    { id: "Chinese (Simplified)", label: "中文 (Chinese)" },
                                    { id: "Thai", label: "ไทย (Thai)" },
                                    { id: "Hindi", label: "हिंदी (Hindi)" },
                                    { id: "Spanish", label: "Español (Spanish)" },
                                    { id: "French", label: "Français (French)" },
                                    { id: "Portuguese", label: "Português (Portuguese)" },
                                    { id: "Arabic", label: "العربية (Arabic)" },
                                    { id: "Russian", label: "Русский (Russian)" },
                                    { id: "Indonesian", label: "Bahasa (Indonesian)" },
                                    { id: "Vietnamese", label: "Tiếng Việt (Vietnamese)" },
                                    { id: "German", label: "Deutsch (German)" },
                                    { id: "Italian", label: "Italiano (Italian)" },
                                    { id: "Turkish", label: "Türkçe (Turkish)" },
                                    { id: "Tagalog", label: "Tagalog (Filipino)" },
                                    { id: "Malay", label: "Bahasa Melayu (Malay)" },
                                ].map((option) => (
                                    <button
                                        key={option.id}
                                        onClick={() => {
                                            setResponseLanguage(option.id);
                                            setIsLangOpen(false);
                                        }}
                                        style={{
                                            width: "100%",
                                            textAlign: "left",
                                            padding: "12px 16px",
                                            fontSize: "14px",
                                            fontWeight: responseLanguage === option.id ? "700" : "500",
                                            color: responseLanguage === option.id ? "var(--color-primary)" : "var(--color-warm-black)",
                                            background: responseLanguage === option.id ? "var(--color-cream-light)" : "transparent",
                                            border: "none",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            transition: "background 0.15s ease",
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = responseLanguage === option.id ? "var(--color-cream-light)" : "#F9FAFB")}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = responseLanguage === option.id ? "var(--color-cream-light)" : "transparent")}
                                    >
                                        {option.label}
                                        {responseLanguage === option.id && (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M20 6 9 17l-5-5" />
                                            </svg>
                                        )}
                                    </button>
                                ))}
                            </motion.div>
                        </div>
                    </div>
                    <div className="chats-item" style={{ background: "transparent", border: "none", borderBottomLeftRadius: "20px", borderBottomRightRadius: "20px", position: "relative", zIndex: 1 }}>
                        <div className="chats-item-info">
                            <span className="chats-item-name" style={{ fontSize: "15px" }}>App Version</span>
                        </div>
                        <span className="chats-item-time">v1.2.0</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
