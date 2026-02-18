"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "@/components/svg/ZodiacIcons";

interface StepWrapperProps {
  children: React.ReactNode;
  stepKey: string;
  direction?: number;
  onBack?: () => void;
  title?: string;
  subtitle?: string;
}

const variants = {
  enter: (direction: number) => ({ x: direction > 0 ? 100 : -100, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -100 : 100, opacity: 0 }),
};

const StepWrapper: React.FC<StepWrapperProps> = ({
  children,
  stepKey,
  direction = 1,
  onBack,
  title,
  subtitle,
}) => {
  return (
    <div className="px-5 py-4 safe-top safe-bottom">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-4">
        {onBack && (
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-[11px] bg-white border border-border-soft flex items-center justify-center shrink-0 active:bg-light-gray active:scale-95 transition-all"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        {title && (
          <div className="flex-1 min-w-0">
            <h2 className="font-[var(--font-display)] font-700 text-[14px] tracking-[-0.02em] truncate text-3d">{title}</h2>
            {subtitle && (
              <p className="text-medium-gray text-[11px] font-500 mt-0.5">{subtitle}</p>
            )}
          </div>
        )}
      </div>

      {/* Animated content */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={stepKey}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default StepWrapper;
