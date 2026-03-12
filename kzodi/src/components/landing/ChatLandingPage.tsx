"use client";
import React from "react";
import Image from "next/image";

interface ChatLandingPageProps {
    onGetStarted: () => void;
    onBack: () => void;
}

/* ── Character data for the slideshow ────────────────────────────────────── */
const CHARACTERS = [
    { name: "Satoru Gojo", tag: "Anime", image: "https://s4.anilist.co/file/anilistcdn/character/large/b127691-9zqh1xpIubn7.png" },
    { name: "Levi Ackerman", tag: "Anime", image: "https://s4.anilist.co/file/anilistcdn/character/large/b45627-CR68RyZmddGG.png" },
    { name: "Monkey D. Luffy", tag: "Anime", image: "https://s4.anilist.co/file/anilistcdn/character/large/b40-MNypXsxSRb1R.png" },
    { name: "Killua Zoldyck", tag: "Anime", image: "https://s4.anilist.co/file/anilistcdn/character/large/b27-Z5O02kQUydpT.jpg" },
    { name: "V / Taehyung", tag: "K-pop", image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400" },
    { name: "Cha Eunwoo", tag: "K-pop", image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400" },
    { name: "Lisa", tag: "K-pop", image: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=400" },
    { name: "Sang-Woo Oh", tag: "BL", image: "https://s4.anilist.co/file/anilistcdn/character/large/b121764-RsO2VCaPLVZL.png" },
    { name: "Bum Yoon", tag: "BL", image: "https://s4.anilist.co/file/anilistcdn/character/large/b121763-BYy6rb70tilA.png" },
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
    const [isIOS, setIsIOS] = React.useState(false);
    const [showIOSInstructions, setShowIOSInstructions] = React.useState(false);

    React.useEffect(() => {
        // iOS detection
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
        const isStandalone = ('standalone' in window.navigator) && (window.navigator as any).standalone;
        
        if (isIOSDevice && !isStandalone) {
            setIsIOS(true);
            setIsInstallable(true);
        }

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
        if (isIOS) {
            setShowIOSInstructions(true);
            return;
        }
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
        </div>            {/* iOS Install Instructions Modal */}
            {showIOSInstructions && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-sm w-full mx-auto shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 relative mb-4 sm:mb-0">
                        <button 
                            onClick={() => setShowIOSInstructions(false)}
                            className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full p-2"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                        
                        <div className="flex flex-col items-center text-center mt-2">
                            <div className="w-16 h-16 bg-gradient-to-tr from-white/10 to-white/5 rounded-2xl flex items-center justify-center mb-5 border border-white/10 shadow-inner">
                                <Image src="/logo.png" alt="Kakoei Logo" width={40} height={40} className="object-contain" priority/>
                            </div>
                            <h3 className="text-2xl font-bold text-white tracking-tight mb-2">Install Kakoei App</h3>
                            <p className="text-warm-gray text-[15px] mb-8 leading-relaxed">Install this application on your home screen for quick and easy access, full screen experience and more.</p>
                            
                            <div className="bg-black/40 rounded-2xl p-5 w-full text-left space-y-4 border border-white/5 shadow-inner">
                                <div className="flex items-start gap-4">
                                    <div className="bg-white/10 rounded-full w-7 h-7 flex items-center justify-center text-[13px] font-bold text-white shrink-0 mt-0.5">1</div>
                                    <p className="text-white/80 text-[15px]">Tap the <span className="font-semibold text-white">Share</span> button at the bottom of Safari.</p>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="bg-white/10 rounded-full w-7 h-7 flex items-center justify-center text-[13px] font-bold text-white shrink-0 mt-0.5">2</div>
                                    <p className="text-white/80 text-[15px]">Scroll down and tap <span className="font-semibold text-white">"Add to Home Screen"</span>.</p>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="bg-white/10 rounded-full w-7 h-7 flex items-center justify-center text-[13px] font-bold text-white shrink-0 mt-0.5">3</div>
                                    <p className="text-white/80 text-[15px]">Tap <span className="font-semibold text-white">"Add"</span> in the top right corner.</p>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => setShowIOSInstructions(false)}
                                className="w-full mt-8 py-3.5 rounded-xl bg-white text-black font-600 hover:bg-white/90 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatLandingPage;
