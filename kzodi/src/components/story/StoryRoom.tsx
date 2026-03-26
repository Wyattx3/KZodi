"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChatStore, type CastMember, type ChatMessage, type StoryData } from "@/lib/chatStore";
import { motion, AnimatePresence } from "framer-motion";
import type { Character } from "@/data/characters";

interface StoryRoomProps {
    storyId: string;
}

interface ParsedStoryContent {
    cleanedText: string;
    scene: string | null;
    actions: string[];
    fragments: StoryFragment[];
}

interface StoryFragment {
    type: "narrator" | "dialogue" | "action" | "thinking" | "world";
    characterName?: string;
    text: string;
}

const DEFAULT_QUICK_ACTIONS = ["Continue", "Ask a question", "Look around"];

function normalizeCharacterName(name: string) {
    return name.trim().toLowerCase();
}

function pushNarratorFragment(text: string, fragments: StoryFragment[]) {
    const normalized = text.replace(/\n{3,}/g, "\n\n").trim();
    if (!normalized) {
        return;
    }

    fragments.push({
        type: "narrator",
        text: normalized,
    });
}

function parseStoryContent(content: string): ParsedStoryContent {
    const sceneMatch = content.match(/\[\[\s*SCENE\s*:\s*([\s\S]*?)\]\]/i);
    const actionsMatch = content.match(/\[\[\s*ACTIONS\s*:\s*([\s\S]*?)\]\]/i);

    const cleanedText = content
        .replace(/\[\[\s*SCENE\s*:\s*[\s\S]*?\]\]\s*/gi, "")
        .replace(/\[\[\s*ACTIONS\s*:\s*[\s\S]*?\]\]\s*/gi, "")
        .trim();

    const fragments: StoryFragment[] = [];
    const tagRegex = /\[CHAR:([^\]]+)\]([\s\S]*?)\[\/CHAR\]|\[ACTION:([^\]]+)\]([\s\S]*?)\[\/ACTION\]|\[THINK:([^\]]+)\]([\s\S]*?)\[\/THINK\]|\[WORLD\]([\s\S]*?)\[\/WORLD\]/gi;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tagRegex.exec(cleanedText)) !== null) {
        pushNarratorFragment(cleanedText.slice(lastIndex, match.index), fragments);

        if (match[1]) {
            fragments.push({
                type: "dialogue",
                characterName: match[1].trim(),
                text: match[2].trim(),
            });
        } else if (match[3]) {
            fragments.push({
                type: "action",
                characterName: match[3].trim(),
                text: match[4].trim(),
            });
        } else if (match[5]) {
            fragments.push({
                type: "thinking",
                characterName: match[5].trim(),
                text: match[6].trim(),
            });
        } else if (match[7]) {
            fragments.push({
                type: "world",
                text: match[7].trim(),
            });
        }

        lastIndex = tagRegex.lastIndex;
    }

    pushNarratorFragment(cleanedText.slice(lastIndex), fragments);

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
        fragments: fragments.length > 0
            ? fragments
            : (cleanedText ? [{ type: "narrator", text: cleanedText }] : []),
    };
}

function renderMessageContent(message: ChatMessage) {
    const parsed = parseStoryContent(message.content);
    if (message.role === "user" && parsed.cleanedText === "[CONTINUE]") {
        return "";
    }
    return parsed.cleanedText || (message.role === "assistant" ? "..." : "");
}

interface CharacterSelectionScreenProps {
    storyId: string;
    title: string;
    coverImage?: string;
    genre?: string;
    creatorLabel?: string;
    storyData: StoryData;
    onBack: () => void;
    onConfirmed: () => void;
}

