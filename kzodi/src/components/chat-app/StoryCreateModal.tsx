"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useChatStore, type CastMember, type CustomCastCharacter, type StoryData } from "@/lib/chatStore";
import type { Character } from "@/data/characters";

interface StoryCreateModalProps {
    onClose: () => void;
    onCreated: (storyId: string, story?: any) => void;
    initialData?: any;
}

type StoryStep = 1 | 2 | 3 | 4 | 5;
type CastSourceTab = "kakoei" | "custom";
type MainCharMode = "fixed" | "customizable";
type Visibility = "public" | "private";
type CastRole = CastMember["role"];
type ContentRating = NonNullable<StoryData["contentRating"]>;

interface CustomCharacterFormState {
    name: string;
    description: string;
    image: string;
    personality: string;
    role: CastRole;
}

const GENRES = [
    "Fantasy",
    "Sci-Fi",
    "Romance",
    "Mystery",
    "Horror",
    "Adventure",
    "Slice of Life",
    "Isekai",
    "Thriller",
    "Historical",
] as const;

const STORY_TONES = [
    "Dark",
    "Light-hearted",
    "Romantic",
    "Action",
    "Philosophical",
    "Comedic",
] as const;

const CONTENT_RATINGS: Array<{ value: ContentRating; label: string }> = [
    { value: "all-ages", label: "All Ages" },
    { value: "teen", label: "Teen" },
    { value: "mature", label: "Mature" },
];

const WORLD_TYPES = ["Fantasy", "Realistic", "Sci-Fi", "Supernatural", "Post-Apocalyptic"] as const;

const ROLE_OPTIONS: Array<{ value: CastRole; label: string; description: string }> = [
    { value: "main-npc", label: "Main NPC", description: "Core presence in major scenes" },
    { value: "supporting", label: "Supporting NPC", description: "Adds texture and helps arcs move" },
    { value: "antagonist", label: "Antagonist", description: "Pushes conflict and raises stakes" },
    { value: "mentor", label: "Mentor", description: "Guides growth and perspective" },
    { value: "love-interest", label: "Love Interest", description: "Brings chemistry and emotional pull" },
    { value: "ally", label: "Ally", description: "Reliable partner in tense moments" },
];

const ROLE_STYLES: Record<CastRole, { background: string; border: string; color: string }> = {
    "main-npc": {
        background: "rgba(127,82,45,0.12)",
        border: "1px solid rgba(127,82,45,0.18)",
        color: "#6B4729",
    },
    supporting: {
        background: "rgba(122,105,84,0.12)",
        border: "1px solid rgba(122,105,84,0.18)",
        color: "#6E6152",
    },
    antagonist: {
        background: "rgba(151,80,72,0.12)",
        border: "1px solid rgba(151,80,72,0.18)",
        color: "#8C4C45",
    },
    mentor: {
        background: "rgba(108,122,86,0.14)",
        border: "1px solid rgba(108,122,86,0.18)",
        color: "#5C6948",
    },
    "love-interest": {
        background: "rgba(170,114,120,0.14)",
        border: "1px solid rgba(170,114,120,0.18)",
        color: "#955D63",
    },
    ally: {
        background: "rgba(83,122,123,0.14)",
        border: "1px solid rgba(83,122,123,0.18)",
        color: "#446B6C",
    },
};

const THEME_SWATCHES = ["#E8E1D5", "#E69A8D", "#8DA8E6", "#8DE6A8", "#E6D88D", "#C7A17A"];
const EMPTY_WORLD_RULES = {
    timePeriod: "",
    worldType: "",
    specialRules: "",
    forbiddenTopics: "",
};
const EMPTY_CUSTOM_CHAR_FORM: CustomCharacterFormState = {
    name: "",
    description: "",
    image: "",
    personality: "",
    role: "supporting",
};

const STEP_DETAILS: Record<StoryStep, { title: string; subtitle: string }> = {
    1: { title: "Story Info", subtitle: "Title, style, and presentation" },
    2: { title: "World Rules", subtitle: "Set the boundaries of the world" },
    3: { title: "Cast Setup", subtitle: "Choose who will populate the story" },
    4: { title: "Main Character", subtitle: "Decide how the player enters the story" },
    5: { title: "Publish Settings", subtitle: "Review the story before creation" },
};

function createCustomId(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readFileAsDataUrl(file: File, onLoad: (value: string) => void) {
    const reader = new FileReader();
    reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === "string") {
            onLoad(result);
        }
    };
    reader.readAsDataURL(file);
}

function parseStoryValue(value: any) {
    if (typeof value !== "string") {
        return value;
    }

    try {
        return JSON.parse(value);
    } catch {
        return undefined;
    }
}

function getRoleLabel(role: CastRole) {
    return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? "Supporting NPC";
}

function summarizePersonality(personality: string) {
    return personality
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 2)
        .join(" / ");
}

function getInitials(name: string) {
    const initials = name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("");

    return initials || "?";
}

interface RoleSelectorProps {
    value: CastRole;
    onChange: (role: CastRole) => void;
    disabled?: boolean;
    compact?: boolean;
    stopPropagation?: boolean;
}

