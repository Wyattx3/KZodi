"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatStore, type ChatMessage } from "@/lib/chatStore";
import { type Character } from "@/data/characters";
import CharacterProfile from "./CharacterProfile";

interface ChatRoomProps {
    character: Character;
    onBack: () => void;
}


// Sticker Options (20 items - reduced to prevent Too Many Requests and save costs)
const STICKER_OPTIONS = [
    { label: "Happy", emoji: "😊" },
    { label: "Love", emoji: "😍" },
    { label: "Laugh", emoji: "😂" },
    { label: "Sad", emoji: "😢" },
    { label: "Angry", emoji: "😡" },
    { label: "Confused", emoji: "😕" },
    { label: "Surprised", emoji: "😲" },
    { label: "Scared", emoji: "😱" },
    { label: "Shy", emoji: "😳" },
    { label: "Wink", emoji: "😉" },
    { label: "Thinking", emoji: "🤔" },
    { label: "Cool", emoji: "😎" },
    { label: "Sleepy", emoji: "😴" },
    { label: "Thumbs Up", emoji: "👍" },
    { label: "Celebrate", emoji: "🎉" },
    { label: "Wave", emoji: "👋" },
    { label: "Heart", emoji: "❤️" },
    { label: "Broken Heart", emoji: "💔" },
    { label: "Sparkles", emoji: "✨" },
    { label: "Sick", emoji: "😷" },
];

// User Character Definition for Stickers
const USER_CHARACTER: Character = {
    id: "user-me",
    name: "Me",
    tag: "Original",
    description: "A cute chibi version of the user, wearing a casual hoodie, friendly smile, expressive anime style.",
    longDescription: "A generic cute anime avatar representing the user.",
    tags: ["chibi", "user", "cute", "expressive"],
    personality: "Friendly, casual",
    greeting: "",
    image: "", // Will rely on description for generation
};

// Sticker cache version — bump this to force re-processing of all stickers
const STICKER_CACHE_VERSION = "v10-IDB-CACHE";

// IDB Native Wrapper for unlimited Base64 caching
const IDB_NAME = "KzodiStickerCache";
const IDB_RAW = "raw";
const IDB_PROC = "processed";

let idbPromise: Promise<IDBDatabase> | null = null;
function getDB() {
    if (typeof window === "undefined") return Promise.reject("SSR");
    if (!idbPromise) {
        idbPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open(IDB_NAME, 1);
            req.onupgradeneeded = () => {
                req.result.createObjectStore(IDB_RAW);
                req.result.createObjectStore(IDB_PROC);
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }
    return idbPromise;
}

async function idbGet(store: string, key: string): Promise<any> {
    try {
        const db = await getDB();
        return new Promise((resolve) => {
            const tx = db.transaction(store, "readonly");
            const req = tx.objectStore(store).get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });
    } catch { return null; }
}

async function idbSet(store: string, key: string, val: any): Promise<void> {
    try {
        const db = await getDB();
        return new Promise((resolve) => {
            const tx = db.transaction(store, "readwrite");
            const req = tx.objectStore(store).put(val, key);
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
        });
    } catch { }
}

if (typeof window !== "undefined") {
    const currentVer = localStorage.getItem("kzodi-sticker-cache-ver");
    if (currentVer !== STICKER_CACHE_VERSION) {
        // Clear old caches
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith("kzodi-sticker-proc-") || k.startsWith("kzodi-sticker-"))) localStorage.removeItem(k);
        }
        localStorage.setItem("kzodi-sticker-cache-ver", STICKER_CACHE_VERSION);

        // Clear IDB
        getDB().then(db => {
            const tx = db.transaction([IDB_RAW, IDB_PROC], "readwrite");
            tx.objectStore(IDB_RAW).clear();
            tx.objectStore(IDB_PROC).clear();
        }).catch(() => { });
        console.log(`[Sticker] Cache version updated to ${STICKER_CACHE_VERSION}`);
    }
}

// Memory Cache provides instant, synchronous loading after first hit
const memStickerCache = new Map<string, any>();
const memProcessedCache = new Map<string, string>();

async function getStickerFromCache(key: string): Promise<{ image?: string; svg?: string; type?: string } | null> {
    if (memStickerCache.has(key)) return memStickerCache.get(key);
    const data = await idbGet(IDB_RAW, key);
    if (data) {
        memStickerCache.set(key, data);
        return data;
    }
    return null;
}

async function saveStickerToCache(key: string, data: { image?: string; svg?: string; type?: string }) {
    memStickerCache.set(key, data);
    await idbSet(IDB_RAW, key, data);
}

