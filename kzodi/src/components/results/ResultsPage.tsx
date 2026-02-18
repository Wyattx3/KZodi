"use client";
import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toPng } from "html-to-image";
import { zodiacSvgIcons, ArrowLeft, ShareIcon, ChevronDown } from "@/components/svg/ZodiacIcons";
import { getZodiacSign, getZodiacData, getCompatibilityScore, type ZodiacSign } from "@/lib/zodiac";
import { mbtiDescriptions } from "@/data/mbtiQuestions";
import type { PersonInfo, RelationshipStatus } from "@/lib/store";
import { useTranslate, LANGUAGES } from "@/lib/useTranslate";
import CompatibilityWheel from "./CompatibilityWheel";
import BirthChartWheel from "./BirthChartWheel";
import FeedbackSurvey from "./FeedbackSurvey";
import ChatWidget from "@/components/chat/ChatWidget";

interface ResultsPageProps {
  person1: PersonInfo;
  person2?: PersonInfo;
  relationshipStatus: RelationshipStatus;
  rsDuration?: string;
  onBack: () => void;
  aiInsights: Record<string, unknown> | null;
  birthChartData?: Record<string, unknown> | null;
  sessionId?: string;
}

type TabKey = "personality" | "love" | "compatibility" | "likes" | "chart";

const tabs: { key: TabKey; label: string }[] = [
  { key: "personality", label: "Personality" },
  { key: "love", label: "Love" },
  { key: "compatibility", label: "Match" },
  { key: "likes", label: "Likes" },
  { key: "chart", label: "Chart" },
];

