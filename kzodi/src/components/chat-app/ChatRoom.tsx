"use client";
import React, { useState, useEffect, useRef, useCallback, createElement, useMemo, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatStore, type ChatMessage } from "@/lib/chatStore";
import { CHARACTERS, type Character } from "@/data/characters";
import CharacterProfile from "./CharacterProfile";
import { ThumbsUp, Heart, Laugh, Sparkles, Frown } from "lucide-react";
import AstrologerMenu from "./AstrologerMenu";
import AstroProfileModal from "./AstroProfileModal";
import { extractAstrologyTags, AstroWidgetWrapper } from "./AstrologyUIElements";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getZodiacSign } from "@/lib/zodiac";
import SpecialistSetup from "./SpecialistSetups";
import VoiceRecorder from "./VoiceRecorder";

const EMPTY_GROUP_MEMBER_IDS: string[] = [];

// Inline Audio Player Component for Chat Bubbles
const AudioPlayer = ({ src, duration: passedDuration, isUser = false }: { src: string, duration?: number, isUser?: boolean }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [actualDuration, setActualDuration] = useState(passedDuration || 0);

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current && audioRef.current.duration !== Infinity) {
            setActualDuration(audioRef.current.duration);
        }
    };

    const handleTimeUpdate = () => {
        if (!audioRef.current) return;
        const current = audioRef.current.currentTime;
        const total = (audioRef.current.duration && audioRef.current.duration !== Infinity) ? audioRef.current.duration : actualDuration || 1;
        setCurrentTime(current);
        setProgress((current / total) * 100);
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
        if (audioRef.current) audioRef.current.currentTime = 0;
    };

    const formatTime = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = Math.floor(s % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    // Generate fixed random waveform bars based on a hash of the src so it doesn't jump
    const bars = useMemo(() => {
        let hash = 0;
        for (let i = 0; i < src.length; i++) hash = src.charCodeAt(i) + ((hash << 5) - hash);
        const rand = () => {
            const x = Math.sin(hash++) * 10000;
            return x - Math.floor(x);
        };
        return Array.from({ length: 30 }).map(() => 4 + rand() * 16);
    }, [src]);

    const fgColor = isUser ? "#fff" : "#38a3fd";
    const bgTrackColor = isUser ? "rgba(255,255,255,0.4)" : "rgba(56,163,253,0.3)";

    return (
        <div 
            style={{ 
                display: "flex", alignItems: "center", gap: "10px", 
                background: isUser ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.04)", 
                padding: "8px 12px", borderRadius: "16px", minWidth: "220px", marginBottom: "8px" 
            }} 
            onClick={(e) => e.stopPropagation()}
        >
            <button
                onClick={togglePlay}
                style={{
                    width: "36px", height: "36px", borderRadius: "50%",
                    background: fgColor, color: isUser ? "#38a3fd" : "#fff", border: "none",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", flexShrink: 0,
                    boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
                }}
            >
                {isPlaying ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: "2px" }}><path d="M8 5v14l11-7z"/></svg>
                )}
            </button>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                
                {/* Waveform Player */}
                <div style={{ display: "flex", alignItems: "center", gap: "2px", height: "20px", position: "relative" }}>
                    {bars.map((h, i) => {
                        const barProgress = (i / bars.length) * 100;
                        const isPlayed = barProgress <= progress;
                        return (
                            <div 
                                key={i} 
                                style={{ 
                                    flex: 1, height: `${h}px`, borderRadius: "2px",
                                    background: isPlayed ? fgColor : bgTrackColor,
                                    transition: "background 0.1s linear"
                                }} 
                            />
                        );
                    })}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: isUser ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.5)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(actualDuration)}</span>
                </div>
            </div>
            <audio ref={audioRef} src={src} onTimeUpdate={handleTimeUpdate} onEnded={handleEnded} onLoadedMetadata={handleLoadedMetadata} preload="metadata" />
        </div>
    );
};

interface ChatRoomProps {
    character: Character;
    onBack: () => void;
    initialShowProfile?: boolean;
    charMap?: Record<string, Character>;
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
const STICKER_CACHE_VERSION = "v11-IDB-CACHE";

// IDB Native Wrapper for unlimited Base64 caching
const IDB_NAME = "KzodiStickerCacheV2";
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
    const currentVer = localStorage.getItem("kakoei-sticker-cache-ver");
    if (currentVer !== STICKER_CACHE_VERSION) {
        // Clear old caches
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith("kakoei-sticker-proc-") || k.startsWith("kakoei-sticker-"))) localStorage.removeItem(k);
        }
        localStorage.setItem("kakoei-sticker-cache-ver", STICKER_CACHE_VERSION);

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
        if (typeof stickerData.image === "string" && stickerData.image.startsWith("http")) img.crossOrigin = "Anonymous";
        img.src = typeof stickerData.image === "string" ? stickerData.image : "";

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
                <motion.div
                    style={{ position: "absolute", width: 20, height: 20, border: "2px solid rgba(0,0,0,0.2)", borderTop: "2px solid transparent", borderRadius: "50%" }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                />
            </div>
        );
    }

    if (error === "quota") {
        return (
            <div style={{ fontSize: "16px", textAlign: "center", color: "red", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }} title="API Credit Limit Reached">
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
        <div style={{ width: 20, height: 20, border: "2px dashed rgba(0,0,0,0.2)", borderRadius: "4px" }} title="Sticker generation failed" />
    );
};

