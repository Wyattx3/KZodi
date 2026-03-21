"use client";
import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import { useChatStore } from "@/lib/chatStore";

const CustomSelect = ({ value, onChange, options, placeholder, minWidth = "160px" }: { value: string, onChange: (v: string) => void, options: {id: string, label: string}[], placeholder: string, minWidth?: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedOption = options.find(o => o.id === value);

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2"
                style={{
                    background: isOpen ? "var(--color-cream)" : "var(--color-cream-dark)",
                    border: `1px solid ${isOpen ? "var(--color-primary-light)" : "var(--color-border-soft)"}`,
                    borderRadius: "14px",
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "var(--color-warm-black)",
                    cursor: "pointer",
                    outline: "none",
                    transition: "all 0.2s ease",
                    minWidth,
                    justifyContent: "space-between"
                }}
            >
                <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
                <motion.svg
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ color: "var(--color-warm-gray)" }}
                >
                    <path d="m6 9 6 6 6-6" />
                </motion.svg>
            </button>

            <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: isOpen ? 1 : 0, y: isOpen ? 4 : -10, scale: isOpen ? 1 : 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    width: "max-content",
                    minWidth: "100%",
                    background: "#FFFFFF",
                    borderRadius: "16px",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.1), 0 2px 10px rgba(0,0,0,0.05)",
                    border: "1px solid var(--color-border-soft)",
                    overflowY: "auto",
                    overflowX: "hidden",
                    maxHeight: "240px",
                    pointerEvents: isOpen ? "auto" : "none",
                    zIndex: 50,
                    transformOrigin: "top right"
                }}
            >
                {options.map((option) => (
                    <button
                        key={option.id}
                        onClick={() => {
                            onChange(option.id);
                            setIsOpen(false);
                        }}
                        style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "12px 16px",
                            fontSize: "14px",
                            fontWeight: value === option.id ? "700" : "500",
                            color: value === option.id ? "var(--color-primary)" : "var(--color-warm-black)",
                            background: value === option.id ? "var(--color-cream-light)" : "transparent",
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            transition: "background 0.15s ease",
                            whiteSpace: "nowrap"
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = value === option.id ? "var(--color-cream-light)" : "#F9FAFB")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = value === option.id ? "var(--color-cream-light)" : "transparent")}
                    >
                        {option.label}
                        {value === option.id && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "12px" }}>
                                <path d="M20 6 9 17l-5-5" />
                            </svg>
                        )}
                    </button>
                ))}
            </motion.div>
        </div>
    );
};

