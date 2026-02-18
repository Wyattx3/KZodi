"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "@/components/svg/ZodiacIcons";

const mbtiGroups = [
  { label: "Analysts", types: ["INTJ", "INTP", "ENTJ", "ENTP"] },
  { label: "Diplomats", types: ["INFJ", "INFP", "ENFJ", "ENFP"] },
  { label: "Sentinels", types: ["ISTJ", "ISFJ", "ESTJ", "ESFJ"] },
  { label: "Explorers", types: ["ISTP", "ISFP", "ESTP", "ESFP"] },
];

interface MBTIStepProps {
  personLabel: string;
  onSelect: (mbti: string) => void;
  onDontKnow: () => void;
}

const f = (d: number) => ({ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { delay: d, duration: 0.3 } });

const MBTIStep: React.FC<MBTIStepProps> = ({ personLabel, onSelect, onDontKnow }) => {
  const [selected, setSelected] = useState<string>("");

  return (
    <div className="flex flex-col">
      <motion.div {...f(0)} className="mb-4">
        <p className="text-[11px] font-700 text-pastel-yellow bg-warm-black inline-block px-2.5 py-1 rounded-lg mb-3 tracking-wide uppercase">MBTI</p>
        <h2 className="font-[var(--font-display)] text-[26px] font-800 leading-[1.1] tracking-[-0.03em] mb-1.5 text-3d">
          {personLabel}{"'"}s
          <br />MBTI type
        </h2>
        <p className="text-warm-gray text-[13px]">Select your type or take the test</p>
      </motion.div>

      {/* Grouped MBTI Grid */}
      <motion.div {...f(0.04)} className="flex flex-col gap-3 mb-4">
        {mbtiGroups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-600 text-medium-gray uppercase tracking-wider mb-1.5">{group.label}</p>
            <div className="grid grid-cols-4 gap-1.5">
              {group.types.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelected(type)}
                  className={`py-3 rounded-[12px] font-700 text-[12px] tracking-[-0.01em] border-[1.5px] transition-all active:scale-95 ${
                    selected === type
                      ? "bg-pastel-yellow border-pastel-yellow"
                      : "bg-white border-border-soft"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        ))}
      </motion.div>

      {/* Take test */}
      <motion.div {...f(0.08)} className="flex justify-center mb-4">
        <button
          onClick={onDontKnow}
          className="px-4 py-2.5 rounded-[12px] border-[1.5px] border-dashed border-border-soft text-warm-gray text-[12px] font-600 active:bg-light-gray active:scale-[0.985] transition-all"
        >
          I don{"'"}t know my type — Take the test
        </button>
      </motion.div>

      {/* Continue */}
      <motion.div {...f(0.12)}>
        <button
          onClick={() => selected && onSelect(selected)}
          disabled={!selected}
          className="btn-primary w-full flex items-center justify-center gap-2 mb-4"
        >
          <span>Continue</span>
          <ArrowRight size={17} />
        </button>
      </motion.div>

      {/* Info */}
      <motion.div {...f(0.16)} className="card-bordered p-3.5">
        <p className="text-[12px] text-warm-gray leading-[1.45]">
          <span className="font-700 text-warm-black">MBTI + Zodiac</span> combined analysis gives you a much deeper personality understanding than either alone.
        </p>
      </motion.div>
    </div>
  );
};

export default MBTIStep;
