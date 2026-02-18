"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FeedbackSurveyProps {
  sessionId: string;
  zodiacSign: string;
  mbtiType: string;
  birthChart: Record<string, unknown> | null;
  section: string;
  sectionLabel: string;
}

const accuracyOptions = [
  { value: 95, label: "Very Accurate", color: "#22c55e" },
  { value: 80, label: "Mostly Right", color: "#84cc16" },
  { value: 60, label: "Somewhat", color: "#eab308" },
  { value: 40, label: "Not Really", color: "#f97316" },
  { value: 20, label: "Wrong", color: "#ef4444" },
];

const FeedbackSurvey: React.FC<FeedbackSurveyProps> = ({
  sessionId,
  zodiacSign,
  mbtiType,
  birthChart,
  section,
  sectionLabel,
}) => {
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (accuracy === null) return;
    setSubmitting(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          zodiacSign,
          mbtiType,
          birthChart,
          section,
          accuracyPercent: accuracy,
          feedbackText,
        }),
      });
      setSubmitted(true);
    } catch {
      // Silently fail
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-accent p-4 mt-4"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[10px] bg-pastel-yellow flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 8L7 11L12 5" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="font-600 text-[14px] text-warm-black">Thanks for your feedback</p>
            <p className="text-[12px] text-warm-gray">This helps improve future readings</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-bordered p-4 mt-4"
    >
      <h4 className="font-[var(--font-display)] font-700 text-[14px] tracking-[-0.01em] mb-1">
        How accurate is this?
      </h4>
      <p className="text-[12px] text-warm-gray mb-3">
        Rate the {sectionLabel.toLowerCase()} reading accuracy
      </p>

      {/* Accuracy buttons */}
      <div className="flex gap-1.5 mb-3">
        {accuracyOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setAccuracy(opt.value)}
            className={`flex-1 py-2.5 rounded-[12px] text-[11px] font-600 transition-all border ${
              accuracy === opt.value
                ? "border-warm-black bg-warm-black text-white scale-[1.02]"
                : "border-border-soft bg-white text-warm-gray hover:border-warm-black/20"
            }`}
          >
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[15px] font-700" style={{ color: accuracy === opt.value ? "white" : opt.color }}>
                {opt.value}%
              </span>
              <span className="text-[9px]">{opt.label}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Feedback text - show when accuracy < 80% */}
      <AnimatePresence>
        {accuracy !== null && accuracy < 80 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="What feels inaccurate? Which part is wrong?"
              className="input-field text-[13px] mb-3 resize-none"
              rows={3}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={accuracy === null || submitting}
        className="btn-primary w-full text-[13px] py-3"
      >
        {submitting ? "Submitting..." : "Submit Feedback"}
      </button>
    </motion.div>
  );
};

export default FeedbackSurvey;
