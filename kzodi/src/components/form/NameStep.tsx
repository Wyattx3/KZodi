"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "@/components/svg/ZodiacIcons";

interface NameStepProps {
    personLabel: string;
    onSubmit: (name: string) => void;
}

const f = (d: number) => ({ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { delay: d, duration: 0.3 } });

const NameStep: React.FC<NameStepProps> = ({ personLabel, onSubmit }) => {
    const [name, setName] = useState("");

    const handleSubmit = () => {
        if (name.trim()) {
            onSubmit(name.trim());
        }
    };

    return (
        <div className="flex flex-col">
            <motion.div {...f(0)} className="mb-5">
                <p className="text-[11px] font-700 text-pastel-yellow bg-warm-black inline-block px-2.5 py-1 rounded-lg mb-3 tracking-wide uppercase">Name</p>
                <h2 className="font-[var(--font-display)] text-[26px] font-800 leading-[1.1] tracking-[-0.03em] mb-1.5 text-3d">
                    What is {personLabel.toLowerCase()}{personLabel.toLowerCase() === "your" ? "" : "'s"}
                    <br />name?
                </h2>
                <p className="text-warm-gray text-[13px]">We{"'"}ll use this for the chart reading card</p>
            </motion.div>

            <motion.div {...f(0.05)} className="flex flex-col gap-3.5 mb-5">
                <div>
                    <label className="label-sm">Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="input-field text-left text-[17px] font-700"
                        autoFocus
                    />
                </div>
            </motion.div>

            <motion.div {...f(0.1)}>
                <button onClick={handleSubmit} disabled={!name.trim()} className="btn-primary w-full flex items-center justify-center gap-2 mb-4">
                    <span>Continue</span>
                    <ArrowRight size={17} />
                </button>
            </motion.div>
        </div>
    );
};

export default NameStep;
