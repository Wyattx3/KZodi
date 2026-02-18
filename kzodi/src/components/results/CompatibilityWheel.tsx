"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface CompatibilityWheelProps {
  score: number;
  sign1: string;
  sign2: string;
}

const CompatibilityWheel: React.FC<CompatibilityWheelProps> = ({ score, sign1, sign2 }) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (score / 100) * circumference;

  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const duration = 1200;
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * score));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    const timer = setTimeout(() => { frame = requestAnimationFrame(animate); }, 300);
    return () => { clearTimeout(timer); cancelAnimationFrame(frame); };
  }, [score]);

  const label = score >= 90 ? "Excellent" : score >= 75 ? "Great" : score >= 60 ? "Good" : "Interesting";

  return (
    <div className="card-bordered p-6 flex flex-col items-center">
      <div className="relative w-[150px] h-[150px] mb-5">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#F2F2EF" strokeWidth="7" />
          <motion.circle
            cx="60" cy="60" r={radius} fill="none" stroke="#FFE566" strokeWidth="7" strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - strokeDash }}
            transition={{ duration: 1.2, ease: [0.32, 0.72, 0, 1], delay: 0.3 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-[var(--font-display)] text-[36px] font-900 leading-none tracking-[-0.04em]">{animatedScore}</span>
          <span className="text-[12px] font-600 text-medium-gray mt-0.5">/ 100</span>
        </div>
      </div>
      <div className="flex items-center gap-2.5 mb-2">
        <span className="tag tag-dark text-[12px]">{sign1}</span>
        <svg width="16" height="2" viewBox="0 0 16 2"><rect width="16" height="2" rx="1" fill="#E6E5E1" /></svg>
        <span className="tag tag-dark text-[12px]">{sign2}</span>
      </div>
      <span className="text-[13px] font-700 text-warm-gray">{label} compatibility</span>
    </div>
  );
};

export default CompatibilityWheel;
