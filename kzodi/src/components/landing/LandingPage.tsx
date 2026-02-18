"use client";
import React from "react";
import Image from "next/image";
import { ArrowRight } from "@/components/svg/ZodiacIcons";

interface LandingPageProps {
  onLearnPersonality: () => void;
  onStartChat: () => void;
}

/* Mini SVG zodiac glyphs for the orbit ring (18x18 viewBox) */
const G = ({ d, s }: { d: string; s?: string }) => (
  <svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <path d={d} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    {s && <path d={s} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />}
  </svg>
);

const ZODIAC_GLYPHS = [
  /* Aries */
  <G key={0} d="M9 15V8C9 5 5 4 4 7M9 8C9 5 13 4 14 7" />,
  /* Taurus */
  <G key={1} d="M4 6C4 2 9 2 9 2C9 2 14 2 14 6" s="M9 14A4 4 0 1 0 9 6A4 4 0 1 0 9 14" />,
  /* Gemini */
  <G key={2} d="M5 4.5C7 3 11 3 13 4.5M5 13.5C7 15 11 15 13 13.5M7 4.5V13.5M11 4.5V13.5" />,
  /* Cancer */
  <G key={3} d="M12 4C10 2 6 2 4 6" s="M6 14C8 16 12 16 14 12M4 6A2 2 0 1 0 4 10A2 2 0 1 0 4 6M14 12A2 2 0 1 0 14 8A2 2 0 1 0 14 12" />,
  /* Leo */
  <G key={4} d="M5 10A3 3 0 1 1 5 4A3 3 0 0 1 5 10C5 10 9 6 11 9C12 10.5 11 14 7 14" />,
  /* Virgo */
  <G key={5} d="M5 4V12M5 6C7 4 9 5 9 8V12M9 7C11 5 13 6 13 9C13 13 11 14 9 12" />,
  /* Libra */
  <G key={6} d="M4 13H14M5 10H13" s="M6 10C6 7 7 5 9 5C11 5 12 7 12 10" />,
  /* Scorpio */
  <G key={7} d="M5 5V13M5 7C7 5 9 6 9 9V13M9 8C11 6 13 7 13 10V13M13 11L15 13" s="M15 13L16 11" />,
  /* Sagittarius */
  <G key={8} d="M4 14L13 5M9 5H13V9" s="M8 10L11 13" />,
  /* Capricorn */
  <G key={9} d="M5 5C5 5 5 10 9 13L13 5" s="M13 5C13 5 15 5 15 9C15 11 13 13 12 11" />,
  /* Aquarius */
  <G key={10} d="M4 7L6 5L8 7L10 5L12 7L14 5M4 11L6 9L8 11L10 9L12 11L14 9" />,
  /* Pisces */
  <G key={11} d="M6 4C6 4 3 6 3 9C3 12 6 14 6 14" s="M12 4C12 4 15 6 15 9C15 12 12 14 12 14M3 9H15" />,
];

/* Pre-computed orbit positions (r=58, 12 points) */
const ORBIT_POS = [
  [0, -58], [29, -50], [50, -29], [58, 0], [50, 29], [29, 50],
  [0, 58], [-29, 50], [-50, 29], [-58, 0], [-50, -29], [-29, -50],
];

