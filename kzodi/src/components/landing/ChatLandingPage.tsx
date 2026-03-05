"use client";
import React from "react";
import Image from "next/image";

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

function CharCard({ char }: { char: typeof CHARACTERS[number] }) {
    return (
        <div className="char-card">
            <Image src={char.image} alt={char.name} fill sizes="(max-width: 768px) 140px, 160px" className="char-card-img object-cover object-center" />
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

    const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
    const [isInstallable, setIsInstallable] = React.useState(false);

    React.useEffect(() => {
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            (window as any).deferredPWAEvent = e;
            setDeferredPrompt(e);
            setIsInstallable(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Check if it already fired before this component mounted
        if (typeof window !== 'undefined' && (window as any).deferredPWAEvent) {
            setDeferredPrompt((window as any).deferredPWAEvent);
            setIsInstallable(true);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsInstallable(false);
        }
        setDeferredPrompt(null);
    };

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
                {/* Center content */}
                <div className="chat-landing-center">
                    {/* Logo */}
                    <div className="chat-landing-logo">
                        <Image src="/logo.png" alt="Kakoei Logo" width={64} height={64} className="object-contain" priority />
                    </div>

                    {/* Title */}
                    <h1 className="chat-landing-title">
                        Kakoei Chat
                    </h1>

                    {/* Subtitle */}
                    <p className="chat-landing-subtitle">
                        Chat with your favorite anime, K-pop &amp; BL characters powered by AI
                    </p>

                    <div className="w-full flex flex-col gap-3 mt-4">
                        {/* Get Started button */}
                        <button
                            className="chat-landing-btn"
                            onClick={onGetStarted}
                        >
                            Get Started
                        </button>

                        {/* Install App button (PWA only) */}
                        {isInstallable && (
                            <button
                                onClick={handleInstallClick}
                                className="w-[280px] mx-auto py-3.5 rounded-full border border-white/20 bg-white/10 text-white font-600 backdrop-blur-md active:bg-white/20 transition-colors flex items-center justify-center gap-2"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                Install App
                            </button>
                        )}
                    </div>

                    {/* Footer note */}
                    <p className="chat-landing-note mt-6">
                        Sign in with Google to continue
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ChatLandingPage;
