"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useIOSViewportContainment } from "@/lib/useIOSViewportContainment";

const GENRES = ["All", "Fantasy", "Romance", "Mystery", "Action", "Horror", "Sci-Fi", "Slice of Life", "Thriller", "Comedy"] as const;

function safeParseJSON(v: any) {
    if (typeof v !== "string") return v;
    try { return JSON.parse(v); } catch { return undefined; }
}

function first(...vals: any[]) {
    for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim();
    return "";
}

function getSynopsis(story: any) {
    const sd = safeParseJSON(story?.story_data) || {};
    return first(story?.synopsis, sd.synopsis, sd.summary) || "An untold story awaits…";
}

function getMetaLine(story: any) {
    const sd = safeParseJSON(story?.story_data) || {};
    const wd = safeParseJSON(story?.world_data) || {};
    const world = first(wd.name, wd.title, wd.setting, sd.setting, sd.world);
    const tone = first(sd.tone, sd.mood, sd.vibe, wd.tone, wd.vibe);
    return [world, tone, story?.genre || "Story"].filter(Boolean).slice(0, 2).join(" · ");
}

function getHeatBadge(story: any, index: number) {
    const t = story?.created_at ? new Date(story.created_at).getTime() : 0;
    if (t && Date.now() - t < 7 * 24 * 60 * 60 * 1000) return "NEW";
    if (index < 3) return "HOT";
    return null;
}