async function getProcessedFromCache(key: string): Promise<string | null> {
    if (memProcessedCache.has(key)) return memProcessedCache.get(key) || null;
    const data = await idbGet(IDB_PROC, key);
    if (data) {
        memProcessedCache.set(key, data);
        return data;
    }
    return null;
}

async function saveProcessedToCache(key: string, dataUrl: string) {
    memProcessedCache.set(key, dataUrl);
    await idbSet(IDB_PROC, key, dataUrl);
}

// White background removal — removes white/near-white pixels with smooth edge transition
function removeWhiteBackground(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imageData.data;

    for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];

        // Calculate how "white" this pixel is (0 = black, 1 = pure white)
        const brightness = (r + g + b) / (3 * 255);
        // Check color saturation — white has very low saturation
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const saturation = max === 0 ? 0 : (max - min) / max;

        if (brightness > 0.92 && saturation < 0.1) {
            // Pure white/near-white — fully transparent
            d[i + 3] = 0;
        } else if (brightness > 0.85 && saturation < 0.15) {
            // Near-white edge — smooth fade for anti-aliasing
            const whiteness = (brightness - 0.85) / 0.07;
            d[i + 3] = Math.round(d[i + 3] * (1 - whiteness * 0.9));
        } else if (brightness > 0.78 && saturation < 0.08) {
            // Very light gray edge — gentle fade
            const whiteness = (brightness - 0.78) / 0.07;
            d[i + 3] = Math.round(d[i + 3] * (1 - whiteness * 0.5));
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

// Global Sticker queue to prevent Too Many Requests (429) from Fireworks AI
let activeStickerRequests = 0;
const stickerRequestQueue: (() => void)[] = [];

async function enqueueStickerRequest<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        const execute = async () => {
            activeStickerRequests++;
            try {
                const res = await task();
                resolve(res);
            } catch (err) {
                reject(err);
            } finally {
                activeStickerRequests--;
                if (stickerRequestQueue.length > 0) {
                    const next = stickerRequestQueue.shift();
                    if (next) next();
                }
            }
        };

        if (activeStickerRequests < 5) { // increased to 5 for 2x/5x faster bulk loading
            execute();
        } else {
            console.log(`[StickerQueue] Queuing request... (${stickerRequestQueue.length + 1} waiting)`);
            stickerRequestQueue.push(execute);
        }
    });
}

