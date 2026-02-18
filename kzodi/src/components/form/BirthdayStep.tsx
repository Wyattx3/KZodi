"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ChevronDown } from "@/components/svg/ZodiacIcons";

interface BirthdayStepProps {
  personLabel: string;
  onSubmit: (data: {
    birthYear: number;
    birthMonth: number;
    birthDay: number;
    birthTime: string;
  }) => void;
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const years = Array.from({ length: 80 }, (_, i) => 2010 - i);

const f = (d: number) => ({ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { delay: d, duration: 0.3 } });

const BirthdayStep: React.FC<BirthdayStepProps> = ({ personLabel, onSubmit }) => {
  const [month, setMonth] = useState<number | null>(null);
  const [day, setDay] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [time, setTime] = useState<string>("");
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  const maxDays = month ? new Date(year || 2000, month, 0).getDate() : 31;
  const isValid = month !== null && day !== null && year !== null && day >= 1 && day <= maxDays;

  const handleSubmit = () => {
    if (!isValid || !month || !day || !year) return;
    onSubmit({ birthYear: year, birthMonth: month, birthDay: day, birthTime: time });
  };

  return (
    <div className="flex flex-col">
      <motion.div {...f(0)} className="mb-5">
        <p className="text-[11px] font-700 text-pastel-yellow bg-warm-black inline-block px-2.5 py-1 rounded-lg mb-3 tracking-wide uppercase">Birthday</p>
        <h2 className="font-[var(--font-display)] text-[26px] font-800 leading-[1.1] tracking-[-0.03em] mb-1.5 text-3d">
          {personLabel}{"'"}s
          <br />birthday
        </h2>
        <p className="text-warm-gray text-[13px]">We{"'"}ll determine the zodiac sign from this</p>
      </motion.div>

      <motion.div {...f(0.05)} className="flex flex-col gap-3.5 mb-5">
        {/* Month + Year row */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="label-sm">Month</label>
            <div className="relative">
              <button
                onClick={() => { setShowMonthPicker(!showMonthPicker); setShowYearPicker(false); }}
                className="input-field text-left w-full flex items-center justify-between"
              >
                <span className={month ? "font-600" : "text-medium-gray"}>{month ? months[month - 1] : "Select"}</span>
                <ChevronDown size={15} className="text-medium-gray" />
              </button>
              {showMonthPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className="absolute z-20 top-full left-0 right-0 mt-1.5 bg-white border border-border-soft rounded-[14px] max-h-[180px] overflow-y-auto"
                  style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}
                >
                  {months.map((m, i) => (
                    <button
                      key={m}
                      onClick={() => { setMonth(i + 1); setShowMonthPicker(false); }}
                      className={`w-full px-3.5 py-2.5 text-left text-[13px] font-500 active:bg-light-gray transition-colors
                        ${month === i + 1 ? "bg-pastel-yellow-soft font-700" : ""}
                        ${i === 0 ? "rounded-t-[14px]" : ""} ${i === 11 ? "rounded-b-[14px]" : ""}`}
                    >
                      {m}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
          </div>

          <div>
            <label className="label-sm">Year</label>
            <div className="relative">
              <button
                onClick={() => { setShowYearPicker(!showYearPicker); setShowMonthPicker(false); }}
                className="input-field text-left w-full flex items-center justify-between"
              >
                <span className={year ? "font-600" : "text-medium-gray"}>{year || "Select"}</span>
                <ChevronDown size={15} className="text-medium-gray" />
              </button>
              {showYearPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className="absolute z-20 top-full left-0 right-0 mt-1.5 bg-white border border-border-soft rounded-[14px] max-h-[180px] overflow-y-auto"
                  style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}
                >
                  {years.map((y, i) => (
                    <button
                      key={y}
                      onClick={() => { setYear(y); setShowYearPicker(false); }}
                      className={`w-full px-3.5 py-2.5 text-left text-[13px] font-500 active:bg-light-gray transition-colors
                        ${year === y ? "bg-pastel-yellow-soft font-700" : ""}
                        ${i === 0 ? "rounded-t-[14px]" : ""} ${i === years.length - 1 ? "rounded-b-[14px]" : ""}`}
                    >
                      {y}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Day */}
        <div>
          <label className="label-sm">Day</label>
          <input
            type="number"
            min={1}
            max={maxDays}
            placeholder="DD"
            value={day ?? ""}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              setDay(isNaN(v) ? null : Math.min(v, maxDays));
            }}
            className="input-field text-center text-[17px] font-700 tracking-wider"
          />
        </div>

        {/* Time (optional) */}
        <div>
          <label className="label-sm flex items-center gap-2">
            Birth Time
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-light-gray font-500 text-medium-gray normal-case tracking-normal">Optional</span>
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="input-field text-center text-[15px] font-600"
          />
        </div>
      </motion.div>

      <motion.div {...f(0.1)}>
        <button onClick={handleSubmit} disabled={!isValid} className="btn-primary w-full flex items-center justify-center gap-2 mb-4">
          <span>Continue</span>
          <ArrowRight size={17} />
        </button>
      </motion.div>

      {/* Zodiac hint */}
      <motion.div {...f(0.14)} className="card-bordered p-3.5">
        <p className="text-[12px] text-warm-gray leading-[1.45]">
          <span className="font-700 text-warm-black">Birth time</span> is optional but helps determine your rising sign for a more detailed reading.
        </p>
      </motion.div>
    </div>
  );
};

export default BirthdayStep;