function CharacterSelectionScreen({
    storyId,
    title,
    coverImage,
    genre,
    creatorLabel,
    storyData,
    onBack,
    onConfirmed,
}: CharacterSelectionScreenProps) {
    const [selectionMode, setSelectionMode] = useState<"custom" | "creator" | "kakoei" | null>(null);
    const [customName, setCustomName] = useState("");
    const [customDescription, setCustomDescription] = useState("");
    const [customImage, setCustomImage] = useState("");
    const [kakoeiSearch, setKakoeiSearch] = useState("");
    const [availableCharacters, setAvailableCharacters] = useState<Character[]>([]);
    const [loadingCharacters, setLoadingCharacters] = useState(false);
    const [selectedCreatorCharacterId, setSelectedCreatorCharacterId] = useState<string | null>(null);
    const [selectedKakoeiCharacterId, setSelectedKakoeiCharacterId] = useState<string | null>(null);
    const customImageInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (selectionMode !== "kakoei") {
            return;
        }

        let isCancelled = false;
        const controller = new AbortController();

        const loadCharacters = async () => {
            setLoadingCharacters(true);
            try {
                const params = new URLSearchParams({ limit: "18" });
                if (kakoeiSearch.trim()) {
                    params.set("search", kakoeiSearch.trim());
                }

                const response = await fetch(`/api/characters?${params.toString()}`, {
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error(`Character fetch failed with ${response.status}`);
                }

                const data = await response.json();
                if (!isCancelled) {
                    setAvailableCharacters(Array.isArray(data?.characters) ? data.characters : []);
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    console.error("Failed to load character selection options", error);
                    if (!isCancelled) {
                        setAvailableCharacters([]);
                    }
                }
            } finally {
                if (!isCancelled) {
                    setLoadingCharacters(false);
                }
            }
        };

        void loadCharacters();

        return () => {
            isCancelled = true;
            controller.abort();
        };
    }, [kakoeiSearch, selectionMode]);

    const creatorCharacters = storyData.creatorCustomCharacters || [];
    const selectionOptions = [
        { id: "custom" as const, title: "\u270F\uFE0F Create My Own Character", subtitle: "Write a custom protagonist" },
        { id: "creator" as const, title: "\u{1F3AD} Use Creator's Characters", subtitle: "Pick from the story creator's cast" },
        { id: "kakoei" as const, title: "\u{1F310} Pick from Kakoei", subtitle: "Search the wider character library" },
    ];
    const activeSelectionOption = selectionOptions.find((option) => option.id === selectionMode) || null;
    const isOverviewScreen = selectionMode === null;
    const selectedCreatorCharacter = creatorCharacters.find((character) => character.id === selectedCreatorCharacterId);
    const selectedKakoeiCharacter = availableCharacters.find((character) => character.id === selectedKakoeiCharacterId) || null;
    const canBegin = selectionMode === "custom"
        ? Boolean(customName.trim())
        : selectionMode === "creator"
            ? Boolean(selectedCreatorCharacter)
            : selectionMode === "kakoei"
                ? Boolean(selectedKakoeiCharacter)
                : false;

    const persistSelection = () => {
        let playerCharacterName = "";
        let playerCharacterDescription = "";

        if (selectionMode === "custom") {
            playerCharacterName = customName.trim();
            playerCharacterDescription = customDescription.trim();
        } else if (selectionMode === "creator" && selectedCreatorCharacter) {
            playerCharacterName = selectedCreatorCharacter.name;
            playerCharacterDescription = selectedCreatorCharacter.description;
        } else if (selectionMode === "kakoei" && selectedKakoeiCharacter) {
            playerCharacterName = selectedKakoeiCharacter.name;
            playerCharacterDescription = selectedKakoeiCharacter.description;
        }

        if (!playerCharacterName) {
            return;
        }

        useChatStore.getState().upsertConversation(storyId, {
            storyData: {
                ...storyData,
                playerCharacterName,
                playerCharacterDescription,
            },
        });
        onConfirmed();
    };

    const handleSelectionBack = () => {
        if (isOverviewScreen) {
            onBack();
            return;
        }

        setSelectionMode(null);
    };

    return (
        <div
            className="min-h-[100dvh] h-[100dvh] overflow-y-auto px-5 py-6 md:px-8"
            style={{
                backgroundColor: "#0E0C0A",
                color: "#F7E7C1",
            }}
        >
            <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6">
                <div
                    className="sticky top-0 z-10 -mx-5 -mt-6 flex items-center gap-4 px-5 py-4 md:-mx-8 md:px-8"
                    style={{
                        backgroundColor: "#0E0C0A",
                        borderBottom: "1px solid rgba(232,213,163,0.12)",
                    }}
                >
                    <button
                        type="button"
                        onClick={onBack}
                        className="flex h-[42px] w-[42px] items-center justify-center rounded-full border"
                        style={{
                            borderColor: "rgba(232,213,163,0.16)",
                            background: "rgba(20,16,12,0.92)",
                            color: "#F7E7C1",
                            flexShrink: 0,
                        }}
                        aria-label="Back to chats"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M15 4L7 12L15 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <div className="min-w-0">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: "rgba(232,213,163,0.68)" }}>
                            Story Setup
                        </div>
                        <div className="truncate font-serif text-[24px] leading-tight">{title}</div>
                    </div>
                </div>

                <div
                    className="overflow-hidden rounded-[28px] border"
                    style={{ borderColor: "rgba(232,213,163,0.16)", background: "rgba(20,16,12,0.92)" }}
                >
                    <div className="grid gap-0 md:grid-cols-[180px_1fr]">
                        <div
                            style={{
                                minHeight: "220px",
                                background: coverImage
                                    ? `center / cover no-repeat url(${coverImage})`
                                    : "linear-gradient(135deg, #2A1E13, #8B6B44)",
                            }}
                        />
                        <div className="flex flex-col gap-3 p-6">
                            <div className="text-[12px] font-semibold uppercase tracking-[0.2em]" style={{ color: "#E8D5A3", opacity: 0.72 }}>
                                Story Preview
                            </div>
                            <h1 className="m-0 font-serif text-[32px] leading-tight">{title}</h1>
                            <div className="text-[14px]" style={{ color: "rgba(247,231,193,0.72)" }}>
                                {`${genre || "Story"} | ${creatorLabel || "Creator"}`}
                            </div>
                            <p className="m-0 max-w-[440px] text-[15px] leading-7" style={{ color: "rgba(247,231,193,0.82)" }}>
                                Choose how you want to step into this world before the first scene begins.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    {[
                        { id: "custom" as const, title: "\u270F\uFE0F Create My Own Character", subtitle: "Write a custom protagonist" },
                        { id: "creator" as const, title: "\u{1F3AD} Use Creator's Characters", subtitle: "Pick from the story creator's cast" },
                        { id: "kakoei" as const, title: "\u{1F310} Pick from Kakoei", subtitle: "Search the wider character library" },
                    ].map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => setSelectionMode(option.id)}
                            className="rounded-[24px] border p-5 text-left transition-colors"
                            style={{
                                borderColor: selectionMode === option.id ? "#E8D5A3" : "rgba(232,213,163,0.14)",
                                background: selectionMode === option.id ? "rgba(232,213,163,0.12)" : "rgba(20,16,12,0.9)",
                                color: "#F7E7C1",
                            }}
                        >
                            <div className="text-[15px] font-semibold">{option.title}</div>
                            <div className="mt-2 text-[13px]" style={{ color: "rgba(247,231,193,0.64)" }}>
                                {option.subtitle}
                            </div>
                        </button>
                    ))}
                </div>

                {selectionMode === "custom" && (
                    <div
                        className="flex flex-col gap-4 rounded-[28px] border p-6"
                        style={{ borderColor: "rgba(232,213,163,0.16)", background: "rgba(20,16,12,0.92)" }}
                    >
                        <div className="grid gap-4 md:grid-cols-[120px_1fr]">
                            <input
                                ref={customImageInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (!file) {
                                        return;
                                    }
                                    const reader = new FileReader();
                                    reader.onload = (loadEvent) => {
                                        const result = loadEvent.target?.result;
                                        if (typeof result === "string") {
                                            setCustomImage(result);
                                        }
                                    };
                                    reader.readAsDataURL(file);
                                    event.target.value = "";
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => customImageInputRef.current?.click()}
                                className="rounded-[20px] border"
                                style={{
                                    height: "148px",
                                    borderColor: "rgba(232,213,163,0.18)",
                                    background: customImage
                                        ? `center / cover no-repeat url(${customImage})`
                                        : "linear-gradient(135deg, #1E160F, #5C4326)",
                                    color: "#F7E7C1",
                                }}
                            >
                                {!customImage && "Upload image"}
                            </button>
                            <div className="flex flex-col gap-4">
                                <input
                                    type="text"
                                    value={customName}
                                    onChange={(event) => setCustomName(event.target.value)}
                                    placeholder="Character name"
                                    className="rounded-[18px] border px-4 py-4 text-[15px] outline-none"
                                    style={{
                                        borderColor: "rgba(232,213,163,0.16)",
                                        background: "rgba(12,10,8,0.9)",
                                        color: "#F7E7C1",
                                    }}
                                />
                                <textarea
                                    value={customDescription}
                                    onChange={(event) => setCustomDescription(event.target.value)}
                                    placeholder="Appearance, backstory, and what drives this character"
                                    className="min-h-[110px] rounded-[18px] border px-4 py-4 text-[15px] outline-none"
                                    style={{
                                        borderColor: "rgba(232,213,163,0.16)",
                                        background: "rgba(12,10,8,0.9)",
                                        color: "#F7E7C1",
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {selectionMode === "creator" && (
                    <div
                        className="flex flex-col gap-4 rounded-[28px] border p-6"
                        style={{ borderColor: "rgba(232,213,163,0.16)", background: "rgba(20,16,12,0.92)" }}
                    >
                        {creatorCharacters.length === 0 ? (
                            <div className="rounded-[20px] border px-5 py-6 text-[14px]" style={{ borderColor: "rgba(232,213,163,0.14)", color: "rgba(247,231,193,0.64)" }}>
                                No characters available.
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2">
                                {creatorCharacters.map((character) => (
                                    <button
                                        key={character.id}
                                        type="button"
                                        onClick={() => setSelectedCreatorCharacterId(character.id)}
                                        className="flex gap-4 rounded-[22px] border p-4 text-left"
                                        style={{
                                            borderColor: selectedCreatorCharacterId === character.id ? "#E8D5A3" : "rgba(232,213,163,0.14)",
                                            background: selectedCreatorCharacterId === character.id ? "rgba(232,213,163,0.1)" : "rgba(12,10,8,0.9)",
                                            color: "#F7E7C1",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: "74px",
                                                height: "94px",
                                                borderRadius: "18px",
                                                flexShrink: 0,
                                                background: character.image
                                                    ? `center / cover no-repeat url(${character.image})`
                                                    : "linear-gradient(135deg, #1E160F, #5C4326)",
                                            }}
                                        />
                                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                                            <div className="text-[16px] font-semibold">{character.name}</div>
                                            <div className="text-[13px]" style={{ color: "rgba(247,231,193,0.72)" }}>
                                                {character.personality}
                                            </div>
                                            <div className="text-[13px] leading-6" style={{ color: "rgba(247,231,193,0.62)" }}>
                                                {character.description}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {selectionMode === "kakoei" && (
                    <div
                        className="flex flex-col gap-4 rounded-[28px] border p-6"
                        style={{ borderColor: "rgba(232,213,163,0.16)", background: "rgba(20,16,12,0.92)" }}
                    >
                        <input
                            type="text"
                            value={kakoeiSearch}
                            onChange={(event) => setKakoeiSearch(event.target.value)}
                            placeholder="Search Kakoei characters..."
                            className="rounded-[18px] border px-4 py-4 text-[15px] outline-none"
                            style={{
                                borderColor: "rgba(232,213,163,0.16)",
                                background: "rgba(12,10,8,0.9)",
                                color: "#F7E7C1",
                            }}
                        />

                        {loadingCharacters && (
                            <div className="rounded-[20px] border px-5 py-6 text-center text-[14px]" style={{ borderColor: "rgba(232,213,163,0.14)", color: "rgba(247,231,193,0.64)" }}>
                                Loading characters...
                            </div>
                        )}

                        {!loadingCharacters && availableCharacters.length === 0 && (
                            <div className="rounded-[20px] border px-5 py-6 text-center text-[14px]" style={{ borderColor: "rgba(232,213,163,0.14)", color: "rgba(247,231,193,0.64)" }}>
                                No characters available.
                            </div>
                        )}

                        <div className="grid gap-4 md:grid-cols-2">
                            {availableCharacters.map((character) => (
                                <button
                                    key={character.id}
                                    type="button"
                                    onClick={() => setSelectedKakoeiCharacterId(character.id)}
                                    className="flex items-center gap-4 rounded-[22px] border p-4 text-left"
                                    style={{
                                        borderColor: selectedKakoeiCharacterId === character.id ? "#E8D5A3" : "rgba(232,213,163,0.14)",
                                        background: selectedKakoeiCharacterId === character.id ? "rgba(232,213,163,0.1)" : "rgba(12,10,8,0.9)",
                                        color: "#F7E7C1",
                                    }}
                                >
                                    <img
                                        src={character.image}
                                        alt={character.name}
                                        style={{
                                            width: "56px",
                                            height: "56px",
                                            borderRadius: "50%",
                                            objectFit: "cover",
                                            flexShrink: 0,
                                        }}
                                    />
                                    <div className="min-w-0">
                                        <div className="text-[15px] font-semibold">{character.name}</div>
                                        <div className="text-[13px]" style={{ color: "rgba(247,231,193,0.72)" }}>
                                            {character.tag}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={persistSelection}
                        disabled={!canBegin}
                        className="rounded-full px-6 py-3 text-[15px] font-semibold transition-opacity"
                        style={{
                            background: canBegin ? "#E8D5A3" : "rgba(232,213,163,0.24)",
                            color: "#0E0C0A",
                            cursor: canBegin ? "pointer" : "not-allowed",
                            opacity: canBegin ? 1 : 0.7,
                        }}
                    >
                        Begin Story -&gt;
                    </button>
                </div>
            </div>
        </div>
    );
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
    const [playerCharSelected, setPlayerCharSelected] = useState(() => (
        conversation?.storyData?.allowUserCharacterCustomization !== true ||
        Boolean(conversation?.storyData?.playerCharacterName)
    ));
    const storyLogRef = useRef<HTMLDivElement>(null);

    const parsedMessages = useMemo(() => {
        return (conversation?.messages || []).map((message) => ({
            ...message,
            parsed: parseStoryContent(message.content),
        }));
    }, [conversation?.messages]);

    const castMap = useMemo(() => {
        const map: Record<string, CastMember> = {};
        (conversation?.storyData?.cast || []).forEach((member) => {
            if (!member.name) {
                return;
            }
            map[normalizeCharacterName(member.name)] = member;
        });
        return map;
    }, [conversation?.storyData?.cast]);

    useEffect(() => {
        if (!conversation || conversation.conversationType !== "story") {
            router.replace("/chat?tab=chats");
        }
    }, [conversation, router]);

    useEffect(() => {
        setPlayerCharSelected(
            conversation?.storyData?.allowUserCharacterCustomization !== true ||
            Boolean(conversation?.storyData?.playerCharacterName)
        );
    }, [conversation?.storyData?.allowUserCharacterCustomization, conversation?.storyData?.playerCharacterName]);

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

        if (hasTaggedActions && latestMessage.parsed.actions.length > 0) {
            setQuickActions(latestMessage.parsed.actions);
            return;
        }

        setQuickActions(DEFAULT_QUICK_ACTIONS);
    }, [conversation?.messages.length, conversation?.storyData?.currentScene, parsedMessages, storyId, updateStoryScene]);

    useEffect(() => {
        if (!storyLogRef.current) return;
        storyLogRef.current.scrollTop = storyLogRef.current.scrollHeight;
    }, [parsedMessages.length, isLoading, quickActions.length]);

    if (!conversation || conversation.conversationType !== "story") {
        return null;
    }

    const handleAct = async (overrideInput?: string) => {
        const playerInput = (overrideInput ?? inputText).trim();
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

            setQuickActions(parsedReply.actions.length > 0 ? parsedReply.actions : DEFAULT_QUICK_ACTIONS);
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

    const themeColor = conversation.theme || conversation.storyData?.themeColor || (isLightBg ? "#5A544C" : "#E8E1D5");
    // Determine if accent/theme color is light for button text contrast
    const isLightAccent = (() => {
        const hex = themeColor.replace('#', '');
        if (hex.length < 6) return true;
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return (r * 299 + g * 587 + b * 114) / 1000 > 128;
    })();
    const accentButtonText = isLightAccent ? '#0E0C0A' : '#F7F5F0';
    const surfaceBorder = isLightBg ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)';
    const inputBg = isLightBg ? 'rgba(0,0,0,0.06)' : 'rgba(22,20,17,0.85)';
    const inputFocusBg = isLightBg ? 'rgba(0,0,0,0.09)' : 'rgba(30,28,26,0.95)';
    const placeholderColor = isLightBg ? 'rgba(0,0,0,0.35)' : '#5A544C';
    const mutedText = isLightBg ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.4)';

    if (conversation.storyData?.allowUserCharacterCustomization && !playerCharSelected) {
        return (
            <CharacterSelectionScreen
                storyId={storyId}
                title={title}
                coverImage={conversation.groupImage}
                genre={conversation.storyData?.genre}
                creatorLabel={conversation.creatorId || "Creator"}
                storyData={conversation.storyData}
                onBack={() => router.replace("/chat?tab=chats")}
                onConfirmed={() => setPlayerCharSelected(true)}
            />
        );
    }

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
                "--story-placeholder": placeholderColor,
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
                                            const presetBg = t.color || conversation.storyData?.themeColor || (isLightBg ? "#5A544C" : "#E8E1D5");
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
                className="flex-1 overflow-y-auto w-full flex flex-col items-center scroll-smooth px-5 md:px-8 pt-4 pb-48 [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-thumb]:rounded-full z-10"
                style={{ scrollbarColor: `${isLightBg ? 'rgba(0,0,0,0.15)' : '#2A2622'} transparent` }}
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
                        <div className="text-center text-[16px] italic mt-8 font-serif" style={{ color: mutedText }}>
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
                                        {(message.parsed.fragments.length > 0 ? message.parsed.fragments : [{ type: "narrator", text: displayedText } as StoryFragment]).map((fragment, index) => {
                                            const castMember = fragment.characterName
                                                ? castMap[normalizeCharacterName(fragment.characterName)]
                                                : undefined;

                                            if (fragment.type === "dialogue") {
                                                return (
                                                    <div
                                                        key={`${message.id}-dialogue-${index}`}
                                                        className="flex items-start gap-3"
                                                    >
                                                        {castMember?.image ? (
                                                            <img
                                                                src={castMember.image}
                                                                alt={fragment.characterName || "Character"}
                                                                style={{
                                                                    width: "40px",
                                                                    height: "40px",
                                                                    borderRadius: "50%",
                                                                    objectFit: "cover",
                                                                    flexShrink: 0,
                                                                }}
                                                            />
                                                        ) : (
                                                            <div
                                                                style={{
                                                                    width: "40px",
                                                                    height: "40px",
                                                                    borderRadius: "50%",
                                                                    background: `${themeColor}22`,
                                                                    color: themeColor,
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    fontSize: "14px",
                                                                    fontWeight: 700,
                                                                    flexShrink: 0,
                                                                }}
                                                            >
                                                                {(fragment.characterName || "?").slice(0, 1).toUpperCase()}
                                                            </div>
                                                        )}
                                                        <div className="min-w-0 flex-1">
                                                            <div className="mb-2 text-[13px] font-semibold uppercase tracking-[0.14em]" style={{ color: themeColor }}>
                                                                {fragment.characterName}
                                                            </div>
                                                            <div
                                                                className="rounded-[22px] border-l-[3px] px-4 py-3 text-[17px] leading-8"
                                                                style={{
                                                                    background: isLightBg ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.04)",
                                                                    borderColor: isLightBg ? themeColor : `${themeColor}88`,
                                                                    color: textColor,
                                                                }}
                                                            >
                                                                {fragment.text}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            if (fragment.type === "action") {
                                                return (
                                                    <div
                                                        key={`${message.id}-action-${index}`}
                                                        className="text-[14px] leading-7 whitespace-pre-wrap font-sans"
                                                        style={{ color: textColor, opacity: 0.5 }}
                                                    >
                                                        {`*${fragment.text}*`}
                                                    </div>
                                                );
                                            }

                                            if (fragment.type === "thinking") {
                                                return (
                                                    <div
                                                        key={`${message.id}-thinking-${index}`}
                                                        className="text-[15px] leading-7 whitespace-pre-wrap font-serif italic"
                                                        style={{ color: textColor, opacity: 0.4 }}
                                                    >
                                                        {`\u{1F4AD} ${fragment.text}`}
                                                    </div>
                                                );
                                            }

                                            if (fragment.type === "world") {
                                                return (
                                                    <div
                                                        key={`${message.id}-world-${index}`}
                                                        className="rounded-[20px] border-l-[3px] px-4 py-3 text-[15px] leading-7 whitespace-pre-wrap"
                                                        style={{
                                                            background: isLightBg ? `${themeColor}18` : `${themeColor}14`,
                                                            borderColor: isLightBg ? themeColor : `${themeColor}88`,
                                                            color: textColor,
                                                        }}
                                                    >
                                                        {`\u{1F30D} ${fragment.text}`}
                                                    </div>
                                                );
                                            }

                                            return (
                                                <p
                                                    key={`${message.id}-narrator-${index}`}
                                                    className="m-0 whitespace-pre-wrap font-serif text-[19px] md:text-[21px] leading-[1.85] italic"
                                                    style={{ color: textColor, opacity: 0.75 }}
                                                >
                                                    {fragment.text}
                                                </p>
                                            );
                                        })}
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
                                        onClick={() => void handleAct(action)}
                                        className="shrink-0 px-5 py-2.5 rounded-full backdrop-blur-md text-[14px] font-sans transition-all active:scale-95 whitespace-nowrap outline-none"
                                        style={{ backgroundColor: isLightBg ? 'rgba(0,0,0,0.07)' : 'rgba(20,18,15,0.9)', borderWidth: '1px', borderStyle: 'solid', borderColor: isLightBg ? `${themeColor}aa` : `${themeColor}33`, color: isLightBg ? textColor : `${themeColor}cc` }}
                                    >
                                        {action}
                                    </button>
                                ))}
                            </motion.div>
                        )}

                        <div className="relative w-full rounded-[30px]" style={{ boxShadow: isLightBg ? '0 -6px 30px rgba(0,0,0,0.08)' : '0 -10px 40px rgba(0,0,0,0.6)' }}>
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
                                className="w-full resize-none rounded-[30px] backdrop-blur-2xl transition-all pl-6 pr-[148px] py-[20px] text-[16px] outline-none min-h-[64px] max-h-[140px] font-sans block pt-[20px] placeholder:text-[var(--story-placeholder)]"
                                style={{
                                    backgroundColor: inputBg,
                                    color: textColor,
                                    borderWidth: '1px',
                                    borderStyle: 'solid',
                                    borderColor: isLightBg ? `${themeColor}99` : `${themeColor}40`,
                                    ['--tw-placeholder-opacity' as string]: 1,
                                }}
                                onFocus={(e) => { e.currentTarget.style.backgroundColor = inputFocusBg; }}
                                onBlur={(e) => { e.currentTarget.style.backgroundColor = inputBg; }}
                            />
                            <button
                                type="button"
                                onClick={() => void handleAct()}
                                disabled={isLoading}
                                aria-label={submitLabel}
                                className="absolute right-3 bottom-3 h-[40px] min-w-[110px] px-5 rounded-full bg-[var(--story-theme)] flex items-center justify-center cursor-pointer hover:brightness-110 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70 disabled:cursor-wait outline-none shadow-md overflow-hidden text-[14px] font-semibold tracking-[0.02em]"
                                style={{ color: accentButtonText }}
                            >
                                <AnimatePresence mode="wait">
                                    {isLoading ? (
                                        <motion.div key="loading" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                                            <svg className="animate-spin h-5 w-5" style={{ color: accentButtonText }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