const LandingPage: React.FC<LandingPageProps> = ({ onLearnPersonality, onStartChat }) => {
  return (
    <div className="px-5 pt-8 pb-6 safe-top safe-bottom relative overflow-hidden">
      {/* Puffy 3D decorative floating shapes */}
      <div className="absolute top-6 right-5 puffy-circle w-[52px] h-[52px] opacity-40 pointer-events-none" />
      <div className="absolute top-[140px] left-[-12px] puffy-circle-dark w-[28px] h-[28px] opacity-20 pointer-events-none" />
      <div className="absolute bottom-[200px] right-[-8px] puffy-pill-yellow w-[40px] h-[18px] opacity-30 pointer-events-none" />

      {/* Logo */}
      <div className="kz-fade flex items-center mb-6 relative z-10" style={{ animationDelay: "0s" }}>
        <Image src="/logo.png" alt="KZodi Logo" width={48} height={48} className="object-contain" priority />
      </div>

      {/* Hero section */}
      <div className="kz-fade mb-6 relative z-10" style={{ animationDelay: "0.05s" }}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="puffy-pill-yellow px-3 py-1.5">
            <span className="text-[11px] font-700 text-warm-black">AI-Powered</span>
          </div>
          <span className="text-[11px] font-600 text-warm-gray">Zodiac + MBTI</span>
        </div>
        <h1 className="font-[var(--font-display)] text-[36px] font-900 leading-[1.04] tracking-[-0.04em] text-warm-black mb-3 text-3d">
          Discover who
          <br />you truly{" "}
          <span className="text-pastel-yellow text-3d-yellow">are</span>
        </h1>
        <p className="text-warm-gray text-[15px] leading-[1.6] max-w-[300px]">
          Deep personality insights through your complete birth chart, MBTI psychology, and AI research.
        </p>
      </div>

      {/* Zodiac orbit */}
      <div className="kz-fade mb-7 relative z-10" style={{ animationDelay: "0.1s" }}>
        <div className="relative h-[140px] flex items-center justify-center">
          {/* Orbit ring line */}
          <svg className="absolute inset-0 m-auto" width="130" height="130" viewBox="0 0 130 130" fill="none">
            <circle cx="65" cy="65" r="54" stroke="#E5E2DC" strokeWidth="1" strokeDasharray="3 4" />
          </svg>
          {/* Central logo */}
          <div className="w-[48px] h-[48px] flex items-center justify-center relative z-10">
            <Image src="/logo.png" alt="KZodi Logo" width={48} height={48} className="object-contain" />
          </div>
          {/* 12 zodiac SVG glyphs */}
          <div className="absolute inset-0 flex items-center justify-center">
            {ORBIT_POS.map(([x, y], i) => (
              <div
                key={i}
                className={`absolute flex items-center justify-center rounded-full ${i % 3 === 0
                  ? "w-[26px] h-[26px] bg-pastel-yellow text-warm-black"
                  : i % 3 === 1
                    ? "w-[24px] h-[24px] bg-warm-black text-pastel-yellow"
                    : "w-[24px] h-[24px] bg-white text-warm-gray border border-border-soft"
                  }`}
                style={{ transform: `translate(${x}px, ${y}px)` }}
              >
                {ZODIAC_GLYPHS[i]}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA buttons */}
      <div className="kz-fade flex flex-col gap-2.5 mb-7 relative z-10" style={{ animationDelay: "0.15s" }}>
        <button onClick={onLearnPersonality} className="btn-accent w-full flex items-center justify-center gap-2.5 text-[15px]">
          <span>Want to Know Personality</span>
          <ArrowRight size={17} />
        </button>
        <button onClick={onStartChat} className="btn-secondary w-full text-[14px]">
          Start Chat
        </button>
      </div>

      {/* Stats row */}
      <div className="kz-fade flex items-center justify-between mb-7 relative z-10" style={{ animationDelay: "0.2s" }}>
        {[
          { num: "12", label: "Zodiac Signs" },
          { num: "16", label: "MBTI Types" },
          { num: "10", label: "Planets" },
          { num: "12", label: "Houses" },
        ].map((s, i) => (
          <div key={s.label} className="flex flex-col items-center gap-1.5">
            <div className={`${i % 2 === 0 ? "puffy-circle" : "puffy-circle-dark"} w-[44px] h-[44px] flex items-center justify-center`}>
              <span className={`font-[var(--font-display)] text-[16px] font-900 ${i % 2 === 0 ? "text-warm-black" : "text-pastel-yellow"}`}>{s.num}</span>
            </div>
            <span className="text-[10px] font-600 text-warm-gray text-center leading-tight">{s.label}</span>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="kz-fade mb-7 relative z-10" style={{ animationDelay: "0.25s" }}>
        <h3 className="font-[var(--font-display)] font-700 text-[14px] tracking-[-0.01em] mb-4 text-3d">How it works</h3>
        <div className="flex flex-col gap-3">
          {[
            { n: "01", title: "Enter your details", desc: "Birthday, birth time, location, and MBTI" },
            { n: "02", title: "AI calculates your chart", desc: "Full birth chart with all planets and houses" },
            { n: "03", title: "Get deep reading", desc: "Personal astrologer-style insights from your chart" },
          ].map((step) => (
            <div key={step.n} className="flex items-center gap-3">
              <div className="puffy-square-dark w-[36px] h-[36px] flex items-center justify-center shrink-0">
                <span className="text-[11px] font-800 text-pastel-yellow">{step.n}</span>
              </div>
              <div className="flex-1">
                <p className="font-600 text-[14px] text-warm-black leading-tight">{step.title}</p>
                <p className="text-[12px] text-warm-gray mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* What you'll discover */}
      <div className="kz-fade mb-7 relative z-10" style={{ animationDelay: "0.3s" }}>
        <h3 className="font-[var(--font-display)] font-700 text-[14px] tracking-[-0.01em] mb-3 text-3d">What you&apos;ll discover</h3>
        <div className="flex flex-wrap gap-1.5">
          {["Full birth chart", "Rising sign", "Moon sign", "Planet positions", "House meanings", "Personality deep dive", "Love style", "Compatibility", "MBTI + Astro fusion", "AI chat"].map((item) => (
            <span key={item} className="puffy-pill px-3 py-1.5 text-[11px] font-600 text-warm-black">{item}</span>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="kz-fade relative z-10" style={{ animationDelay: "0.35s" }}>
        <button onClick={onLearnPersonality} className="btn-primary w-full flex items-center justify-center gap-2.5 text-[15px] mb-3">
          <span>Get Started</span>
          <ArrowRight size={17} />
        </button>
        <p className="text-center text-[11px] text-medium-gray">Free to use. No account needed.</p>
      </div>
    </div>
  );
};

export default LandingPage;
