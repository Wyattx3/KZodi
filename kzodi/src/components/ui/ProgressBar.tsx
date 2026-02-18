"use client";
import React from "react";
import { motion } from "framer-motion";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep, totalSteps }) => {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="w-full flex items-center gap-3">
      <div className="flex-1 h-[4px] bg-border-soft rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-warm-black rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        />
      </div>
      <span className="text-[11px] font-700 text-medium-gray tabular-nums shrink-0">
        {currentStep + 1}/{totalSteps}
      </span>
    </div>
  );
};

export default ProgressBar;
