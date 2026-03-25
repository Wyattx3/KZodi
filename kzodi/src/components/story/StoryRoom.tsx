"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChatStore, type ChatMessage } from "@/lib/chatStore";
import { motion, AnimatePresence } from "framer-motion";

interface StoryRoomProps {
    storyId: string;
}

interface ParsedStoryContent {
    cleanedText: string;
    scene: string | null;
    actions: string[];
}

interface AssistantFragment {
    type: "dialogue" | "prose";
    text: string;
}

function parseStoryContent(content: string): ParsedStoryContent {
    const sceneMatch = content.match(/\[\[\s*SCENE\s*:\s*([\s\S]*?)\]\]/i);
    const actionsMatch = content.match(/\[\[\s*ACTIONS\s*:\s*([\s\S]*?)\]\]/i);

    const cleanedText = content
        .replace(/\[\[\s*SCENE\s*:\s*[\s\S]*?\]\]\s*/gi, "")
        .replace(/\[\[\s*ACTIONS\s*:\s*[\s\S]*?\]\]\s*/gi, "")
        .trim();

    return {
        cleanedText,
        scene: sceneMatch?.[1]?.trim() || null,
        actions: actionsMatch?.[1]
            ? actionsMatch[1]
                .split("|")
                .map((option) => option.trim())
                .filter(Boolean)
                .slice(0, 3)
            : [],
    };
}

function renderMessageContent(message: ChatMessage) {
    const parsed = parseStoryContent(message.content);
    if (message.role === "user" && parsed.cleanedText === "[CONTINUE]") {
        return "";
    }
    return parsed.cleanedText || (message.role === "assistant" ? "..." : "");
}

function isDialogueFragment(text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
        return false;
    }

    if (/^[A-Z][\w' -]{1,40}:\s+/.test(trimmed)) {
        return true;
    }

    if (/^["'\u201C\u2018]/.test(trimmed)) {
        return true;
    }

    return /["'\u201C\u2018][^"'\u201D\u2019]+["'\u201D\u2019]\s*(?:,?\s*(?:[A-Z][\w'-]+(?:\s+[A-Z][\w'-]+){0,2}\s+)?)?(?:said|asked|whispered|murmured|replied|called|shouted|hissed|growled|answered|snapped|muttered)\b/i.test(trimmed);
}

function formatAssistantMessage(content: string): AssistantFragment[] {
    const fragments: AssistantFragment[] = [];
    const proseBuffer: string[] = [];

    const flushProse = () => {
        if (proseBuffer.length === 0) {
            return;
        }

        fragments.push({
            type: "prose",
            text: proseBuffer.join("\n").trim(),
        });
        proseBuffer.length = 0;
    };

    for (const line of content.split("\n")) {
        const trimmedLine = line.trim();

        if (!trimmedLine) {
            flushProse();
            continue;
        }

        if (isDialogueFragment(trimmedLine)) {
            flushProse();
            fragments.push({
                type: "dialogue",
                text: trimmedLine,
            });
            continue;
        }

        proseBuffer.push(trimmedLine);
    }

    flushProse();

    return fragments.length > 0
        ? fragments
        : [{ type: "prose", text: content.trim() || "..." }];
}