const getSafeImage = (image?: string | null, seedName?: string) => {
    if (image && image.trim() !== "") return image;
    const letter = seedName?.trim()?.charAt(0)?.toUpperCase() || "?";
    const palettes = [["#6366f1", "#818cf8"], ["#ec4899", "#f472b6"], ["#8b5cf6", "#a78bfa"], ["#14b8a6", "#5eead4"], ["#f59e0b", "#fbbf24"], ["#ef4444", "#f87171"]];
    let h = 0;
    if (seedName) for (let i = 0; i < seedName.length; i++) h = seedName.charCodeAt(i) + ((h << 5) - h);
    const idx = Math.abs(h) % palettes.length;
    const [c1, c2] = palettes[idx];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="560" viewBox="0 0 400 560"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs><rect width="400" height="560" fill="url(#g)"/><text x="50%" y="50%" font-family="sans-serif" font-size="140" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle" opacity="0.7">${letter}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export default function StoryExplorePage() {
    const router = useRouter();
    const rootRef = useRef<HTMLDivElement>(null);
    const [genre, setGenre] = useState("All");
    const [stories, setStories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchOpen, setSearchOpen] = useState(false);
    const [search, setSearch] = useState("");
    const searchRef = useRef<HTMLInputElement>(null);

    const fetchStories = useCallback(async () => {
        setLoading(true);
        try {
            const url = `/api/stories?genre=${encodeURIComponent(genre)}&search=${encodeURIComponent(search)}&limit=50&offset=0`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setStories(Array.isArray(data.items) ? data.items : []);
            } else {
                setStories([]);
            }
        } catch {
            setStories([]);
        } finally {
            setLoading(false);
        }
    }, [genre, search]);

    useEffect(() => {
        fetchStories();
    }, [fetchStories]);

    useEffect(() => {
        if (searchOpen) {
            setTimeout(() => searchRef.current?.focus(), 100);
        }
    }, [searchOpen]);

    // Featured story (first one with image)
    const featured = useMemo(() => stories.find(s => s.image && s.image.trim()), [stories]);
    const { viewportStyle } = useIOSViewportContainment({
        rootRef,
        scrollableSelectors: [".se-scroll"],
    });

    return (
        <div ref={rootRef} className="story-explore-root" style={viewportStyle}>
            {/* Top bar */}
            <header className="se-header">
                <button className="se-back-btn" onClick={() => router.back()} aria-label="Go back">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <div className="se-header-title">Stories</div>
                <button
                    className="se-search-toggle"
                    onClick={() => { setSearchOpen(prev => !prev); if (searchOpen) setSearch(""); }}
                    aria-label="Toggle search"
                >
                    {searchOpen ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                            <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    )}
                </button>
            </header>

            {/* Search bar */}
            <AnimatePresence>
                {searchOpen && (
                    <motion.div
                        className="se-search-bar"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="se-search-inner">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="se-search-icon">
                                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                                <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <input
                                ref={searchRef}
                                type="text"
                                className="se-search-input"
                                placeholder="Search stories…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                            {search && (
                                <button className="se-search-clear" onClick={() => setSearch("")} aria-label="Clear">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Genre chips */}
            <div className="se-genre-row no-scrollbar">
                {GENRES.map(g => (
                    <button
                        key={g}
                        className={`se-genre-chip ${genre === g ? "active" : ""}`}
                        onClick={() => setGenre(g)}
                    >
                        {g}
                    </button>
                ))}
            </div>

            {/* Main content */}
            <div className="se-scroll no-scrollbar">
                {loading ? (
                    <div className="se-grid">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="se-card se-card-skeleton">
                                <div className="se-card-cover se-skeleton-pulse" />
                                <div className="se-card-info">
                                    <div className="se-skeleton-line" style={{ width: "80%" }} />
                                    <div className="se-skeleton-line se-skeleton-sm" style={{ width: "50%" }} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : stories.length === 0 ? (
                    <div className="se-empty">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.4 }}>
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5V4.5A2.5 2.5 0 0 1 6.5 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p className="se-empty-title">No stories found</p>
                        <p className="se-empty-sub">Try a different genre or search term</p>
                    </div>
                ) : (
                    <>
                        {/* Featured banner (first story) */}
                        {featured && !search && genre === "All" && (
                            <motion.div
                                className="se-featured"
                                onClick={() => router.push(`/story/preview/${featured.id}`)}
                                whileTap={{ scale: 0.98 }}
                            >
                                <img src={getSafeImage(featured.image, featured.name)} alt={featured.name} className="se-featured-img" />
                                <div className="se-featured-overlay" />
                                <div className="se-featured-content">
                                    <span className="se-featured-badge">Featured</span>
                                    <h2 className="se-featured-title">{featured.name}</h2>
                                    <p className="se-featured-synopsis">{getSynopsis(featured)}</p>
                                    <div className="se-featured-meta">
                                        <span className="se-featured-genre">{featured.genre || "Story"}</span>
                                        <span className="se-featured-dot">·</span>
                                        <span>{getMetaLine(featured)}</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Section header */}
                        <div className="se-section-head">
                            <h2 className="se-section-title">
                                {search ? `Results for "${search}"` : genre === "All" ? "Popular Stories" : genre}
                            </h2>
                            <span className="se-section-count">{stories.length}</span>
                        </div>

                        {/* Story grid or search results */}
                        {search ? (
                            /* Novel-app style search results list */
                            <div className="se-search-results">
                                {stories.map((story) => (
                                    <motion.div
                                        key={story.id}
                                        className="se-search-row"
                                        onClick={() => router.push(`/story/preview/${story.id}`)}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="se-search-row-cover">
                                            <img
                                                src={getSafeImage(story.image, story.name)}
                                                alt={story.name}
                                                className="se-search-row-img"
                                            />
                                        </div>
                                        <div className="se-search-row-body">
                                            <h3 className="se-search-row-title">{story.name}</h3>
                                            <p className="se-search-row-synopsis">{getSynopsis(story)}</p>
                                            <div className="se-search-row-tags">
                                                <span className="se-search-row-genre">{story.genre || "Story"}</span>
                                                <span className="se-search-row-meta">{getMetaLine(story)}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            /* Regular 3-column grid */
                            <div className="se-grid">
                                {stories.map((story, index) => {
                                    const badge = getHeatBadge(story, index);
                                    return (
                                        <motion.div
                                            key={story.id}
                                            className="se-card"
                                            onClick={() => router.push(`/story/preview/${story.id}`)}
                                            whileTap={{ scale: 0.96 }}
                                        >
                                            <div className="se-card-cover">
                                                <img
                                                    src={getSafeImage(story.image, story.name)}
                                                    alt={story.name}
                                                    className="se-card-img"
                                                />
                                                {badge && <span className={`se-badge se-badge-${badge.toLowerCase()}`}>{badge}</span>}
                                                <span className="se-card-genre">{story.genre || "Story"}</span>
                                            </div>
                                            <div className="se-card-info">
                                                <h3 className="se-card-title">{story.name}</h3>
                                                <p className="se-card-meta">{getMetaLine(story)}</p>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
