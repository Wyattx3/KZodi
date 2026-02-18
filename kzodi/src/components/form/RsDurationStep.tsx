"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "@/components/svg/ZodiacIcons";

interface RsDurationStepProps {
  onSubmit: (duration: string) => void;
}

const durationOptions = [
  { label: "Less than 6 months", value: "0-6m", sub: "New beginnings" },
  { label: "6 to 12 months", value: "6-12m", sub: "Getting closer" },
  { label: "1 to 2 years", value: "1-2y", sub: "Building together" },
  { label: "2 to 5 years", value: "2-5y", sub: "Deepening bond" },
  { label: "5+ years", value: "5+y", sub: "Long-term love" },
];

const f = (d: number) => ({ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { delay: d, duration: 0.3 } });

const RsDurationStep: React.FC<RsDurationStepProps> = ({ onSubmit }) => {
  const [selected, setSelected] = useState<string>("");

  return (
    <div className="flex flex-col">
      <motion.div {...f(0)} className="mb-6">
        <p className="text-[11px] font-700 text-pastel-yellow bg-warm-black inline-block px-2.5 py-1 rounded-lg mb-3 tracking-wide uppercase">Duration</p>
        <h2 className="font-[var(--font-display)] text-[26px] font-800 leading-[1.1] tracking-[-0.03em] mb-1.5 text-3d">
          How long have
          <br />you been together?
        </h2>
        <p className="text-warm-gray text-[13px]">This helps analyze relationship dynamics</p>
      </motion.div>

      <div className="flex flex-col gap-2 mb-6">
        {durationOptions.map((opt, i) => (
          <motion.button
            key={opt.value}
            {...f(0.03 + i * 0.03)}
            onClick={() => setSelected(opt.value)}
            className={`p-3.5 rounded-[14px] text-left flex items-center gap-3 transition-all border-[1.5px] ${
              selected === opt.value
                ? "bg-pastel-yellow border-pastel-yellow"
                : "bg-white border-border-soft active:scale-[0.985]"
            }`}
          >
            <div className={`w-3.5 h-3.5 rounded-full border-2 transition-all flex items-center justify-center shrink-0 ${
              selected === opt.value ? "border-warm-black" : "border-border-soft"
            }`}>
              {selected === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-warm-black" />}
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-600 text-[14px] block leading-tight">{opt.label}</span>
              <span className="text-warm-gray text-[11px]">{opt.sub}</span>
            </div>
          </motion.button>
        ))}
      </div>

      <motion.div {...f(0.2)}>
        <button
          onClick={() => selected && onSubmit(selected)}
          disabled={!selected}
          className="btn-primary w-full flex items-center justify-center gap-2 mb-4"
        >
          <span>Continue</span>
          <ArrowRight size={17} />
        </button>
      </motion.div>

      {/* Info */}
      <motion.div {...f(0.24)} className="card-accent p-3.5">
        <p className="text-[12px] text-warm-gray leading-[1.45]">
          Relationship duration affects how we analyze compatibility dynamics. Longer relationships show deeper patterns.
        </p>
      </motion.div>
    </div>
  );
};

export default RsDurationStep;