export default function StoryRoom({ storyId }: StoryRoomProps) {
    const router = useRouter();
    const conversation = useChatStore((state) => state.conversations[storyId]);
    const sendMessage = useChatStore((state) => state.sendMessage);
    const addReply = useChatStore((state) => state.addReply);
    const updateStoryScene = useChatStore((state) => state.updateStoryScene);
    const clearConversation = useChatStore((state) => state.clearConversation);
    const deleteConversation = useChatStore((state) => state.deleteConversation);
    const responseLanguage = useChatStore((state) => state.responseLanguage);
    const setHideStoryBackground = useChatStore((state) => state.setHideStoryBackground);
    const setTheme = useChatStore((state) => state.setTheme);
    const setStoryBgColor = useChatStore((state) => state.setStoryBgColor);
    const setStoryTextColor = useChatStore((state) => state.setStoryTextColor);

    const THEME_PRESETS = [
        { name: "Original", color: undefined },
        { name: "Crimson", color: "#E69A8D" },
        { name: "Cobalt", color: "#8DA8E6" },
        { name: "Emerald", color: "#8DE6A8" },
        { name: "Gold", color: "#E6D88D" },
        { name: "Steel", color: "#A1A1AA" },
    ];

    const BG_PRESETS = [
        { name: "Dark", bg: "#0E0C0A", text: "#E8E1D5" },
        { name: "Warm", bg: "#1A1510", text: "#E8DFD0" },
        { name: "Navy", bg: "#0D1B2A", text: "#D4DDE8" },
        { name: "Sepia", bg: "#3B2F20", text: "#E8DCC8" },
        { name: "Cream", bg: "#F4ECD8", text: "#2C2416" },
        { name: "Light", bg: "#F0F0F0", text: "#1A1A1A" },
    ];

    const [inputText, setInputText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [quickActions, setQuickActions] = useState<string[]>([]);
    const [showSettings, setShowSettings] = useState(false);
    const storyLogRef = useRef<HTMLDivElement>(null);

    const parsedMessages = useMemo(() => {
        return (conversation?.messages || []).map((message) => ({
            ...message,
            parsed: parseStoryContent(message.content),
        }));
    }, [conversation?.messages]);

    useEffect(() => {
        if (!conversation || conversation.conversationType !== "story") {
            router.replace("/chat?tab=chats");
        }
    }, [conversation, router]);

    useEffect(() => {
        const latestMessage = parsedMessages[parsedMessages.length - 1];

        if (!latestMessage) {
            setQuickActions([]);
            return;
        }

        if (latestMessage.role !== "assistant") {
            setQuickActions([]);
            return;
        }

        const hasTaggedScene = /\[\[\s*SCENE\s*:/i.test(latestMessage.content);
        const hasTaggedActions = /\[\[\s*ACTIONS\s*:/i.test(latestMessage.content);

        if (
            hasTaggedScene &&
            latestMessage.parsed.scene &&
            latestMessage.parsed.scene !== conversation?.storyData?.currentScene
        ) {
            updateStoryScene(storyId, latestMessage.parsed.scene);
        }

        if (hasTaggedActions) {
            setQuickActions(latestMessage.parsed.actions);
        }
    }, [conversation?.messages.length, conversation?.storyData?.currentScene, parsedMessages, storyId, updateStoryScene]);

    useEffect(() => {
        if (!storyLogRef.current) return;
        storyLogRef.current.scrollTop = storyLogRef.current.scrollHeight;
    }, [parsedMessages.length, isLoading, quickActions.length]);

    if (!conversation || conversation.conversationType !== "story") {
        return null;
    }

    const handleAct = async () => {
        const playerInput = inputText.trim();
        const requestMessage = playerInput || "[CONTINUE]";
        const isContinueTurn = requestMessage === "[CONTINUE]";
        if (isLoading) return;

        const history = conversation.messages.slice(-20).map((message) => ({
            role: message.role,
            content: message.content,
        }));

        if (!isContinueTurn) {
            sendMessage(storyId, playerInput);
        }
        setInputText("");
        setQuickActions([]);
        setIsLoading(true);

        try {
            const response = await fetch("/api/roleplay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: requestMessage,
                    conversationType: "story",
                    storyData: conversation.storyData,
                    history,
                    characterName: conversation.groupName || "Story",
                    characterPersonality: "",
                    characterTag: "Story",
                    responseLanguage,
                }),
            });

            if (!response.ok) {
                throw new Error(`Story request failed with ${response.status}`);
            }

            const data = await response.json();
            const rawReply = typeof data?.reply === "string" ? data.reply : "";
            const parsedReply = parseStoryContent(rawReply);

            if (parsedReply.scene) {
                updateStoryScene(storyId, parsedReply.scene);
            }

            if (parsedReply.cleanedText) {
                addReply(storyId, parsedReply.cleanedText);
            }

            setQuickActions(parsedReply.actions);
        } catch (error) {
            console.error("Failed to continue story", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (value: string) => {
        setInputText(value);

        if (value.length > 0 && quickActions.length > 0) {
            setQuickActions([]);
        }
    };

    const handleClearStory = () => {
        clearConversation(storyId);
        setInputText("");
        setQuickActions([]);
        setShowSettings(false);
    };

    const handleDeleteStory = () => {
        deleteConversation(storyId);
        setShowSettings(false);
        router.push("/chat?tab=chats");
    };

    const currentScene = conversation.storyData?.currentScene || "Scene not yet established";
    const title = conversation.groupName || "Story";
    const genreLine = `${conversation.storyData?.genre || "Story"}  |  ${
        conversation.storyData?.playerCharacterName || "Unknown Player"
    }`;
    const themeColor = conversation.theme || conversation.storyData?.themeColor || "#E8E1D5";
    const backgroundImage = !conversation.hideStoryBackground ? conversation.storyData?.backgroundImage : undefined;
    const bgColor = conversation.storyBgColor || "#0E0C0A";
    const textColor = conversation.storyTextColor || "#E8E1D5";
    const trimmedInput = inputText.trim();
    const submitLabel = trimmedInput ? "Act" : "Continue";
    // Determine if background is light for contrast adjustments
    const isLightBg = (() => {
        const hex = bgColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return (r * 299 + g * 587 + b * 114) / 1000 > 128;
    })();
    const surfaceBorder = isLightBg ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)';
    const mutedText = isLightBg ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.4)';

    return (
        <div 
            className="min-h-[100dvh] h-[100dvh] flex flex-col font-sans overflow-hidden relative"
            style={{
                backgroundColor: bgColor,
                color: textColor,
                ...(backgroundImage ? {
                    backgroundImage: `url(${backgroundImage})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                } : {}),
                "--story-theme": themeColor,
            } as React.CSSProperties}
        >
            {/* Dark Overlay for readability when using custom background */}
            {backgroundImage && (
                <div className="absolute inset-0 z-0 pointer-events-none" style={{ backgroundColor: `${bgColor}d9` }} />
            )}

            {/* Elegant Header */}
            <header className="flex items-center justify-between px-5 h-[68px] shrink-0 w-full backdrop-blur-md z-20" style={{ background: `linear-gradient(to bottom, ${bgColor}, ${bgColor}e6)` }}>
                <button
                    onClick={() => router.push("/chat?tab=chats")}
                    className="w-[44px] h-[44px] shrink-0 rounded-full bg-transparent flex items-center justify-center transition-colors focus:outline-none"
                    style={{ color: mutedText }}
                    aria-label="Back to chats"
                    type="button"
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                </button>

                <div className="flex-1 px-4 min-w-0 flex justify-center">
                    <motion.div 
                        initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                        className="text-[17px] font-serif tracking-wide text-[var(--story-theme)] truncate drop-shadow-sm"
                    >
                        {title}
                    </motion.div>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="w-[44px] h-[44px] shrink-0 rounded-full bg-transparent flex items-center justify-center transition-colors cursor-pointer outline-none"
                        style={{ color: mutedText }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                            <circle cx="12" cy="6" r="1.5" fill="currentColor" />
                            <circle cx="12" cy="18" r="1.5" fill="currentColor" />
                        </svg>
                    </button>

                    <AnimatePresence>
                        {showSettings && (
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                className="absolute right-0 top-[54px] w-[280px] rounded-2xl shadow-2xl p-4 flex flex-col gap-4 z-50 origin-top-right font-sans max-h-[75vh] overflow-y-auto"
                                style={{ backgroundColor: isLightBg ? '#ffffff' : '#14120F', border: `1px solid ${surfaceBorder}`, color: textColor }}
                            >
                                <div className="text-[12px] font-bold uppercase tracking-[0.15em] text-center" style={{ color: mutedText }}>
                                    Story Settings
                                </div>

                                {/* Accent Color */}
                                <div className="flex flex-col gap-2">
                                    <div className="text-[12px] font-medium" style={{ color: mutedText }}>Accent Color</div>
                                    <div className="flex gap-2 flex-wrap justify-center">
                                        {THEME_PRESETS.map((t, idx) => {
                                            const isActive = conversation.theme === t.color || (t.color === undefined && !conversation.theme);
                                            const presetBg = t.color || conversation.storyData?.themeColor || "#E8E1D5";
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => setTheme(storyId, t.color || "")}
                                                    title={t.name}
                                                    className={`w-7 h-7 rounded-full border-[2px] transition-all hover:scale-110`}
                                                    style={{ backgroundColor: presetBg, borderColor: isActive ? themeColor : 'transparent', boxShadow: isActive ? `0 0 8px ${themeColor}40` : 'none' }}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="w-full h-[1px]" style={{ backgroundColor: surfaceBorder }} />

                                {/* Background */}
                                <div className="flex flex-col gap-2">
                                    <div className="text-[12px] font-medium" style={{ color: mutedText }}>Background</div>
                                    <div className="flex gap-1.5 flex-wrap justify-center">
                                        {BG_PRESETS.map((p) => {
                                            const isActiveBg = (conversation.storyBgColor || '#0E0C0A') === p.bg;
                                            return (
                                                <button
                                                    key={p.name}
                                                    onClick={() => {
                                                        setStoryBgColor(storyId, p.bg);
                                                        setStoryTextColor(storyId, p.text);
                                                    }}
                                                    title={p.name}
                                                    className="h-8 px-2.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-105 border-[2px]"
                                                    style={{
                                                        backgroundColor: p.bg,
                                                        color: p.text,
                                                        borderColor: isActiveBg ? themeColor : 'transparent',
                                                        boxShadow: isActiveBg ? `0 0 6px ${themeColor}30` : 'none',
                                                    }}
                                                >
                                                    {p.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="w-full h-[1px]" style={{ backgroundColor: surfaceBorder }} />

                                {/* Background Image Toggle */}
                                <div className="flex items-center justify-between">
                                    <div className="text-[13px] font-medium">Background Image</div>
                                    <button
                                        onClick={() => setHideStoryBackground(storyId, !conversation.hideStoryBackground)}
                                        className={`w-10 h-5.5 rounded-full flex items-center p-0.5 transition-colors ${!conversation.hideStoryBackground ? 'bg-[var(--story-theme)]' : ''}`}
                                        style={{ backgroundColor: conversation.hideStoryBackground ? surfaceBorder : undefined }}
                                    >
                                        <div className={`w-4 h-4 rounded-full transition-transform ${!conversation.hideStoryBackground ? 'translate-x-[18px]' : 'translate-x-0'}`} style={{ backgroundColor: bgColor }} />
                                    </button>
                                </div>

                                <div className="w-full h-[1px]" style={{ backgroundColor: surfaceBorder }} />

                                {/* Clear / Delete */}
                                <button
                                    type="button"
                                    onClick={handleClearStory}
                                    className="w-full rounded-xl px-4 py-2.5 text-left text-[13px] font-medium transition-colors"
                                    style={{ backgroundColor: "transparent", color: textColor }}
                                    onMouseEnter={(event) => { event.currentTarget.style.backgroundColor = surfaceBorder; }}
                                    onMouseLeave={(event) => { event.currentTarget.style.backgroundColor = "transparent"; }}
                                >
                                    Clear Story
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDeleteStory}
                                    className="w-full rounded-xl px-4 py-2.5 text-left text-[13px] font-medium transition-colors"
                                    style={{ backgroundColor: "transparent", color: "#F87171" }}
                                    onMouseEnter={(event) => { event.currentTarget.style.backgroundColor = surfaceBorder; }}
                                    onMouseLeave={(event) => { event.currentTarget.style.backgroundColor = "transparent"; }}
                                >
                                    Delete Story
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </header>

            {/* Scrollable Story Format */}
            <div
                ref={storyLogRef}
                className="flex-1 overflow-y-auto w-full flex flex-col items-center scroll-smooth px-5 md:px-8 pt-4 pb-48 [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-thumb]:bg-[#2A2622] [&::-webkit-scrollbar-thumb]:rounded-full z-10"
            >
                <div className="w-full max-w-[680px] flex flex-col gap-10">
                    
                    {/* Scene and Genre Marker */}
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.8 }}
                        className="flex flex-col items-center mb-6"
                    >
                        <div className="text-[15px] text-center leading-relaxed font-sans" style={{ color: themeColor, opacity: 0.7 }}>
                            {currentScene}
                        </div>
                        <div className="text-[11px] uppercase tracking-[0.25em] font-medium mt-3 text-center font-sans" style={{ color: themeColor, opacity: 0.45 }}>
                            {genreLine}
                        </div>
                        <div className="w-12 h-[1px] mt-8" style={{ backgroundColor: themeColor, opacity: 0.25 }}></div>
                    </motion.div>

                    {parsedMessages.length === 0 && (
                        <div className="text-center text-[#6B655C] text-[16px] italic mt-8 font-serif">
                            The space is quiet. Awaiting your first move...
                        </div>
                    )}

                    <AnimatePresence initial={false}>
                        {parsedMessages.map((message) => {
                            const displayedText = renderMessageContent(message);

                            if (message.role === "user") {
                                if (!displayedText) {
                                    return null;
                                }

                                return (
                                    <motion.div 
                                        key={message.id} 
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="w-full"
                                    >
                                        <div
                                            className="text-[15px] md:text-[16px] leading-8 whitespace-pre-wrap font-sans italic"
                                            style={{ color: mutedText }}
                                        >
                                            {`> ${displayedText}`}
                                        </div>
                                    </motion.div>
                                );
                            }

                            return (
                                <motion.div 
                                    key={message.id}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                    className="w-full"
                                >
                                    <div className="flex flex-col gap-4">
                                        {formatAssistantMessage(displayedText).map((fragment, index) => (
                                            fragment.type === "dialogue" ? (
                                                <div
                                                    key={`${message.id}-dialogue-${index}`}
                                                    className="border-l-2 pl-4 md:pl-5 text-[18px] md:text-[20px] leading-[1.8] font-serif italic"
                                                    style={{ color: textColor, borderColor: `${themeColor}55` }}
                                                >
                                                    {fragment.text}
                                                </div>
                                            ) : (
                                                <p
                                                    key={`${message.id}-prose-${index}`}
                                                    className="text-[19px] md:text-[21px] leading-[1.85] font-serif whitespace-pre-wrap drop-shadow-sm m-0"
                                                    style={{ color: textColor }}
                                                >
                                                    {fragment.text}
                                                </p>
                                            )
                                        ))}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {isLoading && (
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="w-full"
                        >
                            <div className="text-[17px] leading-[1.8] italic font-serif" style={{ color: mutedText }}>
                                The narrator is writing...
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Input Footer (Floating Frosted Glass) */}
            <div className="absolute bottom-0 left-0 w-full flex flex-col items-center pointer-events-none z-20">
                <div className="w-full h-32 pointer-events-none" style={{ background: `linear-gradient(to top, ${bgColor}, ${bgColor}e6, transparent)` }} />
                
                <div className="w-full px-4 md:px-0 pb-6 pt-1 absolute bottom-0 pointer-events-auto">
                    <div className="w-full max-w-[700px] mx-auto flex flex-col gap-4 relative">
                        {quickActions.length > 0 && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                className="flex gap-3 overflow-x-auto w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-1 pb-1"
                            >
                                {quickActions.map((action) => (
                                    <button
                                        key={action}
                                        type="button"
                                        onClick={() => setInputText(action)}
                                        className="shrink-0 px-5 py-2.5 rounded-full bg-[#14120F]/90 backdrop-blur-md text-[14px] font-sans hover:bg-[#1E1C1A] transition-all active:scale-95 whitespace-nowrap outline-none"
                                        style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: `${themeColor}33`, color: `${themeColor}cc` }}
                                    >
                                        {action}
                                    </button>
                                ))}
                            </motion.div>
                        )}

                        <div className="relative w-full rounded-[30px] shadow-[0_-10px_40px_rgba(0,0,0,0.6)]">
                            <textarea
                                value={inputText}
                                onChange={(event) => handleInputChange(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter" && !event.shiftKey) {
                                        event.preventDefault();
                                        void handleAct();
                                    }
                                }}
                                placeholder="Say or do something..."
                                rows={1}
                                className="w-full resize-none rounded-[30px] bg-[#161411]/85 backdrop-blur-2xl focus:bg-[#1E1C1A]/95 transition-all text-[#E8E1D5] pl-6 pr-[148px] py-[20px] text-[16px] outline-none min-h-[64px] max-h-[140px] placeholder:text-[#5A544C] font-sans block pt-[20px]"
                                style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: `${themeColor}40` }}
                            />
                            <button
                                type="button"
                                onClick={() => void handleAct()}
                                disabled={isLoading}
                                aria-label={submitLabel}
                                className="absolute right-3 bottom-3 h-[40px] min-w-[110px] px-5 rounded-full bg-[var(--story-theme)] text-[#0E0C0A] flex items-center justify-center cursor-pointer hover:brightness-110 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70 disabled:cursor-wait outline-none shadow-md overflow-hidden text-[14px] font-semibold tracking-[0.02em]"
                            >
                                <AnimatePresence mode="wait">
                                    {isLoading ? (
                                        <motion.div key="loading" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                                            <svg className="animate-spin h-5 w-5 text-[#0E0C0A]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-10" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-100" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        </motion.div>
                                    ) : (
                                        <motion.span
                                            key={submitLabel}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                        >
                                            {submitLabel}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