const Sticker = ({ prompt, character, fallbackEmoji, smallMode }: { prompt: string; character: Character; fallbackEmoji?: string; smallMode?: boolean }) => {
    // Check for Pack Override (PACK:id:name:prompt)
    const packMatch = prompt.match(/^PACK:(.+?):(.+?):(.+)$/);
    let targetChar = character;
    let effectivePrompt = prompt;

    if (packMatch) {
        const [_, pId, pName, pPrompt] = packMatch;
        effectivePrompt = pPrompt;
        // Create a temporary character for generation based on the pack
        targetChar = {
            ...character, // Keep base props to avoid TS errors
            id: pId,
            name: pName,
            description: `A cute ${pName} character sticker art.`,
            longDescription: "",
            tags: ["sticker", "pack", pName.toLowerCase()],
            image: "",
            personality: "expressive"
        };
    }

    const cacheKey = `${targetChar.id}-${effectivePrompt.trim().toLowerCase()}`;
    const [stickerData, setStickerData] = useState<{ image?: string; svg?: string; type?: string } | null>(memStickerCache.get(cacheKey) || null);
    const [processedImage, setProcessedImage] = useState<string | null>(memProcessedCache.get(cacheKey) || null);

    // Sync UI to memory cache instantly
    const initialCached = memStickerCache.has(cacheKey) || memProcessedCache.has(cacheKey);
    const [loading, setLoading] = useState(!initialCached);
    const [error, setError] = useState<string | null>(null);

    // Reset state when cacheKey changes
    useEffect(() => {
        const sData = memStickerCache.get(cacheKey) || null;
        const pData = memProcessedCache.get(cacheKey) || null;
        setStickerData(sData);
        setProcessedImage(pData);
        setLoading(!sData && !pData);
        setError(null);
    }, [cacheKey]);

    useEffect(() => {
        if (stickerData || processedImage) return;

        let mounted = true;
        setLoading(true);
        setError(null);
        // Reduce UI lock contention by waiting a tiny bit
        const delay = Math.random() * 50;

        const abortController = new AbortController();

        const fetchSticker = async () => {
            await new Promise(r => setTimeout(r, delay));
            if (!mounted) return;

            // First check IDB (Async)
            const pData = await getProcessedFromCache(cacheKey);
            if (pData) {
                if (mounted) {
                    setProcessedImage(pData);
                    setLoading(false);
                }
                return;
            }

            const sData = await getStickerFromCache(cacheKey);
            if (sData) {
                if (mounted) {
                    setStickerData(sData);
                    setLoading(false);
                }
                return;
            }

            try {
                const res = await enqueueStickerRequest(() => {
                    if (abortController.signal.aborted) {
                        return Promise.reject(new Error("aborted"));
                    }
                    return fetch("/api/sticker", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            prompt: effectivePrompt,
                            characterName: targetChar.name,
                            characterDescription: targetChar.description,
                            characterLongDescription: targetChar.longDescription || "",
                            characterTags: targetChar.tags || [],
                            characterPersonality: targetChar.personality || "",
                            characterImage: targetChar.image,
                            characterSource: targetChar.source || ""
                        }),
                        signal: abortController.signal
                    });
                });

                if (!res.ok) {
                    if (res.status === 402) throw new Error("QUOTA");
                    throw new Error("API_FAIL");
                }

                const data = await res.json();

                if (mounted) {
                    saveStickerToCache(cacheKey, data);
                    setStickerData(data);
                    if (data.type === "svg" || !data.image) {
                        setLoading(false);
                    }
                }
            } catch (e: any) {
                if (!mounted) return; // Completely silence all errors if component unmounted

                const errMsg = typeof e === "string" ? e : (e?.message || "");
                if (
                    e?.name === "AbortError" ||
                    errMsg.includes("aborted")
                ) {
                    return; // Silently exit on abort
                }
                console.error("Sticker load failed", e);
                if (mounted) {
                    setLoading(false);
                    setError(errMsg === "QUOTA" ? "quota" : "generic");
                }
            }
        };

        fetchSticker().catch(() => { });
        return () => {
            mounted = false;
            abortController.abort();
        };
    }, [prompt, character.id, cacheKey, stickerData, processedImage]);

    // ... (Chroma Key Effect remains same) ...

    useEffect(() => {
        if (processedImage) return;
        if (!stickerData?.image || stickerData.type !== "image") return;

        let mounted = true;
        const img = new Image();
        if (stickerData.image.startsWith("http")) img.crossOrigin = "Anonymous";
        img.src = stickerData.image;

        img.onload = () => {
            if (!mounted) return;
            try {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                if (!ctx) { setLoading(false); return; }

                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                removeWhiteBackground(canvas, ctx);

                const result = canvas.toDataURL("image/png");
                setProcessedImage(result);
                saveProcessedToCache(cacheKey, result);
            } catch (e) {
                setProcessedImage(stickerData.image!);
            }
            setLoading(false);
        };

        img.onerror = () => {
            if (mounted) {
                setProcessedImage(stickerData.image!);
                setLoading(false);
            }
        }
        return () => { mounted = false; };
    }, [stickerData, processedImage, cacheKey]);


    const stickerStyle: React.CSSProperties = {
        maxWidth: "100%",
        maxHeight: "100%",
        width: "auto",
        height: "auto",
        filter: smallMode
            ? "drop-shadow(0px 1px 2px rgba(0,0,0,0.15))"
            : "drop-shadow(0px 0px 3px rgba(255,255,255,0.8)) drop-shadow(0px 1px 2px rgba(0,0,0,0.15))",
        transition: "transform 0.2s ease",
        cursor: "pointer",
        objectFit: "contain"
    };

    if (loading) {
        return (
            <div style={{
                width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative"
            }}>
                <div style={{ fontSize: smallMode ? "20px" : "40px", opacity: 0.5, filter: "blur(2px)" }}>{fallbackEmoji || "✨"}</div>
                <motion.div
                    style={{ position: "absolute", width: 20, height: 20, border: "2px solid rgba(0,0,0,0.5)", borderTop: "2px solid transparent", borderRadius: "50%" }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                />
            </div>
        );
    }

    if (error === "quota") {
        return (
            <div style={{ fontSize: "16px", textAlign: "center", color: "red", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }} title="API Credit Limit Reached">
                <span style={{ fontSize: "24px" }}>💸</span>
                <span style={{ fontSize: "10px" }}>No Credits</span>
            </div>
        );
    }

    if (processedImage) {
        return <img src={processedImage} alt={prompt} style={{ ...stickerStyle, borderRadius: "0" }} />;
    }

    if (stickerData?.svg) {
        return <div dangerouslySetInnerHTML={{ __html: stickerData.svg }} style={{ ...stickerStyle, overflow: "visible", display: "flex", alignItems: "center", justifyContent: "center" }} />;
    }

    if (stickerData?.image) {
        return <img src={stickerData.image} alt={prompt} style={{ ...stickerStyle, borderRadius: "8px" }} />;
    }

    return (
        <div style={{ fontSize: smallMode ? "20px" : "48px", textAlign: "center", lineHeight: "1" }} title="Sticker generation failed">
            {fallbackEmoji || "❓"}
        </div>
    );
};