// Parse message content for sticker tags
const STICKER_REGEX = /(\[\[\s*STICKER\s*:.*?\]+)/gi;

const renderMessageContent = (content: string, character: Character) => {
    // First extract any astrology charts, tables, or tarot cards
    const { cleanText, elements, types } = extractAstrologyTags(content);

    // Split remaining text by sticker tags, keeping the delimiters
    const parts = cleanText.split(STICKER_REGEX);

    const renderParts = (partsArray: string[]) => partsArray.map((part, i) => {
        const stickerMatch = part.match(/\[\[\s*STICKER\s*:\s*(.+?)\]+/i);
        if (stickerMatch) {
            const stickerPrompt = stickerMatch[1].trim();
            // Find fallback emoji
            const option = STICKER_OPTIONS.find(o => o.label.toLowerCase() === stickerPrompt.toLowerCase());
            return <Sticker key={`sticker-${i}`} prompt={stickerPrompt} character={character} fallbackEmoji={option?.emoji} />;
        }
        if (!part || !part.trim()) return null;
        return (
            <div key={`text-${i}`} className="markdown-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{part}</ReactMarkdown>
            </div>
        );
    });

    if (elements.length > 0) {
        // Extract a clean preview text by removing sticker tags and getting the first paragraph or two
        let shortTextString = cleanText.replace(/\[\[\s*STICKER\s*:\s*(.+?)\]+/gi, '').trim();
        // Take up to 300 characters for a slightly longer, more detailed preview
        if (shortTextString.length > 300) {
            shortTextString = shortTextString.substring(0, 300) + "...";
        }

        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 }}>
                {shortTextString && (
                    <div style={{ wordBreak: "break-word", fontSize: "14px", opacity: 0.9 }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{shortTextString}</ReactMarkdown>
                    </div>
                )}
                <AstroWidgetWrapper elements={elements} types={types}>
                    <div style={{ wordBreak: "break-word" }}>
                        {renderParts(parts)}
                    </div>
                </AstroWidgetWrapper>
            </div>
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 }}>
            <div style={{ wordBreak: "break-word" }}>
                {renderParts(parts)}
            </div>
        </div>
    );
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
    const items = prompts ? prompts.map(p => ({ label: p, emoji: "" })) : STICKER_OPTIONS.map(opt => ({...opt, emoji: ""}));

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
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        position: "relative",
                        overflow: "hidden"
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "scale(1.05)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                    }}
                    title={opt.label}
                >
                    <div style={{ position: "absolute", inset: 0, padding: "8px", pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Sticker prompt={opt.label} character={character} fallbackEmoji="" />
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

export default function ChatRoom({ character, onBack, initialShowProfile = false, charMap = {} }: ChatRoomProps) {
    const instanceId = useId();
    const backdropMaskId = `backdrop-cutout-mask-${instanceId.replace(/:/g, "")}`;

    const isTrueAstrologer = character.id === 'astrologer-specialist' || character.id === 'astrologer_specialist';
    const [showStandardMenu, setShowStandardMenu] = useState(!isTrueAstrologer);
    const [input, setInput] = useState("");
    const chatroomRef = useRef<HTMLDivElement>(null);
    const viewportSyncFrameRef = useRef<number | null>(null);
    const lastViewportMetricsRef = useRef<{ height: number | null; offsetTop: number | null }>({ height: null, offsetTop: null });
    const initialChatroomInlineStylesRef = useRef<{ height: string; transform: string } | null>(null);
    const restingViewportHeightRef = useRef<number | null>(null);
    const [viewportHeight, setViewportHeight] = useState<number | string>("100dvh");
    const isIOS = useMemo(() => {
        if (typeof navigator === "undefined") return false;
        return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    }, []);
    const [isTyping, setIsTyping] = useState(false);
    const [isFetchingMessages, setIsFetchingMessages] = useState(true);
    const [typingMemberName, setTypingMemberName] = useState<string | null>(null);
    const [showCharInfo, setShowCharInfo] = useState(initialShowProfile);
    const [profileCharacter, setProfileCharacter] = useState<Character>(character);
    const [showStickerPicker, setShowStickerPicker] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
    const [isAstroProfileModalOpen, setIsAstroProfileModalOpen] = useState(false);
    const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
    const [menuPlacement, setMenuPlacement] = useState<{ top: string; left: string } | null>(null);
    const [activeMessage, setActiveMessage] = useState<ChatMessage | null>(null);
    const [activeBubbleRect, setActiveBubbleRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
    const [reactionRowPlacement, setReactionRowPlacement] = useState<{ top: string; left: string } | null>(null);
    const [selectTextContent, setSelectTextContent] = useState<string | null>(null);
    const [hasCompletedSetup, setHasCompletedSetup] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const groupIntroTriggered = useRef(false);
    const isAiRespondingRef = useRef(false);
    const pendingMessagesRef = useRef<{ text: string; repliedContent?: string; repliedId?: string }[]>([]);
    const [isVoiceRecording, setIsVoiceRecording] = useState(false);
    const [isPublishingStory, setIsPublishingStory] = useState(false);
    const [resolvedGroupChars, setResolvedGroupChars] = useState<Record<string, Character>>({});
    const [uiNotice, setUiNotice] = useState<string | null>(null);
    const [groupMemberRetryTick, setGroupMemberRetryTick] = useState(0);
    const groupMemberResolutionRef = useRef<Promise<Record<string, Character>> | null>(null);
    const uiNoticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const groupMemberRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inFlightGroupMemberIdsRef = useRef<Set<string>>(new Set());
    const permanentFailedGroupMemberIdsRef = useRef<Set<string>>(new Set());
    const transientGroupMemberRetryStateRef = useRef<Map<string, { attempts: number; retryAfter: number }>>(new Map());

    const ownerUserId = useChatStore(state => state.ownerUserId);
    const { sendMessage, addReply, markAsSeen, addGroupReply } = useChatStore.getState();

    const convoFromStore = useChatStore(state => state.conversations[character.id]);
    const isGroupChat = convoFromStore?.isGroup ?? character.id.startsWith("group-");
    const conversationType = convoFromStore?.conversationType || "personal";
    const worldData = convoFromStore?.worldData;
    const groupMemberIds = convoFromStore?.groupMemberIds ?? useChatStore.getState().conversations[character.id]?.groupMemberIds ?? EMPTY_GROUP_MEMBER_IDS;
    const groupMemberIdsKey = useMemo(() => [...groupMemberIds].sort().join("|"), [groupMemberIds]);
    const enrichedCharMap = useMemo(() => ({ ...charMap, ...resolvedGroupChars }), [charMap, resolvedGroupChars]);
    const storyData = convoFromStore?.storyData ? {
        ...convoFromStore.storyData,
        castNames: convoFromStore.storyData.castIds?.map(id => enrichedCharMap[id]?.name || CHARACTERS.find(c => c.id === id)?.name).filter(Boolean) as string[]
    } : undefined;
    const buildResolvedGroupMemberChars = useCallback((extraResolved: Record<string, Character> = {}) => {
        if (!isGroupChat || groupMemberIds.length === 0) return [];
        const runtimeCharMap = { ...enrichedCharMap, ...extraResolved };
        return groupMemberIds
            .map(id => runtimeCharMap[id] || CHARACTERS.find(c => c.id === id))
            .filter(Boolean) as Character[];
    }, [enrichedCharMap, groupMemberIds, isGroupChat]);

    const groupMemberChars = useMemo(() => {
        return buildResolvedGroupMemberChars();
    }, [buildResolvedGroupMemberChars]);

    const resolveMissingGroupMembers = useCallback(async () => {
        if (!isGroupChat || groupMemberIds.length === 0) {
            return buildResolvedGroupMemberChars();
        }

        const accumulatedResolved: Record<string, Character> = {};

        while (true) {
            const now = Date.now();
            const missingIds = groupMemberIds.filter((id) => {
                if (charMap[id] || resolvedGroupChars[id] || accumulatedResolved[id]) return false;
                if (permanentFailedGroupMemberIdsRef.current.has(id)) return false;
                if (inFlightGroupMemberIdsRef.current.has(id)) return false;
                const retryState = transientGroupMemberRetryStateRef.current.get(id);
                if (retryState && retryState.retryAfter > now) return false;
                return true;
            });
            if (missingIds.length === 0) {
                const inFlightResolution = groupMemberResolutionRef.current;
                if (inFlightResolution) {
                    const newlyResolved = await inFlightResolution;
                    Object.assign(accumulatedResolved, newlyResolved);
                    continue;
                }
                return buildResolvedGroupMemberChars(accumulatedResolved);
            }

            if (!groupMemberResolutionRef.current) {
                groupMemberResolutionRef.current = (async () => {
                    const resolved: Record<string, Character> = {};
                    await Promise.all(
                        missingIds.map(async (id) => {
                            inFlightGroupMemberIdsRef.current.add(id);
                            try {
                                const res = await fetch(`/api/characters/${id}`);
                                if (!res.ok) {
                                    if (res.status === 403 || res.status === 404) {
                                        transientGroupMemberRetryStateRef.current.delete(id);
                                        permanentFailedGroupMemberIdsRef.current.add(id);
                                    } else {
                                        const attempts = (transientGroupMemberRetryStateRef.current.get(id)?.attempts || 0) + 1;
                                        const retryAfter = Date.now() + Math.min(1000 * Math.pow(2, attempts - 1), 15000);
                                        transientGroupMemberRetryStateRef.current.set(id, { attempts, retryAfter });
                                    }
                                    setGroupMemberRetryTick(t => t + 1);
                                    return;
                                }
                                const data = await res.json();
                                if (data?.character) {
                                    transientGroupMemberRetryStateRef.current.delete(id);
                                    permanentFailedGroupMemberIdsRef.current.delete(id);
                                    resolved[id] = data.character;
                                    setGroupMemberRetryTick(t => t + 1);
                                } else {
                                    const attempts = (transientGroupMemberRetryStateRef.current.get(id)?.attempts || 0) + 1;
                                    const retryAfter = Date.now() + Math.min(1000 * Math.pow(2, attempts - 1), 15000);
                                    transientGroupMemberRetryStateRef.current.set(id, { attempts, retryAfter });
                                    setGroupMemberRetryTick(t => t + 1);
                                }
                            } catch (err) {
                                const attempts = (transientGroupMemberRetryStateRef.current.get(id)?.attempts || 0) + 1;
                                const retryAfter = Date.now() + Math.min(1000 * Math.pow(2, attempts - 1), 15000);
                                transientGroupMemberRetryStateRef.current.set(id, { attempts, retryAfter });
                                setGroupMemberRetryTick(t => t + 1);
                                console.error("Failed to resolve group member character", err);
                            } finally {
                                inFlightGroupMemberIdsRef.current.delete(id);
                            }
                        })
                    );

                    if (Object.keys(resolved).length > 0) {
                        setResolvedGroupChars(prev => ({ ...prev, ...resolved }));
                    }

                    return resolved;
                })().finally(() => {
                    groupMemberResolutionRef.current = null;
                });
            }

            const inFlightResolution = groupMemberResolutionRef.current;
            if (!inFlightResolution) {
                return buildResolvedGroupMemberChars(accumulatedResolved);
            }

            const newlyResolved = await inFlightResolution;
            Object.assign(accumulatedResolved, newlyResolved);
            if (Object.keys(newlyResolved).length === 0) {
                return buildResolvedGroupMemberChars(accumulatedResolved);
            }

            const stillMissingIds = groupMemberIds.filter(id => !charMap[id] && !resolvedGroupChars[id] && !accumulatedResolved[id]);
            if (stillMissingIds.length === 0) {
                return buildResolvedGroupMemberChars(accumulatedResolved);
            }
        }
    }, [buildResolvedGroupMemberChars, charMap, groupMemberIds, isGroupChat, resolvedGroupChars]);

    useEffect(() => {
        if (!isGroupChat || groupMemberIds.length === 0) return;
        void resolveMissingGroupMembers();
    }, [groupMemberIdsKey, groupMemberRetryTick, isGroupChat, resolveMissingGroupMembers]);

    useEffect(() => {
        const activeIds = new Set(groupMemberIds);

        inFlightGroupMemberIdsRef.current.forEach(id => {
            if (!activeIds.has(id)) inFlightGroupMemberIdsRef.current.delete(id);
        });

        permanentFailedGroupMemberIdsRef.current.forEach(id => {
            if (!activeIds.has(id)) permanentFailedGroupMemberIdsRef.current.delete(id);
        });

        Array.from(transientGroupMemberRetryStateRef.current.keys()).forEach(id => {
            if (!activeIds.has(id)) transientGroupMemberRetryStateRef.current.delete(id);
        });
    }, [groupMemberIdsKey]);

    useEffect(() => {
        if (groupMemberRetryTimerRef.current) {
            clearTimeout(groupMemberRetryTimerRef.current);
            groupMemberRetryTimerRef.current = null;
        }

        let earliestRetryAfter: number | null = null;
        transientGroupMemberRetryStateRef.current.forEach((state, id) => {
            if (!groupMemberIds.includes(id)) return;
            if (earliestRetryAfter === null || state.retryAfter < earliestRetryAfter) {
                earliestRetryAfter = state.retryAfter;
            }
        });

        if (earliestRetryAfter !== null) {
            const delay = Math.max(earliestRetryAfter - Date.now(), 0);
            groupMemberRetryTimerRef.current = setTimeout(() => {
                groupMemberRetryTimerRef.current = null;
                setGroupMemberRetryTick(t => t + 1);
            }, delay);
        }

        return () => {
            if (groupMemberRetryTimerRef.current) {
                clearTimeout(groupMemberRetryTimerRef.current);
                groupMemberRetryTimerRef.current = null;
            }
        };
    }, [groupMemberIdsKey, groupMemberRetryTick]);

    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        const convo = useChatStore.getState().conversations[character.id];
        return convo?.messages || [];
    });

    const showTransientNotice = useCallback((text: string) => {
        setUiNotice(text);
        if (uiNoticeTimeoutRef.current) {
            clearTimeout(uiNoticeTimeoutRef.current);
        }
        uiNoticeTimeoutRef.current = setTimeout(() => {
            setUiNotice(null);
            uiNoticeTimeoutRef.current = null;
        }, 3200);
    }, []);

    const resolveProfileCharacter = useCallback(async (characterId: string) => {
        const localCharacter = enrichedCharMap[characterId]
            || CHARACTERS.find(c => c.id === characterId);
        if (localCharacter) return localCharacter;

        try {
            const res = await fetch(`/api/characters/${characterId}`);
            if (!res.ok) return null;
            const data = await res.json();
            if (data?.character) {
                setResolvedGroupChars(prev => ({ ...prev, [characterId]: data.character }));
                return data.character as Character;
            }
        } catch (err) {
            console.error("Failed to resolve profile character", err);
        }

        return null;
    }, [enrichedCharMap]);

    const openCharacterProfile = useCallback(async (characterId?: string) => {
        if (!isGroupChat || !characterId) {
            setProfileCharacter(character);
            setShowCharInfo(true);
            return;
        }

        const resolvedCharacter = await resolveProfileCharacter(characterId);
        if (!resolvedCharacter) {
            showTransientNotice("Character profile is still loading. Please try again.");
            return;
        }

        setProfileCharacter(resolvedCharacter);
        setShowCharInfo(true);
    }, [character, isGroupChat, resolveProfileCharacter, showTransientNotice]);

    const openHeaderProfile = useCallback(async () => {
        if (!isGroupChat) {
            setProfileCharacter(character);
            setShowCharInfo(true);
            return;
        }

        const activeMembers = groupMemberChars.length > 0 ? groupMemberChars : await resolveMissingGroupMembers();
        const lastSenderId = [...messages].reverse().find(m => m.senderId)?.senderId;
        const targetCharacter = (lastSenderId ? activeMembers.find(member => member.id === lastSenderId) : null) || activeMembers[0];

        if (!targetCharacter) {
            showTransientNotice("No character profile is available for this group yet.");
            return;
        }

        setProfileCharacter(targetCharacter);
        setShowCharInfo(true);
    }, [character, groupMemberChars, isGroupChat, messages, resolveMissingGroupMembers, showTransientNotice]);

    const isBlocked = useChatStore(state => state.conversations[character.id]?.isBlocked) || false;
    const conversationTheme = useChatStore(state => state.conversations[character.id]?.theme) || "theme-default";
    const customName = useChatStore(state => state.conversations[character.id]?.customName) || "";
    const displayName = customName || character.name;

    // Close menu when clicking outside
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            // Don't close if clicking inside the menu
            if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
            setShowMenu(false);
            if (isTrueAstrologer) setShowStandardMenu(false);
            setActiveActionMenuId(null);
            setActiveMessage(null);
            setActiveBubbleRect(null);
            setReactionRowPlacement(null);
        };
        window.addEventListener("click", handleClick);
        return () => window.removeEventListener("click", handleClick);
    }, [isTrueAstrologer]);

    useEffect(() => {
        return () => {
            if (uiNoticeTimeoutRef.current) {
                clearTimeout(uiNoticeTimeoutRef.current);
            }
        };
    }, []);

    const [unreadMarkerId, setUnreadMarkerId] = useState<string | null>(() => {
        const convo = useChatStore.getState().conversations[character.id];
        const msgs = convo?.messages || [];
        const firstUnread = msgs.find(m => m.role === "assistant" && m.status !== "seen");
        return firstUnread ? firstUnread.id : null;
    });

    const triggerAiResponse = async (userMessageText: string, repliedMessageContent?: string, repliedId?: string) => {

        // 🔄 If AI is already responding, queue this message and return immediately
        // The AI will process queued messages after finishing its current response
        if (isAiRespondingRef.current) {
            pendingMessagesRef.current.push({
                text: userMessageText,
                repliedContent: repliedMessageContent,
                repliedId: repliedId,
            });
            console.log(`[Chat] 📨 Message queued (${pendingMessagesRef.current.length} pending)`);
            return;
        }

        // Include the message ID of the replied-to message for the AI context
        let finalMessageText = userMessageText;
        if (repliedMessageContent && repliedId) {
            finalMessageText = `[MessageID: ${repliedId}] (Replying to your message: "${repliedMessageContent}")\n\n${userMessageText}`;
        } else if (repliedMessageContent) {
            finalMessageText = `(Replying to your message: "${repliedMessageContent}")\n\n${userMessageText}`;
        }

        let activeGroupMemberChars = groupMemberChars;
        if (isGroupChat && conversationType !== "story" && groupMemberIds.length > activeGroupMemberChars.length) {
            activeGroupMemberChars = await resolveMissingGroupMembers();
        }

        const resolvedGroupMemberIds = new Set(activeGroupMemberChars.map(member => member.id));
        const unresolvedGroupMemberIds = groupMemberIds.filter(id => !resolvedGroupMemberIds.has(id));
        const blockingGroupMemberIds = unresolvedGroupMemberIds.filter((id) => {
            if (permanentFailedGroupMemberIdsRef.current.has(id)) return false;
            const retryState = transientGroupMemberRetryStateRef.current.get(id);
            if (retryState && retryState.retryAfter > Date.now()) return false;
            return true;
        });
        const skippedGroupMemberIds = unresolvedGroupMemberIds.filter(id => !blockingGroupMemberIds.includes(id));

        if (isGroupChat && activeGroupMemberChars.length > 0 && skippedGroupMemberIds.length > 0) {
            showTransientNotice("Some group members are still unavailable. Continuing with available characters.");
        }

        if (isGroupChat && activeGroupMemberChars.length === 0 && blockingGroupMemberIds.length > 0) {
            setIsTyping(false);
            showTransientNotice("Group members are still loading. Please try again in a moment.");
            return;
        }

        // ─── GROUP CHAT: Each member responds individually ───
        if (isGroupChat && activeGroupMemberChars.length > 0) {
            const currentMessages = useChatStore.getState().conversations[character.id]?.messages || [];
            const lastGroupMsg = [...currentMessages].reverse().find(m => m.senderId && m.role === "assistant");
            const lastGroupMsgSenderId = lastGroupMsg ? lastGroupMsg.senderId : null;

            const groupMemberNames = activeGroupMemberChars.map((c: Character) => c.name);
            const randomChar = activeGroupMemberChars.filter((c: Character) => c.id !== lastGroupMsgSenderId);

            // Mark user's messages as "seen" BEFORE any AI starts typing
            markAsSeen(character.id, "user");

            // Small delay so "Seen" renders in UI before typing indicator appears
            await new Promise((resolve) => setTimeout(resolve, 400 + Math.random() * 300));

            // Shuffle members so the order varies each time
            const shuffled = [...activeGroupMemberChars].sort(() => Math.random() - 0.5);

            // Snapshot language once for the entire turn to prevent mixed-language responses
            const responseLanguage = useChatStore.getState().responseLanguage;

            // Mark that AI is actively responding (pauses syncFromDB)
            isAiRespondingRef.current = true;

            for (const member of shuffled) {
                // Random chance some members don't reply (30% skip)
                if (shuffled.length > 2 && Math.random() < 0.3) continue;

                // Brief pause between members to simulate different reaction times
                const memberDelay = 500 + Math.random() * 800;
                await new Promise((resolve) => setTimeout(resolve, memberDelay));

                // Update typing indicator for this specific member
                setIsTyping(false);
                await new Promise((resolve) => setTimeout(resolve, 100)); // Let React render
                setTypingMemberName(member.name);
                setIsTyping(true);

                // Simulate reading/thinking delay so user clearly sees typing indicator
                await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 600));

                try {
                    const currentMessages = useChatStore.getState().conversations[character.id]?.messages || [];
                    // Build history with clear identity separation:
                    // - Current member's past messages → plain assistant role (these are "mine")
                    // - Other characters' messages → prefixed with [TheirName] (these are "theirs")
                    // - User messages → prefixed with [User]
                    const history = currentMessages.map((m) => ({
                        id: m.id,
                        role: m.role,
                        content: m.role === "user"
                            ? `<Message ID: ${m.id}> [User]: ${m.content || ""}`
                            : (m.senderId === member.id
                                ? (m.content || "")  // Own messages — no prefix, the AI knows these are "mine"
                                : `[${m.senderName || "Unknown"}]: ${m.content || ""}`  // Other characters — clearly marked
                            ),
                    }));

                    // Surface the last other-member's reply from THIS turn so this character can react to it
                    // Scope to assistant messages after the most recent user message to avoid stale cross-turn references
                    // Pass as separate groupCue field to avoid contaminating emotion/memory analysis
                    let groupCue: string | undefined;
                    const lastUserMsgIndex = currentMessages.reduce((acc, m, idx) => m.role === "user" ? idx : acc, -1);
                    const thisRoundMessages = lastUserMsgIndex >= 0 ? currentMessages.slice(lastUserMsgIndex + 1) : [];
                    const lastOtherMsg = [...thisRoundMessages].reverse().find(
                        m => m.role === "assistant" && m.senderId && m.senderId !== member.id
                    );
                    if (lastOtherMsg) {
                        const speakerName = lastOtherMsg.senderName || "Another member";
                        groupCue = `[${speakerName} just said: "${(lastOtherMsg.content || "").slice(0, 120)}"]`;
                    }

                    const res = await fetch("/api/roleplay", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            message: finalMessageText,
                            characterId: member.id,
                            characterName: member.name,
                            characterPersonality: member.personality,
                            characterTag: member.tag,
                            history: history.slice(-15),
                            context: "reply",
                            isGroupChat: true,
                            groupMembers: groupMemberNames,
                            creatorId: member.creatorId,
                            responseLanguage,
                            groupCue,
                            conversationType,
                            worldData,
                            storyData,
                        }),
                    });

                    if (res.ok) {
                        const data = await res.json();
                        if (data.action !== "ignore" && data.reply && data.reply !== "...") {
                            // Process response with correct member attribution
                            await processAiResponse(data.reply, member.id, member.name, data.delayFactor, data.replyToId);
                        }
                    }
                } catch (err) {
                    console.error(`Group member ${member.name} response failed:`, err);
                }
            }

            isAiRespondingRef.current = false;
            setIsTyping(false);
            setTypingMemberName(null);
            return;
        }

        if (isGroupChat) {
            // Empty-member world/story group: generate a narrator response
            // instead of silently returning with no reply.
            if ((conversationType === "story" || (conversationType === "world" && groupMemberIds.length === 0)) && activeGroupMemberChars.length === 0) {
                markAsSeen(character.id, "user");
                await new Promise((resolve) => setTimeout(resolve, 400 + Math.random() * 300));
                setIsTyping(true);
                isAiRespondingRef.current = true;
                try {
                    const responseLanguage = useChatStore.getState().responseLanguage;
                    const currentMessages = useChatStore.getState().conversations[character.id]?.messages || [];
                    const history = currentMessages.map((m) => ({
                        id: m.id,
                        role: m.role,
                        content: m.role === "user" ? `<Message ID: ${m.id}> [User]: ${m.content || ""}` : (m.content || ""),
                    }));
                    const res = await fetch("/api/roleplay", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            message: finalMessageText,
                            characterId: character.id,
                            characterName: "Narrator",
                            characterPersonality: "Omniscient narrator, descriptive storyteller",
                            characterTag: "Narrator",
                            history: history.slice(-15),
                            context: "reply",
                            isGroupChat: false,
                            groupMembers: [],
                            responseLanguage,
                            conversationType,
                            worldData,
                            storyData,
                        }),
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.reply && data.reply !== "..." && data.action !== "ignore") {
                            await processAiResponse(data.reply, character.id, "Narrator", data.delayFactor, data.replyToId);
                        }
                    }
                } catch (err) {
                    console.error("Narrator response failed:", err);
                } finally {
                    isAiRespondingRef.current = false;
                    setIsTyping(false);
                }
                return;
            }
            setIsTyping(false);
            showTransientNotice("Group members are unavailable right now. Please try again in a moment.");
            return;
        }

        // ─── NORMAL 1:1 CHAT ───
        // Don't show typing yet — wait for seen to appear first

        try {
            const responseLanguage = useChatStore.getState().responseLanguage;
            const currentMessages = useChatStore.getState().conversations[character.id]?.messages || [];
            const history = currentMessages.map((m) => ({
                id: m.id,
                role: m.role,
                content: m.role === "user" ? `<Message ID: ${m.id}> ${m.content || ""}` : (m.content || ""),
                attachment: m.attachment || undefined,
            }));

            const res = await fetch("/api/roleplay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: finalMessageText,
                    characterId: character.id,
                    characterName: conversationType === "story" ? "Narrator" : character.name,
                    characterPersonality: conversationType === "story" ? "Omniscient narrator, descriptive storyteller" : character.personality,
                    characterTag: conversationType === "story" ? "Narrator" : character.tag,
                    history: history.slice(-25),
                    context: "reply",
                    isGroupChat: false,
                    groupMembers: [],
                    responseLanguage,
                    creatorId: character.creatorId,
                    conversationType,
                    worldData,
                    storyData,
                }),
            });

            if (res.ok) {
                const data = await res.json();

                // AI-controlled seen delay: WAIT for seen to appear BEFORE typing
                const aiSeenDelay = data.seenDelay || (1000 + Math.random() * 2000);
                await new Promise((resolve) => setTimeout(resolve, aiSeenDelay));
                markAsSeen(character.id, "user");

                // AI-controlled read delay before typing starts
                const aiReadDelay = data.readDelay || (300 + Math.random() * 700);
                await new Promise((resolve) => setTimeout(resolve, aiReadDelay));

                // NOW show typing indicator
                setIsTyping(true);

                // Mark that AI is actively responding (pauses syncFromDB)
                isAiRespondingRef.current = true;

                if (data.action === "ignore") {
                    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 500));
                    setIsTyping(false);
                    isAiRespondingRef.current = false;
                } else {
                    if (!data.reply) {
                        // Reaction-only turn: cooldown stripped all text, nothing to render.
                        setIsTyping(false);
                        isAiRespondingRef.current = false;
                        return;
                    }
                    await processAiResponse(data.reply, undefined, undefined, data.delayFactor, data.replyToId);

                    // 🔥 Comfort Follow-up: If user is upset/angry/sad, AI sends a second wave of comfort messages
                    if (data.needsComfort && data.detectedEmotion) {
                        const comfortDelay = 800 + Math.random() * 1000;
                        await new Promise((resolve) => setTimeout(resolve, comfortDelay));

                        setIsTyping(true);

                        const updatedMessages = useChatStore.getState().conversations[character.id]?.messages || [];
                        const updatedHistory = updatedMessages.map((m) => ({
                            id: m.id,
                            role: m.role,
                            content: m.role === "user" ? `<Message ID: ${m.id}> ${m.content || ""}` : (m.content || ""),
                        }));

                        try {
                            const comfortRes = await fetch("/api/roleplay", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    message: "",
                                    characterId: character.id,
                                    characterName: conversationType === "story" ? "Narrator" : character.name,
                                    characterPersonality: conversationType === "story" ? "Omniscient narrator, descriptive storyteller" : character.personality,
                                    characterTag: conversationType === "story" ? "Narrator" : character.tag,
                                    history: updatedHistory.slice(-15),
                                    context: "comfort",
                                    isGroupChat: false,
                                    groupMembers: [],
                                    creatorId: character.creatorId,
                                    conversationType,
                                    worldData,
                                    storyData,
                                }),
                            });

                            if (comfortRes.ok) {
                                const comfortData = await comfortRes.json();
                                if (comfortData.reply && comfortData.reply !== "..." && comfortData.action !== "ignore") {
                                    await processAiResponse(comfortData.reply, undefined, undefined, comfortData.delayFactor);
                                } else {
                                    setIsTyping(false);
                                }
                            } else {
                                setIsTyping(false);
                            }
                        } catch {
                            setIsTyping(false);
                        }
                    }
                    isAiRespondingRef.current = false;

                    // 🔄 Process queued messages — user sent more while we were responding
                    if (pendingMessagesRef.current.length > 0) {
                        const queued = pendingMessagesRef.current;
                        pendingMessagesRef.current = [];
                        // Use the LAST queued message as the main trigger
                        // (AI will see all the queued messages in chat history anyway)
                        const lastMsg = queued[queued.length - 1];
                        console.log(`[Chat] 🔄 Processing ${queued.length} queued message(s), triggering on latest`);
                        // Small delay so the user sees their messages appear first
                        setTimeout(() => {
                            triggerAiResponse(lastMsg.text, lastMsg.repliedContent, lastMsg.repliedId)
                                .catch(err => console.error("Queued AI response failed:", err));
                        }, 300);
                    }
                }
            } else {
                addReply(character.id, "Hmm, I lost my train of thought.");
                setIsTyping(false);
                isAiRespondingRef.current = false;
            }
        } catch {
            addReply(character.id, "Something went wrong.");
            setIsTyping(false);
            isAiRespondingRef.current = false;
        }
    };


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            setUnreadMarkerId(null);
            sendMessage(character.id, "", { type: "image", url: base64 });
            triggerAiResponse("[User sent an image]");
        };
        reader.readAsDataURL(file);
    };

    const handleStickerClick = (label: string) => {
        setShowStickerPicker(false);
        const text = `[[STICKER: ${label}]]`;
        setUnreadMarkerId(null);
        sendMessage(character.id, text);
        triggerAiResponse(`[User sent a sticker: ${label}]`);
    };

    useEffect(() => {
        let mounted = true;
        let pollTimer: ReturnType<typeof setInterval> | null = null;

        const syncFromDB = async (isInitialLoad = false) => {
            // Skip sync while AI is actively sending messages to prevent avatar flash
            if (isAiRespondingRef.current && !isInitialLoad) return;

            try {
                const res = await fetch(`/api/messages?conversationId=${character.id}`);
                if (!res.ok || !mounted) return;

                const data = await res.json();
                const dbMessages: ChatMessage[] = data.messages || [];

                // DB is the single source of truth.
                // On EVERY sync, we replace local state with DB state.
                // The only exception: keep locally-added messages that haven't
                // been confirmed in the DB yet (optimistic updates).
                const localMsgs = useChatStore.getState().conversations[character.id]?.messages || [];
                const dbIds = new Set(dbMessages.map((m: ChatMessage) => m.id));

                const convo = useChatStore.getState().conversations[character.id];
                const clearedAt = convo?.clearedAt || 0;

                // Find messages that exist locally but not in DB — these are pending writes
                const pendingLocal = localMsgs.filter(m => !dbIds.has(m.id) && m.timestamp >= clearedAt);

                // Merge: preserve local reactions, seen status, and transcript content
                const localReactionsMap = new Map<string, Record<string, string[]>>();
                const localSeenIds = new Set<string>();
                const localContentMap = new Map<string, ChatMessage>();
                for (const m of localMsgs) {
                    if (m.reactions && Object.keys(m.reactions).length > 0) {
                        localReactionsMap.set(m.id, m.reactions);
                    }
                    if (m.status === "seen") {
                        localSeenIds.add(m.id);
                    }
                    // Track local messages that have real content (not placeholders)
                    // so we can prevent DB sync from reverting transcripts
                    if (m.attachment?.type === "audio" && m.content && m.content !== "__transcribing__" && m.content !== "__transcribing_failed__") {
                        localContentMap.set(m.id, m);
                    }
                }
                const mergedDbMessages = dbMessages
                    .filter((m: ChatMessage) => m.timestamp >= clearedAt)
                    .map((dbMsg: ChatMessage) => {
                        let merged = dbMsg;
                        const localReactions = localReactionsMap.get(dbMsg.id);
                        if (localReactions && (!dbMsg.reactions || JSON.stringify(dbMsg.reactions) !== JSON.stringify(localReactions))) {
                            merged = { ...merged, reactions: localReactions };
                        }
                        // If locally marked as seen but DB still says sent, keep seen
                        if (localSeenIds.has(dbMsg.id) && dbMsg.status !== "seen") {
                            merged = { ...merged, status: "seen" as const };
                        }
                        // CRITICAL: If local has real transcript but DB still says __transcribing__,
                        // keep the local transcript content (POST may not have completed yet)
                        const localVersion = localContentMap.get(dbMsg.id);
                        if (localVersion && (dbMsg.content === "__transcribing__" || dbMsg.content === "__transcribing_failed__")) {
                            merged = { ...merged, content: localVersion.content };
                        }
                        return merged;
                    });

                // Combine: DB messages (truth with merged reactions) + pending local messages
                const finalMessages = [...mergedDbMessages, ...pendingLocal].sort((a, b) => a.timestamp - b.timestamp);

                if (mounted) {
                    useChatStore.getState().setMessages(character.id, finalMessages);
                    setMessages(finalMessages);
                }
            } catch (err) {
                // Silently fail — we'll retry on next poll
                if (isInitialLoad) {
                    console.error("Failed to fetch messages:", err);
                }
            } finally {
                if (isInitialLoad && mounted) setIsFetchingMessages(false);
            }
        };

        // Initial load from DB
        syncFromDB(true);

        // Poll every 3 seconds — DB is always the authority
        pollTimer = setInterval(() => syncFromDB(false), 3000);

        const unsub = useChatStore.subscribe((state) => {
            const convo = state.conversations[character.id];
            setMessages(convo?.messages || []);
        });

        return () => {
            mounted = false;
            if (pollTimer) clearInterval(pollTimer);
            unsub();
        };
    }, [character.id, groupMemberChars.length, isFetchingMessages, isGroupChat, resolveMissingGroupMembers]);

    // Mark incoming AI messages as seen after a short delay
    // React's effect cleanup ensures only one timer runs at a time
    useEffect(() => {
        const hasUnseen = messages.some(m => m.role === "assistant" && m.status !== "seen");
        if (hasUnseen) {
            const seenTimer = setTimeout(() => {
                markAsSeen(character.id, "assistant");
            }, 1200);
            return () => clearTimeout(seenTimer);
        }
        if (unreadMarkerId && !hasUnseen) {
            const timer = setTimeout(() => {
                setUnreadMarkerId(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [messages, character.id, markAsSeen, unreadMarkerId]);

    useEffect(() => {
        // On initial load (still fetching), jump instantly to the bottom without animation.
        // During normal conversation use smooth scrollIntoView for a polished feel.
        if (isFetchingMessages) {
            const scrollArea = document.querySelector('.chatroom-messages-area');
            if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight;
        } else {
            const endEl = document.querySelector('.chatroom-messages-area .chatroom-messages-end');
            if (endEl) {
                (endEl as HTMLElement).scrollIntoView({ behavior: "smooth", block: "end" });
            }
        }
    }, [messages.length, isTyping, isFetchingMessages]);

    useEffect(() => {
        if (isFetchingMessages) return; // Wait until API finishes loading

        const convo = useChatStore.getState().conversations[character.id];
        if (!convo || convo.messages.length === 0) {
            // Ensure the conversation record exists before adding messages
            useChatStore.getState().ensureConversation(character.id);
            if (isGroupChat) {
                // Guard: only trigger once
                if (groupIntroTriggered.current) return;
                let isIntroEffectActive = true;

                // No welcome message — characters start interacting immediately like an anime group chat
                // Each character introduces themselves / reacts to being in the group
                (async () => {
                    const introMembers = groupMemberChars.length > 0
                        ? groupMemberChars
                        : await resolveMissingGroupMembers();

                    if (!isIntroEffectActive || groupIntroTriggered.current || introMembers.length === 0) {
                        return;
                    }

                    groupIntroTriggered.current = true;

                    // No welcome message - characters start interacting immediately like an anime group chat
                    const groupMemberNames = introMembers.map((c: Character) => c.name);
                    const shuffled = [...introMembers].sort(() => Math.random() - 0.5);

                    // Snapshot language once for the entire intro loop
                    const introResponseLanguage = useChatStore.getState().responseLanguage;

                    for (let i = 0; i < shuffled.length; i++) {
                        const member = shuffled[i];

                        // Natural delay between each character
                        const delay = i === 0 ? 800 : (1500 + Math.random() * 2500);
                        await new Promise(r => setTimeout(r, delay));

                        // Clear and re-set typing for this specific member
                        setIsTyping(false);
                        await new Promise(r => setTimeout(r, 100)); // Let React render
                        setTypingMemberName(member.name);
                        setIsTyping(true);

                        // Typing delay
                        await new Promise(r => setTimeout(r, 1000 + Math.random() * 1500));

                        try {
                            const currentMessages = useChatStore.getState().conversations[character.id]?.messages || [];
                            const history = currentMessages.map((m) => ({
                                id: m.id,
                                role: m.role,
                                content: m.senderName
                                    ? `[${m.senderName}]: ${m.content || ""}`
                                    : (m.role === "user" ? `[User]: ${m.content || ""}` : (m.content || "")),
                            }));

                            // Build a context-aware prompt for each character
                            const isFirst = i === 0;
                            const previousNames = shuffled.slice(0, i).map(m => m.name).join(", ");
                            const introPrompt = isFirst
                                ? `System: A new group chat was just created with ${groupMemberNames.join(", ")} and the user. You are ${member.name} (${member.tag}). Your personality: "${member.personality}". Be the FIRST to speak! React naturally — you might be excited, confused, annoyed, or curious about who's in this group. Stay 100% in character. Keep it short (1-2 messages max). Do NOT greet formally. Act like your anime character would when randomly thrown into a group chat.`
                                : `System: A group chat was just created. ${previousNames} already said something above. You are ${member.name} (${member.tag}). Your personality: "${member.personality}". React to what they said OR introduce yourself in your own way. You can tease them, argue, agree, or be dramatic — whatever fits your personality. Stay 100% in character. Keep it short. Think anime group dynamics.`;

                            const res = await fetch("/api/roleplay", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    message: introPrompt,
                                    characterId: member.id,
                                    characterName: member.name,
                                    characterPersonality: member.personality,
                                    characterTag: member.tag,
                                    history: history.slice(-15),
                                    context: "reply",
                                    isGroupChat: true,
                                    groupMembers: groupMemberNames,
                                    creatorId: member.creatorId,
                                    responseLanguage: introResponseLanguage,
                                    conversationType,
                                    worldData,
                                    storyData,
                                }),
                            });

                            if (res.ok) {
                                const data = await res.json();
                                if (data.reply && data.reply !== "..." && data.action !== "ignore") {
                                    await processAiResponse(data.reply, member.id, member.name, data.delayFactor);
                                }
                            }
                        } catch (err) {
                            console.error(`Group intro for ${member.name} failed:`, err);
                        }
                    }

                    setIsTyping(false);
                    setTypingMemberName(null);
                })();
                return () => {
                    isIntroEffectActive = false;
                };
            } else if (conversationType !== "story") {
                addReply(character.id, character.greeting);
            }
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
    }, [character.id, groupMemberChars.length, isFetchingMessages, isGroupChat, resolveMissingGroupMembers]);

    const handleSetupComplete = (setupData: string) => {
        setHasCompletedSetup(true);
        if (!setupData) {
            triggerAiResponse("Hello!");
            return;
        }

        const initialPrompt = `[SYSTEM BACKGROUND INFORMATION FOR THIS ROLEPLAY:\n${setupData}]\n\n*The user has just entered the chat.* Greet them based on this background context!`;
        triggerAiResponse(initialPrompt);
    };

    const isSpecialist = character.tag === 'Specialist';
    const needsSpecialistSetup = isSpecialist && !isFetchingMessages && messages.length === 0 && !hasCompletedSetup;

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
        setUnreadMarkerId(null);

        const repliedId = replyingTo?.id;
        const repliedContent = replyingTo?.content;
        setReplyingTo(null);

        sendMessage(character.id, text, undefined, repliedId);


        // Fire-and-forget: don't block the UI — user can keep typing
        triggerAiResponse(text, repliedContent, repliedId)
            .catch(err => console.error("AI response failed:", err));
    };

    // Voice recording completion handler
    const handleVoiceRecordComplete = async (blob: Blob, duration: number) => {
        // 1. Convert Blob to base64 for persistent storage via Zustand
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            
            // 2. Add an optimistic audio message with no text (to be filled later)
            // But we need the message ID to update it later. 
            // In ChatStore `sendMessage` creates the ID inside.
            // For now, we'll send a system placeholder or use a workaround:
            // Let's create an explicit text message with an audio attachment.
            
            // A small hack: generate a unique temporary id, but ChatStore doesn't expose standard creation.
            // We'll just rely on the audio attachment being stored. If we need to update *that specific* message,
            // we will need an updateMessage method.
            // Actually, `useChatStore.getState().sendMessage` does not return ID right now.
            // Let's send the audio alone first.
            sendMessage(character.id, "__transcribing__", { type: "audio", url: base64Audio, duration });
            
            // 3. Upload raw Blob to /api/voice for transcription
            try {
                const formData = new FormData();
                const mimeType = blob.type || "audio/webm";
                const ext = mimeType.includes("webm") ? "webm" : "ogg";
                formData.append("audio", blob, `voice.${ext}`);

                const res = await fetch("/api/voice", {
                    method: "POST",
                    body: formData,
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.text && data.text.trim()) {
                        // 4. Update the LAST user message (the audio one we just sent) with the new text.
                        // We reach into the store to find it and overwrite the text.
                        let updatedMessage: ChatMessage | null = null;
                        
                        useChatStore.setState((state) => {
                            const convo = state.conversations[character.id];
                            if (!convo) return state;
                            const messages = [...convo.messages];
                            const lastUserAudioMsgIndex = messages.findLastIndex(m => m.role === "user" && m.attachment?.type === "audio" && m.content === "__transcribing__");
                            if (lastUserAudioMsgIndex !== -1) {
                                messages[lastUserAudioMsgIndex] = { ...messages[lastUserAudioMsgIndex], content: data.text.trim() };
                                updatedMessage = messages[lastUserAudioMsgIndex];
                            }
                            return {
                                conversations: {
                                    ...state.conversations,
                                    [character.id]: {
                                        ...convo,
                                        messages
                                    }
                                }
                            };
                        });
                        
                        // Sync the updated transcript message to the backend immediately
                        // so poll timer doesn't overwrite it with the old __transcribing__ string
                        if (updatedMessage) {
                            const convoForSync = useChatStore.getState().conversations[character.id];
                            const buildMeta = (c: any) => {
                                if (!c) return undefined;
                                if (!c.groupName && !c.groupImage && !c.groupMemberIds && !c.worldData && !c.storyData) return undefined;
                                return { groupName: c.groupName || null, groupImage: c.groupImage || null, groupMemberIds: c.groupMemberIds || null, worldData: c.worldData || null, storyData: c.storyData || null };
                            };
                            await fetch("/api/messages", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    conversationId: character.id,
                                    messages: [updatedMessage],
                                    conversationType: convoForSync?.conversationType || conversationType,
                                    conversationMetadata: buildMeta(convoForSync),
                                })
                            }).catch(err => console.error("Failed to sync transcript:", err));
                        }
                        
                        // 5. Finally, trigger AI response to the transcript
                        triggerAiResponse(data.text.trim())
                            .catch(err => console.error("AI response failed (voice):", err));
                    }
                } else {
                    console.error("[Voice] Transcription failed:", res.status);
                    // Update fallback text
                    useChatStore.setState((state) => {
                        const convo = state.conversations[character.id];
                        if (!convo) return state;
                        const messages = [...convo.messages];
                        const lastUserAudioMsgIndex = messages.findLastIndex(m => m.role === "user" && m.attachment?.type === "audio" && m.content === "__transcribing__");
                        if (lastUserAudioMsgIndex !== -1) {
                            messages[lastUserAudioMsgIndex] = { ...messages[lastUserAudioMsgIndex], content: "__transcribing_failed__" };
                        }
                        return { conversations: { ...state.conversations, [character.id]: { ...convo, messages } } };
                    });
                }
            } catch (err) {
                console.error("[Voice] Network error:", err);
            }
        };
        reader.readAsDataURL(blob);
    };

    const resolveReactionTargetMessageId = (requestedMessageId?: string, explicitReplyToId?: string, reactingSenderId?: string) => {
        const currentMessages = useChatStore.getState().conversations[character.id]?.messages || [];
        const knownMessageIds = new Set(currentMessages.map((message) => message.id));

        if (requestedMessageId && knownMessageIds.has(requestedMessageId)) {
            return requestedMessageId;
        }

        if (explicitReplyToId && knownMessageIds.has(explicitReplyToId)) {
            return explicitReplyToId;
        }

        for (let index = currentMessages.length - 1; index >= 0; index -= 1) {
            const message = currentMessages[index];

            if (!message?.id) continue;
            if (message.content === "__transcribing__" || message.content === "__transcribing_failed__") continue;

            if (reactingSenderId) {
                if (message.role === "assistant" && message.senderId === reactingSenderId) continue;
                if (message.role === "assistant" && !message.senderId) continue;
                return message.id;
            }

            if (message.role === "user") {
                return message.id;
            }
        }

        return requestedMessageId || explicitReplyToId || "";
    };

    // Process AI response and handle splitting
    const processAiResponse = async (responseText: string, groupSenderId?: string, groupSenderName?: string, delayFactor = 1.0, replyToId?: string) => {
        let cleanText = responseText;

        // 1. Extract and process REACT tags (wrapped in try-catch for Myanmar text safety)
        try {
            const emojiToReactionId: Record<string, string> = {
                "\uD83D\uDC4D": "like", "\uD83D\uDC4D\uFE0F": "like", "thumbs up": "like", "thumbsup": "like",
                "\u2764\uFE0F": "love", "\u2764": "love", "heart": "love",
                "\uD83D\uDE02": "haha", "laughing": "haha", "lol": "haha",
                "\uD83D\uDE2E": "wow", "surprised": "wow", "shock": "wow",
                "\uD83D\uDE22": "sad", "crying": "sad", "cry": "sad",
            };
            const validReactionIds = ["like", "love", "haha", "wow", "sad"];

            // Broad regex: captures [[REACT:...]] with 1 or 2 colon-separated values
            // Handles: [[REACT:msg_id:like]], [[REACT::like]], [[REACT:like]], [[REACT : like]]
            const reactRegex = /\[\[\s*REACT\s*[:\s]\s*(.*?)\s*\]+/gi;
            let reactMatch;
            const reactionActorId = groupSenderId || character.id;
            while ((reactMatch = reactRegex.exec(cleanText)) !== null) {
                const inner = reactMatch[1].trim(); // e.g. "msg_id:like", ":like", "like"
                const parts = inner.split(/[,:]+/).map(p => p.trim()).filter(p => p);
                
                let msgId = "";
                let reactionRaw = "";
                
                if (parts.length >= 2) {
                    msgId = parts[0];
                    reactionRaw = parts[1];
                } else if (parts.length === 1) {
                    // AI omitted message ID, just sent the reaction type
                    reactionRaw = parts[0];
                }
                
                if (reactionRaw) {
                    let reactionId = reactionRaw.toLowerCase();
                    // Normalize emoji/text to standard reaction ID
                    if (emojiToReactionId[reactionId]) {
                        reactionId = emojiToReactionId[reactionId];
                    } else if (emojiToReactionId[reactionRaw]) {
                        reactionId = emojiToReactionId[reactionRaw];
                    }
                    const targetMessageId = resolveReactionTargetMessageId(msgId, replyToId, groupSenderId);

                    if (validReactionIds.includes(reactionId) && targetMessageId) {
                        useChatStore.getState().addReaction(character.id, targetMessageId, reactionId, reactionActorId);
                    }
                }
            }
            cleanText = cleanText.replace(reactRegex, "");
        } catch (e) {
            console.warn("[ChatRoom] REACT tag processing failed:", e);
        }
        // Final safety: strip any remaining [[REACT...]] tags that weren't matched
        // Using ]+ ensures we consume all closing brackets even if malformed
        cleanText = cleanText.replace(/\[\[\s*REACT.*?\]+/gi, "");

        // 2. Safety: Strip any leaked message IDs or reply tags from the AI output
        // The AI no longer generates [[REPLY:xxx]] tags, but may still echo message IDs from history
        cleanText = cleanText
            .replace(/<Message ID:\s*[^>]+>/gi, "")           // <Message ID: xxx>
            .replace(/\[MessageID:\s*[^\]]+\]/gi, "")          // [MessageID: xxx]
            .replace(/\[\[\s*REPLY\s*:\s*[^\]]*\]+/gi, "")     // [[REPLY:xxx]] safety net
            .replace(/\[REPLY\s*:\s*[^\]]*\]/gi, "")           // [REPLY:xxx] single bracket
            .replace(/\[\[\s*RE?P?L?Y?[^\]]*\]*/gi, "")        // Catch partial broken tags like `[[RE` or `[[REP`
            .replace(/[a-zA-Z0-9]{13,}-(?:ai|user)-[a-z0-9]+/gi, "")    // Raw message IDs
            .replace(/^\]+\s*/g, "")                            // Aggressively strip `]]` or `]] ` at the very start
            .replace(/(?<=^|\s)\]+(?=\s|[a-zA-Zက-အ])/g, "")      // Strip stray `]]` in the middle, even if joined to a word (English or Myanmar)
            .replace(/\s{2,}/g, " ")                            // Clean double spaces
            .trim();

        // Protect pipes inside [[ ]] blocks so UI elements don't get split into separate chat bubbles
        let protectedText = cleanText.replace(/\[{1,3}([\s\S]*?)(?:\]{1,3}|$)/g, (match) => match.replace(/\|/g, "@@PIPE@@"));

        // First split by explicit pipe separator
        const initialParts = protectedText
            .split("|")
            .map((p) => p.replace(/@@PIPE@@/g, "|").trim().replace(/^["']+|["']+$/g, "").trim())
            .filter((p) => p);

        // Then split any part that contains both text and sticker so they become separate bubbles
        const finalParts: string[] = [];
        // Robust regex: case insensitive, allows spaces
        const stickerRegex = /(\[\[\s*STICKER\s*:.*?\]+)/gi;

        for (const part of initialParts) {
            const subParts = part
                .split(stickerRegex)
                .map((p) => p.trim())
                .filter((p) => p);
            finalParts.push(...subParts);
        }

        // If the AI only sent a reaction tag with no text content, that is valid.
        // The reaction was already applied above — no chat bubble is needed.
        if (finalParts.length === 0) {
            setIsTyping(false);
            isAiRespondingRef.current = false;
            return;
        }

        await sendAiSequence(finalParts, replyToId, groupSenderId, groupSenderName, delayFactor);
    };

    // Send AI messages sequentially with typing delay
    const sendAiSequence = async (parts: string[], replyToId?: string, groupSenderId?: string, groupSenderName?: string, delayFactor = 1.0) => {
        if (parts.length === 0) {
            setIsTyping(false);
            return;
        }

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isSticker = /^\[\[\s*STICKER\s*:.*?\]+$/i.test(part.trim());

            // ─── REALISTIC PAUSE BETWEEN MESSAGES ───
            // Instead of instantly typing the next message, a real person pauses
            // to catch their breath or read what they just sent. 
            if (i > 0) {
                setIsTyping(false);
                // Pause for 1.5 to 2.5 seconds before starting to type again
                await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));
            }

            // Show typing indicator (skip for stickers)
            if (isSticker) {
                setIsTyping(false);
            } else {
                setIsTyping(true);
            }

            // ─── REALISTIC TYPING SPEED ───
            // Telegram/Messenger feel: Human types ~200 chars/min = ~3-4 chars/sec.
            // Minimum 1 second for short messages, scaled realistically for long ones.
            const typingTime = isSticker
                ? 100
                : Math.max(1000, (600 + part.length * 30 + Math.random() * 400) * delayFactor);

            await new Promise((resolve) => setTimeout(resolve, typingTime));

            // Use group-specific reply method if sender info is provided
            if (groupSenderId && groupSenderName) {
                addGroupReply(character.id, part, groupSenderId, groupSenderName, undefined, i === 0 ? replyToId : undefined);
            } else {
                // Only attach replyToId to the FIRST message in the sequence
                addReply(character.id, part, undefined, i === 0 ? replyToId : undefined);
            }
        }

        setIsTyping(false);
    };

    // Proactive messaging (Double texting)
    useEffect(() => {
        if (messages.length === 0 || isBlocked || isGroupChat || conversationType === "story") return;

        const lastMsg = messages[messages.length - 1];

        // Only activate if the last message was from AI
        if (lastMsg.role !== "assistant") return;

        // Determine if character is cold/stoic
        const isCold = /cold|stoic|tsundere|quiet|mysterious|aloof|shy/i.test(
            character.tag + character.personality
        );

        // Cold: wait 3-5 minutes, Regular: wait 1.5-3 minutes
        const delay = isCold
            ? 180000 + Math.random() * 120000   // 3-5 min
            : 90000 + Math.random() * 90000;    // 1.5-3 min

        const timer = setTimeout(async () => {
            // Don't double text if AI is currently typing, or user has typed something
            if (isTyping || input.trim() || isAiRespondingRef.current) return;

            // Probability gate: Cold = 5%, Regular = 50%
            const chance = isCold ? 0.05 : 0.5;
            if (Math.random() > chance) return;

            setIsTyping(true);
            isAiRespondingRef.current = true;
            try {
                const history = messages.map((m) => ({
                    id: m.id,
                    role: m.role,
                    content: m.role === "user" ? `<Message ID: ${m.id}> ${m.content || ""}` : (m.content || ""),
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
                        await processAiResponse(data.reply, undefined, undefined, data.delayFactor);
                    } else {
                        setIsTyping(false);
                        isAiRespondingRef.current = false;
                    }
                } else {
                    setIsTyping(false);
                    isAiRespondingRef.current = false;
                }
            } catch {
                setIsTyping(false);
                isAiRespondingRef.current = false;
            }
        }, delay);

        return () => clearTimeout(timer);
    }, [messages, character, isTyping, input]); // Reset timer on message or input change

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Keep viewport writes on a single path:
    // - iOS uses direct DOM mutation to stay in sync with visualViewport.
    // - Android uses React state to size the room.
    useEffect(() => {
        if (typeof window === "undefined") return;
        const chatroomEl = chatroomRef.current;
        const visualViewport = window.visualViewport;

        if (!chatroomEl) return;

        if (isIOS && !initialChatroomInlineStylesRef.current) {
            initialChatroomInlineStylesRef.current = {
                height: chatroomEl.style.height,
                transform: chatroomEl.style.transform,
            };
        }

        const restoreChatroomViewportStyles = () => {
            const target = chatroomRef.current;
            if (!target) return;

            const initialStyles = initialChatroomInlineStylesRef.current;
            target.style.height = initialStyles?.height ?? "";
            target.style.transform = initialStyles?.transform ?? "";
        };

        const syncViewport = () => {
            const nextHeight = Math.round(visualViewport?.height ?? window.innerHeight);
            const nextOffsetTop = Math.round(visualViewport?.offsetTop ?? 0);
            const lastMetrics = lastViewportMetricsRef.current;

            if (lastMetrics.height === nextHeight && lastMetrics.offsetTop === nextOffsetTop) {
                return;
            }

            lastViewportMetricsRef.current = { height: nextHeight, offsetTop: nextOffsetTop };

            if (isIOS) {
                if (nextOffsetTop === 0) {
                    if (restingViewportHeightRef.current === null || nextHeight >= restingViewportHeightRef.current) {
                        restingViewportHeightRef.current = nextHeight;
                    }
                }

                const restingHeight = restingViewportHeightRef.current ?? nextHeight;
                const isViewportSettled = nextOffsetTop === 0 && nextHeight >= restingHeight - 1;

                if (isViewportSettled) {
                    restoreChatroomViewportStyles();
                    return;
                }

                const nextHeightValue = `${nextHeight}px`;
                const nextTransformValue = nextOffsetTop > 0 ? `translateY(${nextOffsetTop}px)` : "";

                if (chatroomEl.style.height !== nextHeightValue) {
                    chatroomEl.style.height = nextHeightValue;
                }

                if (chatroomEl.style.transform !== nextTransformValue) {
                    chatroomEl.style.transform = nextTransformValue;
                }

                return;
            }

            setViewportHeight((currentHeight) => {
                if (typeof currentHeight === "number" && currentHeight === nextHeight) {
                    return currentHeight;
                }
                return nextHeight;
            });
        };

        const scheduleViewportSync = () => {
            if (viewportSyncFrameRef.current !== null) return;

            viewportSyncFrameRef.current = window.requestAnimationFrame(() => {
                viewportSyncFrameRef.current = null;
                syncViewport();
            });
        };

        if (visualViewport) {
            visualViewport.addEventListener("resize", scheduleViewportSync);
            scheduleViewportSync();
        } else if (!isIOS) {
            setViewportHeight(window.innerHeight);
        }

        return () => {
            if (viewportSyncFrameRef.current !== null) {
                window.cancelAnimationFrame(viewportSyncFrameRef.current);
                viewportSyncFrameRef.current = null;
            }

            if (visualViewport) {
                visualViewport.removeEventListener("resize", scheduleViewportSync);
            }

            if (isIOS) {
                restoreChatroomViewportStyles();
            }

            lastViewportMetricsRef.current = { height: null, offsetTop: null };
            restingViewportHeightRef.current = null;
        };
    }, [isIOS]);

    useEffect(() => {
        if (typeof window === "undefined" || !isIOS) return;

        const chatroomEl = chatroomRef.current;
        if (!chatroomEl) return;

        const interactiveSelector = [
            "textarea",
            "input",
            "select",
            "button",
            "a",
            "label",
            "[contenteditable=\"\"]",
            "[contenteditable=\"true\"]",
            "[role=\"textbox\"]",
        ].join(", ");
        const scrollableSelector = [
            ".chatroom-messages-area",
            ".chatroom-info-drawer",
            ".sticker-drawer",
            ".profile-page",
            ".profile-body",
        ].join(", ");

        const handleTouchMove = (e: TouchEvent) => {
            const target = e.target;
            if (!(target instanceof HTMLElement)) return;

            if (target.closest(interactiveSelector)) return;
            if (target.closest(scrollableSelector)) return;

            e.preventDefault();
        };

        chatroomEl.addEventListener("touchmove", handleTouchMove, { passive: false });

        return () => {
            chatroomEl.removeEventListener("touchmove", handleTouchMove);
        };
    }, [isIOS]);

    return (
        <div
            ref={chatroomRef}
            className={`chatroom ${conversationTheme}`}
            style={isIOS ? undefined : { height: typeof viewportHeight === "number" ? `${viewportHeight}px` : viewportHeight }}
        >
            <div className="chatroom-bg-pattern" />
            {/* ── Header ─────────────────────────── */}
            <motion.div
                className="chatroom-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <motion.button
                    className="chatroom-back"
                    onTap={() => setTimeout(() => onBack(), 10)}
                    whileTap={{ scale: 0.9 }}
                    aria-label="Go back"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M15 4L7 12L15 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </motion.button>
                <div
                    className="chatroom-header-center"
                    onClick={() => void openHeaderProfile()}
                    style={{ cursor: "pointer" }}
                >
                    <div className="chatroom-header-avatar-wrap">
                        <div className="chatroom-header-avatar">
                            <img src={character.image} alt={character.name} />
                        </div>
                        <span className="chatroom-header-online-ring" />
                    </div>
                    <div className="chatroom-header-info">
                        <span className="chatroom-header-name">{displayName}</span>
                        <span className="chatroom-header-status">
                            <span className="chatroom-status-dot" />
                            Online
                        </span>
                    </div>
                </div>
                <div className="chatroom-header-actions" style={{ position: "relative" }}>
                    <button
                        className="chatroom-action-btn"
                        aria-label="Character info"
                        onClick={() => void openHeaderProfile()}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                    <button
                        className="chatroom-action-btn"
                        aria-label="More"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!showMenu && isTrueAstrologer) {
                                setShowStandardMenu(false); // Reset to astrology menu first
                            }
                            setShowMenu(!showMenu);
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="6" r="1.5" fill="currentColor" />
                            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                            <circle cx="12" cy="18" r="1.5" fill="currentColor" />
                        </svg>
                    </button>
                    <AnimatePresence>
                        {showMenu && (
                            isTrueAstrologer && !showStandardMenu ? (
                                <AstrologerMenu
                                    onAction={(prompt, desc) => {
                                        // Send as normal user message, but hidden triggers
                                        const finalPrompt = `[SYSTEM: User clicked macro button. Generate response for:] ${prompt}`;
                                        sendMessage(character.id, desc || "Selected an option...", undefined, undefined);
                                        triggerAiResponse(finalPrompt);
                                    }}
                                    onOpenStandardMenu={() => setShowStandardMenu(true)}
                                    onUpdateProfile={() => {
                                        setShowMenu(false);
                                        setIsAstroProfileModalOpen(true);
                                    }}
                                    onClose={() => setShowMenu(false)}
                                />
                            ) : (
                                <motion.div
                                    ref={menuRef}
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    transition={{ duration: 0.15 }}
                                    style={{
                                        position: "absolute",
                                        top: "40px",
                                        right: "0",
                                        background: "rgba(255, 255, 255, 0.9)",
                                        backdropFilter: "blur(10px)",
                                        WebkitBackdropFilter: "blur(10px)",
                                        border: "1px solid rgba(0,0,0,0.06)",
                                        borderRadius: "16px",
                                        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                                        padding: "6px",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "4px",
                                        minWidth: "150px",
                                        zIndex: 100,
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {isTrueAstrologer && (
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setShowStandardMenu(false);
                                            }}
                                            style={{
                                                display: "flex", alignItems: "center", gap: "8px",
                                                background: "rgba(139, 92, 246, 0.1)", border: "none", padding: "10px 12px",
                                                borderRadius: "10px", cursor: "pointer",
                                                color: "#6D28D9", fontSize: "14px", fontWeight: 600,
                                                marginBottom: "4px"
                                            }}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                            Back to Astrologer
                                        </button>
                                    )}
                                    {/* ── Publish Story Action ── */}
                                    {conversationType === "story" && (!convoFromStore?.creatorId || convoFromStore.creatorId === ownerUserId) && (() => {
                                        const isActuallyPendingSync = convoFromStore?._pendingSync && !convoFromStore?._syncFailedAt && !convoFromStore?.creatorId;
                                        return (
                                            <button
                                                disabled={isPublishingStory || storyData?.isPublished || isActuallyPendingSync}
                                                onClick={async (e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setIsPublishingStory(true);
                                                    try {
                                                        const updatedStoryData = {
                                                            ...(storyData || { synopsis: "", genre: "", isPublished: false, playerCharacterName: "", playerCharacterDescription: "" }),
                                                            synopsis: storyData?.synopsis || character.description || "",
                                                            genre: storyData?.genre || character.tag || "",
                                                            isPublished: true,
                                                        };
                                                        const publishPayload = {
                                                            id: character.id,
                                                            name: convoFromStore?.groupName || character.name,
                                                            image: convoFromStore?.groupImage || character.image,
                                                            synopsis: updatedStoryData.synopsis,
                                                            genre: updatedStoryData.genre,
                                                            story_data: updatedStoryData,
                                                            world_data: worldData || null,
                                                            is_published: true,
                                                        };

                                                        let res = await fetch("/api/stories", {
                                                            method: "POST",
                                                            headers: { "Content-Type": "application/json" },
                                                            body: JSON.stringify(publishPayload),
                                                        });

                                                        // Fallback to metadata preflight if 403 (draft not found)
                                                        if (!res.ok && res.status === 403) {
                                                            if (convoFromStore?._syncFailedAt || !isActuallyPendingSync) {
                                                                const preflightRes = await fetch("/api/messages", {
                                                                    method: "POST",
                                                                    headers: { "Content-Type": "application/json" },
                                                                    body: JSON.stringify({
                                                                        conversationId: character.id,
                                                                        conversationType: "story",
                                                                        conversationMetadata: {
                                                                            groupName: convoFromStore?.groupName || character.name,
                                                                            groupImage: convoFromStore?.groupImage || character.image,
                                                                            groupMemberIds: null,
                                                                            worldData: worldData || null,
                                                                            storyData: storyData || { synopsis: "", genre: "", isPublished: false }
                                                                        }
                                                                    })
                                                                });
                                                                if (!preflightRes.ok) {
                                                                    alert("Failed to sync story metadata. Please try again.");
                                                                    return;
                                                                }
                                                                // Retry publish
                                                                res = await fetch("/api/stories", {
                                                                    method: "POST",
                                                                    headers: { "Content-Type": "application/json" },
                                                                    body: JSON.stringify(publishPayload),
                                                                });
                                                            }
                                                        }

                                                        if (res.ok) {
                                                            // Update local storyData and ownership to reflect published status
                                                            useChatStore.getState().upsertConversation(character.id, {
                                                                storyData: updatedStoryData,
                                                                creatorId: ownerUserId || undefined
                                                            });

                                                            // Backend now atomically updates conversation_metadata during /api/stories POST,
                                                            // so we no longer need a separate, chained call here.

                                                            alert("Story published successfully!");
                                                        } else {
                                                            const data = await res.json().catch(() => ({}));
                                                            alert(data.error || "Failed to publish story.");
                                                        }
                                                    } catch (err) {
                                                        console.error("Failed to publish story:", err);
                                                        alert("Network error while publishing.");
                                                    } finally {
                                                        setIsPublishingStory(false);
                                                        setShowMenu(false);
                                                    }
                                                }}
                                                style={{
                                                    display: "flex", alignItems: "center", gap: "8px",
                                                    background: storyData?.isPublished ? "rgba(16,185,129,0.08)" : isActuallyPendingSync ? "rgba(156,163,175,0.08)" : "rgba(59,130,246,0.08)",
                                                    border: "none", padding: "10px 12px",
                                                    borderRadius: "10px",
                                                    cursor: storyData?.isPublished || isPublishingStory || isActuallyPendingSync ? "default" : "pointer",
                                                    color: storyData?.isPublished ? "#10B981" : isActuallyPendingSync ? "#9CA3AF" : "#3B82F6",
                                                    fontSize: "14px", fontWeight: 600,
                                                    opacity: storyData?.isPublished || isPublishingStory || isActuallyPendingSync ? 0.7 : 1,
                                                    marginBottom: "4px",
                                                }}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                {isPublishingStory ? "Publishing..." : isActuallyPendingSync ? "Syncing Draft..." : storyData?.isPublished ? "Published ✓" : "Publish Story"}
                                            </button>
                                        );
                                    })()}
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            useChatStore.getState().clearConversation(character.id);
                                            setShowMenu(false);
                                        }}
                                        style={{
                                            display: "flex", alignItems: "center", gap: "8px",
                                            background: "transparent", border: "none", padding: "10px 12px",
                                            borderRadius: "10px", cursor: "pointer",
                                            color: "#4A3728", fontSize: "14px", fontWeight: 500,
                                            transition: "background 0.2s"
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.04)"}
                                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z" fill="currentColor" /></svg>
                                        Clear Chat
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setShowMenu(false);
                                            setShowDeleteModal(true);
                                        }}
                                        style={{
                                            display: "flex", alignItems: "center", gap: "8px",
                                            background: "transparent", border: "none", padding: "10px 12px",
                                            borderRadius: "10px", cursor: "pointer",
                                            color: "#EF4444", fontSize: "14px", fontWeight: 500,
                                            transition: "background 0.2s"
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239,68,68,0.1)"}
                                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <path d="M5 7h14M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                            <path d="M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                                        </svg>
                                        Delete Chat
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            useChatStore.getState().toggleBlock(character.id);
                                            setShowMenu(false);
                                        }}
                                        style={{
                                            display: "flex", alignItems: "center", gap: "8px",
                                            background: "transparent", border: "none", padding: "10px 12px",
                                            borderRadius: "10px", cursor: "pointer",
                                            color: "#EF4444", fontSize: "14px", fontWeight: 500,
                                            transition: "background 0.2s"
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239,68,68,0.1)"}
                                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                    >
                                        {isBlocked ? (
                                            <>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z" fill="currentColor" /></svg>
                                                Unblock
                                            </>
                                        ) : (
                                            <>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9l11.21 11.21C15.55 19.37 13.85 20 12 20zm6.31-3.1l-11.21-11.21C8.45 4.63 10.15 4 12 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z" fill="currentColor" /></svg>
                                                Block
                                            </>
                                        )}
                                    </button>
                                    <div style={{ height: "1px", background: "rgba(0,0,0,0.06)", margin: "4px 0" }} />
                                    <div style={{ padding: "4px 12px 2px", fontSize: "11px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" }}>Theme</div>
                                    <div style={{ display: "flex", gap: "10px", padding: "8px 12px", justifyContent: "space-between" }}>
                                        {[
                                            { id: "theme-default", color: "#FFFDF5", border: "#EAE6D6" },
                                            { id: "theme-blue", color: "#EBF4FF", border: "#D1E3FD" },
                                            { id: "theme-pink", color: "#FDF2F8", border: "#FCE7F3" },
                                            { id: "theme-green", color: "#F0FDF4", border: "#DCFCE7" },
                                            { id: "theme-purple", color: "#F5F3FF", border: "#EDE9FE" }
                                        ].map(t => {
                                            const isActive = conversationTheme === t.id;
                                            return (
                                                <button
                                                    key={t.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        useChatStore.getState().setTheme(character.id, t.id);
                                                        setShowMenu(false);
                                                    }}
                                                    style={{
                                                        width: 32, height: 32, borderRadius: "50%",
                                                        border: `1.5px solid ${isActive ? "#4A3728" : t.border}`,
                                                        background: t.color,
                                                        boxShadow: isActive ? "0 2px 8px rgba(0,0,0,0.1) inset" : "0 2px 4px rgba(0,0,0,0.02)",
                                                        cursor: "pointer",
                                                        transition: "transform 0.2s, box-shadow 0.2s",
                                                        display: "flex", alignItems: "center", justifyContent: "center",
                                                        transform: isActive ? "scale(1.1)" : "scale(1)",
                                                        position: "relative"
                                                    }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.transform = isActive ? "scale(1.1)" : "scale(1.15)"; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.transform = isActive ? "scale(1.1)" : "scale(1)"; }}
                                                    aria-label={`Theme ${t.id}`}
                                                >
                                                    {isActive && (
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ position: "absolute" }}>
                                                            <path d="M20 6L9 17L4 12" stroke="#4A3728" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* ── Messages Area / Setup Area ───────── */}
            <div className="chatroom-messages-area relative">
                <AnimatePresence>
                    {uiNotice && (
                        <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.96 }}
                            transition={{ duration: 0.18 }}
                            aria-live="polite"
                            style={{
                                position: "absolute",
                                top: "12px",
                                left: "50%",
                                transform: "translateX(-50%)",
                                zIndex: 30,
                                background: "rgba(34, 34, 34, 0.92)",
                                color: "#FFFDF5",
                                padding: "10px 14px",
                                borderRadius: "14px",
                                fontSize: "13px",
                                fontWeight: 600,
                                boxShadow: "0 10px 24px rgba(0,0,0,0.16)",
                                maxWidth: "calc(100% - 32px)",
                                textAlign: "center",
                                pointerEvents: "none"
                            }}
                        >
                            {uiNotice}
                        </motion.div>
                    )}
                </AnimatePresence>

                {needsSpecialistSetup ? (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 bg-[#FFFDF5]/80 backdrop-blur-sm overflow-y-auto">
                        <SpecialistSetup
                            characterName={character.name}
                            specialtyType={character.name}
                            onComplete={handleSetupComplete}
                        />
                    </div>
                ) : (
                    <div className="chatroom-messages no-scrollbar">
                        {/* Date separator */}
                        <div className="chatroom-date-sep">
                            <span>Today</span>
                        </div>

                        <AnimatePresence initial={false}>
                            {messages.map((msg, i) => {
                                const prevMsg = messages[i - 1];
                                const isNewConversation = prevMsg && (msg.timestamp - prevMsg.timestamp > 15 * 60 * 1000);
                                const isUnreadMarker = msg.id === unreadMarkerId;

                                const isVeryLastInArray = i === messages.length - 1;
                                const isNextDiff = messages[i + 1]?.role !== msg.role || (messages[i + 1]?.senderId || null) !== (msg.senderId || null);
                                const isSenderTyping = isTyping && msg.role === "assistant" && (!isGroupChat || msg.senderName === typingMemberName);
                                // Hide the avatar on the last message if the sender is currently typing right below it
                                const isLastInGroup = isVeryLastInArray ? !isSenderTyping : isNextDiff;

                                return (
                                    <React.Fragment key={msg.id}>
                                        {isNewConversation && !isUnreadMarker && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                style={{
                                                    textAlign: "center",
                                                    margin: "16px 0 8px",
                                                    fontSize: "11px",
                                                    color: "#8B8680",
                                                    fontWeight: 600,
                                                    letterSpacing: "0.5px"
                                                }}
                                            >
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </motion.div>
                                        )}
                                        {isUnreadMarker && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.9, height: 0, marginTop: 0, marginBottom: 0, transition: { duration: 0.3 } }}
                                                style={{
                                                    marginTop: 24,
                                                    marginBottom: 8,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    width: "100%",
                                                    position: "relative"
                                                }}
                                            >
                                                <div style={{ position: "absolute", left: -16, right: -16, height: 1, background: "rgba(56, 163, 253, 0.2)" }} />
                                                <span style={{
                                                    background: "rgba(56, 163, 253, 0.15)",
                                                    color: "#38a3fd",
                                                    fontWeight: 600,
                                                    fontSize: "12px",
                                                    padding: "4px 12px",
                                                    borderRadius: "12px",
                                                    position: "relative",
                                                    zIndex: 1,
                                                    backdropFilter: "blur(4px)"
                                                }}>New message</span>
                                            </motion.div>
                                        )}
                                        <MessageBubble
                                            message={msg}
                                            character={character}
                                            charMap={enrichedCharMap}
                                            isFirst={i === 0 || prevMsg?.role !== msg.role || (prevMsg?.senderId || null) !== (msg.senderId || null) || Boolean(isNewConversation || isUnreadMarker)}
                                            isLast={isLastInGroup}
                                            onOpenCharacterProfile={(characterId) => void openCharacterProfile(characterId)}
                                            onReply={(msg) => {
                                                setReplyingTo(msg);
                                                setTimeout(() => inputRef.current?.focus(), 50);
                                            }}
                                            replyMessage={msg.replyToId ? messages.find(m => m.id === msg.replyToId) : undefined}
                                            onReaction={(msgId, emoji) => {
                                                const hasReacted = msg.reactions?.[emoji]?.includes(USER_CHARACTER.id);
                                                if (hasReacted) {
                                                    useChatStore.getState().removeReaction(character.id, msgId, emoji, USER_CHARACTER.id);
                                                } else {
                                                    useChatStore.getState().addReaction(character.id, msgId, emoji, USER_CHARACTER.id);
                                                }
                                            }}
                                            setActiveActionMenuId={setActiveActionMenuId}
                                            setActiveMessage={setActiveMessage}
                                            setMenuPlacement={setMenuPlacement}
                                            setActiveBubbleRect={setActiveBubbleRect}
                                            setReactionRowPlacement={setReactionRowPlacement}
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
                                        <img src={
                                            typingMemberName
                                                ? (groupMemberChars.find((c: Character) => c.name === typingMemberName)?.image || character.image)
                                                : character.image
                                        } alt="" />
                                    </div>
                                    <div className="chatroom-typing-bubble">

                                        <div className="typing-dots">
                                            <span />
                                            <span />
                                            <span />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div ref={messagesEndRef} className="chatroom-messages-end" />
                    </div>
                )}
            </div>

            {/* ── Input Bar / Blocked State ───────── */}
            {!needsSpecialistSetup ? (
                isBlocked ? (
                    <motion.div
                        className="chatroom-input-bar"
                        style={{ justifyContent: "center", padding: "16px", background: "rgba(255,255,255,0.8)", borderTop: "1px solid rgba(0,0,0,0.05)" }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", textAlign: "center" }}>
                            <span style={{ color: "#8B8680", fontSize: "14px" }}>You blocked this account. You cannot send or receive messages.</span>
                            <button
                                onClick={() => useChatStore.getState().toggleBlock(character.id)}
                                style={{ background: "none", border: "none", color: "#38a3fd", fontWeight: 600, fontSize: "15px", cursor: "pointer" }}
                            >
                                Unblock
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <div
                        className="chatroom-input-bar"
                    >
                        <div className="chatroom-input-wrap" style={replyingTo ? { flexDirection: "column", padding: 0 } : undefined}>
                            {replyingTo && (
                                <div style={{
                                    width: "100%", padding: "8px 12px 8px 16px", background: "transparent",
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    fontSize: "13px"
                                }}>
                                    <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", borderLeft: "3px solid #38A3FD", paddingLeft: "10px" }}>
                                        <span style={{ fontWeight: 600, color: "#38A3FD", fontSize: "12px", marginBottom: "2px" }}>
                                            {replyingTo.role === "user" ? "You" : character.name}
                                        </span>
                                        <span style={{ WebkitLineClamp: 1, overflow: "hidden", display: "-webkit-box", WebkitBoxOrient: "vertical", opacity: 0.7, fontSize: "13px" }}>
                                            {replyingTo.content || "Attachment"}
                                        </span>
                                    </div>
                                    <button onClick={() => setReplyingTo(null)} style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.5, padding: "4px" }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            )}
                            <div style={{ display: "flex", width: "100%", alignItems: "center", padding: replyingTo ? "0" : undefined }}>
                                {input.length === 0 && (
                                    <div
                                        className="chatroom-input-actions"
                                        style={{ display: "flex", alignItems: "center", flexShrink: 0 }}
                                    >
                                        <label
                                            className="chatroom-input-attach"
                                            aria-label="Attach Image"
                                            style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer", margin: 0, padding: 0 }}
                                        >
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                style={{ width: 0, height: 0, position: "absolute", visibility: "hidden" }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </label>
                                        <button
                                            type="button"
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
                                    </div>
                                )}
                                <textarea
                                    ref={inputRef}
                                    className="chatroom-input no-scrollbar"
                                    placeholder={`Message ${character.name.split(" ")[0]}...`}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    rows={1}
                                    style={{ paddingLeft: input.length > 0 ? "12px" : "0", paddingTop: replyingTo ? "12px" : undefined, paddingBottom: replyingTo ? "12px" : undefined }}
                                />
                                {input.trim() && (
                                    <button
                                        className="chatroom-send chatroom-send-active"
                                        onPointerDown={(e) => {
                                            e.preventDefault();
                                            handleSend();
                                        }}
                                        aria-label="Send message"
                                        style={{ marginLeft: 4, flexShrink: 0 }}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                        </svg>
                                    </button>
                                )}
                                {input.trim() === "" && (
                                    <div style={{ marginLeft: 4, flexShrink: 0 }}>
                                        <VoiceRecorder onRecordComplete={handleVoiceRecordComplete} disabled={isBlocked} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )) : null}

            {/* ── Sticker Drawer (Bottom Sheet) ────────── */}
            <AnimatePresence>
                {showStickerPicker && (
                    <motion.div
                        className="sticker-drawer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "min(420px, 45dvh)", opacity: 1 }}
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
                        character={profileCharacter}
                        onBack={() => setShowCharInfo(false)}
                        messageCount={messages.length}
                    />
                )}
            </AnimatePresence>
            {/* Astro Profile Update Modal */}
            <AstroProfileModal
                isOpen={isAstroProfileModalOpen}
                onClose={() => setIsAstroProfileModalOpen(false)}
                onSave={async (data) => {
                    try {
                        let finalZodiac = "";
                        if (data.date) {
                            const parts = data.date.split("-").map(Number);
                            if (parts.length === 3) {
                                const [year, month, day] = parts;
                                finalZodiac = getZodiacSign(month, day);
                                finalZodiac = finalZodiac.charAt(0).toUpperCase() + finalZodiac.slice(1);
                            }
                        }

                        const res = await fetch("/api/user/reading", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ zodiac_sign: finalZodiac, mbti_type: data.mbti })
                        });
                        if (res.ok) {
                            const updateMsg = `I just updated my astrology profile. My zodiac sign is now ${finalZodiac || "not set"}${data.mbti ? ` and my MBTI is ${data.mbti}` : ""}. Please use my NEW profile data for all readings from now on.`;
                            sendMessage(character.id, updateMsg);
                            triggerAiResponse(`[SYSTEM: User has updated their astrology profile. Their new zodiac sign is ${finalZodiac || "Unknown"}${data.mbti ? `, MBTI: ${data.mbti}` : ""}. Acknowledge the update and confirm you will use their new data going forward. Be enthusiastic about recalibrating their readings.]`);
                        }
                    } catch (e) {
                        console.error("Failed to update profile", e);
                    }
                }}
            />

            {/* Delete Chat Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "rgba(0, 0, 0, 0.5)",
                            backdropFilter: "blur(4px)",
                            zIndex: 1000,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "20px"
                        }}
                        onClick={() => setShowDeleteModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{
                                backgroundColor: "white",
                                borderRadius: "16px",
                                padding: "24px",
                                width: "100%",
                                maxWidth: "340px",
                                boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
                                display: "flex",
                                flexDirection: "column",
                                gap: "16px"
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 style={{ margin: 0, color: "#4A3728", fontSize: "18px", fontWeight: 700 }}>Delete Chat</h3>
                            <p style={{ margin: 0, color: "#6B7280", fontSize: "14px" }}>
                                Are you sure you want to delete this chat with {character.name}? This action cannot be undone.
                            </p>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    style={{
                                        padding: "10px 16px",
                                        borderRadius: "10px",
                                        border: "none",
                                        backgroundColor: "rgba(0,0,0,0.05)",
                                        color: "#4A3728",
                                        fontWeight: 600,
                                        fontSize: "14px",
                                        cursor: "pointer",
                                        transition: "background 0.2s"
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        setShowDeleteModal(false);
                                        useChatStore.getState().deleteConversation(character.id);
                                        onBack();
                                        try {
                                            await fetch("/api/memory", {
                                                method: "DELETE",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ characterId: character.id })
                                            });
                                        } catch (err) { }
                                    }}
                                    style={{
                                        padding: "10px 16px",
                                        borderRadius: "10px",
                                        border: "none",
                                        backgroundColor: "#EF4444",
                                        color: "white",
                                        fontWeight: 600,
                                        fontSize: "14px",
                                        cursor: "pointer",
                                        transition: "background 0.2s"
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Transparent click-catcher — dismiss layer */}
            <AnimatePresence>
                {activeActionMenuId !== null && (
                    <motion.div
                        key="menu-click-catcher"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => { setActiveActionMenuId(null); setMenuPlacement(null); setActiveMessage(null); setActiveBubbleRect(null); setReactionRowPlacement(null); }}
                        style={{ position: "fixed", inset: 0, zIndex: 149, background: "transparent" }}
                    />
                )}
            </AnimatePresence>

            {/* Soft backdrop with active-bubble cutout */}
            <AnimatePresence>
                {activeActionMenuId !== null && (
                    <motion.div
                        key="menu-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            position: "fixed",
                            inset: 0,
                            zIndex: 149,
                            pointerEvents: "none"
                        }}
                    >
                        {activeBubbleRect ? (
                            <svg
                                width="100%"
                                height="100%"
                                style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
                            >
                                <defs>
                                    <mask id={backdropMaskId}>
                                        {/* White = visible (dimmed area) */}
                                        <rect width="100%" height="100%" fill="white" />
                                        {/* Black = transparent (active bubble exempt area) */}
                                        <rect
                                            x={activeBubbleRect.left - 4}
                                            y={activeBubbleRect.top - 4}
                                            width={activeBubbleRect.width + 8}
                                            height={activeBubbleRect.height + 8}
                                            rx={18}
                                            ry={18}
                                            fill="black"
                                        />
                                    </mask>
                                </defs>
                                <rect
                                    width="100%"
                                    height="100%"
                                    fill="rgba(0,0,0,0.35)"
                                    mask={`url(#${backdropMaskId})`}
                                />
                            </svg>
                        ) : (
                            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} />
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating reaction pill row — near the active bubble */}
            <AnimatePresence>
                {activeActionMenuId !== null && activeMessage !== null && reactionRowPlacement !== null && (() => {
                    const emojis = [
                        { id: "like", icon: "👍" },
                        { id: "love", icon: "❤️" },
                        { id: "haha", icon: "😂" },
                        { id: "wow", icon: "😮" },
                        { id: "sad", icon: "😢" }
                    ];
                    const dismissMenu = () => { setActiveActionMenuId(null); setMenuPlacement(null); setActiveMessage(null); setActiveBubbleRect(null); setReactionRowPlacement(null); };
                    return (
                        <motion.div
                            key="chatroom-reaction-row-floating"
                            initial={{ opacity: 0, scale: 0.6, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.1 } }}
                            transition={{ type: "spring", stiffness: 420, damping: 22 }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                position: "fixed",
                                zIndex: 201,
                                ...reactionRowPlacement,
                                display: "flex",
                                gap: `${RX_GAP}px`,
                                padding: `6px ${RX_PADDING_H}px`,
                                background: "rgba(255,255,255,0.92)",
                                backdropFilter: "blur(24px)",
                                WebkitBackdropFilter: "blur(24px)",
                                borderRadius: "999px",
                                boxShadow: "0 6px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)",
                                border: `${RX_BORDER}px solid rgba(0,0,0,0.05)`
                            }}
                        >
                            {emojis.map((e, idx) => {
                                const hasReacted = activeMessage.reactions?.[e.id]?.includes(USER_CHARACTER.id);
                                return (
                                    <motion.button
                                        key={e.id}
                                        initial={{ scale: 0, y: 8 }}
                                        animate={{ scale: 1, y: 0 }}
                                        transition={{ type: "spring", stiffness: 500, damping: 20, delay: idx * 0.04 }}
                                        onClick={() => {
                                            if (hasReacted) {
                                                useChatStore.getState().removeReaction(character.id, activeMessage.id, e.id, USER_CHARACTER.id);
                                            } else {
                                                useChatStore.getState().addReaction(character.id, activeMessage.id, e.id, USER_CHARACTER.id);
                                            }
                                            dismissMenu();
                                        }}
                                        whileHover={{ scale: 1.35, y: -4 }}
                                        whileTap={{ scale: 0.85 }}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            background: hasReacted ? "rgba(59,130,246,0.1)" : "none",
                                            border: "none",
                                            fontSize: "26px",
                                            cursor: "pointer",
                                            padding: "2px",
                                            borderRadius: "50%",
                                            width: `${RX_BUTTON_SIZE}px`,
                                            height: `${RX_BUTTON_SIZE}px`,
                                            transition: "background 0.15s"
                                        }}
                                        title={e.id}
                                    >
                                        {e.icon}
                                    </motion.button>
                                );
                            })}
                        </motion.div>
                    );
                })()}
            </AnimatePresence>

            {/* Top-level fixed action menu — Reply / Copy / Select Text only */}
            <AnimatePresence>
                {activeActionMenuId !== null && activeMessage !== null && (() => {
                    const dismissMenu = () => { setActiveActionMenuId(null); setMenuPlacement(null); setActiveMessage(null); setActiveBubbleRect(null); setReactionRowPlacement(null); };
                    const actionItems = [
                        { key: "reply", label: "Reply", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M3 10h10a5 5 0 015 5v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M7 14L3 10l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>, action: () => { setReplyingTo(activeMessage); setTimeout(() => inputRef.current?.focus(), 50); dismissMenu(); } },
                        { key: "copy", label: "Copy", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="1.8" /></svg>, action: () => { navigator.clipboard.writeText(activeMessage.content); dismissMenu(); } },
                        { key: "select", label: "Select Text", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h10M4 17h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>, action: () => { setSelectTextContent(activeMessage.content); dismissMenu(); } },
                    ];
                    return (
                        <motion.div
                            key="chatroom-action-menu-fixed"
                            initial={{ opacity: 0, scale: 0.85, y: 6 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.08 } }}
                            transition={{ type: "spring", stiffness: 500, damping: 26 }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                position: "fixed",
                                zIndex: 200,
                                ...(menuPlacement ?? {}),
                                backdropFilter: "blur(24px)",
                                WebkitBackdropFilter: "blur(24px)",
                                background: "rgba(255,255,255,0.88)",
                                border: "1px solid rgba(0,0,0,0.06)",
                                boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.04)",
                                borderRadius: "14px",
                                minWidth: "160px",
                                overflow: "hidden"
                            }}
                        >
                            {actionItems.map((item, idx) => (
                                <motion.button
                                    key={item.key}
                                    className="chatroom-msg-action-btn"
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.03 * idx, duration: 0.15 }}
                                    onClick={item.action}
                                >
                                    {item.icon}
                                    {item.label}
                                </motion.button>
                            ))}
                        </motion.div>
                    );
                })()}
            </AnimatePresence>

            {/* Select Text modal */}
            <AnimatePresence>
                {selectTextContent !== null && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setSelectTextContent(null)}
                        style={{
                            position: "fixed", inset: 0, zIndex: 500,
                            display: "flex", alignItems: "center", justifyContent: "center"
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.92, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                background: "#FFFFFF", borderRadius: "16px",
                                padding: "20px", maxWidth: "340px",
                                width: "calc(100% - 40px)",
                                boxShadow: "0 16px 48px rgba(0,0,0,0.18)"
                            }}
                        >
                            <div style={{ fontSize: "15px", fontWeight: 700, color: "#4A3728", marginBottom: "12px" }}>Select Text</div>
                            <textarea
                                readOnly
                                value={selectTextContent}
                                style={{
                                    width: "100%", minHeight: "120px",
                                    border: "1px solid rgba(0,0,0,0.08)",
                                    borderRadius: "10px", padding: "10px",
                                    fontSize: "14px", color: "#4A3728",
                                    lineHeight: 1.5, resize: "none",
                                    userSelect: "text", WebkitUserSelect: "text",
                                    outline: "none", fontFamily: "inherit",
                                    background: "rgba(0,0,0,0.02)"
                                }}
                            />
                            <button
                                onClick={() => setSelectTextContent(null)}
                                style={{
                                    marginTop: "12px", width: "100%", padding: "10px",
                                    borderRadius: "10px", border: "none",
                                    background: "#FFE566", color: "#4A3728",
                                    fontWeight: 600, fontSize: "14px", cursor: "pointer"
                                }}
                            >
                                Close
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div >
    );
}

