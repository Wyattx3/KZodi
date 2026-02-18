"use client";
import React from "react";
import { motion } from "framer-motion";
import { PersonIcon, CoupleIcon, ChevronRight, StarIcon } from "@/components/svg/ZodiacIcons";
import type { UserTarget } from "@/lib/store";

interface TargetStepProps {
  onSelect: (target: UserTarget) => void;
}

const f = (d: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay: d, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } });

const TargetStep: React.FC<TargetStepProps> = ({ onSelect }) => {
  return (
    <div className="flex flex-col">
      <motion.div {...f(0)} className="mb-6">
        <p className="text-[11px] font-700 text-pastel-yellow bg-warm-black inline-block px-2.5 py-1 rounded-lg mb-3 tracking-wide uppercase">Step 01</p>
        <h2 className="font-[var(--font-display)] text-[26px] font-800 leading-[1.1] tracking-[-0.03em] mb-1.5 text-3d">
          Who would you like
          <br />to discover?
        </h2>
        <p className="text-warm-gray text-[13px]">Choose who you want to learn about</p>
      </motion.div>

      <div className="flex flex-col gap-2.5 mb-6">
        <motion.button
          {...f(0.06)}
          onClick={() => onSelect("self")}
          className="card-interactive p-4.5 flex items-center gap-3.5 text-left"
        >
          <div className="w-11 h-11 rounded-[12px] bg-pastel-yellow-soft flex items-center justify-center shrink-0">
            <PersonIcon size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-[var(--font-display)] font-700 text-[15px] block tracking-[-0.01em]">Myself</span>
            <span className="text-warm-gray text-[12px]">Discover your own personality</span>
          </div>
          <div className="w-7 h-7 rounded-[8px] bg-light-gray flex items-center justify-center shrink-0">
            <ChevronRight size={14} className="text-warm-gray" />
          </div>
        </motion.button>

        <motion.button
          {...f(0.1)}
          onClick={() => onSelect("others")}
          className="card-interactive p-4.5 flex items-center gap-3.5 text-left"
        >
          <div className="w-11 h-11 rounded-[12px] bg-light-gray flex items-center justify-center shrink-0">
            <CoupleIcon size={28} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-[var(--font-display)] font-700 text-[15px] block tracking-[-0.01em]">Someone Else</span>
            <span className="text-warm-gray text-[12px]">Learn about another person</span>
          </div>
          <div className="w-7 h-7 rounded-[8px] bg-light-gray flex items-center justify-center shrink-0">
            <ChevronRight size={14} className="text-warm-gray" />
          </div>
        </motion.button>
      </div>

      {/* Tip card - fills the space */}
      <motion.div {...f(0.14)} className="card-accent p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-[9px] bg-pastel-yellow flex items-center justify-center shrink-0 mt-0.5">
            <StarIcon size={18} />
          </div>
          <div>
            <p className="font-600 text-[13px] text-warm-black mb-0.5">Tip</p>
            <p className="text-[12px] text-warm-gray leading-[1.45]">
              For the most accurate reading, you{"'"}ll need a birthday (month + day), and optionally your MBTI type. Don{"'"}t know your MBTI? We have a built-in 50-question test.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Quick info */}
      <motion.div {...f(0.18)} className="grid grid-cols-3 gap-2">
        {[
          { num: "12", label: "Zodiac signs" },
          { num: "16", label: "MBTI types" },
          { num: "AI", label: "Powered" },
        ].map((s) => (
          <div key={s.label} className="card-bordered p-3 text-center">
            <div className="font-[var(--font-display)] text-[18px] font-900 tracking-[-0.03em] text-warm-black leading-none">{s.num}</div>
            <div className="text-[10px] font-600 text-medium-gray mt-1">{s.label}</div>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default TargetStep;
