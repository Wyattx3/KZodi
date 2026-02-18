"use client";
import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface ChatLandingPageProps {
    onGetStarted: () => void;
    onBack: () => void;
}

/* ── Character data for the slideshow ────────────────────────────────────── */
const CHARACTERS = [
    { name: "Gojo Satoru", tag: "Anime", image: "https://images.unsplash.com/photo-1578632292335-df3abbb0d586?q=80&w=300&auto=format&fit=crop" },
    { name: "Levi Ackerman", tag: "Anime", image: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=300&auto=format&fit=crop" },
    { name: "Anya Forger", tag: "Anime", image: "https://images.unsplash.com/photo-1541562232579-512a21360020?q=80&w=300&auto=format&fit=crop" },
    { name: "Tanjiro", tag: "Anime", image: "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?q=80&w=300&auto=format&fit=crop" },
    { name: "V / Taehyung", tag: "K-pop", image: "https://images.unsplash.com/photo-1533107862482-0e3574ff682a?q=80&w=300&auto=format&fit=crop" },
    { name: "Cha Eunwoo", tag: "K-pop", image: "https://images.unsplash.com/photo-1621570074981-ee6a0145c8b5?q=80&w=300&auto=format&fit=crop" },
    { name: "Lisa", tag: "K-pop", image: "https://images.unsplash.com/photo-1503104834685-7205e8607eb9?q=80&w=300&auto=format&fit=crop" },
    { name: "Kinn & Porsche", tag: "BL", image: "https://images.unsplash.com/photo-1581022295087-35e593704911?q=80&w=300&auto=format&fit=crop" },
    { name: "Pat & Pran", tag: "BL", image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=300&auto=format&fit=crop" },
];

/* ── Single character card ──────────────────────────────────────────────── */
function CharCard({ char }: { char: typeof CHARACTERS[number] }) {
    return (
        <div className="char-card">
            <img src={char.image} alt={char.name} className="char-card-img" />
            <div className="chat-landing-overlay-card" />
            <div className="char-card-info">
                <span className="char-card-tag-small">{char.tag}</span>
                <p className="char-card-name-small">{char.name}</p>
            </div>
        </div>
    );
}

/* ── Scrolling row (renders items twice for seamless loop) ────────── */
function ScrollRow({ items, direction }: { items: typeof CHARACTERS; direction: "left" | "right" }) {
    const animClass = direction === "left" ? "slide-col-up" : "slide-col-down";
    return (
        <div className="slide-col-wrapper">
            <div className={`slide-col ${animClass}`}>
                {/* Render 3x for seamless loop */}
                {[0, 1, 2].map((set) => (
                    <div key={set} className="slide-col-set">
                        {items.map((c, i) => (
                            <CharCard key={`${set}-${i}`} char={c} />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Main ChatLandingPage ───────────────────────────────────────────────── */
const ChatLandingPage: React.FC<ChatLandingPageProps> = ({ onGetStarted, onBack }) => {
    /* Split characters into rows */
    const row1 = CHARACTERS.slice(0, 5);
    const row2 = CHARACTERS.slice(5);

    return (
        <div className="chat-landing">
            {/* Background rows — fill the oversized rotated container */}
            <div className="chat-landing-bg">
                <ScrollRow items={row1} direction="left" />
                <ScrollRow items={row2} direction="right" />
                <ScrollRow items={row1} direction="left" />
                <ScrollRow items={row2} direction="right" />
                <ScrollRow items={row1} direction="left" />
                <ScrollRow items={row2} direction="right" />
                <ScrollRow items={row1} direction="left" />
                <ScrollRow items={row2} direction="right" />
                <ScrollRow items={row1} direction="left" />
                <ScrollRow items={row2} direction="right" />
                <ScrollRow items={row1} direction="left" />
            </div>

            {/* Dark fade overlay */}
            <div className="chat-landing-overlay" />

            {/* Content */}
            <div className="chat-landing-content">
                {/* Back button */}
                <motion.button
                    className="chat-landing-back"
                    onClick={onBack}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    aria-label="Go back"
                >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M13 4L7 10L13 16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </motion.button>

                {/* Center content */}
                <div className="chat-landing-center">
                    {/* Logo */}
                    <motion.div
                        className="chat-landing-logo"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
                    >
                        <Image src="/logo.png" alt="KZodi Logo" width={64} height={64} className="object-contain" priority />
                    </motion.div>

                    {/* Title */}
                    <motion.h1
                        className="chat-landing-title"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35, duration: 0.5 }}
                    >
                        KZodi Chat
                    </motion.h1>

                    {/* Subtitle */}
                    <motion.p
                        className="chat-landing-subtitle"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45, duration: 0.5 }}
                    >
                        Chat with your favorite anime, K-pop &amp; BL characters powered by AI
                    </motion.p>

                    {/* Get Started button */}
                    <motion.button
                        className="chat-landing-btn"
                        onClick={onGetStarted}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.5 }}
                        whileTap={{ scale: 0.96 }}
                    >
                        Get Started
                    </motion.button>

                    {/* Footer note */}
                    <motion.p
                        className="chat-landing-note"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.75, duration: 0.5 }}
                    >
                        Sign in with Google to continue
                    </motion.p>
                </div>
            </div>
        </div>
    );
};

export default ChatLandingPage;