/* ── Shared reaction-row layout tokens ─────────────── */
// Keep in sync with the floating reaction row style in ChatRoom and MessageBubble
const RX_BUTTON_COUNT = 5;
const RX_BUTTON_SIZE = 40;   // px (width & height of each emoji button)
const RX_GAP = 4;            // px (gap between buttons)
const RX_PADDING_H = 10;     // px (horizontal padding on each side)
const RX_BORDER = 1;         // px (border width on each side)
const REACTION_ROW_WIDTH_COMPUTED =
    RX_BUTTON_COUNT * RX_BUTTON_SIZE +
    (RX_BUTTON_COUNT - 1) * RX_GAP +
    RX_PADDING_H * 2 +
    RX_BORDER * 2;

/* ── Message Bubble ─────────────────────────────────── */
function MessageBubble({
    message,
    character,
    charMap = {},
    isFirst,
    isLast,
    onOpenCharacterProfile,
    onReply,
    replyMessage,
    onReaction,
    setActiveActionMenuId,
    setActiveMessage,
    setMenuPlacement,
    setActiveBubbleRect,
    setReactionRowPlacement,
}: {
    message: ChatMessage;
    character: Character;
    charMap?: Record<string, Character>;
    isFirst: boolean;
    isLast: boolean;
    onOpenCharacterProfile?: (characterId: string) => void;
    onReply?: (msg: ChatMessage) => void;
    replyMessage?: ChatMessage;
    onReaction?: (messageId: string, emoji: string) => void;
    setActiveActionMenuId: (id: string | null) => void;
    setActiveMessage: (msg: ChatMessage | null) => void;
    setMenuPlacement: (p: { top: string; left: string } | null) => void;
    setActiveBubbleRect: (rect: { top: number; left: number; width: number; height: number } | null) => void;
    setReactionRowPlacement: (p: { top: string; left: string } | null) => void;
}) {
    const isUser = message.role === "user";
    const isStickerOnly = /^\[\[\s*STICKER\s*:\s*.+?\]+$/i.test(message.content.trim());
    const isAttachmentOnly = message.attachment?.type === "image" && (!message.content || message.content.trim() === "");
    const isTransparentBubble = isStickerOnly || isAttachmentOnly;
    const rid = message.id.slice(-6); // unique suffix for SVG gradient IDs
    // Emoji set used for reaction pill icon lookup (action menu emojis rendered at ChatRoom level)
    const emojis = [
        { id: "like", icon: "👍" },
        { id: "love", icon: "❤️" },
        { id: "haha", icon: "😂" },
        { id: "wow", icon: "😮" },
        { id: "sad", icon: "😢" }
    ];
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressTriggered = useRef(false);
    const touchStartPos = useRef<{ x: number; y: number } | null>(null);
    const bubbleRef = useRef<HTMLDivElement>(null);
    const LONG_PRESS_MOVE_THRESHOLD = 10; // px

    const MENU_HEIGHT_ESTIMATE = 130;
    const MENU_WIDTH = 180;
    const REACTION_ROW_HEIGHT = 52;
    const REACTION_ROW_WIDTH = REACTION_ROW_WIDTH_COMPUTED;
    const senderProfileClickable = !isUser && !!message.senderId && !!onOpenCharacterProfile;

    const openMenuWithPlacement = () => {
        // Guard: if ref is unavailable we cannot compute placement — do not open
        // with null coords, which would place the menu at the viewport origin.
        if (!bubbleRef.current) return;
        const rect = bubbleRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;

        // Save bubble rect for the backdrop
        setActiveBubbleRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });

        const isLowerHalf = rect.bottom > windowHeight / 2;

        const GAP = 8;
        const totalStackHeight = REACTION_ROW_HEIGHT + GAP + MENU_HEIGHT_ESTIMATE;

        // Base stack position
        const stackTop = isLowerHalf 
            ? rect.top - GAP - totalStackHeight 
            : rect.bottom + GAP;

        // Clamp the entire stack so both layers remain fully visible
        const safeStackTop = Math.min(
            Math.max(stackTop, GAP),
            windowHeight - totalStackHeight - GAP
        );

        // Position layers within the clamped stack
        // Reaction row stays closest to the bubble
        let finalRxTop, finalMenuTop;
        if (isLowerHalf) {
            finalMenuTop = safeStackTop;
            finalRxTop = safeStackTop + MENU_HEIGHT_ESTIMATE + GAP;
        } else {
            finalRxTop = safeStackTop;
            finalMenuTop = safeStackTop + REACTION_ROW_HEIGHT + GAP;
        }

        // --- Action menu placement ---
        const safeMaxLeft = Math.max(GAP, windowWidth - MENU_WIDTH - GAP);
        const rawLeft = isUser ? rect.right - MENU_WIDTH : rect.left;
        const left = Math.min(Math.max(rawLeft, GAP), safeMaxLeft);

        // --- Reaction row placement ---
        const rxSafeMaxLeft = Math.max(GAP, windowWidth - REACTION_ROW_WIDTH - GAP);
        const rxRawLeft = isUser ? rect.right - REACTION_ROW_WIDTH : rect.left;
        const rxLeft = Math.min(Math.max(rxRawLeft, GAP), rxSafeMaxLeft);

        setMenuPlacement({ top: `${finalMenuTop}px`, left: `${left}px` });
        setReactionRowPlacement({ top: `${finalRxTop}px`, left: `${rxLeft}px` });

        setActiveMessage(message);
        setActiveActionMenuId(message.id);
    };

    return (
        <motion.div
            className={`chatroom-msg ${isUser ? "chatroom-msg-user" : "chatroom-msg-ai"} ${isFirst ? "chatroom-msg-first" : ""} ${isLast ? "chatroom-msg-last" : ""}`}
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, info) => {
                if (Math.abs(info.offset.x) > 50) {
                    onReply?.(message);
                }
            }}
            onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openMenuWithPlacement();
            }}
            onTouchStart={(e) => {
                const touch = e.touches[0];
                touchStartPos.current = { x: touch.clientX, y: touch.clientY };
                longPressTriggered.current = false;
                longPressTimer.current = setTimeout(() => {
                    longPressTriggered.current = true;
                    openMenuWithPlacement();
                }, 400);
            }}
            onTouchEnd={(e) => {
                if (longPressTimer.current) clearTimeout(longPressTimer.current);
                touchStartPos.current = null;
                if (longPressTriggered.current) {
                    e.preventDefault();
                    longPressTriggered.current = false;
                }
            }}
            onTouchMove={(e) => {
                if (!touchStartPos.current || !longPressTimer.current) return;
                const touch = e.touches[0];
                const dx = Math.abs(touch.clientX - touchStartPos.current.x);
                const dy = Math.abs(touch.clientY - touchStartPos.current.y);
                if (dx > LONG_PRESS_MOVE_THRESHOLD || dy > LONG_PRESS_MOVE_THRESHOLD) {
                    clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                }
            }}
            onTouchCancel={() => {
                if (longPressTimer.current) clearTimeout(longPressTimer.current);
                longPressTimer.current = null;
                touchStartPos.current = null;
                longPressTriggered.current = false;
            }}
        >
            {!isUser && isLast && (
                <div
                    className="chatroom-msg-avatar"
                    onClick={senderProfileClickable ? () => onOpenCharacterProfile(message.senderId!) : undefined}
                    style={senderProfileClickable ? { cursor: "pointer" } : undefined}
                >
                    <img src={
                        message.senderId
                            ? (charMap[message.senderId]?.image || CHARACTERS.find(c => c.id === message.senderId)?.image || character.image)
                            : character.image
                    } alt="" />
                </div>
            )}
            {!isUser && !isLast && <div className="chatroom-msg-avatar-spacer" />}
            <div ref={bubbleRef} className="chatroom-bubble-wrap" style={message.reactions && Object.keys(message.reactions).length > 0 ? { marginBottom: "16px" } : undefined}>
                <div
                    className={`chatroom-bubble ${isUser ? "chatroom-bubble-user" : "chatroom-bubble-ai"}`}
                    style={isTransparentBubble ? { background: "transparent", boxShadow: "none", padding: 0, border: "none" } : undefined}
                >
                    {!isUser && isFirst && !isTransparentBubble && !!message.senderId && (
                        <span
                            className="chatroom-bubble-sender"
                            onClick={senderProfileClickable ? () => onOpenCharacterProfile(message.senderId!) : undefined}
                            style={senderProfileClickable ? { cursor: "pointer" } : undefined}
                        >
                            {message.senderName || character.name}
                        </span>
                    )}
                    {replyMessage && (
                        <div style={{
                            fontSize: "13px",
                            padding: "4px 8px",
                            background: isUser ? "rgba(0,0,0,0.05)" : "rgba(56,163,253,0.1)",
                            borderRadius: "4px 8px 8px 4px",
                            marginBottom: "6px",
                            borderLeft: `3px solid ${isUser ? "#10B981" : "#38a3fd"}`,
                            cursor: "pointer"
                        }}>
                            <span style={{ fontWeight: 600, fontSize: "12px", display: "block", marginBottom: "1px", color: isUser ? "#10B981" : "#38a3fd" }}>
                                {replyMessage.role === "user" ? "You" : character.name}
                            </span>
                            <div style={{ WebkitLineClamp: 1, overflow: "hidden", display: "-webkit-box", WebkitBoxOrient: "vertical", opacity: 0.85, fontSize: "13px", color: "#111" }}>
                                {replyMessage.attachment?.type === "audio" 
                                    ? "🎤 Voice Message" 
                                    : replyMessage.attachment?.type === "image" 
                                        ? "📷 Image" 
                                        : replyMessage.content}
                            </div>
                        </div>
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
                        {message.attachment?.type === "audio" && (
                            <AudioPlayer src={message.attachment.url} duration={message.attachment.duration} isUser={isUser} />
                        )}
                        
                        {message.content === "__transcribing__" ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 8px", background: "rgba(0,0,0,0.04)", borderRadius: "8px", width: "fit-content", marginTop: "4px" }}>
                                <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0 }} style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#38a3fd" }} />
                                <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }} style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#38a3fd" }} />
                                <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }} style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#38a3fd" }} />
                                <span style={{ fontSize: "11px", color: "rgba(0,0,0,0.5)", fontWeight: 500, marginLeft: "2px" }}>Transcribing</span>
                            </div>
                        ) : message.content === "__transcribing_failed__" ? (
                            <div style={{ fontSize: "12px", color: "rgba(0,0,0,0.4)", fontStyle: "italic", marginTop: "4px", padding: "0 4px" }}>
                                No transcript available
                            </div>
                        ) : message.attachment?.type === "audio" && message.content ? (
                            <div style={{
                                marginTop: "4px", padding: "8px 10px", background: isUser ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.03)",
                                borderRadius: "8px", borderLeft: `2px solid ${isUser ? "rgba(255,255,255,0.4)" : "#38a3fd"}`,
                                fontSize: "14px", lineHeight: "1.4"
                            }}>
                                {renderMessageContent(message.content, isUser ? USER_CHARACTER : character)}
                            </div>
                        ) : message.content ? (
                            renderMessageContent(message.content, isUser ? USER_CHARACTER : character)
                        ) : null}
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

                    {/* Reactions - Placed on the inner corner */}
                    {message.reactions && Object.keys(message.reactions).length > 0 && (
                        <div style={{
                            display: "flex",
                            flexWrap: "nowrap",
                            gap: "2px",
                            position: "absolute",
                            bottom: "-14px",
                            ...(isUser ? { left: "-4px" } : { right: "-4px" }),
                            zIndex: 10,
                        }}>
                            {Object.entries(message.reactions).map(([emoji, users]) => {
                                const hasReacted = users.includes(USER_CHARACTER.id);
                                return (
                                    <motion.button
                                        key={emoji}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={(e) => {
                                            e.stopPropagation(); // prevent opening action menu
                                            onReaction?.(message.id, emoji);
                                        }}
                                        style={{
                                            background: hasReacted ? "#F0F9FF" : "#FFFFFF",
                                            border: hasReacted ? "1px solid #38A3FD" : "1px solid #E5E7EB",
                                            borderRadius: "16px",
                                            padding: "2px 6px",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "4px",
                                            cursor: "pointer",
                                            boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                                        }}
                                    >
                                        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", lineHeight: 1 }}>
                                            {emojis.find(e => e.id === emoji)?.icon || emoji}
                                        </span>
                                        {users.length > 1 && (
                                            <span style={{ fontSize: "11px", color: hasReacted ? "#0284c7" : "#6B7280", fontWeight: 700 }}>
                                                {users.length}
                                            </span>
                                        )}
                                    </motion.button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </motion.div >
    );
}
