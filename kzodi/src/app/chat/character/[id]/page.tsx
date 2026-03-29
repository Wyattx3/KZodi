"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { type Character } from "@/data/characters";
import { useIOSViewportContainment } from "@/lib/useIOSViewportContainment";

export default function SharedCharacterPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const rootRef = useRef<HTMLDivElement>(null);
    const [character, setCharacter] = useState<Character | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [charId, setCharId] = useState<string | null>(null);
    const { viewportStyle } = useIOSViewportContainment({
        rootRef,
        scrollableSelectors: [".profile-body"],
    });

    useEffect(() => {
        params.then(p => setCharId(p.id));
    }, [params]);

    useEffect(() => {
        if (!charId) return;

        const fetchCharacter = async () => {
            try {
                const res = await fetch(`/api/characters/${charId}`);
                if (!res.ok) {
                    if (res.status === 404) throw new Error("Character not found.");
                    if (res.status === 403) throw new Error("This character is private.");
                    throw new Error("Failed to load character.");
                }
                const data = await res.json();
                setCharacter(data.character);
            } catch (err: any) {
                setError(err.message || "An error occurred");
            } finally {
                setLoading(false);
            }
        };

        fetchCharacter();
    }, [charId]);

    const handleStartChat = () => {
        // Redirect into the main chat app with the character query param
        if (charId) {
            router.push(`/chat?character=${charId}`);
        }
    };

    const handleGoBack = () => {
        router.push(`/chat`);
    };

    if (loading) {
        return (
            <div
                ref={rootRef}
                style={{
                    ...viewportStyle,
                    width: '100%',
                    height: 'var(--ios-viewport-height, 100dvh)',
                    minHeight: 'var(--ios-viewport-height, 100dvh)',
                    position: 'relative',
                    top: 'var(--ios-viewport-top, 0px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#FFFDF5',
                    color: '#4A3728',
                }}
            >
                <div className="explore-card-online" style={{ width: "32px", height: "32px", marginBottom: '16px' }}>
                    <span className="online-dot-sm" style={{ width: "32px", height: "32px", animation: "pulse 1.5s infinite" }} />
                </div>
                <h2>Loading Character...</h2>
            </div>
        );
    }

    if (error || !character) {
        return (
            <div
                ref={rootRef}
                style={{
                    ...viewportStyle,
                    width: '100%',
                    height: 'var(--ios-viewport-height, 100dvh)',
                    minHeight: 'var(--ios-viewport-height, 100dvh)',
                    position: 'relative',
                    top: 'var(--ios-viewport-top, 0px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#FFFDF5',
                    color: '#4A3728',
                    padding: '24px',
                    textAlign: 'center',
                }}
            >
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px', color: '#EF4444' }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', marginBottom: '8px' }}>Oops!</h2>
                <p style={{ color: '#6B7280', marginBottom: '24px' }}>{error || "We couldn't find that character."}</p>
                <button className="btn-accent" onClick={handleGoBack}>
                    Go to K-Zodi Chat
                </button>
            </div>
        );
    }

    return (
        <div ref={rootRef} className="profile-page" style={{ ...viewportStyle, background: '#FFFDF5' }}>
            <div className="profile-hero" style={{ backgroundImage: `url(${character.image})`, height: '45dvh', minHeight: '380px', position: 'relative' }}>
                <div className="profile-hero-overlay" />

                {/* Header Back Button */}
                <div className="profile-header">
                    <button className="profile-back-btn" onClick={handleGoBack}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>
                </div>

                <div className="profile-hero-content">
                    <motion.div
                        className="profile-title-block"
                    >
                        <h1 className="profile-name">{character.name}</h1>
                        <div className="profile-tags">
                            <span className="profile-tag-pill">{character.tag}</span>
                            <span className="profile-status">Ready to Chat</span>
                        </div>
                    </motion.div>
                </div>
            </div>

            <div className="profile-body no-scrollbar">

                <motion.div
                    className="profile-stats"
                >
                    <div className="profile-stat-item">
                        <span className="profile-stat-value" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            {character.likes || 0}
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                        </span>
                        <span className="profile-stat-label">Likes</span>
                    </div>
                    <div className="profile-stat-sep" />
                    <div className="profile-stat-item">
                        <span className="profile-stat-value" style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                            {character.totalUsers ? (character.totalUsers >= 1000 ? (character.totalUsers / 1000).toFixed(1) + "k" : character.totalUsers) : "0"}
                        </span>
                        <span className="profile-stat-label">Talking</span>
                    </div>
                </motion.div>

                <motion.div
                    className="profile-section"
                >
                    <h2 className="profile-section-title">About {character.name}</h2>
                    <p className="profile-description">{character.description}</p>
                    {character.longDescription && (
                        <p className="profile-description" style={{ marginTop: '8px' }}>{character.longDescription}</p>
                    )}
                </motion.div>

                <motion.div
                    className="profile-section"
                >
                    <h2 className="profile-section-title">Personality</h2>
                    <div className="profile-traits">
                        {character.personality.split(",").map((t, i) => (
                            <span key={i} className="profile-trait">
                                {t.trim()}
                            </span>
                        ))}
                    </div>
                </motion.div>

                {/* Floating Action Button area at the bottom */}
                <motion.div
                    style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '24px', background: 'linear-gradient(to top, #FFFDF5 60%, rgba(255,253,245,0))', zIndex: 50 }}
                >
                    <button
                        className="btn-accent"
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '18px', fontSize: '18px', boxShadow: '0 8px 24px rgba(255, 229, 102, 0.4)' }}
                        onClick={handleStartChat}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
                        </svg>
                        Start Chatting
                    </button>
                </motion.div>

                {/* Spacer so content isn't hidden behind fixed button */}
                <div style={{ height: '80px' }} />

            </div>
        </div>
    );
}
