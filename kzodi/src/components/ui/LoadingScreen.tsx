"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const steps = [
  { label: "Reading the stars", sub: "Analyzing zodiac data" },
  { label: "Mapping personality", sub: "Cross-referencing MBTI" },
  { label: "Consulting AI", sub: "Gathering research papers" },
  { label: "Building insights", sub: "Synthesizing results" },
  { label: "Almost ready", sub: "Preparing your reading" },
];

const LoadingScreen: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-8 safe-top safe-bottom">
      {/* Spinner ring */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="mb-10 relative"
      >
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
          <circle cx="36" cy="36" r="30" stroke="#F2F2EF" strokeWidth="3" />
          <motion.circle
            cx="36" cy="36" r="30" stroke="#FFE566" strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="188"
            animate={{ strokeDashoffset: [188, 47, 188], rotate: [0, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "center" }}
          />
          <circle cx="36" cy="36" r="16" fill="#FFFBEB" stroke="#FFE566" strokeWidth="1" />
          <text x="36" y="40" textAnchor="middle" fontFamily="var(--font-display)" fontSize="14" fontWeight="800" fill="#111">K</text>
        </svg>
      </motion.div>

      {/* Step message */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="text-center"
        >
          <p className="font-[var(--font-display)] text-[18px] font-800 text-warm-black tracking-[-0.02em] text-3d">
            {steps[activeStep].label}
          </p>
          <p className="text-[13px] text-medium-gray mt-1.5 font-500">
            {steps[activeStep].sub}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Progress dots */}
      <div className="flex items-center gap-2 mt-8">
        {steps.map((_, i) => (
          <motion.div
            key={i}
            animate={{
              width: i === activeStep ? 20 : 6,
              backgroundColor: i === activeStep ? "#FFE566" : i < activeStep ? "#111111" : "#E6E5E1",
            }}
            transition={{ duration: 0.3 }}
            className="h-1.5 rounded-full"
          />
        ))}
      </div>
    </div>
  );
};

export default LoadingScreen;