export default function ProfileTab() {
    const { data: session } = useSession();
    const [isLangOpen, setIsLangOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const responseLanguage = useChatStore(state => state.responseLanguage);
    const setResponseLanguage = useChatStore(state => state.setResponseLanguage);

    const [nickname, setNickname] = useState("");
    const [gender, setGender] = useState("Prefer not to say");
    const [birthday, setBirthday] = useState("");
    const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const [isSaving, setIsSaving] = useState(false);
    const [profileLoaded, setProfileLoaded] = useState(false);

    useEffect(() => {
        if (session?.user) {
            fetch("/api/user/profile")
                .then(res => res.json())
                .then(data => {
                    setNickname(data.nickname || "");
                    setGender(data.gender || "Prefer not to say");
                    setBirthday(data.birthday || "");
                    setTimezone(data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
                    setProfileLoaded(true);
                })
                .catch(err => console.error("Failed to load profile", err));
        }
    }, [session?.user]);

    const [isEditingNickname, setIsEditingNickname] = useState(false);

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            await fetch("/api/user/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nickname, gender, birthday, timezone })
            });
            alert("Profile saved successfully");
        } catch (e) {
            console.error("Failed to save profile", e);
        }
        setIsSaving(false);
    };

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
        <div className="safe-top" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            {/* Sticky Header */}
            <div style={{ flexShrink: 0, position: "sticky", top: 0, zIndex: 60, background: "#FFFDF5", padding: "20px 18px 16px", borderBottom: "1px solid #F3F4F6" }}>
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

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", paddingTop: "24px" }}>
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
            </div>

            {/* Scroll Content Area */}
            <div className="no-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "0 18px 16px" }}>
                <motion.div
                    className="explore-section"
            >
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

                {session?.user && profileLoaded && (
                    <div className="chats-list" style={{ marginTop: "24px", paddingBottom: 0, borderRadius: "20px", border: "1px solid #F3F4F6", background: "#FFFFFF", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
                        <div 
                            className="chats-item" 
                            onClick={() => setIsEditingNickname(true)}
                            style={{ background: "transparent", borderBottom: "1px solid #F3F4F6", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", borderTopLeftRadius: "20px", borderTopRightRadius: "20px" }}
                        >
                            <div className="chats-item-info">
                                <span className="chats-item-name" style={{ fontSize: "15px", fontWeight: "700" }}>Your Name</span>
                                <span className="chats-header-sub" style={{ display: "block", marginTop: "2px", fontSize: "12px", color: "var(--color-warm-gray)" }}>
                                    Characters will call you this
                                </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontSize: "14px", fontWeight: "600", color: nickname ? "var(--color-warm-black)" : "var(--color-warm-gray)" }}>
                                    {nickname ? `@${nickname}` : "Not set"}
                                </span>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-warm-gray)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m9 18 6-6-6-6"/>
                                </svg>
                            </div>
                        </div>

                        <div className="chats-item" style={{ background: "transparent", borderBottom: "1px solid #F3F4F6", cursor: "default", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px" }}>
                            <div className="chats-item-info">
                                <span className="chats-item-name" style={{ fontSize: "15px", fontWeight: "700" }}>Gender</span>
                            </div>
                            <CustomSelect
                                value={gender}
                                onChange={setGender}
                                placeholder="Select Gender"
                                options={[
                                    { id: "Prefer not to say", label: "Prefer not to say" },
                                    { id: "Female", label: "Female" },
                                    { id: "Male", label: "Male" },
                                    { id: "Non-binary", label: "Non-binary" }
                                ]}
                            />
                        </div>

                        <div className="chats-item" style={{ background: "transparent", borderBottom: "1px solid #F3F4F6", cursor: "default", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px" }}>
                            <div className="chats-item-info">
                                <span className="chats-item-name" style={{ fontSize: "15px", fontWeight: "700" }}>Birthday</span>
                            </div>
                            <input
                                type="date"
                                value={birthday}
                                onChange={(e) => setBirthday(e.target.value)}
                                style={{
                                    background: "var(--color-cream-dark)",
                                    border: "1px solid var(--color-border-soft)",
                                    borderRadius: "14px",
                                    padding: "8px 16px",
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    color: "var(--color-warm-black)",
                                    outline: "none",
                                    maxWidth: "180px",
                                    fontFamily: "inherit",
                                    transition: "all 0.2s ease"
                                }}
                                onFocus={(e) => {
                                    e.target.style.background = "var(--color-cream)";
                                    e.target.style.border = "1px solid var(--color-primary-light)";
                                }}
                                onBlur={(e) => {
                                    e.target.style.background = "var(--color-cream-dark)";
                                    e.target.style.border = "1px solid var(--color-border-soft)";
                                }}
                            />
                        </div>

                        <div className="chats-item" style={{ background: "transparent", borderBottom: "1px solid #F3F4F6", cursor: "default", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px" }}>
                            <div className="chats-item-info">
                                <span className="chats-item-name" style={{ fontSize: "15px", fontWeight: "700" }}>Timezone</span>
                            </div>
                            <CustomSelect
                                value={timezone}
                                onChange={setTimezone}
                                placeholder="Select Timezone"
                                options={[
                                    { id: "Asia/Rangoon", label: "Asia/Rangoon" },
                                    { id: "America/New_York", label: "America/New_York" },
                                    { id: "Europe/London", label: "Europe/London" },
                                    { id: "Asia/Tokyo", label: "Asia/Tokyo" },
                                    { id: Intl.DateTimeFormat().resolvedOptions().timeZone, label: "Local" }
                                ]}
                            />
                        </div>

                        <div style={{ padding: "24px 16px", borderBottomLeftRadius: "20px", borderBottomRightRadius: "20px" }}>
                            <motion.button
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleSaveProfile}
                                disabled={isSaving}
                                style={{
                                    width: "100%",
                                    background: "#FFE566",
                                    color: "#111111",
                                    padding: "14px 24px",
                                    borderRadius: "16px",
                                    border: "none",
                                    fontWeight: "700",
                                    fontSize: "15px",
                                    boxShadow: "0 4px 14px rgba(255, 184, 0, 0.3)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                    opacity: isSaving ? 0.7 : 1,
                                    cursor: "pointer",
                                    transition: "all 0.2s ease"
                                }}
                            >
                                {isSaving ? "Saving changes..." : (
                                    <>
                                        Save Profile
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M20 6 9 17l-5-5" />
                                        </svg>
                                    </>
                                )}
                            </motion.button>
                        </div>
                    </div>
                )}
            </motion.div>
            </div>

            {/* Nickname Edit Modal Overlay */}
            {isEditingNickname && (
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} onClick={() => setIsEditingNickname(false)} />
                    <motion.div 
                        initial={{ scale: 0.9, y: 20, opacity: 0 }} 
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        style={{ position: "relative", background: "#fff", width: "100%", maxWidth: "340px", borderRadius: "24px", padding: "24px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}
                    >
                        <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px", textAlign: "center", color: "var(--color-warm-black)" }}>Edit Your Name</h3>
                        <p style={{ fontSize: "13px", color: "var(--color-warm-gray)", marginBottom: "20px", textAlign: "center" }}>Characters will use this name to call you.</p>
                        <div style={{ position: "relative" }}>
                            <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--color-warm-gray)", fontWeight: "600", fontSize: "15px" }}>@</span>
                            <input 
                                autoFocus
                                type="text"
                                value={nickname}
                                onChange={e => setNickname(e.target.value)}
                                style={{
                                    width: "100%", padding: "12px 16px 12px 36px", borderRadius: "14px", border: "1px solid var(--color-primary-light)", background: "var(--color-cream)", fontSize: "15px", fontWeight: "600", outline: "none", transition: "all 0.2s", color: "var(--color-warm-black)"
                                }}
                            />
                        </div>
                        <button 
                            onClick={() => setIsEditingNickname(false)}
                            style={{ width: "100%", marginTop: "24px", background: "#111111", color: "white", padding: "14px", borderRadius: "14px", fontWeight: "700", border: "none", cursor: "pointer" }}
                        >
                            Done
                        </button>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