// Parse message content for sticker tags
const STICKER_REGEX = /(\[\[\s*STICKER\s*:[^\]]+\]\])/gi;

const renderMessageContent = (content: string, character: Character) => {
    // Split by sticker tags, keeping the delimiters
    const parts = content.split(STICKER_REGEX);

    return parts.map((part, i) => {
        const stickerMatch = part.match(/\[\[\s*STICKER\s*:\s*(.+?)\]\]/i);
        if (stickerMatch) {
            const stickerPrompt = stickerMatch[1].trim();
            // Find fallback emoji
            const option = STICKER_OPTIONS.find(o => o.label.toLowerCase() === stickerPrompt.toLowerCase());
            return <Sticker key={i} prompt={stickerPrompt} character={character} fallbackEmoji={option?.emoji} />;
        }
        if (!part || !part.trim()) return null;
        return <span key={i}>{part}</span>;
    });
};

// Sticker Grid Component for the Picker
const StickerGrid = ({
    character,
    onSelect,
    prompts
}: {
    character: Character,
    onSelect: (label: string) => void,
    prompts?: string[]
}) => {
    // Default to character feelings if no prompts provided
    const items = prompts ? prompts.map(p => ({ label: p, emoji: "✨" })) : STICKER_OPTIONS;

    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", overflowY: "auto", paddingRight: "4px" }}>
            {items.map((opt, idx) => (
                <button
                    key={`${opt.label}-${idx}`}
                    onClick={() => onSelect(opt.label)}
                    style={{
                        aspectRatio: "1/1",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(255,255,255,0.5)",
                        borderRadius: "12px",
                        border: "1px solid rgba(0,0,0,0.05)",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                        position: "relative",
                        overflow: "hidden"
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "scale(1.05)";
                        e.currentTarget.style.background = "rgba(255,255,255,0.8)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                        e.currentTarget.style.background = "rgba(255,255,255,0.5)";
                    }}
                    title={opt.label}
                >
                    <div style={{ position: "absolute", inset: 0, padding: "8px", pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Sticker prompt={opt.label} character={character} fallbackEmoji={opt.emoji} />
                    </div>
                </button>
            ))}
        </div>
    );
};

// Sticker Picker with Telegram-style Layout
// Sticker Picker with Telegram-style Layout
const StickerPicker = ({ character, onSelect }: { character: Character, onSelect: (label: string) => void }) => {
    const [selectedPackId, setSelectedPackId] = useState<string>("");
    const [packs, setPacks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const currentPack = packs.find(p => p.id === selectedPackId);
    const activePackName = currentPack ? currentPack.name : (loading ? "Loading..." : "Stickers");
    const currentStickers = currentPack ? (currentPack.id === "character-custom" ? undefined : currentPack.stickers) : [];

    // Determine which character to use for generation
    // If it's the custom pack, use the passed character (User or AI)
    // If it's a public pack, use the pack's identity
    const targetCharacter = useMemo(() => {
        if (!currentPack || currentPack.id === "character-custom") {
            return character;
        }
        // Create a temporary character profile for the pack theme
        return {
            id: currentPack.id,
            name: currentPack.name,
            tag: "Original",
            description: currentPack.description || `A cute ${currentPack.name} character.`,
            longDescription: "",
            tags: ["kawaii", "sticker", currentPack.icon],
            personality: "Cute, expressive",
            greeting: "",
            image: ""
        } as Character;
    }, [currentPack, character]);

    useEffect(() => {
        fetch("/api/sticker/packs")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    // Add Character Specific Pack
                    const charPack = {
                        id: "character-custom",
                        name: "My Stickers", // Renamed for clarity since it's "Me"
                        icon: "✨", // Special icon
                        stickers: [] // Will trigger default emotions
                    };
                    const allPacks = [charPack, ...data];
                    setPacks(allPacks);
                    setSelectedPackId(charPack.id);
                }
            })
            .catch(err => console.error("Failed to load packs", err))
            .finally(() => setLoading(false));
    }, [character.name]);

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>

            <div style={{
                padding: "12px 16px",
                borderBottom: "1px solid rgba(0,0,0,0.05)",
                marginBottom: "8px",
                flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "space-between"
            }}>
                <span style={{ fontSize: "14px", fontWeight: 600, opacity: 0.8 }}>{activePackName}</span>
            </div>

            <div style={{ flex: 1, overflowY: "auto", paddingBottom: "8px", position: "relative" }}>
                {loading ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: "12px", opacity: 0.6 }}>
                        <div style={{ width: "24px", height: "24px", border: "3px solid #000", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                        <span style={{ fontSize: "12px" }}>Fetching packs...</span>
                    </div>
                ) : (
                    <StickerGrid
                        character={targetCharacter}
                        onSelect={(label) => {
                            if (currentPack && currentPack.id !== "character-custom") {
                                // Encode pack info into the prompt for consistent generation
                                onSelect(`PACK:${currentPack.id}:${currentPack.name}:${label}`);
                            } else {
                                onSelect(label);
                            }
                        }}
                        prompts={currentStickers && currentStickers.length > 0 ? currentStickers : undefined}
                    />
                )}
            </div>

            <div style={{
                height: "64px",
                borderTop: "1px solid rgba(0,0,0,0.05)",
                display: "flex",
                alignItems: "center",
                overflowX: "auto",
                gap: "12px",
                padding: "0 16px",
                background: "rgba(240,242,245,0.9)", // slightly more opaque
                backdropFilter: "blur(10px)",
                flexShrink: 0
            }} className="no-scrollbar">

                {packs.map(pack => {
                    const isCustom = pack.id === "character-custom";
                    const isActive = selectedPackId === pack.id;

                    return (
                        <button
                            key={pack.id}
                            onClick={() => setSelectedPackId(pack.id)}
                            style={{
                                width: "40px", height: "40px", flexShrink: 0,
                                borderRadius: "8px",
                                border: "none",
                                background: isActive ? "rgba(0,0,0,0.08)" : "transparent",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                cursor: "pointer", transition: "all 0.2s ease",
                                padding: "4px",
                                opacity: isActive ? 1 : 0.4,
                                transform: isActive ? "scale(1.1)" : "scale(1)",
                                overflow: "hidden"
                            }}
                            title={pack.name}
                        >
                            {isCustom ? (
                                <img
                                    src={character.image || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=Me&backgroundColor=transparent`}
                                    alt={pack.name}
                                    style={{
                                        width: "100%", height: "100%",
                                        objectFit: "cover",
                                        borderRadius: "6px"
                                    }}
                                />
                            ) : (
                                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Sticker
                                        prompt={`PACK:${pack.id}:${pack.name}:${pack.stickers?.[0] || pack.name}`}
                                        character={character}
                                        fallbackEmoji={pack.icon || "📦"}
                                        smallMode={true}
                                    />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default function ChatRoom({ character, onBack }: ChatRoomProps) {


    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [showCharInfo, setShowCharInfo] = useState(false);
    const [showStickerPicker, setShowStickerPicker] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { sendMessage, addReply, markAsSeen } = useChatStore.getState();

    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        const convo = useChatStore.getState().conversations[character.id];
        return convo?.messages || [];
    });

    const triggerAiResponse = async (userMessageText: string) => {
        // 1. Realistic Reading Delay (1.5s - 3s)
        const readingDelay = 1500 + Math.random() * 1500;
        await new Promise((resolve) => setTimeout(resolve, readingDelay));

        // 2. Mark as Seen
        markAsSeen(character.id);

        // 3. Reaction Delay (Thinking before typing)
        const reactionDelay = 500 + Math.random() * 1000;
        await new Promise((resolve) => setTimeout(resolve, reactionDelay));

        setIsTyping(true);

        try {
            const currentMessages = useChatStore.getState().conversations[character.id]?.messages || [];
            const history = currentMessages.map((m) => ({
                role: m.role,
                content: m.content || (m.attachment ? "[Image]" : ""),
            }));

            const res = await fetch("/api/roleplay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMessageText,
                    characterName: character.name,
                    characterPersonality: character.personality,
                    characterTag: character.tag,
                    history: history.slice(-10),
                    context: "reply",
                }),
            });

            if (res.ok) {
                const data = await res.json();
                if (data.action === "ignore") {
                    await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 2500));
                    setIsTyping(false);
                } else {
                    await processAiResponse(data.reply || "...");
                }
            } else {
                addReply(character.id, "Hmm, I lost my train of thought.");
                setIsTyping(false);
            }
        } catch {
            addReply(character.id, "Something went wrong.");
            setIsTyping(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            sendMessage(character.id, "", { type: "image", url: base64 });
            triggerAiResponse("[User sent an image]");
        };
        reader.readAsDataURL(file);
    };

    const handleStickerClick = (label: string) => {
        setShowStickerPicker(false);
        const text = `[[STICKER: ${label}]]`;
        sendMessage(character.id, text);
        triggerAiResponse(`[User sent a sticker: ${label}]`);
    };

    useEffect(() => {
        const unsub = useChatStore.subscribe((state) => {
            const convo = state.conversations[character.id];
            setMessages(convo?.messages || []);
        });
        return unsub;
    }, [character.id]);

    useEffect(() => {
        const hasUnseen = messages.some(m => m.role === "assistant" && m.status !== "seen");
        if (hasUnseen) {
            markAsSeen(character.id);
        }
    }, [messages, character.id, markAsSeen]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length, isTyping]);

    useEffect(() => {
        const convo = useChatStore.getState().conversations[character.id];
        if (!convo || convo.messages.length === 0) {
            // No conversation yet — add the greeting once
            addReply(character.id, character.greeting);
        } else {
            // Clean up duplicate greetings left over from the previous bug
            const msgs = convo.messages;
            if (
                msgs.length >= 2 &&
                msgs[0].role === "assistant" &&
                msgs[1].role === "assistant" &&
                msgs[0].content === msgs[1].content
            ) {
                // Remove the duplicate (keep only one copy + rest of conversation)
                useChatStore.setState((state) => ({
                    conversations: {
                        ...state.conversations,
                        [character.id]: {
                            ...state.conversations[character.id],
                            messages: [msgs[0], ...msgs.slice(2)],
                        },
                    },
                }));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [character.id]);

    // Auto-resize textarea
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = "auto";
            inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
        }
    }, [input]);

    const handleSend = async () => {
        const text = input.trim();
        if (!text) return;

        setInput("");
        sendMessage(character.id, text);
        setTimeout(() => inputRef.current?.focus(), 50);

        await triggerAiResponse(text);
    };

    // Process AI response and handle splitting
    const processAiResponse = async (responseText: string) => {
        // First split by explicit pipe separator
        const initialParts = responseText
            .split("|")
            .map((p) => p.trim().replace(/^["']+|["']+$/g, "").trim())
            .filter((p) => p);

        // Then split any part that contains both text and sticker so they become separate bubbles
        const finalParts: string[] = [];
        // Robust regex: case insensitive, allows spaces
        const stickerRegex = /(\[\[\s*STICKER\s*:[^\]]+\]\])/gi;

        for (const part of initialParts) {
            const subParts = part
                .split(stickerRegex)
                .map((p) => p.trim())
                .filter((p) => p);
            finalParts.push(...subParts);
        }

        await sendAiSequence(finalParts);
    };

    // Send AI messages sequentially with typing delay
    const sendAiSequence = async (parts: string[]) => {
        if (parts.length === 0) {
            setIsTyping(false);
            return;
        }

        setIsTyping(true);

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            // Simulate typing time: base 800ms + 30ms per char (capped/randomized)
            const typingTime = 600 + part.length * 20 + Math.random() * 500;

            await new Promise((resolve) => setTimeout(resolve, typingTime));

            addReply(character.id, part);

            // If there are more messages, keep "typing" or briefly pause
            if (i < parts.length - 1) {
                // Optional: brief pause between bubbles
                await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 200));
            }
        }

        setIsTyping(false);
    };

    // Proactive messaging (Double texting)
    useEffect(() => {
        if (messages.length === 0) return;

        const lastMsg = messages[messages.length - 1];

        let timer: NodeJS.Timeout;

        // Only activate if the last message was from AI
        if (lastMsg.role === "assistant") {
            // Determine if character is cold/stoic
            const isCold = /cold|stoic|tsundere|quiet|mysterious|aloof|shy/i.test(
                character.tag + character.personality
            );

            // Cold: wait 3-5 minutes, Regular: wait 1.5-3 minutes
            const delay = isCold
                ? 180000 + Math.random() * 120000   // 3-5 min
                : 90000 + Math.random() * 90000;    // 1.5-3 min

            timer = setTimeout(async () => {
                // Don't double text if AI is typing or User has typed something
                if (isTyping || input.trim()) return;

                // Probability gate: Cold = 5%, Regular = 50%
                const chance = isCold ? 0.05 : 0.5;
                if (Math.random() > chance) return;

                setIsTyping(true);
                try {
                    const history = messages.map((m) => ({
                        role: m.role,
                        content: m.content,
                    }));

                    const res = await fetch("/api/roleplay", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            message: "", // No new user message
                            characterName: character.name,
                            characterPersonality: character.personality,
                            characterTag: character.tag,
                            history: history.slice(-10),
                            context: "proactive",
                        }),
                    });

                    if (res.ok) {
                        const data = await res.json();
                        if (data.reply && data.reply !== "...") {
                            await processAiResponse(data.reply);
                        } else {
                            setIsTyping(false);
                        }
                    } else {
                        setIsTyping(false);
                    }
                } catch {
                    setIsTyping(false);
                }
            }, delay);
        }

        return () => clearTimeout(timer);
    }, [messages, character, isTyping, input]); // Reset timer on message or input change

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="chatroom">
            <div className="chatroom-bg-pattern" />
            {/* ── Header ─────────────────────────── */}
            <motion.div
                className="chatroom-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <button className="chatroom-back" onClick={onBack} aria-label="Go back">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M15 4L7 12L15 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <div
                    className="chatroom-header-center"
                    onClick={() => setShowCharInfo(true)}
                    style={{ cursor: "pointer" }}
                >
                    <div className="chatroom-header-avatar-wrap">
                        <div className="chatroom-header-avatar">
                            <img src={character.image} alt={character.name} />
                        </div>
                        <span className="chatroom-header-online-ring" />
                    </div>
                    <div className="chatroom-header-info">
                        <span className="chatroom-header-name">{character.name}</span>
                        <span className="chatroom-header-status">
                            <span className="chatroom-status-dot" />
                            Online
                        </span>
                    </div>
                </div>
                <div className="chatroom-header-actions">
                    <button
                        className="chatroom-action-btn"
                        aria-label="Character info"
                        onClick={() => setShowCharInfo(true)}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                    <button className="chatroom-action-btn" aria-label="More">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="6" r="1.5" fill="currentColor" />
                            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                            <circle cx="12" cy="18" r="1.5" fill="currentColor" />
                        </svg>
                    </button>
                </div>
            </motion.div>

            {/* ── Messages Area ──────────────────── */}
            <div className="chatroom-messages-area">

                <div className="chatroom-messages no-scrollbar">
                    {/* Date separator */}
                    <div className="chatroom-date-sep">
                        <span>Today</span>
                    </div>

                    <AnimatePresence initial={false}>
                        {messages.map((msg, i) => {
                            const prevMsg = messages[i - 1];
                            // Show divider if it's been more than 15 minutes since the last message
                            const isNewConversation = prevMsg && (msg.timestamp - prevMsg.timestamp > 15 * 60 * 1000);

                            return (
                                <React.Fragment key={msg.id}>
                                    {isNewConversation && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="chatroom-date-sep"
                                            style={{ marginTop: 24, marginBottom: 8 }}
                                        >
                                            <span style={{
                                                background: "rgba(56, 163, 253, 0.1)",
                                                color: "#38a3fd",
                                                fontWeight: 600
                                            }}>New message</span>
                                        </motion.div>
                                    )}
                                    <MessageBubble
                                        message={msg}
                                        character={character}
                                        isFirst={i === 0 || prevMsg?.role !== msg.role || Boolean(isNewConversation)}
                                        isLast={i === messages.length - 1 || messages[i + 1]?.role !== msg.role}
                                    />
                                </React.Fragment>
                            );
                        })}
                    </AnimatePresence>

                    {/* Typing indicator */}
                    <AnimatePresence>
                        {isTyping && (
                            <motion.div
                                className="chatroom-typing"
                                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="chatroom-typing-avatar">
                                    <img src={character.image} alt="" />
                                </div>
                                <div className="chatroom-typing-bubble">
                                    <span className="chatroom-typing-name">{character.name.split(" ")[0]}</span>
                                    <div className="typing-dots">
                                        <span />
                                        <span />
                                        <span />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* ── Input Bar ──────────────────────── */}
            <motion.div
                className="chatroom-input-bar"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
            >
                <div className="chatroom-input-wrap">
                    <AnimatePresence mode="popLayout">
                        {input.length === 0 && (
                            <motion.div
                                className="chatroom-input-actions"
                                initial={{ width: "auto", opacity: 1, scale: 1 }}
                                exit={{ width: 0, opacity: 0, scale: 0 }}
                                transition={{ duration: 0.2 }}
                                style={{ display: "flex", alignItems: "center", overflow: "hidden" }}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: "none" }}
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                                <button
                                    className="chatroom-input-attach"
                                    aria-label="Attach Image"
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{ flexShrink: 0 }}
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                                <button
                                    className="chatroom-input-attach"
                                    aria-label="Send Sticker"
                                    onClick={() => setShowStickerPicker(!showStickerPicker)}
                                    style={{ marginLeft: 8, marginRight: 8, flexShrink: 0 }}
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="1.5" />
                                        <path d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M9 9H9.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M15 9H15.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <textarea
                        ref={inputRef}
                        className="chatroom-input"
                        placeholder={`Message ${character.name.split(" ")[0]}...`}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isTyping}
                        rows={1}
                        style={{ paddingLeft: input.length > 0 ? "12px" : "0" }}
                    />
                </div>

                <AnimatePresence>
                    {input.trim() && (
                        <motion.button
                            key="send-button"
                            className="chatroom-send chatroom-send-active"
                            onClick={handleSend}
                            disabled={isTyping}
                            initial={{ opacity: 1, scale: 1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0 }}
                            aria-label="Send message"
                            whileTap={{ scale: 0.95 }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </motion.button>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* ── Sticker Drawer (Bottom Sheet) ────────── */}
            <AnimatePresence>
                {showStickerPicker && (
                    <motion.div
                        className="sticker-drawer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "420px", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, type: "spring", damping: 25, stiffness: 200 }}
                        style={{
                            overflow: "hidden",
                            background: "rgba(255,255,255,0.95)",
                            backdropFilter: "blur(20px)",
                            borderTop: "1px solid rgba(0,0,0,0.05)",
                            display: "flex",
                            flexDirection: "column",
                            width: "100%",
                            flexShrink: 0
                        }}
                    >
                        {/* Close Button Only - Absolute Positioned */}
                        <div style={{ position: "absolute", top: "12px", right: "12px", zIndex: 10 }}>
                            <button onClick={() => setShowStickerPicker(false)} style={{ background: "rgba(0,0,0,0.05)", borderRadius: "50%", padding: "4px", border: "none", cursor: "pointer", display: "flex" }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div style={{ flex: 1, overflowY: "hidden", display: "flex", flexDirection: "column" }}>
                            {/* Pass USER_CHARACTER to StickerPicker so user generates THEIR OWN stickers */}
                            <StickerPicker character={USER_CHARACTER} onSelect={handleStickerClick} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Character Profile Page ────────── */}
            <AnimatePresence>
                {showCharInfo && (
                    <CharacterProfile
                        character={character}
                        onBack={() => setShowCharInfo(false)}
                        messageCount={messages.length}
                    />
                )}
            </AnimatePresence>
        </div >
    );
}

/* ── Message Bubble ─────────────────────────────────── */
function MessageBubble({
    message,
    character,
    isFirst,
    isLast,
}: {
    message: ChatMessage;
    character: Character;
    isFirst: boolean;
    isLast: boolean;
}) {
    const isUser = message.role === "user";
    const [showActions, setShowActions] = useState(false);
    const isStickerOnly = /^\[\[STICKER:\s*.+?\]\]$/.test(message.content.trim());

    return (
        <motion.div
            className={`chatroom-msg ${isUser ? "chatroom-msg-user" : "chatroom-msg-ai"} ${isFirst ? "chatroom-msg-first" : ""} ${isLast ? "chatroom-msg-last" : ""}`}
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            onContextMenu={(e) => {
                e.preventDefault();
                setShowActions(!showActions);
            }}
        >
            {!isUser && isLast && (
                <div className="chatroom-msg-avatar">
                    <img src={character.image} alt="" />
                </div>
            )}
            {!isUser && !isLast && <div className="chatroom-msg-avatar-spacer" />}
            <div className="chatroom-bubble-wrap">
                <div
                    className={`chatroom-bubble ${isUser ? "chatroom-bubble-user" : "chatroom-bubble-ai"}`}
                    style={isStickerOnly ? { background: "transparent", boxShadow: "none", padding: 0, border: "none" } : undefined}
                >
                    {!isUser && isFirst && (
                        <span className="chatroom-bubble-sender">{character.name}</span>
                    )}
                    <div className="chatroom-message-content">
                        {message.attachment?.type === "image" && (
                            <img
                                src={message.attachment.url}
                                alt="Attachment"
                                style={{
                                    maxWidth: "100%",
                                    maxHeight: "300px",
                                    borderRadius: "8px",
                                    marginBottom: message.content ? "8px" : "0"
                                }}
                            />
                        )}
                        {renderMessageContent(message.content, isUser ? USER_CHARACTER : character)}
                    </div>
                    <div className="chatroom-bubble-meta">
                        <span className="chatroom-bubble-time">
                            {new Date(message.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </span>
                        {isUser && (
                            <span className="chatroom-status-icon">
                                {message.status === "seen" ? (
                                    <span className="status-seen">Seen</span>
                                ) : (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </span>
                        )}
                    </div>
                </div>
                {/* Quick action row on context menu */}
                <AnimatePresence>
                    {showActions && (
                        <motion.div
                            className="chatroom-msg-actions"
                            initial={{ opacity: 0, y: -6, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.9 }}
                            transition={{ duration: 0.15 }}
                        >
                            <button className="chatroom-msg-action-btn" onClick={() => { navigator.clipboard.writeText(message.content); setShowActions(false); }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                    <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
                                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="1.5" />
                                </svg>
                                Copy
                            </button>
                            <button className="chatroom-msg-action-btn" onClick={() => setShowActions(false)}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                                Close
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
