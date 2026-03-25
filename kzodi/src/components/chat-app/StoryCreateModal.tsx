"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useChatStore, type CastMember, type CustomCastCharacter, type StoryData } from "@/lib/chatStore";
import type { Character } from "@/data/characters";

interface StoryCreateModalProps {
    onClose: () => void;
    onCreated: (storyId: string) => void;
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

const ROLE_OPTIONS: Array<{ value: CastRole; label: string }> = [
    { value: "main-npc", label: "Main NPC" },
    { value: "supporting", label: "Supporting NPC" },
    { value: "antagonist", label: "Antagonist" },
    { value: "mentor", label: "Mentor" },
    { value: "love-interest", label: "Love Interest" },
    { value: "ally", label: "Ally" },
];

const THEME_SWATCHES = ["#E8E1D5", "#E69A8D", "#8DA8E6", "#8DE6A8", "#E6D88D", "#C7A17A"];

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

export default function StoryCreateModal({ onClose, onCreated }: StoryCreateModalProps) {
    const [step, setStep] = useState<StoryStep>(1);

    const [title, setTitle] = useState("");
    const [genre, setGenre] = useState("");
    const [synopsis, setSynopsis] = useState("");
    const [tone, setTone] = useState("");
    const [contentRating, setContentRating] = useState<ContentRating | "">("");
    const [coverImage, setCoverImage] = useState("");
    const [backgroundImage, setBackgroundImage] = useState("");
    const [themeColor, setThemeColor] = useState("#E8E1D5");

    const [worldRules, setWorldRules] = useState({
        timePeriod: "",
        worldType: "",
        specialRules: "",
        forbiddenTopics: "",
    });

    const [cast, setCast] = useState<CastMember[]>([]);
    const [castSourceTab, setCastSourceTab] = useState<CastSourceTab>("kakoei");
    const [castSearch, setCastSearch] = useState("");
    const [customCharForm, setCustomCharForm] = useState<CustomCharacterFormState>({
        name: "",
        description: "",
        image: "",
        personality: "",
        role: "supporting",
    });
    const [creatorCustomCharacters, setCreatorCustomCharacters] = useState<CustomCastCharacter[]>([]);
    const [availableCharacters, setAvailableCharacters] = useState<Character[]>([]);
    const [loadingCharacters, setLoadingCharacters] = useState(false);

    const [mainCharMode, setMainCharMode] = useState<MainCharMode>("fixed");
    const [fixedCharName, setFixedCharName] = useState("");
    const [fixedCharDescription, setFixedCharDescription] = useState("");

    const [visibility, setVisibility] = useState<Visibility>("public");
    const [allowUserCharacterCustomization, setAllowUserCharacterCustomization] = useState(false);

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

    const handleCreate = () => {
        if (!canCreate) {
            return;
        }

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

        const storyId = useChatStore.getState().createStory(title.trim(), coverImage, storyData);
        onCreated(storyId);
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
        setCustomCharForm({
            name: "",
            description: "",
            image: "",
            personality: "",
            role: "supporting",
        });
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
        ? { label: "Create", onClick: handleCreate, disabled: !canCreate }
        : {
            label: "Next ->",
            onClick: handleNext,
            disabled: (step === 1 && !canContinueFromInfo) || (step === 4 && !canContinueFromMainCharacter),
        };

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
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: "10px",
                                    background: "rgba(74,55,40,0.05)",
                                    borderRadius: "18px",
                                    padding: "6px",
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setCastSourceTab("kakoei")}
                                    style={{
                                        border: "none",
                                        borderRadius: "14px",
                                        padding: "12px 10px",
                                        background: castSourceTab === "kakoei" ? "#4A3728" : "transparent",
                                        color: castSourceTab === "kakoei" ? "#FFFFFF" : "#4A3728",
                                        fontSize: "13px",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                    }}
                                >
                                    Kakoei Characters
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCastSourceTab("custom")}
                                    style={{
                                        border: "none",
                                        borderRadius: "14px",
                                        padding: "12px 10px",
                                        background: castSourceTab === "custom" ? "#4A3728" : "transparent",
                                        color: castSourceTab === "custom" ? "#FFFFFF" : "#4A3728",
                                        fontSize: "13px",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                    }}
                                >
                                    Custom Character
                                </button>
                            </div>