function RoleSelector({
    value,
    onChange,
    disabled = false,
    compact = false,
    stopPropagation = false,
}: RoleSelectorProps) {
    return (
        <div
            onClick={stopPropagation ? (event) => event.stopPropagation() : undefined}
            style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: compact ? "8px" : "10px",
                opacity: disabled ? 0.55 : 1,
                pointerEvents: disabled ? "none" : "auto",
            }}
        >
            {ROLE_OPTIONS.map((option) => {
                const selected = option.value === value;
                const roleStyle = ROLE_STYLES[option.value];

                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={(event) => {
                            if (stopPropagation) {
                                event.stopPropagation();
                            }
                            onChange(option.value);
                        }}
                        style={{
                            border: selected ? roleStyle.border : "1px solid rgba(74,55,40,0.08)",
                            borderRadius: compact ? "16px" : "18px",
                            background: selected
                                ? `linear-gradient(180deg, ${roleStyle.background}, rgba(255,255,255,0.98))`
                                : "#FFFFFF",
                            padding: compact ? "10px 11px" : "12px 13px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-start",
                            gap: compact ? "4px" : "6px",
                            textAlign: "left",
                            color: "#4A3728",
                            cursor: disabled ? "default" : "pointer",
                            boxShadow: selected ? "0 10px 22px rgba(74,55,40,0.08)" : "none",
                            transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
                            <span
                                style={{
                                    width: compact ? "9px" : "10px",
                                    height: compact ? "9px" : "10px",
                                    borderRadius: "999px",
                                    background: selected ? roleStyle.color : "rgba(74,55,40,0.18)",
                                    boxShadow: selected ? `0 0 0 4px ${roleStyle.background}` : "none",
                                    flexShrink: 0,
                                }}
                            />
                            <span
                                style={{
                                    fontSize: compact ? "12px" : "13px",
                                    fontWeight: 800,
                                    color: selected ? roleStyle.color : "#4A3728",
                                    lineHeight: 1.3,
                                }}
                            >
                                {option.label}
                            </span>
                        </div>
                        {!compact && (
                            <span
                                style={{
                                    fontSize: "11px",
                                    lineHeight: 1.45,
                                    color: selected ? "#6E645C" : "#8B8680",
                                }}
                            >
                                {option.description}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export default function StoryCreateModal({ onClose, onCreated, initialData }: StoryCreateModalProps) {
    const [step, setStep] = useState<StoryStep>(1);

    const [title, setTitle] = useState("");
    const [genre, setGenre] = useState("");
    const [synopsis, setSynopsis] = useState("");
    const [tone, setTone] = useState("");
    const [contentRating, setContentRating] = useState<ContentRating | "">("");
    const [coverImage, setCoverImage] = useState("");
    const [backgroundImage, setBackgroundImage] = useState("");
    const [themeColor, setThemeColor] = useState("#E8E1D5");

    const [worldRules, setWorldRules] = useState(EMPTY_WORLD_RULES);

    const [cast, setCast] = useState<CastMember[]>([]);
    const [castSourceTab, setCastSourceTab] = useState<CastSourceTab>("kakoei");
    const [castSearch, setCastSearch] = useState("");
    const [customCharForm, setCustomCharForm] = useState<CustomCharacterFormState>(EMPTY_CUSTOM_CHAR_FORM);
    const [creatorCustomCharacters, setCreatorCustomCharacters] = useState<CustomCastCharacter[]>([]);
    const [availableCharacters, setAvailableCharacters] = useState<Character[]>([]);
    const [loadingCharacters, setLoadingCharacters] = useState(false);

    const [mainCharMode, setMainCharMode] = useState<MainCharMode>("fixed");
    const [fixedCharName, setFixedCharName] = useState("");
    const [fixedCharDescription, setFixedCharDescription] = useState("");

    const [visibility, setVisibility] = useState<Visibility>("public");
    const [allowUserCharacterCustomization, setAllowUserCharacterCustomization] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const coverInputRef = useRef<HTMLInputElement>(null);
    const backgroundInputRef = useRef<HTMLInputElement>(null);
    const customCharImageInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let isCancelled = false;
        const controller = new AbortController();

        const loadCharacters = async () => {
            setLoadingCharacters(true);
            try {
                const params = new URLSearchParams({ limit: "24" });
                if (castSearch.trim()) {
                    params.set("search", castSearch.trim());
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
                    console.error("Failed to load characters for story cast", error);
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
    }, [castSearch]);

    useEffect(() => {
        const parsedStoryData = parseStoryValue(initialData?.storyData || initialData?.story_data) || {};

        if (initialData) {
            const allowsCustomization = parsedStoryData.allowUserCharacterCustomization === true;

            setStep(1);
            setTitle(initialData.name || "");
            setGenre(initialData.genre || parsedStoryData.genre || "");
            setSynopsis(initialData.synopsis || parsedStoryData.synopsis || "");
            setTone(parsedStoryData.tone || "");
            setContentRating(parsedStoryData.contentRating || "");
            setCoverImage(initialData.image || "");
            setBackgroundImage(parsedStoryData.backgroundImage || "");
            setThemeColor(parsedStoryData.themeColor || "#E8E1D5");
            setWorldRules(parsedStoryData.worldRules || EMPTY_WORLD_RULES);
            setCast(Array.isArray(parsedStoryData.cast) ? parsedStoryData.cast : []);
            setCreatorCustomCharacters(Array.isArray(parsedStoryData.creatorCustomCharacters) ? parsedStoryData.creatorCustomCharacters : []);
            setCastSourceTab("kakoei");
            setCastSearch("");
            setCustomCharForm(EMPTY_CUSTOM_CHAR_FORM);
            setMainCharMode(allowsCustomization ? "customizable" : "fixed");
            setFixedCharName(parsedStoryData.playerCharacterName || "");
            setFixedCharDescription(parsedStoryData.playerCharacterDescription || "");
            setVisibility((parsedStoryData.isPublished || initialData.is_published) ? "public" : "private");
            setAllowUserCharacterCustomization(allowsCustomization);
            setIsSaving(false);
            return;
        }

        setStep(1);
        setTitle("");
        setGenre("");
        setSynopsis("");
        setTone("");
        setContentRating("");
        setCoverImage("");
        setBackgroundImage("");
        setThemeColor("#E8E1D5");
        setWorldRules(EMPTY_WORLD_RULES);
        setCast([]);
        setCastSourceTab("kakoei");
        setCastSearch("");
        setCustomCharForm(EMPTY_CUSTOM_CHAR_FORM);
        setCreatorCustomCharacters([]);
        setMainCharMode("fixed");
        setFixedCharName("");
        setFixedCharDescription("");
        setVisibility("public");
        setAllowUserCharacterCustomization(false);
        setIsSaving(false);
    }, [initialData]);

    const currentStep = STEP_DETAILS[step];
    const stepProgress = Array.from({ length: 5 }, (_, index) => index + 1 as StoryStep);
    const canContinueFromInfo = Boolean(title.trim() && coverImage && genre && synopsis.trim() && contentRating);
    const canContinueFromMainCharacter = mainCharMode === "customizable" || Boolean(fixedCharName.trim() && fixedCharDescription.trim());
    const canCreate = canContinueFromInfo && canContinueFromMainCharacter;

    const handleFileChange = (
        event: React.ChangeEvent<HTMLInputElement>,
        onLoad: (value: string) => void
    ) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }
        readFileAsDataUrl(file, onLoad);
        event.target.value = "";
    };

    const handleBack = () => {
        if (step === 1) {
            onClose();
            return;
        }
        setStep((current) => (current - 1) as StoryStep);
    };

    const handleNext = () => {
        if (step === 1 && !canContinueFromInfo) {
            return;
        }
        if (step === 4 && !canContinueFromMainCharacter) {
            return;
        }
        if (step < 5) {
            setStep((current) => (current + 1) as StoryStep);
        }
    };

    const handleCreate = async () => {
        if (!canCreate || isSaving) {
            return;
        }

        setIsSaving(true);
        const hasWorldRules = Object.values(worldRules).some((value) => value.trim().length > 0);
        const storyData: StoryData = {
            synopsis: synopsis.trim(),
            genre,
            isPublished: visibility === "public",
            playerCharacterName: allowUserCharacterCustomization ? "" : fixedCharName.trim(),
            playerCharacterDescription: allowUserCharacterCustomization ? "" : fixedCharDescription.trim(),
            castIds: cast.filter((member) => !member.isCustom).map((member) => member.characterId),
            cast: cast.length > 0 ? cast : undefined,
            creatorCustomCharacters: creatorCustomCharacters.length > 0 ? creatorCustomCharacters : undefined,
            worldRules: hasWorldRules ? worldRules : undefined,
            tone: tone || undefined,
            contentRating: contentRating || undefined,
            allowUserCharacterCustomization,
            themeColor,
            backgroundImage: backgroundImage || undefined,
        };

        const persistedWorldData = parseStoryValue(initialData?.worldData || initialData?.world_data);
        const storyId = useChatStore.getState().createStory(
            title.trim(),
            coverImage,
            storyData,
            persistedWorldData,
            initialData?.id,
            initialData?.creatorId || initialData?.creator_id
        );
        const storyPayload = {
            id: storyId,
            name: title.trim(),
            synopsis: synopsis.trim(),
            genre,
            image: coverImage,
            story_data: storyData,
            world_data: persistedWorldData || null,
            is_published: visibility === "public",
        };
        const metadataPayload = {
            conversationId: storyId,
            conversationType: "story",
            conversationMetadata: {
                groupName: title.trim(),
                groupImage: coverImage,
                groupMemberIds: null,
                worldData: persistedWorldData || null,
                storyData,
            },
        };

        try {
            let response = await fetch("/api/stories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(storyPayload),
            });

            if (!response.ok && response.status === 403) {
                const syncResponse = await fetch("/api/messages", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(metadataPayload),
                });

                if (!syncResponse.ok) {
                    alert("Failed to sync story metadata.");
                    return;
                }

                response = await fetch("/api/stories", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(storyPayload),
                });
            }

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                alert(data?.error || "Failed to save story.");
                return;
            }

            const rawStory = data?.story || {
                id: storyId,
                name: title.trim(),
                synopsis: synopsis.trim(),
                genre,
                image: coverImage,
                creator_id: initialData?.creatorId || initialData?.creator_id,
                is_published: visibility === "public",
                story_data: storyData,
                world_data: persistedWorldData || null,
            };
            const normalizedStoryData = parseStoryValue(rawStory.story_data) || storyData;

            onCreated(storyId, {
                ...rawStory,
                creatorId: rawStory.creator_id || rawStory.creatorId,
                synopsis: rawStory.synopsis || normalizedStoryData.synopsis || "",
                genre: rawStory.genre || normalizedStoryData.genre || "",
                is_published: Boolean(rawStory.is_published),
                storyData: {
                    ...normalizedStoryData,
                    synopsis: rawStory.synopsis || normalizedStoryData.synopsis || "",
                    genre: rawStory.genre || normalizedStoryData.genre || "",
                    isPublished: Boolean(rawStory.is_published),
                },
                worldData: parseStoryValue(rawStory.world_data) || persistedWorldData,
            });
        } catch (error) {
            console.error("Failed to save story:", error);
            alert("Failed to save story.");
        } finally {
            setIsSaving(false);
        }
    };

    const toggleKakoeiCharacter = (character: Character) => {
        setCast((currentCast) => {
            const exists = currentCast.some((member) => member.characterId === character.id);
            if (exists) {
                return currentCast.filter((member) => member.characterId !== character.id);
            }

            return [
                ...currentCast,
                {
                    characterId: character.id,
                    name: character.name,
                    image: character.image,
                    description: character.description,
                    personality: character.personality,
                    role: "main-npc",
                    isCustom: false,
                },
            ];
        });
    };

    const updateCastRole = (characterId: string, role: CastRole) => {
        setCast((currentCast) =>
            currentCast.map((member) => (
                member.characterId === characterId
                    ? { ...member, role }
                    : member
            ))
        );
    };

    const handleAddCustomCharacter = () => {
        if (!customCharForm.name.trim() || !customCharForm.description.trim() || !customCharForm.personality.trim()) {
            return;
        }

        const id = createCustomId("story-cast");
        const customCharacter: CustomCastCharacter = {
            id,
            name: customCharForm.name.trim(),
            description: customCharForm.description.trim(),
            image: customCharForm.image,
            personality: customCharForm.personality.trim(),
        };

        setCreatorCustomCharacters((current) => [...current, customCharacter]);
        setCast((current) => [
            ...current,
            {
                characterId: id,
                name: customCharacter.name,
                image: customCharacter.image,
                description: customCharacter.description,
                personality: customCharacter.personality,
                role: customCharForm.role,
                isCustom: true,
            },
        ]);
        setCustomCharForm(EMPTY_CUSTOM_CHAR_FORM);
    };

    const handleRemoveCastMember = (characterId: string) => {
        setCast((current) => current.filter((member) => member.characterId !== characterId));
        setCreatorCustomCharacters((current) => current.filter((member) => member.id !== characterId));
    };

    const setMainCharacterMode = (mode: MainCharMode) => {
        setMainCharMode(mode);
        setAllowUserCharacterCustomization(mode === "customizable");
    };

    const headerAction = step === 5
        ? {
            label: isSaving ? "Saving..." : initialData?.id ? "Save" : "Create",
            onClick: handleCreate,
            disabled: !canCreate || isSaving,
        }
        : {
            label: "Next ->",
            onClick: handleNext,
            disabled: (step === 1 && !canContinueFromInfo) || (step === 4 && !canContinueFromMainCharacter),
        };
    const canAddCustomCharacter = Boolean(customCharForm.name.trim() && customCharForm.description.trim() && customCharForm.personality.trim());
    const selectedCastCount = cast.length;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 1000,
                background: "#FFFDF5", // Full screen background
                display: "flex",
                alignItems: "center", // Center content on larger screens
                justifyContent: "center",
            }}
        >
            <motion.div
                initial={{ y: "10vh", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "10vh", opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                onClick={(event) => event.stopPropagation()}
                style={{
                    width: "100%",
                    maxWidth: "600px", // Limits max width on desktop
                    height: "100%", // Full height (or 100dvh handled by CSS)
                    background: "#FFFDF5",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        padding: "20px 20px 14px",
                        borderBottom: "1px solid rgba(74,55,40,0.08)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "14px",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                            <button
                                onClick={handleBack}
                                type="button"
                                style={{
                                    width: "38px",
                                    height: "38px",
                                    borderRadius: "50%",
                                    border: "1px solid rgba(74,55,40,0.12)",
                                    background: "#FFFFFF",
                                    color: "#4A3728",
                                    cursor: "pointer",
                                    flexShrink: 0,
                                }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <path d="M15 4L7 12L15 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                            <div style={{ minWidth: 0 }}>
                                <h2 style={{ margin: 0, fontSize: "21px", fontWeight: 800, color: "#4A3728" }}>
                                    {currentStep.title}
                                </h2>
                                <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#8B8680" }}>
                                    {currentStep.subtitle}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={headerAction.onClick}
                            disabled={headerAction.disabled}
                            style={{
                                border: "none",
                                borderRadius: "999px",
                                background: headerAction.disabled ? "rgba(74,55,40,0.2)" : "#4A3728",
                                color: "#FFFFFF",
                                padding: "10px 18px",
                                fontSize: "14px",
                                fontWeight: 700,
                                cursor: headerAction.disabled ? "not-allowed" : "pointer",
                                flexShrink: 0,
                            }}
                        >
                            {headerAction.label}
                        </button>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                        {stepProgress.map((value) => (
                            <div
                                key={value}
                                style={{
                                    height: "8px",
                                    flex: 1,
                                    borderRadius: "999px",
                                    background: value <= step ? "#4A3728" : "rgba(74,55,40,0.12)",
                                    transition: "background 0.2s ease",
                                }}
                            />
                        ))}
                    </div>
                </div>

                <div
                    className="no-scrollbar"
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "22px 20px 28px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "22px",
                    }}
                >
                    {step === 1 && (
                        <>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <label style={{ fontSize: "12px", fontWeight: 700, color: "#8B8680" }}>COVER IMAGE *</label>
                                    <input
                                        ref={coverInputRef}
                                        type="file"
                                        accept="image/*"
                                        style={{ display: "none" }}
                                        onChange={(event) => handleFileChange(event, setCoverImage)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => coverInputRef.current?.click()}
                                        style={{
                                            border: coverImage ? "none" : "2px dashed rgba(74,55,40,0.18)",
                                            borderRadius: "20px",
                                            background: coverImage ? `center / cover no-repeat url(${coverImage})` : "linear-gradient(135deg, #F7F0E4, #EED6BA)",
                                            minHeight: "180px",
                                            cursor: "pointer",
                                            color: "#4A3728",
                                            fontWeight: 700,
                                        }}
                                    >
                                        {!coverImage && "Upload cover"}
                                    </button>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <label style={{ fontSize: "12px", fontWeight: 700, color: "#8B8680" }}>BACKGROUND IMAGE</label>
                                    <input
                                        ref={backgroundInputRef}
                                        type="file"
                                        accept="image/*"
                                        style={{ display: "none" }}
                                        onChange={(event) => handleFileChange(event, setBackgroundImage)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => backgroundInputRef.current?.click()}
                                        style={{
                                            border: backgroundImage ? "none" : "2px dashed rgba(74,55,40,0.18)",
                                            borderRadius: "20px",
                                            background: backgroundImage ? `center / cover no-repeat url(${backgroundImage})` : "linear-gradient(135deg, #F4F4F4, #DFE8F5)",
                                            minHeight: "180px",
                                            cursor: "pointer",
                                            color: "#4A3728",
                                            fontWeight: 700,
                                        }}
                                    >
                                        {!backgroundImage && "Upload background"}
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                <label style={{ fontSize: "12px", fontWeight: 700, color: "#8B8680" }}>STORY TITLE *</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(event) => setTitle(event.target.value)}
                                    placeholder="Give your story a memorable title"
                                    style={{
                                        width: "100%",
                                        padding: "16px 20px",
                                        borderRadius: "20px",
                                        border: "none",
                                        outline: "none",
                                        fontSize: "15px",
                                        color: "#4A3728",
                                        background: "rgba(74,55,40,0.04)",
                                        transition: "background 0.2s ease",
                                    }}
                                />
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                <label style={{ fontSize: "12px", fontWeight: 700, color: "#8B8680" }}>GENRE *</label>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                                    {GENRES.map((item) => (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => setGenre(item)}
                                            style={{
                                                border: "none",
                                                borderRadius: "999px",
                                                padding: "10px 14px",
                                                background: genre === item ? "#4A3728" : "rgba(74,55,40,0.06)",
                                                color: genre === item ? "#FFFFFF" : "#4A3728",
                                                fontSize: "13px",
                                                fontWeight: 600,
                                                cursor: "pointer",
                                            }}
                                        >
                                            {item}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                <label style={{ fontSize: "12px", fontWeight: 700, color: "#8B8680" }}>SYNOPSIS *</label>
                                <textarea
                                    value={synopsis}
                                    onChange={(event) => setSynopsis(event.target.value)}
                                    placeholder="Summarize the premise, hook, and direction of the story"
                                    style={{
                                        width: "100%",
                                        minHeight: "130px",
                                        padding: "16px 20px",
                                        borderRadius: "20px",
                                        border: "none",
                                        outline: "none",
                                        resize: "vertical",
                                        fontSize: "15px",
                                        color: "#4A3728",
                                        background: "rgba(74,55,40,0.04)",
                                        transition: "background 0.2s ease",
                                    }}
                                />
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                <label style={{ fontSize: "12px", fontWeight: 700, color: "#8B8680" }}>STORY TONE</label>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                                    {STORY_TONES.map((item) => (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => setTone(item)}
                                            style={{
                                                border: "none",
                                                borderRadius: "999px",
                                                padding: "10px 14px",
                                                background: tone === item ? "#A86442" : "rgba(168,100,66,0.08)",
                                                color: tone === item ? "#FFFFFF" : "#7A4E35",
                                                fontSize: "13px",
                                                fontWeight: 600,
                                                cursor: "pointer",
                                            }}
                                        >
                                            {item}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                <label style={{ fontSize: "12px", fontWeight: 700, color: "#8B8680" }}>CONTENT RATING *</label>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                                    {CONTENT_RATINGS.map((item) => (
                                        <button
                                            key={item.value}
                                            type="button"
                                            onClick={() => setContentRating(item.value)}
                                            style={{
                                                border: "none",
                                                borderRadius: "999px",
                                                padding: "10px 14px",
                                                background: contentRating === item.value ? "#4A3728" : "rgba(74,55,40,0.06)",
                                                color: contentRating === item.value ? "#FFFFFF" : "#4A3728",
                                                fontSize: "13px",
                                                fontWeight: 600,
                                                cursor: "pointer",
                                            }}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                <label style={{ fontSize: "12px", fontWeight: 700, color: "#8B8680" }}>THEME COLOR</label>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                                    {THEME_SWATCHES.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setThemeColor(color)}
                                            style={{
                                                width: "36px",
                                                height: "36px",
                                                borderRadius: "50%",
                                                border: themeColor === color ? "3px solid #4A3728" : "2px solid rgba(74,55,40,0.12)",
                                                background: color,
                                                cursor: "pointer",
                                            }}
                                        />
                                    ))}
                                    <input
                                        type="color"
                                        value={themeColor}
                                        onChange={(event) => setThemeColor(event.target.value)}
                                        style={{
                                            width: "40px",
                                            height: "40px",
                                            border: "none",
                                            borderRadius: "12px",
                                            background: "transparent",
                                            cursor: "pointer",
                                        }}
                                        title="Custom color"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                <label style={{ fontSize: "12px", fontWeight: 700, color: "#8B8680" }}>TIME PERIOD</label>
                                <input
                                    type="text"
                                    value={worldRules.timePeriod}
                                    onChange={(event) => setWorldRules((current) => ({ ...current, timePeriod: event.target.value }))}
                                    placeholder="Ancient kingdom, modern day, distant future..."
                                    style={{
                                        width: "100%",
                                        padding: "16px 20px",
                                        borderRadius: "20px",
                                        border: "none",
                                        outline: "none",
                                        fontSize: "15px",
                                        color: "#4A3728",
                                        background: "rgba(74,55,40,0.04)",
                                        transition: "background 0.2s ease",
                                    }}
                                />
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                <label style={{ fontSize: "12px", fontWeight: 700, color: "#8B8680" }}>WORLD TYPE</label>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                                    {WORLD_TYPES.map((item) => (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => setWorldRules((current) => ({ ...current, worldType: item }))}
                                            style={{
                                                border: "none",
                                                borderRadius: "999px",
                                                padding: "10px 14px",
                                                background: worldRules.worldType === item ? "#4A3728" : "rgba(74,55,40,0.06)",
                                                color: worldRules.worldType === item ? "#FFFFFF" : "#4A3728",
                                                fontSize: "13px",
                                                fontWeight: 600,
                                                cursor: "pointer",
                                            }}
                                        >
                                            {item}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                <label style={{ fontSize: "12px", fontWeight: 700, color: "#8B8680" }}>SPECIAL RULES</label>
                                <textarea
                                    value={worldRules.specialRules}
                                    onChange={(event) => setWorldRules((current) => ({ ...current, specialRules: event.target.value }))}
                                    placeholder="Magic systems, social rules, taboos, unique mechanics..."
                                    style={{
                                        width: "100%",
                                        minHeight: "140px",
                                        padding: "16px 20px",
                                        borderRadius: "20px",
                                        border: "none",
                                        outline: "none",
                                        resize: "vertical",
                                        fontSize: "15px",
                                        color: "#4A3728",
                                        background: "rgba(74,55,40,0.04)",
                                        transition: "background 0.2s ease",
                                    }}
                                />
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                <label style={{ fontSize: "12px", fontWeight: 700, color: "#8B8680" }}>FORBIDDEN TOPICS</label>
                                <textarea
                                    value={worldRules.forbiddenTopics}
                                    onChange={(event) => setWorldRules((current) => ({ ...current, forbiddenTopics: event.target.value }))}
                                    placeholder="Optional safety rails or topics to keep out of the story"
                                    style={{
                                        width: "100%",
                                        minHeight: "120px",
                                        padding: "16px 20px",
                                        borderRadius: "20px",
                                        border: "none",
                                        outline: "none",
                                        resize: "vertical",
                                        fontSize: "15px",
                                        color: "#4A3728",
                                        background: "rgba(74,55,40,0.04)",
                                        transition: "background 0.2s ease",
                                    }}
                                />
                            </div>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "14px",
                                    padding: "18px",
                                    borderRadius: "26px",
                                    background: "linear-gradient(135deg, rgba(74,55,40,0.08), rgba(230,214,190,0.28))",
                                    border: "1px solid rgba(74,55,40,0.1)",
                                    boxShadow: "0 18px 38px rgba(74,55,40,0.08)",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "flex-start",
                                        justifyContent: "space-between",
                                        gap: "16px",
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 }}>
                                        <div
                                            style={{
                                                fontSize: "11px",
                                                fontWeight: 800,
                                                letterSpacing: "0.08em",
                                                color: "#8B8680",
                                            }}
                                        >
                                            CAST CURATION
                                        </div>
                                        <div style={{ fontSize: "18px", fontWeight: 800, color: "#4A3728", lineHeight: 1.3 }}>
                                            Build a cast with chemistry, tension, and room to grow.
                                        </div>
                                        <div style={{ fontSize: "13px", lineHeight: 1.6, color: "#6E645C", maxWidth: "460px" }}>
                                            Blend Kakoei favorites with custom originals, then decide who drives the plot,
                                            who complicates it, and who keeps the world alive.
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            padding: "10px 14px",
                                            borderRadius: "999px",
                                            background: "#FFFFFF",
                                            border: "1px solid rgba(74,55,40,0.1)",
                                            color: "#4A3728",
                                            fontSize: "13px",
                                            fontWeight: 800,
                                            boxShadow: "0 8px 18px rgba(74,55,40,0.08)",
                                        }}
                                    >
                                        {selectedCastCount} selected
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                                    {["Kakoei picks", "Original creations", "Flexible roles"].map((label) => (
                                        <div
                                            key={label}
                                            style={{
                                                padding: "8px 12px",
                                                borderRadius: "999px",
                                                background: "rgba(255,255,255,0.72)",
                                                border: "1px solid rgba(74,55,40,0.08)",
                                                color: "#6E645C",
                                                fontSize: "12px",
                                                fontWeight: 700,
                                            }}
                                        >
                                            {label}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: "10px",
                                    background: "linear-gradient(180deg, rgba(74,55,40,0.05), rgba(74,55,40,0.02))",
                                    borderRadius: "22px",
                                    padding: "8px",
                                    border: "1px solid rgba(74,55,40,0.08)",
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setCastSourceTab("kakoei")}
                                    style={{
                                        border: "none",
                                        borderRadius: "18px",
                                        padding: "14px 14px 13px",
                                        background: castSourceTab === "kakoei" ? "#4A3728" : "transparent",
                                        color: castSourceTab === "kakoei" ? "#FFFFFF" : "#4A3728",
                                        fontSize: "13px",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "flex-start",
                                        gap: "4px",
                                        textAlign: "left",
                                        boxShadow: castSourceTab === "kakoei" ? "0 12px 26px rgba(74,55,40,0.16)" : "none",
                                    }}
                                >
                                    <span>Kakoei Characters</span>
                                    <span
                                        style={{
                                            fontSize: "11px",
                                            fontWeight: 600,
                                            color: castSourceTab === "kakoei" ? "rgba(255,255,255,0.76)" : "#8B8680",
                                        }}
                                    >
                                        Pick from the existing roster
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCastSourceTab("custom")}
                                    style={{
                                        border: "none",
                                        borderRadius: "18px",
                                        padding: "14px 14px 13px",
                                        background: castSourceTab === "custom" ? "#4A3728" : "transparent",
                                        color: castSourceTab === "custom" ? "#FFFFFF" : "#4A3728",
                                        fontSize: "13px",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "flex-start",
                                        gap: "4px",
                                        textAlign: "left",
                                        boxShadow: castSourceTab === "custom" ? "0 12px 26px rgba(74,55,40,0.16)" : "none",
                                    }}
                                >
                                    <span>Custom Character</span>
                                    <span
                                        style={{
                                            fontSize: "11px",
                                            fontWeight: 600,
                                            color: castSourceTab === "custom" ? "rgba(255,255,255,0.76)" : "#8B8680",
                                        }}
                                    >
                                        Create someone new for this story
                                    </span>
                                </button>
                            </div>

                            {castSourceTab === "kakoei" && (
                                <>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                gap: "12px",
                                                flexWrap: "wrap",
                                            }}
                                        >
                                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                                <div style={{ fontSize: "12px", fontWeight: 800, color: "#8B8680" }}>
                                                    DISCOVER CHARACTERS
                                                </div>
                                                <div style={{ fontSize: "13px", color: "#6E645C", lineHeight: 1.5 }}>
                                                    Tap a card to add it, then decide what role it plays in the story.
                                                </div>
                                            </div>
                                            <div
                                                style={{
                                                    padding: "8px 12px",
                                                    borderRadius: "999px",
                                                    background: "#FFFFFF",
                                                    border: "1px solid rgba(74,55,40,0.08)",
                                                    color: "#6E645C",
                                                    fontSize: "12px",
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {loadingCharacters ? "Loading..." : `${availableCharacters.length} available`}
                                            </div>
                                        </div>

                                        <div style={{ position: "relative" }}>
                                            <div
                                                style={{
                                                    position: "absolute",
                                                    top: "50%",
                                                    left: "18px",
                                                    transform: "translateY(-50%)",
                                                    color: "#A1978E",
                                                    pointerEvents: "none",
                                                }}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                                                    <path d="M20 20L17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                </svg>
                                            </div>
                                            <input
                                                type="text"
                                                value={castSearch}
                                                onChange={(event) => setCastSearch(event.target.value)}
                                                placeholder="Search Kakoei characters..."
                                                style={{
                                                    width: "100%",
                                                    padding: "16px 18px 16px 46px",
                                                    borderRadius: "20px",
                                                    border: "1px solid rgba(74,55,40,0.08)",
                                                    outline: "none",
                                                    fontSize: "15px",
                                                    color: "#4A3728",
                                                    background: "#FFFFFF",
                                                    boxShadow: "0 10px 24px rgba(74,55,40,0.05)",
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                        {loadingCharacters && (
                                            <div
                                                style={{
                                                    padding: "22px",
                                                    borderRadius: "22px",
                                                    background: "rgba(74,55,40,0.04)",
                                                    color: "#8B8680",
                                                    textAlign: "center",
                                                    fontSize: "14px",
                                                    border: "1px solid rgba(74,55,40,0.06)",
                                                }}
                                            >
                                                Loading characters...
                                            </div>
                                        )}

                                        {!loadingCharacters && availableCharacters.length === 0 && (
                                            <div
                                                style={{
                                                    padding: "22px",
                                                    borderRadius: "22px",
                                                    background: "rgba(74,55,40,0.04)",
                                                    color: "#8B8680",
                                                    textAlign: "center",
                                                    fontSize: "14px",
                                                    border: "1px solid rgba(74,55,40,0.06)",
                                                }}
                                            >
                                                No characters matched your search.
                                            </div>
                                        )}

                                        {availableCharacters.map((character) => {
                                            const selectedMember = cast.find((member) => member.characterId === character.id);
                                            const isSelected = Boolean(selectedMember);
                                            const currentRole = selectedMember?.role || "main-npc";
                                            const roleStyle = ROLE_STYLES[currentRole];
                                            const personalityPreview = summarizePersonality(character.personality);

                                            return (
                                                <div
                                                    key={character.id}
                                                    onClick={() => toggleKakoeiCharacter(character)}
                                                    style={{
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        gap: "12px",
                                                        padding: "14px",
                                                        borderRadius: "24px",
                                                        background: isSelected
                                                            ? "linear-gradient(180deg, rgba(74,55,40,0.09), rgba(255,255,255,0.95))"
                                                            : "#FFFFFF",
                                                        border: isSelected
                                                            ? "1px solid rgba(74,55,40,0.16)"
                                                            : "1px solid rgba(74,55,40,0.08)",
                                                        boxShadow: isSelected
                                                            ? "0 14px 32px rgba(74,55,40,0.1)"
                                                            : "0 8px 22px rgba(74,55,40,0.05)",
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                                                        <div style={{ position: "relative", flexShrink: 0 }}>
                                                            <img
                                                                src={character.image}
                                                                alt={character.name}
                                                                style={{
                                                                    width: "64px",
                                                                    height: "64px",
                                                                    borderRadius: "20px",
                                                                    objectFit: "cover",
                                                                    display: "block",
                                                                }}
                                                            />
                                                            <div
                                                                style={{
                                                                    position: "absolute",
                                                                    right: "-4px",
                                                                    bottom: "-4px",
                                                                    width: "26px",
                                                                    height: "26px",
                                                                    borderRadius: "50%",
                                                                    background: isSelected ? "#4A3728" : "#FFF8EE",
                                                                    border: isSelected
                                                                        ? "2px solid #FFFDF5"
                                                                        : "1px solid rgba(74,55,40,0.12)",
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    boxShadow: "0 6px 14px rgba(74,55,40,0.12)",
                                                                }}
                                                            >
                                                                {isSelected ? (
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                                                        <path
                                                                            d="M20 6L9 17L4 12"
                                                                            stroke="#FFFFFF"
                                                                            strokeWidth="3"
                                                                            strokeLinecap="round"
                                                                            strokeLinejoin="round"
                                                                        />
                                                                    </svg>
                                                                ) : (
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                                                        <path
                                                                            d="M12 5V19"
                                                                            stroke="#4A3728"
                                                                            strokeWidth="2.4"
                                                                            strokeLinecap="round"
                                                                        />
                                                                        <path
                                                                            d="M5 12H19"
                                                                            stroke="#4A3728"
                                                                            strokeWidth="2.4"
                                                                            strokeLinecap="round"
                                                                        />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div
                                                                style={{
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    gap: "8px",
                                                                    flexWrap: "wrap",
                                                                }}
                                                            >
                                                                <div style={{ fontSize: "16px", fontWeight: 800, color: "#4A3728" }}>
                                                                    {character.name}
                                                                </div>
                                                                <span
                                                                    style={{
                                                                        padding: "5px 9px",
                                                                        borderRadius: "999px",
                                                                        background: isSelected ? roleStyle.background : "rgba(74,55,40,0.06)",
                                                                        border: isSelected ? roleStyle.border : "1px solid rgba(74,55,40,0.08)",
                                                                        color: isSelected ? roleStyle.color : "#6E645C",
                                                                        fontSize: "11px",
                                                                        fontWeight: 800,
                                                                    }}
                                                                >
                                                                    {isSelected ? getRoleLabel(currentRole) : character.tag || "Kakoei"}
                                                                </span>
                                                            </div>
                                                            <div
                                                                style={{
                                                                    marginTop: "6px",
                                                                    fontSize: "12px",
                                                                    color: "#8B8680",
                                                                }}
                                                            >
                                                                {personalityPreview || "Character profile available"}
                                                            </div>
                                                            <div
                                                                style={{
                                                                    marginTop: "9px",
                                                                    fontSize: "13px",
                                                                    color: "#6E645C",
                                                                    lineHeight: 1.55,
                                                                    maxHeight: "3.2em",
                                                                    overflow: "hidden",
                                                                }}
                                                            >
                                                                {character.description}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            flexDirection: "column",
                                                            gap: "12px",
                                                            paddingTop: "12px",
                                                            borderTop: "1px solid rgba(74,55,40,0.08)",
                                                        }}
                                                    >
                                                        <div style={{ fontSize: "12px", color: "#8B8680", fontWeight: 600 }}>
                                                            {isSelected ? "Choose how they influence the story." : "Add first, then assign a role."}
                                                        </div>
                                                        {isSelected ? (
                                                            <RoleSelector
                                                                value={currentRole}
                                                                onChange={(role) => updateCastRole(character.id, role)}
                                                                compact
                                                                stopPropagation
                                                            />
                                                        ) : (
                                                            <div
                                                                style={{
                                                                    padding: "11px 12px",
                                                                    borderRadius: "16px",
                                                                    background: "rgba(74,55,40,0.04)",
                                                                    border: "1px dashed rgba(74,55,40,0.12)",
                                                                    color: "#8B8680",
                                                                    fontSize: "12px",
                                                                    fontWeight: 700,
                                                                }}
                                                            >
                                                                Role options unlock after the character is added.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}

                            {castSourceTab === "custom" && (
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "18px",
                                        padding: "20px",
                                        borderRadius: "28px",
                                        background: "linear-gradient(180deg, rgba(74,55,40,0.06), rgba(255,255,255,0.92))",
                                        border: "1px solid rgba(74,55,40,0.08)",
                                        boxShadow: "0 14px 34px rgba(74,55,40,0.07)",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "flex-start",
                                            justifyContent: "space-between",
                                            gap: "12px",
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 }}>
                                            <div style={{ fontSize: "12px", fontWeight: 800, color: "#8B8680" }}>
                                                CHARACTER COMPOSER
                                            </div>
                                            <div style={{ fontSize: "18px", fontWeight: 800, color: "#4A3728", lineHeight: 1.3 }}>
                                                Design someone the story can orbit around.
                                            </div>
                                            <div style={{ fontSize: "13px", color: "#6E645C", lineHeight: 1.6, maxWidth: "430px" }}>
                                                Give them a portrait, a role, and enough personality for the plot to react to.
                                            </div>
                                        </div>
                                        <div
                                            style={{
                                                ...ROLE_STYLES[customCharForm.role],
                                                padding: "8px 12px",
                                                borderRadius: "999px",
                                                fontSize: "12px",
                                                fontWeight: 800,
                                            }}
                                        >
                                            {getRoleLabel(customCharForm.role)}
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns: "110px minmax(0, 1fr)",
                                            gap: "16px",
                                            alignItems: "start",
                                        }}
                                    >
                                        <input
                                            ref={customCharImageInputRef}
                                            type="file"
                                            accept="image/*"
                                            style={{ display: "none" }}
                                            onChange={(event) =>
                                                handleFileChange(event, (value) =>
                                                    setCustomCharForm((current) => ({ ...current, image: value }))
                                                )
                                            }
                                        />
                                        <button
                                            type="button"
                                            onClick={() => customCharImageInputRef.current?.click()}
                                            style={{
                                                width: "110px",
                                                height: "146px",
                                                borderRadius: "22px",
                                                border: customCharForm.image ? "none" : "2px dashed rgba(74,55,40,0.18)",
                                                background: customCharForm.image
                                                    ? `center / cover no-repeat url(${customCharForm.image})`
                                                    : "linear-gradient(145deg, #F7F0E4, #E7C9A3)",
                                                color: "#4A3728",
                                                cursor: "pointer",
                                                position: "relative",
                                                overflow: "hidden",
                                                boxShadow: "0 12px 24px rgba(74,55,40,0.08)",
                                            }}
                                        >
                                            {customCharForm.image ? (
                                                <div
                                                    style={{
                                                        position: "absolute",
                                                        left: "10px",
                                                        right: "10px",
                                                        bottom: "10px",
                                                        padding: "8px 10px",
                                                        borderRadius: "14px",
                                                        background: "rgba(20,16,12,0.56)",
                                                        color: "#FFFFFF",
                                                        fontSize: "11px",
                                                        fontWeight: 800,
                                                        textAlign: "center",
                                                    }}
                                                >
                                                    Change portrait
                                                </div>
                                            ) : (
                                                <div
                                                    style={{
                                                        height: "100%",
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        gap: "8px",
                                                        padding: "12px",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            width: "34px",
                                                            height: "34px",
                                                            borderRadius: "50%",
                                                            background: "rgba(255,255,255,0.65)",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            fontSize: "22px",
                                                            fontWeight: 400,
                                                            lineHeight: 1,
                                                        }}
                                                    >
                                                        +
                                                    </div>
                                                    <div style={{ fontSize: "12px", fontWeight: 800 }}>Upload portrait</div>
                                                    <div style={{ fontSize: "11px", color: "#6E645C", lineHeight: 1.4 }}>
                                                        PNG, JPG, or anything that fits their energy.
                                                    </div>
                                                </div>
                                            )}
                                        </button>

                                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                            <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                                <span style={{ fontSize: "11px", fontWeight: 800, color: "#8B8680" }}>NAME</span>
                                                <input
                                                    type="text"
                                                    value={customCharForm.name}
                                                    onChange={(event) =>
                                                        setCustomCharForm((current) => ({ ...current, name: event.target.value }))
                                                    }
                                                    placeholder="Character name"
                                                    style={{
                                                        width: "100%",
                                                        padding: "15px 18px",
                                                        borderRadius: "18px",
                                                        border: "1px solid rgba(74,55,40,0.08)",
                                                        outline: "none",
                                                        fontSize: "14px",
                                                        color: "#4A3728",
                                                        background: "#FFFFFF",
                                                    }}
                                                />
                                            </label>
                                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                                <span style={{ fontSize: "11px", fontWeight: 800, color: "#8B8680" }}>STORY ROLE</span>
                                                <RoleSelector
                                                    value={customCharForm.role}
                                                    onChange={(role) => setCustomCharForm((current) => ({ ...current, role }))}
                                                />
                                            </div>
                                            <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                                <span style={{ fontSize: "11px", fontWeight: 800, color: "#8B8680" }}>PERSONALITY NOTES</span>
                                                <input
                                                    type="text"
                                                    value={customCharForm.personality}
                                                    onChange={(event) =>
                                                        setCustomCharForm((current) => ({ ...current, personality: event.target.value }))
                                                    }
                                                    placeholder="Calm strategist, reckless charmer..."
                                                    style={{
                                                        width: "100%",
                                                        padding: "15px 18px",
                                                        borderRadius: "18px",
                                                        border: "1px solid rgba(74,55,40,0.08)",
                                                        outline: "none",
                                                        fontSize: "14px",
                                                        color: "#4A3728",
                                                        background: "#FFFFFF",
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    </div>

                                    <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                        <span style={{ fontSize: "11px", fontWeight: 800, color: "#8B8680" }}>DESCRIPTION</span>
                                        <textarea
                                            value={customCharForm.description}
                                            onChange={(event) =>
                                                setCustomCharForm((current) => ({ ...current, description: event.target.value }))
                                            }
                                            placeholder="Description, role in the story, and the energy they bring"
                                            style={{
                                                width: "100%",
                                                minHeight: "130px",
                                                padding: "16px 18px",
                                                borderRadius: "20px",
                                                border: "1px solid rgba(74,55,40,0.08)",
                                                outline: "none",
                                                resize: "vertical",
                                                fontSize: "15px",
                                                color: "#4A3728",
                                                background: "#FFFFFF",
                                            }}
                                        />
                                    </label>

                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: "12px",
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        <div style={{ fontSize: "12px", color: "#8B8680", fontWeight: 600 }}>
                                            {canAddCustomCharacter
                                                ? "Ready to join the cast."
                                                : "Name, personality, and description are required."}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleAddCustomCharacter}
                                            disabled={!canAddCustomCharacter}
                                            style={{
                                                border: "none",
                                                borderRadius: "18px",
                                                background: canAddCustomCharacter ? "#4A3728" : "rgba(74,55,40,0.18)",
                                                color: "#FFFFFF",
                                                padding: "14px 18px",
                                                fontSize: "14px",
                                                fontWeight: 800,
                                                cursor: canAddCustomCharacter ? "pointer" : "not-allowed",
                                                boxShadow: canAddCustomCharacter ? "0 14px 28px rgba(74,55,40,0.16)" : "none",
                                            }}
                                        >
                                            {canAddCustomCharacter ? "Add to Cast" : "Complete Character"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: "12px",
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                        <div style={{ fontSize: "12px", fontWeight: 800, color: "#8B8680" }}>
                                            SELECTED CAST {selectedCastCount > 0 ? `(${selectedCastCount})` : ""}
                                        </div>
                                        <div style={{ fontSize: "13px", color: "#6E645C", lineHeight: 1.5 }}>
                                            {selectedCastCount === 0
                                                ? "Start picking characters to give the story its social gravity."
                                                : "Refine each character's role before you continue."}
                                        </div>
                                    </div>
                                    {selectedCastCount > 0 && (
                                        <div
                                            style={{
                                                padding: "8px 12px",
                                                borderRadius: "999px",
                                                background: "#FFFFFF",
                                                border: "1px solid rgba(74,55,40,0.08)",
                                                color: "#4A3728",
                                                fontSize: "12px",
                                                fontWeight: 800,
                                            }}
                                        >
                                            {selectedCastCount} ready
                                        </div>
                                    )}
                                </div>
                                {selectedCastCount === 0 ? (
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "14px",
                                            padding: "18px",
                                            borderRadius: "24px",
                                            background: "linear-gradient(180deg, rgba(74,55,40,0.04), rgba(255,255,255,0.96))",
                                            border: "1px solid rgba(74,55,40,0.08)",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: "48px",
                                                height: "48px",
                                                borderRadius: "18px",
                                                background: "rgba(74,55,40,0.08)",
                                                color: "#4A3728",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0,
                                            }}
                                        >
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                                <path
                                                    d="M9 11C10.6569 11 12 9.65685 12 8C12 6.34315 10.6569 5 9 5C7.34315 5 6 6.34315 6 8C6 9.65685 7.34315 11 9 11Z"
                                                    stroke="currentColor"
                                                    strokeWidth="1.8"
                                                />
                                                <path
                                                    d="M15 13C16.1046 13 17 12.1046 17 11C17 9.89543 16.1046 9 15 9C13.8954 9 13 9.89543 13 11C13 12.1046 13.8954 13 15 13Z"
                                                    stroke="currentColor"
                                                    strokeWidth="1.8"
                                                />
                                                <path
                                                    d="M3 18C3 15.7909 5.23858 14 8 14H10C12.7614 14 15 15.7909 15 18"
                                                    stroke="currentColor"
                                                    strokeWidth="1.8"
                                                    strokeLinecap="round"
                                                />
                                                <path
                                                    d="M13 18C13.1475 16.9987 14.2143 16 15.5 16H16.5C17.8807 16 19 17.1193 19 18.5"
                                                    stroke="currentColor"
                                                    strokeWidth="1.8"
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                        </div>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                                            <div style={{ fontSize: "15px", fontWeight: 800, color: "#4A3728" }}>
                                                Your cast board is empty
                                            </div>
                                            <div style={{ fontSize: "13px", color: "#8B8680", lineHeight: 1.6 }}>
                                                Add Kakoei characters or create custom ones to build a mix of allies,
                                                mentors, rivals, and scene-stealers.
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                                            gap: "12px",
                                        }}
                                    >
                                        {cast.map((member) => {
                                            const roleStyle = ROLE_STYLES[member.role];
                                            const personalityPreview = summarizePersonality(member.personality);

                                            return (
                                                <div
                                                    key={member.characterId}
                                                    style={{
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        gap: "14px",
                                                        padding: "14px",
                                                        borderRadius: "24px",
                                                        background: "#FFFFFF",
                                                        border: "1px solid rgba(74,55,40,0.08)",
                                                        boxShadow: "0 12px 28px rgba(74,55,40,0.06)",
                                                    }}
                                                >
                                                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                                                        {member.image ? (
                                                            <img
                                                                src={member.image}
                                                                alt={member.name}
                                                                style={{
                                                                    width: "56px",
                                                                    height: "56px",
                                                                    borderRadius: "18px",
                                                                    objectFit: "cover",
                                                                    flexShrink: 0,
                                                                }}
                                                            />
                                                        ) : (
                                                            <div
                                                                style={{
                                                                    width: "56px",
                                                                    height: "56px",
                                                                    borderRadius: "18px",
                                                                    background: "linear-gradient(145deg, #F4E6D2, #DFC19A)",
                                                                    color: "#4A3728",
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    fontSize: "18px",
                                                                    fontWeight: 800,
                                                                    flexShrink: 0,
                                                                }}
                                                            >
                                                                {getInitials(member.name)}
                                                            </div>
                                                        )}

                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: "15px", fontWeight: 800, color: "#4A3728" }}>
                                                                {member.name}
                                                            </div>
                                                            <div
                                                                style={{
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    gap: "8px",
                                                                    flexWrap: "wrap",
                                                                    marginTop: "8px",
                                                                }}
                                                            >
                                                                <span
                                                                    style={{
                                                                        padding: "5px 9px",
                                                                        borderRadius: "999px",
                                                                        background: "rgba(74,55,40,0.05)",
                                                                        border: "1px solid rgba(74,55,40,0.08)",
                                                                        color: "#6E645C",
                                                                        fontSize: "11px",
                                                                        fontWeight: 800,
                                                                    }}
                                                                >
                                                                    {member.isCustom ? "Original creation" : "From Kakoei"}
                                                                </span>
                                                                <span
                                                                    style={{
                                                                        ...roleStyle,
                                                                        padding: "5px 9px",
                                                                        borderRadius: "999px",
                                                                        fontSize: "11px",
                                                                        fontWeight: 800,
                                                                    }}
                                                                >
                                                                    {getRoleLabel(member.role)}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveCastMember(member.characterId)}
                                                            style={{
                                                                width: "32px",
                                                                height: "32px",
                                                                borderRadius: "50%",
                                                                border: "none",
                                                                background: "rgba(74,55,40,0.06)",
                                                                color: "#8B8680",
                                                                cursor: "pointer",
                                                                flexShrink: 0,
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                            }}
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                                <path
                                                                    d="M6 6L18 18"
                                                                    stroke="currentColor"
                                                                    strokeWidth="2.4"
                                                                    strokeLinecap="round"
                                                                />
                                                                <path
                                                                    d="M18 6L6 18"
                                                                    stroke="currentColor"
                                                                    strokeWidth="2.4"
                                                                    strokeLinecap="round"
                                                                />
                                                            </svg>
                                                        </button>
                                                    </div>

                                                    <div
                                                        style={{
                                                            fontSize: "13px",
                                                            color: "#6E645C",
                                                            lineHeight: 1.6,
                                                            maxHeight: "4.8em",
                                                            overflow: "hidden",
                                                        }}
                                                    >
                                                        {member.description}
                                                    </div>

                                                    <div
                                                        style={{
                                                            fontSize: "12px",
                                                            color: "#8B8680",
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {personalityPreview || "No personality notes yet."}
                                                    </div>

                                                    <RoleSelector
                                                        value={member.role}
                                                        onChange={(role) => updateCastRole(member.characterId, role)}
                                                        compact
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {step === 4 && (
                        <>
                            <button
                                type="button"
                                onClick={() => setMainCharacterMode("fixed")}
                                style={{
                                    width: "100%",
                                    textAlign: "left",
                                    padding: "18px",
                                    borderRadius: "22px",
                                    border: mainCharMode === "fixed" ? "2px solid #4A3728" : "1px solid rgba(74,55,40,0.1)",
                                    background: mainCharMode === "fixed" ? "rgba(74,55,40,0.06)" : "#FFFFFF",
                                    cursor: "pointer",
                                }}
                            >
                                <div style={{ fontSize: "16px", fontWeight: 800, color: "#4A3728" }}>
                                    Fixed Character
                                </div>
                                <div style={{ fontSize: "13px", color: "#8B8680", marginTop: "6px" }}>
                                    Define the player character yourself and lock it into the story setup.
                                </div>
                            </button>

                            {mainCharMode === "fixed" && (
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "14px",
                                        padding: "16px",
                                        borderRadius: "22px",
                                        background: "rgba(74,55,40,0.04)",
                                        border: "1px solid rgba(74,55,40,0.08)",
                                    }}
                                >
                                    <input
                                        type="text"
                                        value={fixedCharName}
                                        onChange={(event) => setFixedCharName(event.target.value)}
                                        placeholder="Main character name"
                                        style={{
                                            width: "100%",
                                            padding: "16px 20px",
                                            borderRadius: "20px",
                                            border: "none",
                                            outline: "none",
                                            fontSize: "15px",
                                            color: "#4A3728",
                                            background: "rgba(74,55,40,0.04)",
                                        }}
                                    />
                                    <textarea
                                        value={fixedCharDescription}
                                        onChange={(event) => setFixedCharDescription(event.target.value)}
                                        placeholder="Describe the player character's background, appearance, and capabilities"
                                        style={{
                                            width: "100%",
                                            minHeight: "140px",
                                            padding: "16px 20px",
                                            borderRadius: "20px",
                                            border: "none",
                                            outline: "none",
                                            resize: "vertical",
                                            fontSize: "15px",
                                            color: "#4A3728",
                                            background: "rgba(74,55,40,0.04)",
                                        }}
                                    />
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => setMainCharacterMode("customizable")}
                                style={{
                                    width: "100%",
                                    textAlign: "left",
                                    padding: "18px",
                                    borderRadius: "22px",
                                    border: mainCharMode === "customizable" ? "2px solid #4A3728" : "1px solid rgba(74,55,40,0.1)",
                                    background: mainCharMode === "customizable" ? "rgba(74,55,40,0.06)" : "#FFFFFF",
                                    cursor: "pointer",
                                }}
                            >
                                <div style={{ fontSize: "16px", fontWeight: 800, color: "#4A3728" }}>
                                    Allow User Customization
                                </div>
                                <div style={{ fontSize: "13px", color: "#8B8680", marginTop: "6px" }}>
                                    Let readers pick or create their own player character before the story begins.
                                </div>
                            </button>
                        </>
                    )}

                    {step === 5 && (
                        <>
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                <div style={{ fontSize: "12px", fontWeight: 700, color: "#8B8680" }}>VISIBILITY</div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                    {(["public", "private"] as Visibility[]).map((value) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setVisibility(value)}
                                            style={{
                                                border: "none",
                                                borderRadius: "18px",
                                                padding: "14px",
                                                background: visibility === value ? "#4A3728" : "rgba(74,55,40,0.06)",
                                                color: visibility === value ? "#FFFFFF" : "#4A3728",
                                                fontSize: "14px",
                                                fontWeight: 700,
                                                cursor: "pointer",
                                                textTransform: "capitalize",
                                            }}
                                        >
                                            {value}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "16px 18px",
                                    borderRadius: "20px",
                                    background: "rgba(74,55,40,0.04)",
                                    border: "1px solid rgba(74,55,40,0.08)",
                                }}
                            >
                                <div>
                                    <div style={{ fontSize: "15px", fontWeight: 700, color: "#4A3728" }}>
                                        Allow Character Customization
                                    </div>
                                    <div style={{ fontSize: "13px", color: "#8B8680", marginTop: "4px" }}>
                                        Readers can pick or create their own protagonist before the first scene.
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const nextValue = !allowUserCharacterCustomization;
                                        setAllowUserCharacterCustomization(nextValue);
                                        setMainCharMode(nextValue ? "customizable" : "fixed");
                                    }}
                                    style={{
                                        width: "48px",
                                        height: "28px",
                                        borderRadius: "999px",
                                        border: "none",
                                        background: allowUserCharacterCustomization ? "#4A3728" : "rgba(74,55,40,0.16)",
                                        position: "relative",
                                        cursor: "pointer",
                                        flexShrink: 0,
                                    }}
                                >
                                    <span
                                        style={{
                                            position: "absolute",
                                            top: "4px",
                                            left: allowUserCharacterCustomization ? "24px" : "4px",
                                            width: "20px",
                                            height: "20px",
                                            borderRadius: "50%",
                                            background: "#FFFFFF",
                                            transition: "left 0.2s ease",
                                        }}
                                    />
                                </button>
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "12px",
                                    padding: "18px",
                                    borderRadius: "24px",
                                    background: "#4A3728",
                                    color: "#FFF7EB",
                                }}
                            >
                                <div style={{ fontSize: "12px", fontWeight: 700, opacity: 0.7, letterSpacing: "0.12em" }}>
                                    STORY SUMMARY
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "96px 1fr", gap: "14px", alignItems: "start" }}>
                                    <div
                                        style={{
                                            width: "96px",
                                            height: "132px",
                                            borderRadius: "18px",
                                            background: coverImage
                                                ? `center / cover no-repeat url(${coverImage})`
                                                : "linear-gradient(135deg, #EED6BA, #C7A17A)",
                                        }}
                                    />
                                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                        <div>
                                            <div style={{ fontSize: "20px", fontWeight: 800 }}>{title || "Untitled Story"}</div>
                                            <div style={{ fontSize: "13px", opacity: 0.78, marginTop: "4px" }}>
                                                {`${genre || "No genre selected"} | ${visibility === "public" ? "Public" : "Private"}`}
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                            {tone && (
                                                <span style={{ padding: "6px 10px", borderRadius: "999px", background: "rgba(255,247,235,0.14)", fontSize: "12px" }}>
                                                    Tone: {tone}
                                                </span>
                                            )}
                                            {contentRating && (
                                                <span style={{ padding: "6px 10px", borderRadius: "999px", background: "rgba(255,247,235,0.14)", fontSize: "12px" }}>
                                                    Rating: {CONTENT_RATINGS.find((item) => item.value === contentRating)?.label}
                                                </span>
                                            )}
                                            <span style={{ padding: "6px 10px", borderRadius: "999px", background: "rgba(255,247,235,0.14)", fontSize: "12px" }}>
                                                Cast: {cast.length}
                                            </span>
                                            <span style={{ padding: "6px 10px", borderRadius: "999px", background: "rgba(255,247,235,0.14)", fontSize: "12px" }}>
                                                Main Character: {allowUserCharacterCustomization ? "Customizable" : "Fixed"}
                                            </span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.6, opacity: 0.82 }}>
                                            {synopsis || "Add a synopsis on the first step to preview it here."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
