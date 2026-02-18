"use client";
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CHARACTERS, SOURCE_CATEGORIES as CATEGORIES, type Category, type Character } from "@/data/characters";

interface ExploreTabProps {
    onSelectCharacter: (character: Character) => void;
}

export default function ExploreTab({ onSelectCharacter }: ExploreTabProps) {
    const [activeCategory, setActiveCategory] = useState<Category>("All");
    const [search, setSearch] = useState("");
    const [selectedPreview, setSelectedPreview] = useState<Character | null>(null);

    const filtered = useMemo(() => {
        let list = CHARACTERS;
        if (activeCategory !== "All") {
            list = list.filter((c) => c.tag === activeCategory);
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(
                (c) =>
                    c.name.toLowerCase().includes(q) ||
                    c.description.toLowerCase().includes(q)
            );
        }
        return list;
    }, [activeCategory, search]);

    // Featured character (rotates based on time) — robust hydration
    const [featured, setFeatured] = useState<Character>(CHARACTERS[0]);

    React.useEffect(() => {
        setFeatured(CHARACTERS[Math.floor(Date.now() / 86400000) % CHARACTERS.length]);
    }, []);

    // For You picks (random-ish 3 characters, excluding featured)
    const forYou = useMemo(() => {
        return CHARACTERS.filter((c) => c.id !== featured.id).slice(0, 3);
    }, [featured.id]);

    const handlePreview = (char: Character, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedPreview(char);
    };

    return (
        <div className="explore-container">
            {/* ── Header ────────────────────────────────── */}
            {/* ── Header ────────────────────────────────── */}
            <div className="explore-hero">
                <motion.div
                    className="explore-hero-content"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                    <div className="explore-hero-top-row">
                        <div style={{ paddingLeft: "4px" }}>
                            {/* Title with Gradient Text Styling from CSS */}
                            <h1 className="explore-hero-title">Discover</h1>
                            <p className="explore-hero-subtitle">Find your next conversation partner</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* ── Search ─────────────────────────────────── */}
            <motion.div
                className="explore-search-wrap"
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
                <div className="explore-search-glass">
                    <svg className="explore-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                        <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <input
                        className="explore-search"
                        type="text"
                        placeholder="Search characters..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button className="explore-search-clear" onClick={() => setSearch("")}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                            </svg>
                        </button>
                    )}
                </div>
            </motion.div>

            {/* ── Category chips ─────────────────────────── */}
            <motion.div
                className="explore-chips no-scrollbar"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.4 }}
            >
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat}
                        className={`explore-chip ${activeCategory === cat ? "explore-chip-active" : ""}`}
                        onClick={() => setActiveCategory(cat)}
                    >
                        {cat}
                        {cat !== "All" && (
                            <span className="explore-chip-count">
                                {CHARACTERS.filter((c: Character) => c.tag === cat).length}
                            </span>
                        )}
                    </button>
                ))}
            </motion.div>

            {/* ── Featured Character Spotlight ──────────── */}
            {activeCategory === "All" && !search && (
                <motion.div
                    className="explore-featured"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                >
                    <div className="explore-featured-card" onClick={() => onSelectCharacter(featured)}>
                        <div className="explore-featured-img-wrap">
                            <img src={featured.image} alt={featured.name} className="explore-featured-img" />
                            <div className="explore-featured-overlay" />
                            <div className="explore-featured-content">
                                <span className="explore-featured-label">Featured</span>
                                <h2 className="explore-featured-name">{featured.name}</h2>
                                <p className="explore-featured-desc">{featured.description}</p>
                                <div className="explore-featured-actions">
                                    <span className="explore-featured-tag">{featured.tag}</span>
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
                </motion.div>
            )}

            {/* ── For You Section ──────────────────────── */}
            {activeCategory === "All" && !search && (
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
                                onClick={() => onSelectCharacter(char)}
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.15 + i * 0.08, duration: 0.4 }}
                                whileTap={{ scale: 0.96 }}
                            >
                                <div className="explore-fy-img-wrap">
                                    <img src={char.image} alt={char.name} className="explore-fy-img" />
                                    <div className="explore-fy-overlay" />
                                </div>
                                <div className="explore-fy-info">
                                    <span className="explore-fy-tag">{char.tag}</span>
                                    <h3 className="explore-fy-name">{char.name}</h3>
                                    <div className="explore-fy-status">
                                        <span className="explore-fy-online-dot" />
                                        Online
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
                    <span className="explore-section-count">{filtered.length} characters</span>
                </div>
                <div className="explore-grid">
                    <AnimatePresence mode="popLayout">
                        {filtered.map((char, i) => (
                            <motion.div
                                key={char.id}
                                className="explore-card"
                                onClick={() => onSelectCharacter(char)}
                                initial={{ opacity: 0, y: 24, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.35, delay: i * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }}
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
                                        <h3 className="explore-card-name">{char.name}</h3>
                                        <span className="explore-card-online">
                                            <span className="online-dot-sm" />
                                        </span>
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

            {/* ── Empty state ────────────────────────────── */}
            {filtered.length === 0 && (
                <motion.div
                    className="explore-empty"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="explore-empty-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            <path d="M8 11h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                    </div>
                    <p className="explore-empty-title">No characters found</p>
                    <p className="explore-empty-subtitle">Try a different search or category</p>
                </motion.div>
            )}

            {/* ── Character Preview Modal ──────────────── */}
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
                                        <span>Online</span>
                                    </div>
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