                            {castSourceTab === "kakoei" && (
                                <>
                                    <input
                                        type="text"
                                        value={castSearch}
                                        onChange={(event) => setCastSearch(event.target.value)}
                                        placeholder="Search Kakoei characters..."
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

                                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                        {loadingCharacters && (
                                            <div
                                                style={{
                                                    padding: "18px",
                                                    borderRadius: "18px",
                                                    background: "rgba(74,55,40,0.04)",
                                                    color: "#8B8680",
                                                    textAlign: "center",
                                                    fontSize: "14px",
                                                }}
                                            >
                                                Loading characters...
                                            </div>
                                        )}

                                        {!loadingCharacters && availableCharacters.length === 0 && (
                                            <div
                                                style={{
                                                    padding: "18px",
                                                    borderRadius: "18px",
                                                    background: "rgba(74,55,40,0.04)",
                                                    color: "#8B8680",
                                                    textAlign: "center",
                                                    fontSize: "14px",
                                                }}
                                            >
                                                No characters matched your search.
                                            </div>
                                        )}

                                        {availableCharacters.map((character) => {
                                            const selectedMember = cast.find((member) => member.characterId === character.id);
                                            const isSelected = Boolean(selectedMember);

                                            return (
                                                <div
                                                    key={character.id}
                                                    onClick={() => toggleKakoeiCharacter(character)}
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "12px",
                                                        padding: "12px",
                                                        borderRadius: "18px",
                                                        background: isSelected ? "rgba(74,55,40,0.08)" : "#FFFFFF",
                                                        border: isSelected ? "1px solid rgba(74,55,40,0.18)" : "1px solid rgba(74,55,40,0.08)",
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    <img
                                                        src={character.image}
                                                        alt={character.name}
                                                        style={{
                                                            width: "48px",
                                                            height: "48px",
                                                            borderRadius: "50%",
                                                            objectFit: "cover",
                                                            flexShrink: 0,
                                                        }}
                                                    />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: "15px", fontWeight: 700, color: "#4A3728" }}>
                                                            {character.name}
                                                        </div>
                                                        <div
                                                            style={{
                                                                fontSize: "12px",
                                                                color: "#8B8680",
                                                                whiteSpace: "nowrap",
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis",
                                                            }}
                                                        >
                                                            {`${character.tag} | ${character.personality.split(",")[0]?.trim() || "Character"}`}
                                                        </div>
                                                    </div>
                                                    <select
                                                        value={selectedMember?.role || "main-npc"}
                                                        onChange={(event) => updateCastRole(character.id, event.target.value as CastRole)}
                                                        onClick={(event) => event.stopPropagation()}
                                                        disabled={!isSelected}
                                                        style={{
                                                            borderRadius: "12px",
                                                            border: "1px solid rgba(74,55,40,0.12)",
                                                            padding: "8px 10px",
                                                            background: isSelected ? "#FFF8EE" : "#F7F4EE",
                                                            color: "#4A3728",
                                                            fontSize: "12px",
                                                            fontWeight: 600,
                                                            cursor: isSelected ? "pointer" : "not-allowed",
                                                        }}
                                                    >
                                                        {ROLE_OPTIONS.map((option) => (
                                                            <option key={option.value} value={option.value}>
                                                                {option.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div
                                                        style={{
                                                            width: "24px",
                                                            height: "24px",
                                                            borderRadius: "50%",
                                                            background: isSelected ? "#4A3728" : "transparent",
                                                            border: isSelected ? "none" : "2px solid rgba(74,55,40,0.18)",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        {isSelected && (
                                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                                                                <path d="M20 6L9 17L4 12" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
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
                                        gap: "14px",
                                        padding: "16px",
                                        borderRadius: "22px",
                                        background: "rgba(74,55,40,0.04)",
                                        border: "1px solid rgba(74,55,40,0.08)",
                                    }}
                                >
                                    <div style={{ display: "grid", gridTemplateColumns: "96px 1fr", gap: "14px" }}>
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
                                                width: "96px",
                                                height: "120px",
                                                borderRadius: "18px",
                                                border: customCharForm.image ? "none" : "2px dashed rgba(74,55,40,0.18)",
                                                background: customCharForm.image
                                                    ? `center / cover no-repeat url(${customCharForm.image})`
                                                    : "linear-gradient(135deg, #F7F0E4, #EED6BA)",
                                                color: "#4A3728",
                                                fontSize: "12px",
                                                fontWeight: 700,
                                                cursor: "pointer",
                                            }}
                                        >
                                            {!customCharForm.image && "Upload image"}
                                        </button>

                                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                            <input
                                                type="text"
                                                value={customCharForm.name}
                                                onChange={(event) =>
                                                    setCustomCharForm((current) => ({ ...current, name: event.target.value }))
                                                }
                                                placeholder="Character name"
                                                style={{
                                                    width: "100%",
                                                    padding: "16px 20px",
                                                    borderRadius: "18px",
                                                    border: "none",
                                                    outline: "none",
                                                    fontSize: "14px",
                                                    color: "#4A3728",
                                                    background: "rgba(74,55,40,0.04)",
                                                }}
                                            />
                                            <select
                                                value={customCharForm.role}
                                                onChange={(event) =>
                                                    setCustomCharForm((current) => ({ ...current, role: event.target.value as CastRole }))
                                                }
                                                style={{
                                                    width: "100%",
                                                    padding: "16px 20px",
                                                    borderRadius: "18px",
                                                    border: "none",
                                                    outline: "none",
                                                    fontSize: "14px",
                                                    color: "#4A3728",
                                                    background: "rgba(74,55,40,0.04)",
                                                }}
                                            >
                                                {ROLE_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <input
                                                type="text"
                                                value={customCharForm.personality}
                                                onChange={(event) =>
                                                    setCustomCharForm((current) => ({ ...current, personality: event.target.value }))
                                                }
                                                placeholder="Personality"
                                                style={{
                                                    width: "100%",
                                                    padding: "16px 20px",
                                                    borderRadius: "18px",
                                                    border: "none",
                                                    outline: "none",
                                                    fontSize: "14px",
                                                    color: "#4A3728",
                                                    background: "rgba(74,55,40,0.04)",
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <textarea
                                        value={customCharForm.description}
                                        onChange={(event) =>
                                            setCustomCharForm((current) => ({ ...current, description: event.target.value }))
                                        }
                                        placeholder="Description, role in the story, and the energy they bring"
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
                                        }}
                                    />

                                    <button
                                        type="button"
                                        onClick={handleAddCustomCharacter}
                                        disabled={!customCharForm.name.trim() || !customCharForm.description.trim() || !customCharForm.personality.trim()}
                                        style={{
                                            border: "none",
                                            borderRadius: "16px",
                                            background:
                                                customCharForm.name.trim() && customCharForm.description.trim() && customCharForm.personality.trim()
                                                    ? "#4A3728"
                                                    : "rgba(74,55,40,0.18)",
                                            color: "#FFFFFF",
                                            padding: "14px 16px",
                                            fontSize: "14px",
                                            fontWeight: 700,
                                            cursor:
                                                customCharForm.name.trim() && customCharForm.description.trim() && customCharForm.personality.trim()
                                                    ? "pointer"
                                                    : "not-allowed",
                                        }}
                                    >
                                        Add Character
                                    </button>
                                </div>
                            )}

                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                <div style={{ fontSize: "12px", fontWeight: 700, color: "#8B8680" }}>
                                    SELECTED CAST {cast.length > 0 ? `(${cast.length})` : ""}
                                </div>
                                {cast.length === 0 ? (
                                    <div
                                        style={{
                                            padding: "16px",
                                            borderRadius: "18px",
                                            background: "rgba(74,55,40,0.04)",
                                            color: "#8B8680",
                                            fontSize: "14px",
                                        }}
                                    >
                                        Add Kakoei characters or create custom ones to build your cast.
                                    </div>
                                ) : (
                                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                                        {cast.map((member) => (
                                            <div
                                                key={member.characterId}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "8px",
                                                    padding: "8px 10px",
                                                    borderRadius: "18px",
                                                    background: "#FFFFFF",
                                                    border: "1px solid rgba(74,55,40,0.1)",
                                                }}
                                            >
                                                <span style={{ fontSize: "13px", fontWeight: 700, color: "#4A3728" }}>
                                                    {member.name}
                                                </span>
                                                <select
                                                    value={member.role}
                                                    onChange={(event) => updateCastRole(member.characterId, event.target.value as CastRole)}
                                                    style={{
                                                        borderRadius: "10px",
                                                        border: "1px solid rgba(74,55,40,0.12)",
                                                        padding: "6px 8px",
                                                        background: "#FFF8EE",
                                                        color: "#4A3728",
                                                        fontSize: "12px",
                                                        fontWeight: 600,
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    {ROLE_OPTIONS.map((option) => (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveCastMember(member.characterId)}
                                                    style={{
                                                        border: "none",
                                                        background: "transparent",
                                                        color: "#8B8680",
                                                        cursor: "pointer",
                                                        fontSize: "14px",
                                                        lineHeight: 1,
                                                    }}
                                                >
                                                    x
                                                </button>
                                            </div>
                                        ))}
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
