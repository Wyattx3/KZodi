"use client";
import React from "react";
import Image from "next/image";
import { ArrowRight } from "@/components/svg/ZodiacIcons";

interface LandingPageProps {
  onLearnPersonality: () => void;
  onStartChat: () => void;
}

import { publicZodiacIcons } from "@/components/svg/PublicZodiacIcons";

const ZODIAC_GLYPHS = [
  publicZodiacIcons.aries({}),
  publicZodiacIcons.taurus({}),
  publicZodiacIcons.gemini({}),
  publicZodiacIcons.cancer({}),
  publicZodiacIcons.leo({}),
  publicZodiacIcons.virgo({}),
  publicZodiacIcons.libra({}),
  publicZodiacIcons.scorpio({}),
  publicZodiacIcons.sagittarius({}),
  publicZodiacIcons.capricorn({}),
  publicZodiacIcons.aquarius({}),
  publicZodiacIcons.pisces({}),
] as React.JSX.Element[];

/* Pre-computed orbit positions (r=58, 12 points) */
const ORBIT_POS = [
  [0, -58], [29, -50], [50, -29], [58, 0], [50, 29], [29, 50],
  [0, 58], [-29, 50], [-50, 29], [-58, 0], [-50, -29], [-29, -50],
];

const LandingPage: React.FC<LandingPageProps> = ({ onLearnPersonality, onStartChat }) => {
  return (
    <div className="chat-app-content px-5 pt-8 pb-6 safe-top safe-bottom relative overflow-hidden">
      {/* Puffy 3D decorative floating shapes */}
      <div className="absolute top-6 right-5 puffy-circle w-[52px] h-[52px] opacity-40 pointer-events-none" />
      <div className="absolute top-[140px] left-[-12px] puffy-circle-dark w-[28px] h-[28px] opacity-20 pointer-events-none" />
      <div className="absolute bottom-[200px] right-[-8px] puffy-pill-yellow w-[40px] h-[18px] opacity-30 pointer-events-none" />

      {/* Logo */}
      <div className="kz-fade flex items-center mb-6 relative z-10" style={{ animationDelay: "0s" }}>
        <Image src="/logo.png" alt="Kakoei Logo" width={48} height={48} className="object-contain" priority />
      </div>

      {/* Hero section */}
      <div className="kz-fade mb-6 relative z-10" style={{ animationDelay: "0.05s" }}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="bg-pastel-yellow rounded-full px-3 py-1.5 shadow-sm border border-[#FBE058]">
            <span className="text-[11px] font-700 text-[#4A3728]">AI-Powered</span>
          </div>
          <span className="text-[11px] font-600 text-[#4A3728] opacity-70">Zodiac + MBTI</span>
        </div>
        <h1 className="font-[var(--font-display)] text-[36px] font-900 leading-[1.04] tracking-[-0.04em] text-[#4A3728] mb-3">
          Discover who
          <br />you truly{" "}
          <span className="text-[#DE9D20]">are</span>
        </h1>
        <p className="text-[#4A3728] opacity-80 text-[15px] leading-[1.6] max-w-[300px]">
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
          <div className="w-[48px] h-[48px] flex items-center justify-center relative z-10 bg-white rounded-2xl shadow-sm border border-border-soft p-1">
            <Image src="/logo.png" alt="Kakoei Logo" width={40} height={40} className="object-contain" />
          </div>
          {/* 12 zodiac SVG glyphs */}
          <div className="absolute inset-0 flex items-center justify-center opacity-80">
            {ORBIT_POS.map(([x, y], i) => (
              <div
                key={i}
                className={`absolute flex items-center justify-center rounded-full ${i % 3 === 0
                  ? "w-[26px] h-[26px] bg-pastel-yellow text-[#4A3728]"
                  : i % 3 === 1
                    ? "w-[24px] h-[24px] bg-[#4A3728] text-pastel-yellow"
                    : "w-[24px] h-[24px] bg-white text-[#4A3728] border border-border-soft shadow-sm"
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
        <button onClick={onLearnPersonality} className="w-full flex items-center justify-center gap-2.5 text-[15px] font-700 bg-pastel-yellow text-[#4A3728] py-4 rounded-2xl shadow-[0_4px_0_#d4be4a,0_8px_16px_rgba(0,0,0,0.1)] active:translate-y-[2px] active:shadow-[0_2px_0_#d4be4a,0_4px_8px_rgba(0,0,0,0.1)] transition-all">
          <span>Want to Know Personality</span>
          <ArrowRight size={17} />
        </button>
        <button onClick={onStartChat} className="w-full text-[14px] font-700 bg-white text-[#4A3728] border-2 border-[#E5E2DC] py-4 rounded-2xl shadow-sm active:bg-light-gray transition-all">
          Start Chat
        </button>
      </div>

      {/* Stats row */}
      <div className="kz-fade flex items-center justify-between mb-7 relative z-10" style={{ animationDelay: "0.2s" }}>
        {[
          { num: "12", label: "Zodiac" },
          { num: "16", label: "MBTI" },
          { num: "10", label: "Planets" },
          { num: "12", label: "Houses" },
        ].map((s, i) => (
          <div key={s.label} className="flex flex-col items-center gap-1.5">
            <div className={`rounded-full w-[44px] h-[44px] flex items-center justify-center shadow-sm border ${i % 2 === 0 ? "bg-white border-border-soft" : "bg-[#4A3728] border-[#4A3728]"}`}>
              <span className={`font-[var(--font-display)] text-[16px] font-900 ${i % 2 === 0 ? "text-[#4A3728]" : "text-pastel-yellow"}`}>{s.num}</span>
            </div>
            <span className="text-[10px] font-600 text-[#4A3728] opacity-70 text-center leading-tight">{s.label}</span>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="kz-fade mb-7 relative z-10" style={{ animationDelay: "0.25s" }}>
        <h3 className="font-[var(--font-display)] font-700 text-[14px] tracking-[-0.01em] mb-4 text-[#4A3728]">How it works</h3>
        <div className="flex flex-col gap-3">
          {[
            { n: "01", title: "Enter your details", desc: "Birthday, birth time, location, and MBTI" },
            { n: "02", title: "AI calculates your chart", desc: "Full birth chart with all planets and houses" },
            { n: "03", title: "Get deep reading", desc: "Personal astrologer-style insights from your chart" },
          ].map((step) => (
            <div key={step.n} className="flex items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-border-soft">
              <div className="bg-[#4A3728] w-[32px] h-[32px] rounded-xl flex items-center justify-center shrink-0">
                <span className="text-[11px] font-800 text-pastel-yellow">{step.n}</span>
              </div>
              <div className="flex-1">
                <p className="font-600 text-[13px] text-[#4A3728] leading-tight">{step.title}</p>
                <p className="text-[11px] text-[#4A3728] opacity-60 mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* What you'll discover */}
      <div className="kz-fade mb-7 relative z-10" style={{ animationDelay: "0.3s" }}>
        <h3 className="font-[var(--font-display)] font-700 text-[14px] tracking-[-0.01em] mb-3 text-[#4A3728]">What you&apos;ll discover</h3>
        <div className="flex flex-wrap gap-1.5">
          {["Full birth chart", "Rising sign", "Moon sign", "Planet positions", "House meanings", "Personality deep dive", "Love style", "Compatibility", "MBTI + Astro fusion", "AI chat"].map((item) => (
            <span key={item} className="bg-white border border-border-soft rounded-full px-3 py-1.5 text-[11px] font-600 text-[#4A3728] shadow-sm">{item}</span>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="kz-fade relative z-10" style={{ animationDelay: "0.35s" }}>
        <button onClick={onLearnPersonality} className="w-full flex items-center justify-center gap-2.5 text-[15px] font-700 bg-[#4A3728] text-white py-4 rounded-2xl shadow-[0_4px_0_rgba(0,0,0,0.8),0_8px_16px_rgba(0,0,0,0.2)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.8),0_4px_8px_rgba(0,0,0,0.2)] transition-all mb-3">
          <span>Get Started</span>
          <ArrowRight size={17} />
        </button>
        <p className="text-center text-[11px] text-[#4A3728] opacity-60">Free to use. No account needed.</p>
      </div>
    </div>
  );
};

export default LandingPage;