const ResultsPage: React.FC<ResultsPageProps> = ({
  person1, person2, relationshipStatus, rsDuration, onBack, aiInsights, birthChartData, sessionId,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>("personality");
  const [showChat, setShowChat] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);
  const { lang, translating, changeLang, getText } = useTranslate();

  const sign1Key = person1.birthMonth && person1.birthDay ? getZodiacSign(person1.birthMonth, person1.birthDay) : "aries";
  const sign1 = getZodiacData(sign1Key)!;
  const sign2Key = person2?.birthMonth && person2?.birthDay ? getZodiacSign(person2.birthMonth, person2.birthDay) : null;
  const sign2 = sign2Key ? getZodiacData(sign2Key) : null;
  const mbti1 = person1.mbti;
  const mbti1Desc = mbtiDescriptions[mbti1];
  const compatScore = sign2Key ? getCompatibilityScore(sign1Key, sign2Key) : null;
  const ZodiacIcon1 = zodiacSvgIcons[sign1Key];
  const ZodiacIcon2 = sign2Key ? zodiacSvgIcons[sign2Key] : null;

  const aiPersonalityRaw = (aiInsights?.personality as string) || null;
  const aiLoveRaw = (aiInsights?.love as string) || null;
  const aiCompatibilityRaw = (aiInsights?.compatibility as string) || null;
  const aiLikesRaw = (aiInsights?.likes as string) || null;
  const aiChartReadingRaw = (aiInsights?.chartReading as string) || null;

  const aiPersonality = getText("personality", aiPersonalityRaw);
  const aiLove = getText("love", aiLoveRaw);
  const aiCompatibility = getText("compatibility", aiCompatibilityRaw);
  const aiLikes = getText("likes", aiLikesRaw);
  const aiChartReading = getText("chartReading", aiChartReadingRaw);

  const handleLangChange = (code: string) => {
    setShowLangMenu(false);
    changeLang(code, {
      personality: aiPersonalityRaw,
      love: aiLoveRaw,
      compatibility: aiCompatibilityRaw,
      likes: aiLikesRaw,
      chartReading: aiChartReadingRaw,
    });
  };

  const handleShare = async () => {
    if (!shareRef.current) return;
    try {
      const dataUrl = await toPng(shareRef.current, { quality: 0.95, pixelRatio: 2, backgroundColor: "#111111" });
      if (navigator.share) {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], "kzodi-personality.png", { type: "image/png" });
        await navigator.share({ title: "My KZodi Personality", text: `${sign1.name} ${mbti1 ? `+ ${mbti1}` : ""}`, files: [file] });
      } else {
        const link = document.createElement("a");
        link.download = "kzodi-personality.png";
        link.href = dataUrl;
        link.click();
      }
    } catch { /* cancelled */ }
  };

  const renderFeedback = (section: string, sectionLabel: string) => {
    if (!sessionId) return null;
    return (
      <FeedbackSurvey
        sessionId={sessionId}
        zodiacSign={sign1Key}
        mbtiType={mbti1}
        birthChart={birthChartData || null}
        section={section}
        sectionLabel={sectionLabel}
      />
    );
  };

  return (
    <div className="safe-top safe-bottom bg-[#EEEDEA]">
      {/* Top bar */}
      <div className="px-5 pt-4 pb-2.5 flex items-center justify-between">
        <button onClick={onBack} className="w-9 h-9 rounded-[11px] bg-white border border-border-soft flex items-center justify-center active:bg-light-gray active:scale-95 transition-all">
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-2">
          <div className="puffy-square-dark w-6 h-6 !rounded-[7px] flex items-center justify-center">
            <span className="text-[9px] font-800 text-pastel-yellow">K</span>
          </div>
          <h2 className="font-[var(--font-display)] font-700 text-[15px] tracking-[-0.02em] text-3d">Your Reading</h2>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Language selector */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="h-9 px-2.5 rounded-[11px] bg-white border border-border-soft flex items-center gap-1 active:bg-light-gray active:scale-95 transition-all"
            >
              <span className="text-[11px] font-700 text-warm-black uppercase">{lang}</span>
              <ChevronDown size={12} />
            </button>
            <AnimatePresence>
              {showLangMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-11 w-[140px] bg-white rounded-[14px] border border-border-soft shadow-lg z-50 py-1.5 max-h-[280px] overflow-y-auto no-scrollbar"
                >
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => handleLangChange(l.code)}
                      className={`w-full text-left px-3.5 py-2 text-[12px] font-600 transition-colors ${
                        lang === l.code ? "bg-pastel-yellow-soft text-warm-black" : "text-warm-gray hover:bg-light-gray"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button onClick={handleShare} className="w-9 h-9 rounded-[11px] bg-warm-black text-white flex items-center justify-center active:opacity-80 active:scale-95 transition-all">
            <ShareIcon size={14} />
          </button>
        </div>
      </div>

      {/* Translating indicator */}
      <AnimatePresence>
        {translating && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 8 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="mx-5 overflow-hidden"
          >
            <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-[12px] bg-pastel-yellow-soft border border-pastel-yellow-light">
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <motion.div key={i} animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} className="w-1.5 h-1.5 rounded-full bg-warm-black" />
                ))}
              </div>
              <span className="text-[11px] font-700 text-warm-black">
                Translating to {LANGUAGES.find(l => l.code === lang)?.label}...
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero card (shareable) */}
      <div ref={shareRef} className="mx-5 mb-3">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }} className="card-dark p-6 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-[120px] h-[120px] rounded-full border border-white/5" />
          <div className="absolute -bottom-8 -left-8 w-[80px] h-[80px] rounded-full border border-white/5" />

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-[64px] h-[64px] rounded-[18px] bg-white/10 flex items-center justify-center shrink-0">
              {ZodiacIcon1 && <ZodiacIcon1 size={36} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-600 text-white/40 uppercase tracking-[0.1em] mb-1.5">{sign1.dateRange}</div>
              <h3 className="font-[var(--font-display)] text-[28px] font-900 leading-none tracking-[-0.03em] mb-2.5 text-3d-dark">{sign1.name}</h3>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="tag tag-white text-[10px]">{sign1.element}</span>
                {mbti1 && <span className="tag text-[10px] bg-pastel-yellow text-warm-black">{mbti1}</span>}
                {mbti1Desc && <span className="text-[10px] text-white/35 font-500">{mbti1Desc.title}</span>}
              </div>
            </div>
          </div>

          {/* Birth chart summary badges */}
          {birthChartData && (birthChartData.angles as Record<string, {sign: string}>)?.ascendant && (
            <div className="mt-4 pt-3 border-t border-white/8 flex items-center gap-2 flex-wrap relative z-10">
              <span className="tag text-[10px] bg-white/10 text-white/70">Rising: {(birthChartData.angles as Record<string, {sign: string}>).ascendant.sign}</span>
              {(birthChartData.planets as Array<{name: string; sign: string}>)?.find(p => p.name === "Moon") && (
                <span className="tag text-[10px] bg-white/10 text-white/70">
                  Moon: {(birthChartData.planets as Array<{name: string; sign: string}>).find(p => p.name === "Moon")?.sign}
                </span>
              )}
              {(birthChartData.planets as Array<{name: string; sign: string}>)?.find(p => p.name === "Venus") && (
                <span className="tag text-[10px] bg-white/10 text-white/70">
                  Venus: {(birthChartData.planets as Array<{name: string; sign: string}>).find(p => p.name === "Venus")?.sign}
                </span>
              )}
            </div>
          )}

          {relationshipStatus === "rs" && sign2 && ZodiacIcon2 && (
            <div className="mt-5 pt-4 border-t border-white/8 flex items-center gap-3 relative z-10">
              <div className="w-11 h-11 rounded-[13px] bg-white/10 flex items-center justify-center shrink-0">
                <ZodiacIcon2 size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-white/35 font-500 uppercase tracking-wider">Partner</span>
                <span className="font-700 text-[15px] block mt-0.5">{sign2.name}</span>
              </div>
              {compatScore && (
                <div className="text-right">
                  <div className="text-[9px] text-white/35 font-500 uppercase tracking-wider">Match</div>
                  <div className="font-[var(--font-display)] text-[26px] font-900 tracking-[-0.03em] leading-none mt-0.5">{compatScore}%</div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-1.5 mt-5 relative z-10">
            <div className="w-4 h-4 rounded-[5px] bg-pastel-yellow flex items-center justify-center">
              <span className="text-[8px] font-800 text-warm-black">K</span>
            </div>
            <span className="text-[9px] font-600 text-white/25">KZodi</span>
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="px-5 mb-3">
        <div className="bg-white rounded-[14px] p-1 flex gap-0.5 border border-border-soft">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 rounded-[10px] text-[11px] font-700 whitespace-nowrap transition-all relative ${
                activeTab === tab.key ? "bg-warm-black text-white" : "text-warm-gray"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Tab content */}
      <div className="px-5 pb-2">
        <AnimatePresence mode="wait">
          {activeTab === "personality" && (
            <TabContent key="personality">
              <PersonalitySection sign={sign1} mbti={mbti1} mbtiDesc={mbti1Desc} aiInsight={aiPersonality} lang={lang} />
              {renderFeedback("personality", "Personality")}
            </TabContent>
          )}
          {activeTab === "love" && (
            <TabContent key="love">
              <LoveSection sign={sign1} aiInsight={aiLove} lang={lang} />
              {renderFeedback("love", "Love")}
            </TabContent>
          )}
          {activeTab === "compatibility" && (
            <TabContent key="compatibility">
              <CompatibilitySection sign1={sign1} sign1Key={sign1Key} sign2={sign2} sign2Key={sign2Key} compatScore={compatScore} aiInsight={aiCompatibility} lang={lang} />
              {renderFeedback("compatibility", "Compatibility")}
            </TabContent>
          )}
          {activeTab === "likes" && (
            <TabContent key="likes">
              <LikesSection sign={sign1} aiInsight={aiLikes} lang={lang} />
              {renderFeedback("likes", "Likes")}
            </TabContent>
          )}
          {activeTab === "chart" && (
            <TabContent key="chart">
              <ChartSection birthChartData={birthChartData || null} aiChartReading={aiChartReading} lang={lang} />
            </TabContent>
          )}
        </AnimatePresence>
      </div>

      {/* Chat toggle */}
      <div className="px-5 py-3">
        <button onClick={() => setShowChat(!showChat)} className={`w-full text-[13px] font-600 py-3 rounded-[14px] transition-all ${showChat ? 'bg-warm-black text-white' : 'btn-secondary'}`}>
          {showChat ? "Hide chat" : "Ask about your chart"}
        </button>
      </div>

      <AnimatePresence>
        {showChat && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }} className="overflow-hidden">
            <ChatWidget zodiacSign={sign1Key} mbtiType={mbti1} personName="You" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* -- Helpers -- */

const TabContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}>
    {children}
  </motion.div>
);

function getLangClass(lang: string): string {
  if (lang === "my") return "translated-text";
  if (["zh", "ja", "ko"].includes(lang)) return "translated-cjk";
  if (lang === "ar") return "translated-rtl";
  if (lang !== "en") return "translated-text";
  return "";
}

const AiText: React.FC<{ text: string | null; fallbackMsg?: string; lang?: string }> = ({ text, fallbackMsg, lang = "en" }) => {
  if (text) {
    const paragraphs = text.split("\n\n").filter(Boolean);
    const extraClass = getLangClass(lang);
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={text.slice(0, 60)}
          initial={{ opacity: 0, filter: "blur(4px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, filter: "blur(4px)" }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className={`flex flex-col gap-3 ${extraClass}`}
        >
          {paragraphs.map((p, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.04, ease: [0.25, 0.1, 0.25, 1] }}
              className={`text-warm-gray ${lang === "my" ? "text-[15px]" : "text-[14px] leading-[1.8]"}`}
            >
              {p.trim()}
            </motion.p>
          ))}
        </motion.div>
      </AnimatePresence>
    );
  }
  return <p className="text-[13px] text-medium-gray italic">{fallbackMsg || "AI reading is loading..."}</p>;
};

/* -- Sections -- */

const PersonalitySection: React.FC<{ sign: ZodiacSign; mbti: string; mbtiDesc: { title: string; description: string } | undefined; aiInsight: string | null; lang: string }> = ({ sign, mbti, mbtiDesc, aiInsight, lang }) => (
  <div className="flex flex-col gap-3">
    {/* Tags */}
    <div className="flex flex-wrap gap-1.5">
      {sign.traits.map((t, i) => (
        <span key={t} className={`puffy-pill px-3 py-1.5 text-[11px] font-600 ${i === 0 ? '!bg-warm-black text-white' : i === 1 ? '!bg-pastel-yellow text-warm-black' : 'text-warm-black'}`}>{t}</span>
      ))}
    </div>

    {/* AI Reading */}
    <div className="card-bordered p-5">
      <h4 className="section-title mb-3 text-3d">Your Personality Reading</h4>
      <AiText text={aiPersonality(aiInsight)} lang={lang} />
    </div>

    {/* MBTI Card */}
    {mbti && mbtiDesc && (
      <div className="card-dark p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="puffy-pill-yellow px-3 py-1">
            <span className="text-[12px] font-800 text-warm-black">{mbti}</span>
          </div>
          <h4 className="text-[15px] font-700 text-white text-3d-dark">{mbtiDesc.title}</h4>
        </div>
        <p className="text-[14px] leading-[1.75] text-white/60">{mbtiDesc.description}</p>
      </div>
    )}

    {/* Strengths & Weaknesses */}
    <div className="grid grid-cols-2 gap-2.5">
      <div className="card-bordered p-4">
        <h5 className="text-[10px] font-700 text-medium-gray uppercase tracking-[0.08em] mb-3">Strengths</h5>
        <div className="flex flex-col gap-2.5">
          {sign.strengths.map((s, i) => (
            <div key={s}>
              <div className="text-[13px] font-600 text-warm-black mb-1">{s}</div>
              <div className="h-1 rounded-full bg-light-gray overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${90 - i * 10}%` }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
                  className="h-full rounded-full bg-pastel-yellow"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="card-bordered p-4">
        <h5 className="text-[10px] font-700 text-medium-gray uppercase tracking-[0.08em] mb-3">Weaknesses</h5>
        <div className="flex flex-col gap-2.5">
          {sign.weaknesses.map((w, i) => (
            <div key={w}>
              <div className="text-[13px] font-500 text-warm-gray mb-1">{w}</div>
              <div className="h-1 rounded-full bg-light-gray overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${70 - i * 12}%` }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
                  className="h-full rounded-full bg-border-soft"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Helper to pass aiInsight correctly
function aiPersonality(insight: string | null): string | null {
  return insight;
}

const LoveSection: React.FC<{ sign: ZodiacSign; aiInsight: string | null; lang: string }> = ({ sign, aiInsight, lang }) => (
  <div className="flex flex-col gap-3">
    <div className="card-accent p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <h4 className="section-title text-3d">Love Style</h4>
        <div className="puffy-pill-yellow px-2.5 py-1">
          <span className="text-[11px] font-700 text-warm-black">{sign.loveStyle}</span>
        </div>
      </div>
      <AiText text={aiInsight} fallbackMsg="Your love reading is being prepared..." lang={lang} />
    </div>
    <div className="card-bordered p-5">
      <h4 className="section-title mb-4">Most Compatible With</h4>
      <div className="grid grid-cols-3 gap-2">
        {sign.compatibleSigns.map((cs) => {
          const csKey = cs.toLowerCase();
          const CsIcon = zodiacSvgIcons[csKey];
          return (
            <div key={cs} className="flex flex-col items-center gap-2 py-3 rounded-[14px] bg-light-gray">
              {CsIcon && <CsIcon size={28} />}
              <span className="font-700 text-[12px]">{cs}</span>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

const CompatibilitySection: React.FC<{
  sign1: ZodiacSign; sign1Key: string; sign2: ZodiacSign | null; sign2Key: string | null; compatScore: number | null; aiInsight: string | null; lang: string;
}> = ({ sign1, sign2, compatScore, aiInsight, lang }) => (
  <div className="flex flex-col gap-3">
    {sign2 && compatScore !== null ? (
      <>
        <CompatibilityWheel score={compatScore} sign1={sign1.name} sign2={sign2.name} />
        <div className="card-bordered p-5">
          <h4 className="section-title mb-3 text-3d">{sign1.name} and {sign2.name}</h4>
          <AiText text={aiInsight} fallbackMsg="Compatibility analysis loading..." lang={lang} />
        </div>
      </>
    ) : (
      <div className="flex flex-col gap-3">
        <CompatibilityWheel score={85} sign1={sign1.name} sign2={sign1.compatibleSigns[0]} />
        <div className="card-bordered p-5">
          <h4 className="section-title mb-3">Your Compatibility Profile</h4>
          <AiText text={aiInsight} fallbackMsg="Compatibility analysis loading..." lang={lang} />
          <div className="flex flex-wrap gap-2 mt-3">
            {sign1.compatibleSigns.map((cs) => (
              <span key={cs} className="puffy-pill-yellow px-3 py-1.5 text-[11px] font-600 text-warm-black">{cs}</span>
            ))}
          </div>
        </div>
      </div>
    )}
  </div>
);

const LikesSection: React.FC<{ sign: ZodiacSign; aiInsight: string | null; lang: string }> = ({ sign, aiInsight, lang }) => (
  <div className="flex flex-col gap-3">
    <div className="card-bordered p-5">
      <h4 className="section-title mb-4 text-3d">Interests & Career</h4>
      <AiText text={aiInsight} fallbackMsg="Preferences analysis loading..." lang={lang} />
    </div>
    <div className="card-dark p-5">
      <h4 className="text-[15px] font-700 text-white mb-3 text-3d-dark">Chart Details</h4>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Element", value: sign.element },
          { label: "Quality", value: sign.quality },
          { label: "Ruler", value: sign.rulingPlanet },
          { label: "Lucky Numbers", value: sign.luckyNumbers.join(", ") },
        ].map((item) => (
          <div key={item.label}>
            <p className="text-[10px] text-white/40 font-600 mb-0.5">{item.label}</p>
            <p className="text-[13px] text-white font-600">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ChartSection: React.FC<{ birthChartData: Record<string, unknown> | null; aiChartReading: string | null; lang: string }> = ({ birthChartData, aiChartReading, lang }) => {
  return (
    <div className="flex flex-col gap-3">
      {/* Birth chart visualization */}
      <BirthChartWheel birthChartData={birthChartData} />

      {/* AI full chart reading */}
      <div className="card-bordered p-5">
        <h4 className="section-title mb-3 text-3d">Full Chart Reading</h4>
        <AiText text={aiChartReading} fallbackMsg="Your detailed chart reading is being prepared by the AI astrologer..." lang={lang} />
      </div>
    </div>
  );
};

export default ResultsPage;
