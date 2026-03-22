import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SOURCE_CATEGORIES, type Category, type Character } from "@/data/characters";

const CATEGORIES = ["All", "Stories", ...SOURCE_CATEGORIES] as const;
type ExploreCategory = (typeof CATEGORIES)[number];
import { App } from '@capacitor/app';
import { useChatStore } from "@/lib/chatStore";

const getSafeImage = (image?: string | null, seedName?: string) => {
    if (image && image.trim() !== '') return image;
    const firstLetter = seedName && seedName.trim() ? seedName.trim().charAt(0).toUpperCase() : '?';
    const colors = [['#FF9A9E','#FECFEF'],['#a18cd1','#fbc2eb'],['#84fab0','#8fd3f4'],['#a6c0fe','#f68084'],['#fccb90','#d57eeb'],['#e0c3fc','#8ec5fc']];
    let hash = 0;
    if (seedName) for (let i = 0; i < seedName.length; i++) hash = seedName.charCodeAt(i) + ((hash << 5) - hash);
    const index = Math.abs(hash) % colors.length;
    const [c1, c2] = colors[index];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><defs><linearGradient id="g${index}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${c1}" /><stop offset="100%" stop-color="${c2}" /></linearGradient></defs><rect width="400" height="400" fill="url(#g${index})" /><text x="50%" y="50%" font-family="sans-serif" font-size="120" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle" opacity="0.8">${firstLetter}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

interface ExploreTabProps {
    onSelectCharacter: (character: Character) => void;
    onSelectGroup?: (groupId: string) => void;
}

const PAGE_SIZE = 50;

export default function ExploreTab({ onSelectCharacter, onSelectGroup }: ExploreTabProps) {
    const [activeCategory, setActiveCategory] = useState<ExploreCategory>("All");
    const [search, setSearch] = useState("");
    const [searchMode, setSearchMode] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [selectedPreview, setSelectedPreview] = useState<Character | null>(null);
    // Pre-play character setup modal state
    const [storySetupChar, setStorySetupChar] = useState<Character | null>(null);
    const [playerName, setPlayerName] = useState("");
    const [playerDesc, setPlayerDesc] = useState("");
    const [characters, setCharacters] = useState<Character[]>([]);
    const [specialCharacters, setSpecialCharacters] = useState<Character[]>([]);
    const [forYouCharacters, setForYouCharacters] = useState<Character[]>([]);
    // initialLoading: true only on very first load (no data yet) → shows skeleton grid
    const [initialLoading, setInitialLoading] = useState(true);
    // refreshLoading: true on category/search refreshes when cards already exist → shows overlay spinner
    const [refreshLoading, setRefreshLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [currentOffset, setCurrentOffset] = useState(0);
    const [featuredIndex, setFeaturedIndex] = useState(0);
    const [dragOffset, setDragOffset] = useState(0);
    const touchStartX = useRef<number>(0);
    const isDragging = useRef(false);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const debounceTimer = useRef<NodeJS.Timeout | undefined>(undefined);
    const abortControllerRef = useRef<AbortController | null>(null);
    // queryToken: incremented on every category/search change. Lets loadMore detect stale appends.
    const queryTokenRef = useRef(0);

    // Fetch characters (initial or reset)
    const fetchCharacters = async (append = false, offset = 0, signal?: AbortSignal, expectedToken?: number) => {
        if (append) {
            setIsLoadingMore(true);
        } else {
            // Use the full skeleton only on the very first load (no cards, no search query).
            // When the user is searching, keep existing results visible and show the
            // overlay spinner instead — this eliminates the blank flash between keystrokes.
            if (characters.length === 0 && !search) {
                setInitialLoading(true);
            } else {
                setRefreshLoading(true);
            }
        }
        try {
            let fetchUrl = `/api/characters?category=${encodeURIComponent(activeCategory)}&search=${encodeURIComponent(search)}&limit=${PAGE_SIZE}&offset=${offset}`;
            if (activeCategory === "Stories") {
                fetchUrl = `/api/stories?search=${encodeURIComponent(search)}&limit=${PAGE_SIZE}&offset=${offset}`;
            }
            const res = await fetch(fetchUrl, { signal });
            if (res.ok) {
                const data = await res.json();

                const safeParseJSON = (jsonStr: any) => {
                    if (typeof jsonStr !== 'string') return jsonStr;
                    try {
                        return JSON.parse(jsonStr);
                    } catch (e) {
                        console.warn("Safe JSON parse failed for story metadata, returning undefined", e);
                        return undefined;
                    }
                };

                let chars: Character[] = [];
                if (activeCategory === "Stories") {
                    const storyItems = data.items || data;
                    chars = (Array.isArray(storyItems) ? storyItems : []).map((story: any) => ({
                        id: story.id,
                        name: story.name,
                        tag: story.genre || "Story",
                        description: story.synopsis || "",
                        personality: "Play Story",
                        greeting: story.synopsis || "Begin your story...",
                        image: story.image,
                        source: "story",
                        creatorId: story.creator_id,
                        storyData: {
                            ...(safeParseJSON(story.story_data) || {}),
                            isPublished: Boolean(story.is_published),
                            synopsis: story.synopsis || safeParseJSON(story.story_data)?.synopsis || "",
                            genre: story.genre || safeParseJSON(story.story_data)?.genre || "",
                        },
                        worldData: safeParseJSON(story.world_data),
                    } as Character));
                } else {
                    chars = data.characters || data;
                }

                if (append) {
                    // Discard stale load-more append if the query context has changed
                    if (expectedToken !== undefined && queryTokenRef.current !== expectedToken) return;
                    setCharacters(prev => [...prev, ...chars]);
                } else {
                    setCharacters(chars);
                }
                setHasMore(activeCategory === "Stories" ? (data.hasMore ?? false) : (data.hasMore ?? false));
                setCurrentOffset(offset + chars.length);
            }
        } catch (error: any) {
            if (error?.name === 'AbortError') return; // stale request — do not update state
            console.error("Failed to fetch characters:", error);
        } finally {
            if (!signal?.aborted) {
                setInitialLoading(false);
                setRefreshLoading(false);
                setIsLoadingMore(false);
            }
        }
    };

    // Load next page
    const loadMore = useCallback(() => {
        if (isLoadingMore || !hasMore) return;
        // Capture the token at call-time; fetchCharacters will discard the append if it changes
        const token = queryTokenRef.current;
        fetchCharacters(true, currentOffset, undefined, token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoadingMore, hasMore, currentOffset, activeCategory, search]);

    // IntersectionObserver for infinite scroll
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;
        const observer = new IntersectionObserver(
            (entries) => { if (entries[0].isIntersecting) loadMore(); },
            { rootMargin: "400px" }
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [loadMore]);

    const fetchSpecialCharacters = async () => {
        try {
            const res = await fetch(`/api/characters?category=Specialist&limit=10`);
            if (res.ok) {
                const data = await res.json();
                setSpecialCharacters(data.characters || data);
            }
        } catch (error) {
            console.error("Failed to fetch special characters:", error);
        }
    };

    const fetchForYou = async () => {
        try {
            const res = await fetch(`/api/characters/for-you`);
            if (res.ok) {
                const data = await res.json();
                setForYouCharacters(data);
            }
        } catch (error) {
            console.error("Failed to fetch for-you characters:", error);
        }
    };

    useEffect(() => {
        setCurrentOffset(0);
        setHasMore(false);
        // Bump token to invalidate any in-flight load-more from the previous query
        queryTokenRef.current += 1;

        // Abort any previous in-flight request
        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const runFetch = () => fetchCharacters(false, 0, controller.signal);

        if (search) {
            // Debounce search input to avoid stale races on every keystroke
            clearTimeout(debounceTimer.current);
            debounceTimer.current = setTimeout(runFetch, 350);
        } else {
            // Category change — fire immediately, no debounce needed
            runFetch();
        }

        if (activeCategory === "All" && !search) {
            fetchSpecialCharacters();
            fetchForYou();
        } else {
            setSpecialCharacters([]);
            setForYouCharacters([]);
        }

        const handleLikeUpdate = (e: Event) => {
            const customEvent = e as CustomEvent<{ id: string, likesCount: number, liked: boolean }>;
            const { id, likesCount, liked } = customEvent.detail;
            setCharacters(prev => prev.map(c =>
                c.id === id ? { ...c, likes: likesCount, userHasLiked: liked } : c
            ));
            setSelectedPreview(prev => prev?.id === id ? { ...prev, likes: likesCount, userHasLiked: liked } : prev);
        };

        window.addEventListener('characterLikeUpdate', handleLikeUpdate);
        return () => {
            clearTimeout(debounceTimer.current);
            abortControllerRef.current?.abort();
            window.removeEventListener('characterLikeUpdate', handleLikeUpdate);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCategory, search]);

    const handleLike = async (character: Character, e: React.MouseEvent) => {
        e.stopPropagation(); // prevent opening preview

        const wasLiked = character.userHasLiked || false;
        const newLikes = (character.likes || 0) + (wasLiked ? -1 : 1);

        // Optimistic UI update
        setCharacters(prev => prev.map(c =>
            c.id === character.id
                ? { ...c, likes: Math.max(0, newLikes), userHasLiked: !wasLiked }
                : c
        ));

        if (selectedPreview?.id === character.id) {
            setSelectedPreview(prev => prev ? { ...prev, likes: Math.max(0, newLikes), userHasLiked: !wasLiked } : null);
        }

        try {
            const res = await fetch(`/api/characters/${character.id}/like`, { method: "POST" });

            if (!res.ok) {
                throw new Error(res.status === 401 ? "unauthorized" : "failed");
            }

            const data = await res.json();
            if (data.success && typeof data.likesCount === 'number') {
                // Correct optimistic UI
                setCharacters(prev => prev.map(c =>
                    c.id === character.id ? { ...c, likes: data.likesCount, userHasLiked: data.liked } : c
                ));
                if (selectedPreview?.id === character.id) {
                    setSelectedPreview(prev => prev ? { ...prev, likes: data.likesCount, userHasLiked: data.liked } : null);
                }
                // Notify other components
                window.dispatchEvent(new CustomEvent('characterLikeUpdate', {
                    detail: { id: character.id, likesCount: data.likesCount, liked: data.liked }
                }));
            }
        } catch (error: any) {
            // Revert
            setCharacters(prev => prev.map(c =>
                c.id === character.id ? { ...c, likes: character.likes, userHasLiked: wasLiked } : c
            ));
            if (selectedPreview?.id === character.id) {
                setSelectedPreview(prev => prev ? { ...prev, likes: character.likes, userHasLiked: wasLiked } : null);
            }
            if (error.message === "unauthorized") alert("Please log in to like this character.");
            else alert("Failed to like character.");
        }
    };

    // Featured characters (top trending ones)
    const featuredList = useMemo(() => {
        return characters.slice(0, 5);
    }, [characters]);

    const featured = featuredList.length > 0 ? featuredList[featuredIndex] : null;

    // Auto-play the slider
    useEffect(() => {
        if (featuredList.length <= 1) return;
        const timer = setInterval(() => {
            setFeaturedIndex((prev) => (prev + 1) % featuredList.length);
        }, 4000);
        return () => clearInterval(timer);
    }, [featuredList.length]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        isDragging.current = true;
        setDragOffset(0);
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isDragging.current) return;
        const diff = e.touches[0].clientX - touchStartX.current;
        setDragOffset(diff);
    }, []);

    const handleTouchEnd = useCallback(() => {
        isDragging.current = false;
        if (dragOffset < -50 && featuredList.length > 1) {
            setFeaturedIndex((prev) => (prev + 1) % featuredList.length);
        } else if (dragOffset > 50 && featuredList.length > 1) {
            setFeaturedIndex((prev) => (prev - 1 + featuredList.length) % featuredList.length);
        }
        setDragOffset(0);
    }, [dragOffset, featuredList.length]);

    // For You picks — use personalized API data, fallback to trending slice
    const forYou = forYouCharacters.length > 0
        ? forYouCharacters
        : characters.slice(featuredList.length, featuredList.length + 3);

    const handlePreview = (char: Character, e?: React.MouseEvent | React.TouchEvent) => {
        if (e) e.stopPropagation();
        setSelectedPreview(char);
    };

    // Capacitor Hardware Back Button for Preview Modal
    useEffect(() => {
        const handleBack = () => {
            if (selectedPreview) {
                setSelectedPreview(null);
            }
        };
        const listener = App.addListener('backButton', handleBack);
        return () => {
            listener.then(l => l.remove());
        };
    }, [selectedPreview]);

    // --- Long Press Logic ---
    const longPressTimer = useRef<NodeJS.Timeout | undefined>(undefined);
    const isLongPressActive = useRef(false);

    const handlePressStart = (char: Character, e: React.TouchEvent | React.MouseEvent) => {
        isLongPressActive.current = false;
        longPressTimer.current = setTimeout(() => {
            isLongPressActive.current = true;
            if (window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate(50);
            }
            handlePreview(char, e);
        }, 500);
    };

    const handlePressEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
        }
    };

    const handleCardClick = (char: Character, e: React.MouseEvent | React.TouchEvent) => {
        if (isLongPressActive.current) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        if (char.source === "story" && onSelectGroup) {
            // Show the pre-play character setup modal instead of directly opening
            const store = useChatStore.getState();
            const existingConvo = store.conversations[char.id];
            // Pre-fill with existing player values if available
            setPlayerName(
                existingConvo?.storyData?.playerCharacterName ||
                char.storyData?.playerCharacterName || ""
            );
            setPlayerDesc(
                existingConvo?.storyData?.playerCharacterDescription ||
                char.storyData?.playerCharacterDescription || ""
            );
            setStorySetupChar(char);
        } else {
            onSelectCharacter(char);
        }
    };

    /** Called when the player confirms their character in the pre-play setup modal. */
    const handleStorySetupConfirm = () => {
        if (!storySetupChar || !onSelectGroup) return;
        const char = storySetupChar;
        const finalName = playerName.trim() || "Player";
        const finalDesc = playerDesc.trim() || "The protagonist";

        const store = useChatStore.getState();
        const existingConvo = store.conversations[char.id];

        if (existingConvo) {
            // Existing conversation found — persist updated story metadata to the backend
            // Prefer reusing createStory with the explicit id so sync is consistent
            store.createStory(
                char.name,
                char.image,
                {
                    synopsis: char.storyData?.synopsis || char.description || existingConvo.storyData?.synopsis || "",
                    genre: char.storyData?.genre || char.tag || existingConvo.storyData?.genre || "",
                    isPublished: true,
                    playerCharacterName: finalName,
                    playerCharacterDescription: finalDesc,
                    castIds: char.storyData?.castIds || existingConvo.storyData?.castIds || []
                },
                char.worldData ?? existingConvo.worldData,
                char.id,
                char.creatorId ?? existingConvo.creatorId
            );
            onSelectGroup(char.id);
        } else {
            // No existing conversation — create a new one
            const storyId = store.createStory(
                char.name,
                char.image,
                {
                    synopsis: char.storyData?.synopsis || char.description || "",
                    genre: char.storyData?.genre || char.tag || "",
                    isPublished: true,
                    playerCharacterName: finalName,
                    playerCharacterDescription: finalDesc,
                    castIds: char.storyData?.castIds || []
                },
                char.worldData,
                char.id,
                char.creatorId
            );
            onSelectGroup(storyId);
        }

        setStorySetupChar(null);
    };

    return (
        <div className="explore-container">
            <AnimatePresence mode="wait">
                {searchMode ? (
                    /* ══════════ SEARCH PAGE ══════════ */
                    <motion.div
                        key="search-page"
                        style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
                    >
                        {/* Sticky Search Header */}
                        <div className="explore-header-sticky">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 0 8px' }}>
                                <button
                                    onClick={() => { setSearchMode(false); setSearch(""); setActiveCategory("All"); }}
                                    style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        color: '#4A3728', padding: '6px', borderRadius: '12px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                                <div className="explore-search-glass" style={{ flex: 1, marginBottom: 0 }}>
                                    <svg className="explore-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ position: 'absolute', left: '16px', color: '#9CA3AF', pointerEvents: 'none' }}>
                                        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                                        <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                    <input
                                        ref={searchInputRef}
                                        className="explore-search"
                                        type="text"
                                        placeholder="Search characters..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        autoFocus
                                        style={{ padding: '12px 14px 12px 40px', width: '100%', border: 'none', background: 'transparent', outline: 'none' }}
                                    />
                                    {search && (
                                        <button className="explore-search-clear" onClick={() => setSearch("")} style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Category chips */}
                            <div className="explore-chips no-scrollbar" style={{ paddingTop: '4px', paddingBottom: '12px' }}>
                                {CATEGORIES.map((cat) => (
                                    <button
                                        key={cat}
                                        className={`explore-chip ${activeCategory === cat ? "explore-chip-active" : ""}`}
                                        onClick={() => setActiveCategory(cat)}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Scrollable Search Results */}
                        <div className="explore-scroll-content no-scrollbar">

                            {/* Search Results */}
                            {initialLoading ? (
                                /* First-load skeleton — shown only when no data exists yet */
                                <div style={{ paddingTop: '8px' }}>
                                    <div className="explore-section-header">
                                        <div style={{ width: '150px', height: '28px', background: '#F3F4F6', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />
                                        <div style={{ width: '80px', height: '16px', background: '#F3F4F6', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                                    </div>
                                    <div className="explore-grid">
                                        {[1, 2, 3, 4].map((i) => (
                                            <div key={i} className="explore-card" style={{ pointerEvents: 'none' }}>
                                                <div className="explore-card-img-wrap" style={{ background: '#F3F4F6', animation: 'pulse 1.5s infinite' }} />
                                                <div className="explore-card-body">
                                                    <div className="explore-card-name-row">
                                                        <div style={{ width: '70%', height: '20px', background: '#e5e7eb', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                                                    </div>
                                                    <div style={{ width: '100%', height: '12px', background: '#e5e7eb', borderRadius: '4px', marginTop: '6px', animation: 'pulse 1.5s infinite' }} />
                                                    <div style={{ width: '80%', height: '12px', background: '#e5e7eb', borderRadius: '4px', marginTop: '4px', animation: 'pulse 1.5s infinite' }} />
                                                    <div className="explore-card-footer" style={{ marginTop: '8px' }}>
                                                        <div style={{ width: '40px', height: '16px', background: '#e5e7eb', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                                                        <div style={{ width: '50px', height: '14px', background: '#e5e7eb', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : characters.length > 0 ? (
                                <div style={{ paddingTop: '8px', position: 'relative' }}>
                                    {/* Refresh overlay spinner — shown over existing cards on category/search change */}
                                    {refreshLoading && (
                                        <div style={{
                                            position: 'absolute', inset: 0, zIndex: 10,
                                            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                                            paddingTop: '48px',
                                            background: 'rgba(255,253,245,0.65)', backdropFilter: 'blur(2px)',
                                            borderRadius: '12px', pointerEvents: 'none'
                                        }}>
                                            <div style={{
                                                width: '28px', height: '28px', border: '3px solid #e5e7eb',
                                                borderTop: '3px solid #4A3728', borderRadius: '50%',
                                                animation: 'spin 0.8s linear infinite'
                                            }} />
                                        </div>
                                    )}
                                    <div className="explore-section-header">
                                        <h2 className="explore-section-title">
                                            {search ? `Results for "${search}"` : activeCategory === "All" ? "All Characters" : activeCategory}
                                        </h2>
                                    </div>
                                    <div className="explore-grid">
                                        <AnimatePresence mode="popLayout">
                                            {characters.map((char) => (
                                                <motion.div
                                                    key={char.id}
                                                    className="explore-card"
                                                    onClick={(e) => handleCardClick(char, e as any)}
                                                    onTouchStart={(e) => handlePressStart(char, e)}
                                                    onTouchEnd={handlePressEnd}
                                                    onTouchMove={handlePressEnd}
                                                    onMouseDown={(e) => handlePressStart(char, e)}
                                                    onMouseUp={handlePressEnd}
                                                    onMouseLeave={handlePressEnd}
                                                    whileTap={{ scale: 0.97 }}
                                                    layout
                                                >
                                                    <div className="explore-card-img-wrap">
                                                        <img src={getSafeImage(char.image, char.name)} alt={char.name} className="explore-card-img" />
                                                        <div className="explore-card-img-overlay" />
                                                        <div className="explore-card-float-tag">
                                                            <span>{char.tag}</span>
                                                        </div>
                                                    </div>
                                                    <div className="explore-card-body">
                                                        <div className="explore-card-name-row">
                                                            <h3 className="explore-card-name" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {char.name}
                                                            </h3>
                                                        </div>
                                                        <p className="explore-card-desc">{char.description}</p>
                                                        <div className="explore-card-footer">
                                                            <span className="explore-card-chat-btn">
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                                                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                                                </svg>
                                                                Chat
                                                            </span>
                                                            <span className="explore-card-personality">
                                                                {char.personality.split(",")[0].trim()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            ) : (
                                <motion.div
                                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' }}
                                >
                                    <svg width="140" height="140" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '16px', opacity: 0.9, filter: 'drop-shadow(0px 8px 16px rgba(0,0,0,0.06))' }}>
                                        <circle cx="100" cy="90" r="60" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="8" />
                                        <path d="M140 130l25 25" stroke="#E5E7EB" strokeWidth="16" strokeLinecap="round" />
                                        <circle cx="85" cy="80" r="4" fill="#6B7280" />
                                        <circle cx="115" cy="80" r="4" fill="#6B7280" />
                                        <path d="M92 98c5 4 11 4 16 0" stroke="#6B7280" strokeWidth="3" strokeLinecap="round" fill="none" />
                                        <path d="M125 50l5-8M140 60l10-4M55 120l-10 5" stroke="#D1D5DB" strokeWidth="3" strokeLinecap="round" />
                                    </svg>
                                    <p style={{ fontSize: '18px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>No characters found</p>
                                    <p style={{ fontSize: '14px', color: '#6B7280' }}>Try a different search or category</p>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                ) : (
                    /* ══════════ EXPLORE PAGE ══════════ */
                    <motion.div
                        key="explore-page"
                        style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
                    >
                        {/* ── Sticky Header ────────────────────────────────── */}
                        <div className="explore-header-sticky">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 4px 8px' }}>
                                <div style={{ paddingLeft: "4px" }}>
                                    <h1 className="explore-hero-title" style={{ fontSize: '22px', marginBottom: '2px' }}>Discover</h1>
                                    <p className="explore-hero-subtitle" style={{ fontSize: '11px' }}>Find your next partner</p>
                                </div>
                                <motion.button
                                    className="explore-header-search-btn"
                                    onClick={() => setSearchMode(true)}
                                    whileTap={{ scale: 0.95 }}
                                    style={{
                                        width: '36px', height: '36px', borderRadius: '50%',
                                        background: '#F3F4F6', border: 'none',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#4A3728', cursor: 'pointer',
                                        flexShrink: 0
                                    }}
                                    aria-label="Search characters"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                                        <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                </motion.button>
                            </div>

                            {/* ── Category chips ─────────────────────────── */}
                            <motion.div
                                className="explore-chips no-scrollbar"
                                style={{ padding: '4px 0 8px' }}
                            >
                                {CATEGORIES.map((cat) => (
                                    <button
                                        key={cat}
                                        className={`explore-chip ${activeCategory === cat ? "explore-chip-active" : ""}`}
                                        onClick={() => setActiveCategory(cat)}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </motion.div>
                        </div>

                        {/* ── Scrollable Content ────────────────────── */}
                        <div className="explore-scroll-content no-scrollbar">

                            {initialLoading ? (
                                /* First-load skeleton — shown only when no data exists yet */
                                <div style={{ padding: '0px' }}>
                                    <div className="explore-section">
                                        <div className="explore-section-header">
                                            <div style={{ width: '150px', height: '28px', background: '#F3F4F6', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />
                                            <div style={{ width: '80px', height: '16px', background: '#F3F4F6', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                                        </div>
                                        <div className="explore-grid">
                                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                                <div key={i} className="explore-card" style={{ pointerEvents: 'none' }}>
                                                    <div className="explore-card-img-wrap" style={{ background: '#F3F4F6', animation: 'pulse 1.5s infinite' }} />
                                                    <div className="explore-card-body">
                                                        <div className="explore-card-name-row">
                                                            <div style={{ width: '70%', height: '20px', background: '#e5e7eb', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                                                        </div>
                                                        <div style={{ width: '100%', height: '12px', background: '#e5e7eb', borderRadius: '4px', marginTop: '6px', animation: 'pulse 1.5s infinite' }} />
                                                        <div style={{ width: '80%', height: '12px', background: '#e5e7eb', borderRadius: '4px', marginTop: '4px', animation: 'pulse 1.5s infinite' }} />
                                                        <div className="explore-card-footer" style={{ marginTop: '8px' }}>
                                                            <div style={{ width: '40px', height: '16px', background: '#e5e7eb', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                                                            <div style={{ width: '50px', height: '14px', background: '#e5e7eb', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ position: 'relative' }}>
                                    {/* Refresh overlay spinner — shown over existing cards on category/search change */}
                                    {refreshLoading && (
                                        <div style={{
                                            position: 'absolute', inset: 0, zIndex: 10,
                                            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                                            paddingTop: '64px',
                                            background: 'rgba(255,253,245,0.65)', backdropFilter: 'blur(2px)',
                                            borderRadius: '12px', pointerEvents: 'none'
                                        }}>
                                            <div style={{
                                                width: '28px', height: '28px', border: '3px solid #e5e7eb',
                                                borderTop: '3px solid #4A3728', borderRadius: '50%',
                                                animation: 'spin 0.8s linear infinite'
                                            }} />
                                        </div>
                                    )}
                                    {/* ── Specialist Characters — Horizontal Scroll ── */}
                                    {activeCategory === "All" && !search && specialCharacters.length > 0 && (
                                        <div className="explore-section">
                                            <div className="explore-section-header">
                                                <h2 className="explore-section-title">Specialist Characters</h2>
                                            </div>
                                            <div className="explore-specialist-scroll no-scrollbar">
                                                {specialCharacters.map((char, i) => (
                                                    <motion.div
                                                        key={char.id}
                                                        className="explore-specialist-card"
                                                        onClick={(e) => handleCardClick(char, e as any)}
                                                        onTouchStart={(e) => handlePressStart(char, e)}
                                                        onTouchEnd={handlePressEnd}
                                                        onTouchMove={handlePressEnd}
                                                        onMouseDown={(e) => handlePressStart(char, e)}
                                                        onMouseUp={handlePressEnd}
                                                        onMouseLeave={handlePressEnd}
                                                        whileTap={{ scale: 0.96 }}
                                                    >
                                                        <img src={getSafeImage(char.image, char.name)} alt={char.name} className="explore-specialist-img" />
                                                        <div className="explore-specialist-overlay" />
                                                        <div className="explore-specialist-badge-wrap">
                                                            <span className="explore-specialist-badge">
                                                                <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                                                                Specialist
                                                            </span>
                                                        </div>
                                                        <div className="explore-specialist-chat-hint">
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        </div>
                                                        <div className="explore-specialist-info">
                                                            <div className="explore-specialist-name">{char.name}</div>
                                                            <div className="explore-specialist-role">{char.description?.substring(0, 40) || char.tag}</div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Featured Character Spotlight ──────────── */}
                                    {activeCategory === "All" && !search && featuredList.length > 0 && (() => {
                                        const currentChar = featuredList[featuredIndex];
                                        return (
                                            <motion.div
                                                className="explore-featured"
                                                style={{ position: 'relative' }}
                                                onTouchStart={handleTouchStart}
                                                onTouchMove={handleTouchMove}
                                                onTouchEnd={handleTouchEnd}
                                            >
                                                <div
                                                    key={featuredIndex}
                                                    className="explore-featured-card explore-slide-in"
                                                    onClick={(e) => handleCardClick(currentChar, e as any)}
                                                    onTouchStart={(e) => handlePressStart(currentChar, e)}
                                                    onTouchEnd={handlePressEnd}
                                                    onTouchMove={handlePressEnd}
                                                    onMouseDown={(e) => handlePressStart(currentChar, e)}
                                                    onMouseUp={handlePressEnd}
                                                    onMouseLeave={handlePressEnd}
                                                >
                                                    <div className="explore-featured-img-wrap">
                                                        <img src={getSafeImage(currentChar.image, currentChar.name)} alt={currentChar.name} className="explore-featured-img" style={{ pointerEvents: 'none', userSelect: 'none' }} />
                                                        <div className="explore-featured-overlay" />
                                                        <div className="explore-featured-content">
                                                            <span className="explore-featured-label">#{featuredIndex + 1} Trending</span>
                                                            <h2 className="explore-featured-name">{currentChar.name}</h2>
                                                            <p className="explore-featured-desc">{currentChar.description}</p>
                                                            <div className="explore-featured-actions">
                                                                <span className="explore-featured-tag">{currentChar.tag}</span>
                                                                <span className="explore-featured-chat-btn">
                                                                    {currentChar.source === "story" ? (
                                                                        <>
                                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                                                                <path d="M8 5v14l11-7z" />
                                                                            </svg>
                                                                            Play Story
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                                                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                                            </svg>
                                                                            Start Chat
                                                                        </>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                {featuredList.length > 1 && (
                                                    <div style={{ position: 'absolute', bottom: '16px', right: '20px', display: 'flex', gap: '6px', zIndex: 10 }}>
                                                        {featuredList.map((_, idx) => (
                                                            <button
                                                                key={idx}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setFeaturedIndex(idx);
                                                                }}
                                                                style={{
                                                                    width: '8px', height: '8px', borderRadius: '50%',
                                                                    background: idx === featuredIndex ? '#FFE566' : 'rgba(255,255,255,0.4)',
                                                                    border: 'none', cursor: 'pointer', padding: 0,
                                                                    transition: 'all 0.3s',
                                                                    transform: idx === featuredIndex ? 'scale(1.4)' : 'scale(1)',
                                                                    boxShadow: idx === featuredIndex ? '0 0 6px rgba(255, 229, 102, 0.6)' : 'none'
                                                                }}
                                                                aria-label={`Go to slide ${idx + 1}`}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })()}

                                    {/* ── For You Section ──────────────────────── */}
                                    {activeCategory === "All" && !search && forYou.length > 0 && (
                                        <div className="explore-section">
                                            <div className="explore-section-header">
                                                <h2 className="explore-section-title">For You</h2>
                                            </div>
                                            <div className="explore-for-you no-scrollbar">
                                                {forYou.map((char, i) => (
                                                    <motion.div
                                                        key={char.id}
                                                        className="explore-fy-card"
                                                        onClick={(e) => handleCardClick(char, e as any)}
                                                        onTouchStart={(e) => handlePressStart(char, e)}
                                                        onTouchEnd={handlePressEnd}
                                                        onTouchMove={handlePressEnd}
                                                        onMouseDown={(e) => handlePressStart(char, e)}
                                                        onMouseUp={handlePressEnd}
                                                        onMouseLeave={handlePressEnd}
                                                        whileTap={{ scale: 0.96 }}
                                                    >
                                                        <div className="explore-fy-img-wrap">
                                                            <img src={getSafeImage(char.image, char.name)} alt={char.name} className="explore-fy-img" />
                                                            <div className="explore-fy-overlay" />
                                                        </div>
                                                        <div className="explore-fy-info">
                                                            <span className="explore-fy-tag">{char.tag}</span>
                                                            <h3 className="explore-fy-name">{char.name}</h3>
                                                            <div className="explore-fy-status" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                    <span className="explore-fy-online-dot" /> Online
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#ff4d4f' }}>
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                                                                    {char.likes || 0}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* ── All Characters grid ────────────────────── */}
                                    <div className="explore-section">
                                        <div className="explore-section-header">
                                            <h2 className="explore-section-title">
                                                {activeCategory === "All" ? "All Characters" : activeCategory}
                                            </h2>
                                        </div>
                                        <div className="explore-grid">
                                            <AnimatePresence mode="popLayout">
                                                {characters.map((char, i) => (
                                                    <motion.div
                                                        key={char.id}
                                                        className="explore-card"
                                                        onClick={(e) => handleCardClick(char, e as any)}
                                                        onTouchStart={(e) => handlePressStart(char, e)}
                                                        onTouchEnd={handlePressEnd}
                                                        onTouchMove={handlePressEnd}
                                                        onMouseDown={(e) => handlePressStart(char, e)}
                                                        onMouseUp={handlePressEnd}
                                                        onMouseLeave={handlePressEnd}
                                                        whileTap={{ scale: 0.97 }}
                                                        layout
                                                    >
                                                        <div className="explore-card-img-wrap">
                                                            <img src={getSafeImage(char.image, char.name)} alt={char.name} className="explore-card-img" />
                                                            <div className="explore-card-img-overlay" />
                                                            <div className="explore-card-float-tag">
                                                                <span>{char.tag}</span>
                                                            </div>
                                                            <button
                                                                className="explore-card-info-btn"
                                                                onClick={(e) => handlePreview(char, e)}
                                                                aria-label="Character info"
                                                            >
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                                                                    <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                        <div className="explore-card-body">
                                                            <div className="explore-card-name-row">
                                                                <h3 className="explore-card-name" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    {char.name}
                                                                    {char.nickname && <span style={{ fontSize: '12px', color: '#9CA3AF', marginLeft: '6px', fontWeight: 'normal' }}>"{char.nickname}"</span>}
                                                                </h3>
                                                                {char.source !== "story" && (
                                                                    <button
                                                                        onClick={(e) => handleLike(char, e)}
                                                                        className="explore-like-btn"
                                                                        style={{
                                                                            background: 'transparent',
                                                                            border: 'none',
                                                                            cursor: 'pointer',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '2px',
                                                                            color: '#ff4d4f',
                                                                            fontSize: '11px',
                                                                            fontWeight: 600,
                                                                            padding: '2px'
                                                                        }}
                                                                    >
                                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill={char.userHasLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                                                        </svg>
                                                                        {char.likes || 0}
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <p className="explore-card-desc">{char.description}</p>
                                                            <div className="explore-card-footer">
                                                                <span className="explore-card-chat-btn">
                                                                    {char.source === "story" ? (
                                                                        <>
                                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                                                                <path d="M8 5v14l11-7z" />
                                                                            </svg>
                                                                            Play
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                                                                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                                                            </svg>
                                                                            Chat
                                                                        </>
                                                                    )}
                                                                </span>
                                                                <span className="explore-card-personality">
                                                                    {char.source === "story" ? (char.tag || "Story") : char.personality.split(",")[0].trim()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    {/* ── Infinite scroll sentinel + loading ── */}
                                    <div ref={sentinelRef} style={{ height: '1px' }} />
                                    {isLoadingMore && (
                                        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0 40px' }}>
                                            <div style={{
                                                width: '32px', height: '32px', border: '3px solid #e5e7eb',
                                                borderTop: '3px solid #4A3728', borderRadius: '50%',
                                                animation: 'spin 0.8s linear infinite'
                                            }} />
                                        </div>
                                    )}
                                    {!isLoadingMore && hasMore && (
                                        <div style={{ textAlign: 'center', padding: '16px 0 32px', color: '#9CA3AF', fontSize: '13px' }}>
                                            Scroll for more...
                                        </div>
                                    )}

                                    {/* ── Empty state ────────────────────────────── */}
                                    {characters.length === 0 && (
                                        <motion.div
                                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center', gridColumn: '1 / -1' }}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.5 }}
                                        >
                                            <svg width="140" height="140" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '16px', opacity: 0.9, filter: 'drop-shadow(0px 8px 16px rgba(0,0,0,0.06))' }}>
                                                <circle cx="100" cy="90" r="60" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="8" />
                                                <path d="M140 130l25 25" stroke="#E5E7EB" strokeWidth="16" strokeLinecap="round" />
                                                <circle cx="85" cy="80" r="4" fill="#6B7280" />
                                                <circle cx="115" cy="80" r="4" fill="#6B7280" />
                                                <path d="M92 98c5 4 11 4 16 0" stroke="#6B7280" strokeWidth="3" strokeLinecap="round" fill="none" />
                                                <path d="M125 50l5-8M140 60l10-4M55 120l-10 5" stroke="#D1D5DB" strokeWidth="3" strokeLinecap="round" />
                                            </svg>
                                            <p style={{ fontSize: '18px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>No characters found</p>
                                            <p style={{ fontSize: '14px', color: '#6B7280' }}>Try a different search or category</p>
                                        </motion.div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Character Preview Modal ── */}
            <AnimatePresence>
                {selectedPreview && (
                    <motion.div
                        className="explore-preview-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedPreview(null)}
                    >
                        <motion.div
                            className="explore-preview-modal"
                            initial={{ opacity: 0, y: 60, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 40, scale: 0.95 }}
                            transition={{ type: "spring", damping: 28, stiffness: 340 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                className="explore-preview-close"
                                onClick={() => setSelectedPreview(null)}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                                </svg>
                            </button>
                            <div className="explore-preview-header">
                                <div className="explore-preview-avatar">
                                    <img src={getSafeImage(selectedPreview.image, selectedPreview.name)} alt={selectedPreview.name} />
                                </div>
                                <div className="explore-preview-header-info">
                                    <h3 className="explore-preview-name">{selectedPreview.name}</h3>
                                    <span className="explore-preview-tag-pill">{selectedPreview.tag}</span>
                                    <div className="explore-preview-online-row">
                                        <span className="explore-preview-online-dot" />
                                        <span>Online{selectedPreview.source !== "story" ? ` • ${selectedPreview.likes || 0} Likes` : ""}</span>
                                    </div>
                                    {selectedPreview.source !== "story" && (
                                        <button
                                            onClick={(e) => handleLike(selectedPreview, e)}
                                            style={{
                                                marginTop: '8px',
                                                padding: '8px 16px',
                                                background: selectedPreview.userHasLiked ? '#FFF0F0' : '#F9FAFB',
                                                color: selectedPreview.userHasLiked ? '#FF4D4F' : '#6B7280',
                                                border: selectedPreview.userHasLiked ? '1px solid #FFCCC7' : '1px solid #E5E7EB',
                                                borderRadius: '20px',
                                                cursor: 'pointer',
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill={selectedPreview.userHasLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                                            {selectedPreview.userHasLiked ? 'Liked' : 'Like'}
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="explore-preview-body">
                                <div className="explore-preview-section">
                                    <span className="explore-preview-label">About</span>
                                    <p className="explore-preview-text" style={{ whiteSpace: "pre-wrap" }}>
                                        {selectedPreview.longDescription || selectedPreview.description}
                                    </p>
                                </div>
                                {selectedPreview.tags && selectedPreview.tags.length > 0 && (
                                    <div className="explore-preview-section">
                                        <span className="explore-preview-label">Tags</span>
                                        <div className="explore-preview-traits">
                                            {selectedPreview.tags.map(tag => (
                                                <span key={tag} className="explore-preview-trait" style={{ background: "#F3F4F6", border: "none" }}>#{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {(selectedPreview.zodiac_sign || selectedPreview.birthday) && (
                                    <div className="explore-preview-section" style={{ display: "flex", gap: "24px" }}>
                                        {selectedPreview.zodiac_sign && (
                                            <div>
                                                <span className="explore-preview-label">Zodiac</span>
                                                <div className="explore-preview-text" style={{ fontWeight: 600 }}>{selectedPreview.zodiac_sign}</div>
                                            </div>
                                        )}
                                        {selectedPreview.birthday && (
                                            <div>
                                                <span className="explore-preview-label">Birthday</span>
                                                <div className="explore-preview-text" style={{ fontWeight: 600 }}>{selectedPreview.birthday}</div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="explore-preview-section">
                                    <span className="explore-preview-label">Personality</span>
                                    <div className="explore-preview-traits">
                                        {selectedPreview.personality.split(",").map((trait) => (
                                            <span key={trait.trim()} className="explore-preview-trait">
                                                {trait.trim()}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                {selectedPreview.scenario && (
                                    <div className="explore-preview-section">
                                        <span className="explore-preview-label">Scenario</span>
                                        <p className="explore-preview-text" style={{ fontStyle: "italic", background: "#F9FAFB", padding: "10px", borderRadius: "10px", fontSize: "13px" }}>
                                            {selectedPreview.scenario}
                                        </p>
                                    </div>
                                )}
                                <div className="explore-preview-section">
                                    <span className="explore-preview-label">Greeting</span>
                                    <p className="explore-preview-greeting">{selectedPreview.greeting}</p>
                                </div>
                            </div>
                            <button
                                className="explore-preview-start"
                                onClick={(e) => {
                                    setSelectedPreview(null);
                                    if (selectedPreview.source === "story") {
                                        handleCardClick(selectedPreview, e);
                                    } else {
                                        onSelectCharacter(selectedPreview);
                                    }
                                }}
                            >
                                {selectedPreview.source === "story" ? (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                        Play Story
                                    </>
                                ) : (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        Start Conversation
                                    </>
                                )}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Pre-Play Character Setup Modal ── */}
            <AnimatePresence>
                {storySetupChar && (
                    <motion.div
                        className="explore-preview-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setStorySetupChar(null)}
                        style={{ zIndex: 1100 }}
                    >
                        <motion.div
                            className="explore-preview-modal"
                            initial={{ opacity: 0, y: 60, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 40, scale: 0.95 }}
                            transition={{ type: "spring", damping: 28, stiffness: 340 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ maxWidth: '400px' }}
                        >
                            <button
                                className="explore-preview-close"
                                onClick={() => setStorySetupChar(null)}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                                </svg>
                            </button>

                            {/* Story Info Header */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '20px 20px 0', marginBottom: '4px'
                            }}>
                                <div style={{
                                    width: '56px', height: '56px', borderRadius: '14px',
                                    overflow: 'hidden', flexShrink: 0,
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                }}>
                                    <img
                                        src={getSafeImage(storySetupChar.image, storySetupChar.name)}
                                        alt={storySetupChar.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </div>
                                <div>
                                    <h3 style={{
                                        fontWeight: 700, fontSize: '17px', color: '#1F2937',
                                        margin: 0, lineHeight: 1.3
                                    }}>{storySetupChar.name}</h3>
                                    <span style={{
                                        fontSize: '12px', color: '#6B7280',
                                        background: '#F3F4F6', padding: '2px 8px',
                                        borderRadius: '6px', marginTop: '4px', display: 'inline-block'
                                    }}>{storySetupChar.tag || 'Story'}</span>
                                </div>
                            </div>

                            {/* Setup Form */}
                            <div style={{ padding: '16px 20px 20px' }}>
                                <div style={{
                                    background: 'linear-gradient(135deg, #FFF7ED, #FEF3C7)',
                                    borderRadius: '12px', padding: '14px 16px',
                                    marginBottom: '16px', border: '1px solid #FDE68A'
                                }}>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        marginBottom: '6px'
                                    }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: '#D97706' }}>
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor" />
                                        </svg>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#92400E' }}>
                                            Set up your character
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '12px', color: '#78716C', margin: 0, lineHeight: 1.5 }}>
                                        Create your player persona to immerse yourself in the story. The AI narrator will address you by this identity.
                                    </p>
                                </div>

                                <label style={{
                                    display: 'block', fontSize: '13px', fontWeight: 600,
                                    color: '#374151', marginBottom: '6px'
                                }}>
                                    Character Name
                                </label>
                                <input
                                    type="text"
                                    value={playerName}
                                    onChange={(e) => setPlayerName(e.target.value)}
                                    placeholder="e.g. Arya, Kai, your name..."
                                    maxLength={40}
                                    style={{
                                        width: '100%', padding: '10px 14px',
                                        border: '1.5px solid #E5E7EB', borderRadius: '10px',
                                        fontSize: '14px', outline: 'none',
                                        background: '#FAFAFA', color: '#1F2937',
                                        transition: 'border-color 0.2s',
                                        boxSizing: 'border-box',
                                        marginBottom: '14px'
                                    }}
                                    onFocus={(e) => e.currentTarget.style.borderColor = '#D97706'}
                                    onBlur={(e) => e.currentTarget.style.borderColor = '#E5E7EB'}
                                    autoFocus
                                />

                                <label style={{
                                    display: 'block', fontSize: '13px', fontWeight: 600,
                                    color: '#374151', marginBottom: '6px'
                                }}>
                                    Character Description
                                </label>
                                <textarea
                                    value={playerDesc}
                                    onChange={(e) => setPlayerDesc(e.target.value)}
                                    placeholder="e.g. A wandering swordsman seeking redemption..."
                                    maxLength={200}
                                    rows={3}
                                    style={{
                                        width: '100%', padding: '10px 14px',
                                        border: '1.5px solid #E5E7EB', borderRadius: '10px',
                                        fontSize: '14px', outline: 'none',
                                        background: '#FAFAFA', color: '#1F2937',
                                        transition: 'border-color 0.2s',
                                        resize: 'none', fontFamily: 'inherit',
                                        boxSizing: 'border-box',
                                        marginBottom: '18px'
                                    }}
                                    onFocus={(e) => e.currentTarget.style.borderColor = '#D97706'}
                                    onBlur={(e) => e.currentTarget.style.borderColor = '#E5E7EB'}
                                />

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={() => setStorySetupChar(null)}
                                        style={{
                                            flex: 1, padding: '12px',
                                            borderRadius: '12px', border: '1px solid #E5E7EB',
                                            background: '#F9FAFB', color: '#6B7280',
                                            fontWeight: 600, fontSize: '14px',
                                            cursor: 'pointer', transition: 'background 0.2s'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleStorySetupConfirm}
                                        style={{
                                            flex: 2, padding: '12px',
                                            borderRadius: '12px', border: 'none',
                                            background: 'linear-gradient(135deg, #4A3728, #6B4F3A)',
                                            color: '#FFF', fontWeight: 700,
                                            fontSize: '14px', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', gap: '8px',
                                            boxShadow: '0 2px 8px rgba(74, 55, 40, 0.3)',
                                            transition: 'opacity 0.2s'
                                        }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                        Start Playing
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
