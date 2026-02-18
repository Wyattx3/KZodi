"use client";
import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "@/components/svg/ZodiacIcons";
import { mbtiQuestions, calculateMBTI } from "@/data/mbtiQuestions";

interface MBTITestProps {
  onComplete: (mbtiResult: string) => void;
  onBack: () => void;
}

const dimensionLabel: Record<string, string> = {
  EI: "Extraversion vs Introversion",
  SN: "Sensing vs Intuition",
  TF: "Thinking vs Feeling",
  JP: "Judging vs Perceiving",
};

const MBTITest: React.FC<MBTITestProps> = ({ onComplete, onBack }) => {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, "a" | "b">>({});
  const [direction, setDirection] = useState(1);

  const question = mbtiQuestions[currentQ];
  const progress = ((currentQ + 1) / mbtiQuestions.length) * 100;

  const handleAnswer = useCallback((answer: "a" | "b") => {
    const newAnswers = { ...answers, [question.id]: answer };
    setAnswers(newAnswers);

    setTimeout(() => {
      if (currentQ < mbtiQuestions.length - 1) {
        setDirection(1);
        setCurrentQ((p) => p + 1);
      } else {
        const result = calculateMBTI(newAnswers);
        onComplete(result);
      }
    }, 350);
  }, [answers, currentQ, question.id, onComplete]);

  const handlePrev = () => {
    if (currentQ > 0) {
      setDirection(-1);
      setCurrentQ((p) => p - 1);
    } else {
      onBack();
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={handlePrev}
          className="w-9 h-9 rounded-[11px] bg-white border border-border-soft flex items-center justify-center shrink-0 active:bg-light-gray active:scale-95 transition-all"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-600 text-medium-gray uppercase tracking-wider">
              {dimensionLabel[question.dimension]}
            </span>
            <span className="text-[11px] font-700 text-warm-black tabular-nums">
              {currentQ + 1}/{mbtiQuestions.length}
            </span>
          </div>
          <div className="w-full h-[4px] bg-light-gray rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-warm-black rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            />
          </div>
        </div>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentQ}
          custom={direction}
          initial={{ x: direction > 0 ? 80 : -80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: direction > 0 ? -80 : 80, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
          className="w-full"
        >
          {/* Question text */}
          <div className="card-accent p-5 mb-5">
            <p className="font-[var(--font-display)] text-[16px] font-700 leading-[1.4] text-warm-black text-center">
              {question.question}
            </p>
          </div>

          {/* Options */}
          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => handleAnswer("a")}
              className={`card-interactive p-4 text-left ${answers[question.id] === "a" ? "card-interactive-selected" : ""
                }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-[9px] flex items-center justify-center shrink-0 text-[11px] font-800 ${answers[question.id] === "a" ? "bg-pastel-yellow text-warm-black" : "bg-light-gray text-warm-gray"
                  }`}>
                  A
                </div>
                <span className="text-[13px] font-500 leading-[1.5] pt-0.5">{question.optionA}</span>
              </div>
            </button>

            <button
              onClick={() => handleAnswer("b")}
              className={`card-interactive p-4 text-left ${answers[question.id] === "b" ? "card-interactive-selected" : ""
                }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-[9px] flex items-center justify-center shrink-0 text-[11px] font-800 ${answers[question.id] === "b" ? "bg-pastel-yellow text-warm-black" : "bg-light-gray text-warm-gray"
                  }`}>
                  B
                </div>
                <span className="text-[13px] font-500 leading-[1.5] pt-0.5">{question.optionB}</span>
              </div>
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default MBTITest;
