"use client";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SOURCE_CATEGORIES as CATEGORIES, type Category, type Character } from "@/data/characters";

interface ExploreTabProps {
    onSelectCharacter: (character: Character) => void;
}

const PAGE_SIZE = 50;

export default function ExploreTab({ onSelectCharacter }: ExploreTabProps) {
    const [activeCategory, setActiveCategory] = useState<Category>("All");
    const [search, setSearch] = useState("");
    const [searchMode, setSearchMode] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [selectedPreview, setSelectedPreview] = useState<Character | null>(null);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [specialCharacters, setSpecialCharacters] = useState<Character[]>([]);
    const [forYouCharacters, setForYouCharacters] = useState<Character[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [currentOffset, setCurrentOffset] = useState(0);
    const [featuredIndex, setFeaturedIndex] = useState(0);
    const [dragOffset, setDragOffset] = useState(0);
    const touchStartX = useRef(0);
    const isDragging = useRef(false);
    const sentinelRef = useRef<HTMLDivElement>(null);

    // Fetch characters (initial or reset)
    const fetchCharacters = async (append = false, offset = 0) => {
        if (append) setIsLoadingMore(true);
        else setIsLoading(true);
        try {
            const res = await fetch(`/api/characters?category=${encodeURIComponent(activeCategory)}&search=${encodeURIComponent(search)}&limit=${PAGE_SIZE}&offset=${offset}`);
            if (res.ok) {
                const data = await res.json();
                const chars = data.characters || data;
                if (append) {
                    setCharacters(prev => [...prev, ...chars]);
                } else {
                    setCharacters(chars);
                }
                setHasMore(data.hasMore ?? false);
                setCurrentOffset(offset + chars.length);
            }
        } catch (error) {
            console.error("Failed to fetch characters:", error);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    };

    // Load next page
    const loadMore = useCallback(() => {
        if (isLoadingMore || !hasMore) return;
        fetchCharacters(true, currentOffset);
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
        fetchCharacters(false, 0);
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
        return () => window.removeEventListener('characterLikeUpdate', handleLikeUpdate);
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
        onSelectCharacter(char);
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
                                        color: '#4A3728', padding: '8px', borderRadius: '12px',
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
                            {isLoading ? (
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
                                                    <div style={{ width: '100%', height: '14px', background: '#e5e7eb', borderRadius: '4px', marginTop: '8px', animation: 'pulse 1.5s infinite' }} />
                                                    <div style={{ width: '80%', height: '14px', background: '#e5e7eb', borderRadius: '4px', marginTop: '4px', animation: 'pulse 1.5s infinite' }} />
                                                    <div className="explore-card-footer" style={{ marginTop: '12px' }}>
                                                        <div style={{ width: '50px', height: '20px', background: '#e5e7eb', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                                                        <div style={{ width: '60px', height: '16px', background: '#e5e7eb', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : characters.length > 0 ? (
                                <div style={{ paddingTop: '8px' }}>
                                    <div className="explore-section-header">
                                        <h2 className="explore-section-title">
                                            {search ? `Results for "${search}"` : activeCategory === "All" ? "All Characters" : activeCategory}
                                        </h2>
                                        <span className="explore-section-count">{characters.length} found</span>
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
                                                        <img src={char.image} alt={char.name} className="explore-card-img" />
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
                                    <h1 className="explore-hero-title" style={{ fontSize: '26px', marginBottom: '2px' }}>Discover</h1>
                                    <p className="explore-hero-subtitle" style={{ fontSize: '12px' }}>Find your next partner</p>
                                </div>
                                <motion.button
                                    className="explore-header-search-btn"
                                    onClick={() => setSearchMode(true)}
                                    whileTap={{ scale: 0.95 }}
                                    style={{
                                        width: '40px', height: '40px', borderRadius: '50%',
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
                                style={{ padding: '8px 0 12px' }}
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

                            {isLoading ? (
                                <div style={{ padding: '0px' }}>
                                    {/* Skeleton Section Header */}
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
                                                        <div style={{ width: '100%', height: '14px', background: '#e5e7eb', borderRadius: '4px', marginTop: '8px', animation: 'pulse 1.5s infinite' }} />
                                                        <div style={{ width: '80%', height: '14px', background: '#e5e7eb', borderRadius: '4px', marginTop: '4px', animation: 'pulse 1.5s infinite' }} />
                                                        <div className="explore-card-footer" style={{ marginTop: '12px' }}>
                                                            <div style={{ width: '50px', height: '20px', background: '#e5e7eb', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                                                            <div style={{ width: '60px', height: '16px', background: '#e5e7eb', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* ── Specialist Characters — Horizontal Scroll ── */}
                                    {activeCategory === "All" && !search && specialCharacters.length > 0 && (
                                        <div className="explore-section">
                                            <div className="explore-section-header">
                                                <h2 className="explore-section-title">Specialist Characters</h2>
                                                <span className="explore-section-count">{specialCharacters.length} specialists</span>
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
                                                        <img src={char.image} alt={char.name} className="explore-specialist-img" />
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
                                                        <img src={currentChar.image} alt={currentChar.name} className="explore-featured-img" style={{ pointerEvents: 'none', userSelect: 'none' }} />
                                                        <div className="explore-featured-overlay" />
                                                        <div className="explore-featured-content">
                                                            <span className="explore-featured-label">#{featuredIndex + 1} Trending</span>
                                                            <h2 className="explore-featured-name">{currentChar.name}</h2>
                                                            <p className="explore-featured-desc">{currentChar.description}</p>
                                                            <div className="explore-featured-actions">
                                                                <span className="explore-featured-tag">{currentChar.tag}</span>
                                                                <span className="explore-featured-chat-btn">
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                                    </svg>
                                                                    Start Chat
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
                                                <span className="explore-section-count">{forYou.length} picks</span>
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
                                                            <img src={char.image} alt={char.name} className="explore-fy-img" />
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
                                            <span className="explore-section-count">{characters.length} characters</span>
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
                                                            <img src={char.image} alt={char.name} className="explore-card-img" />
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
                                                                <button
                                                                    onClick={(e) => handleLike(char, e)}
                                                                    className="explore-like-btn"
                                                                    style={{
                                                                        background: 'transparent',
                                                                        border: 'none',
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px',
                                                                        color: '#ff4d4f',
                                                                        fontSize: '12px',
                                                                        fontWeight: 600,
                                                                        padding: '4px'
                                                                    }}
                                                                >
                                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill={char.userHasLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                                                    </svg>
                                                                    {char.likes || 0}
                                                                </button>
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
                                </>
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
                                    <img src={selectedPreview.image} alt={selectedPreview.name} />
                                </div>
                                <div className="explore-preview-header-info">
                                    <h3 className="explore-preview-name">{selectedPreview.name}</h3>
                                    <span className="explore-preview-tag-pill">{selectedPreview.tag}</span>
                                    <div className="explore-preview-online-row">
                                        <span className="explore-preview-online-dot" />
                                        <span>Online • {selectedPreview.likes || 0} Likes</span>
                                    </div>
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
                                onClick={() => {
                                    setSelectedPreview(null);
                                    onSelectCharacter(selectedPreview);
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Start Conversation
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
