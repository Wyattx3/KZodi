"use client";
import React from "react";
import { motion } from "framer-motion";
import { PersonIcon, HeartIcon, ChevronRight } from "@/components/svg/ZodiacIcons";
import type { RelationshipStatus } from "@/lib/store";

interface RelationshipStepProps {
  onSelect: (status: RelationshipStatus) => void;
}

const f = (d: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay: d, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } });

const RelationshipStep: React.FC<RelationshipStepProps> = ({ onSelect }) => {
  return (
    <div className="flex flex-col">
      <motion.div {...f(0)} className="mb-6">
        <p className="text-[11px] font-700 text-pastel-yellow bg-warm-black inline-block px-2.5 py-1 rounded-lg mb-3 tracking-wide uppercase">Step 02</p>
        <h2 className="font-[var(--font-display)] text-[26px] font-800 leading-[1.1] tracking-[-0.03em] mb-1.5 text-3d">
          Relationship
          <br />status?
        </h2>
        <p className="text-warm-gray text-[13px]">This helps personalize your reading</p>
      </motion.div>

      <div className="flex flex-col gap-2.5 mb-6">
        <motion.button
          {...f(0.06)}
          onClick={() => onSelect("single")}
          className="card-interactive p-4.5 flex items-center gap-3.5 text-left"
        >
          <div className="w-11 h-11 rounded-[12px] bg-light-gray flex items-center justify-center shrink-0">
            <PersonIcon size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-[var(--font-display)] font-700 text-[15px] block tracking-[-0.01em]">Single</span>
            <span className="text-warm-gray text-[12px]">Individual personality analysis</span>
          </div>
          <div className="w-7 h-7 rounded-[8px] bg-light-gray flex items-center justify-center shrink-0">
            <ChevronRight size={14} className="text-warm-gray" />
          </div>
        </motion.button>

        <motion.button
          {...f(0.1)}
          onClick={() => onSelect("rs")}
          className="card-interactive p-4.5 flex items-center gap-3.5 text-left"
        >
          <div className="w-11 h-11 rounded-[12px] bg-pastel-yellow-soft flex items-center justify-center shrink-0">
            <HeartIcon size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-[var(--font-display)] font-700 text-[15px] block tracking-[-0.01em]">In a Relationship</span>
            <span className="text-warm-gray text-[12px]">Compatibility + dual analysis</span>
          </div>
          <div className="w-7 h-7 rounded-[8px] bg-light-gray flex items-center justify-center shrink-0">
            <ChevronRight size={14} className="text-warm-gray" />
          </div>
        </motion.button>
      </div>

      {/* What each option includes */}
      <motion.div {...f(0.14)} className="card-bordered p-4 mb-4">
        <h4 className="font-[var(--font-display)] font-700 text-[13px] mb-3 tracking-[-0.01em]">What you{"'"}ll get</h4>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          {[
            "Personality traits",
            "Love style analysis",
            "Compatible signs",
            "Strengths & weaknesses",
            "Birth chart",
            "AI-powered insights",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-pastel-yellow shrink-0" />
              <span className="text-[12px] text-warm-gray">{item}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* RS extra note */}
      <motion.div {...f(0.18)} className="card-dark p-4">
        <p className="text-[12px] text-white/50 leading-[1.5]">
          <span className="font-700 text-white/70">Relationship mode</span> adds compatibility score, partner analysis, and relationship dynamics based on both zodiac signs.
        </p>
      </motion.div>
    </div>
  );
};

export default RelationshipStep;
