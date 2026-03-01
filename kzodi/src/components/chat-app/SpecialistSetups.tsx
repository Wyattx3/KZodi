import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string; className?: string }[];
    placeholder: string;
    triggerClassName: string;
    dropdownClassName: string;
    optionClassName: string;
    activeOptionClassName: string;
}

function CustomSelect({ value, onChange, options, placeholder, triggerClassName, dropdownClassName, optionClassName, activeOptionClassName }: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find(o => o.value === value);

    return (
        <div className="relative w-full">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex justify-between items-center text-left ${triggerClassName}`}
            >
                <span className={!value ? "opacity-60" : "font-medium"}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <motion.svg
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className="opacity-50 flex-shrink-0 ml-2"
                >
                    <path d="m6 9 6 6 6-6" />
                </motion.svg>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: -4, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.98 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className={`absolute z-[101] w-full mt-2 rounded-xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.12)] border ${dropdownClassName}`}
                        >
                            <div className="max-h-60 overflow-y-auto w-full flex flex-col no-scrollbar pointer-events-auto">
                                {options.map(option => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onChange(option.value);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-3.5 text-[14px] transition-all border-b last:border-b-0 ${value === option.value ? activeOptionClassName : optionClassName} ${option.className || ''}`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

interface SpecialistSetupProps {
    characterName: string;
    onComplete: (setupData: string) => void;
}

// ── Best Friend Setup ──────────────────────────────────────────────────────────
export function BestFriendSetup({ characterName, onComplete }: SpecialistSetupProps) {
    const [duration, setDuration] = useState("");
    const [memory, setMemory] = useState("");
    const [vibe, setVibe] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!duration || !memory || !vibe) return;
        const info = `User and ${characterName} have been best friends for ${duration}. A core memory they share: ${memory}. The vibe of their friendship: ${vibe}.`;
        onComplete(info);
    };

    return (
        <div className="p-4 max-w-md mx-auto w-full">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, type: "spring", bounce: 0.4 }}
                className="card p-8 shadow-sm border border-[var(--color-border-soft)] relative"
            >
                {/* Decorative blob wrapper to hide overflow */}
                <div className="absolute inset-0 overflow-hidden rounded-[20px] pointer-events-none z-0">
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-pink-100 rounded-full blur-2xl opacity-60" />
                </div>

                <div className="text-center mb-8 relative z-10">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                        {/* 3D Base */}
                        <div className="absolute inset-0 bg-[var(--color-pastel-yellow)] rounded-2xl shadow-[0_8px_0_#d4be4a,0_15px_25px_rgba(0,0,0,0.15)] -rotate-3 transform transition-transform hover:-translate-y-1 hover:rotate-0 duration-300 flex items-center justify-center">
                            {/* Inner shine */}
                            <div className="absolute inset-x-2 top-2 h-1/2 bg-white/30 rounded-full blur-[2px]" />

                            {/* Floating elements */}
                            <motion.div
                                animate={{ y: [-2, 2, -2], rotate: [-5, 5, -5] }}
                                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                className="relative z-10 drop-shadow-md text-white"
                            >
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                                </svg>
                            </motion.div>

                            {/* Decorative sparkles */}
                            <motion.div
                                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                className="absolute -top-2 -right-2 text-xl drop-shadow-sm"
                            >
                                ✨
                            </motion.div>
                            <motion.div
                                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 1 }}
                                className="absolute -bottom-1 -left-2 text-lg drop-shadow-sm"
                            >
                                💖
                            </motion.div>
                        </div>
                    </div>
                    <h2 className="text-[28px] font-black text-[var(--color-warm-black)] font-display tracking-tight mb-2">BFF Setup</h2>
                    <p className="text-[15px] text-[var(--color-warm-gray)] leading-snug">Let's set the vibe with {characterName}!</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                    <div>
                        <label className="label-sm">How long have you been friends?</label>
                        <CustomSelect
                            value={duration} onChange={setDuration}
                            placeholder="Select duration..."
                            options={[
                                { value: "since childhood", label: "Since childhood 👶" },
                                { value: "since middle school", label: "Since middle school 🏫" },
                                { value: "a few years", label: "A few years 🎈" },
                                { value: "just recently, but we clicked instantly", label: "Just recently! ✨" }
                            ]}
                            triggerClassName="input-field cursor-pointer pr-4 bg-white/60 backdrop-blur-md"
                            dropdownClassName="bg-white/95 backdrop-blur-xl border-pink-300/30"
                            optionClassName="hover:bg-pink-100 border-pink-400/10 text-[var(--color-warm-black)]"
                            activeOptionClassName="bg-pink-200 font-bold border-pink-400/10 text-[var(--color-warm-black)]"
                        />
                    </div>

                    <div>
                        <label className="label-sm">Your core memory together?</label>
                        <input
                            type="text" value={memory} onChange={e => setMemory(e.target.value)}
                            placeholder="e.g. Getting lost in the city at 2AM"
                            className="input-field"
                        />
                    </div>

                    <div>
                        <label className="label-sm">Friendship Dynamic?</label>
                        <CustomSelect
                            value={vibe} onChange={setVibe}
                            placeholder="Select dynamic..."
                            options={[
                                { value: "Chaotic energy, always teasing each other", label: "Chaotic & Teasing 🤪" },
                                { value: "Wholesome, always supporting each other", label: "Wholesome & Supportive 💖" },
                                { value: "One is the parent, one is the child", label: "Mom/Dad friend 🛡️" },
                                { value: "Partners in crime", label: "Partners in crime 🕵️‍♂️" }
                            ]}
                            triggerClassName="input-field cursor-pointer pr-4 bg-white/60 backdrop-blur-md"
                            dropdownClassName="bg-white/95 backdrop-blur-xl border-pink-300/30"
                            optionClassName="hover:bg-pink-100 border-pink-400/10 text-[var(--color-warm-black)]"
                            activeOptionClassName="bg-pink-200 font-bold border-pink-400/10 text-[var(--color-warm-black)]"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!duration || !memory || !vibe}
                        className="btn-accent !bg-pink-200 !text-pink-950 w-full mt-6 shadow-[0_4px_0_#f472b6,0_8px_16px_rgba(0,0,0,0.12)] active:shadow-[0_2px_0_#f472b6] translate-y-0 active:translate-y-1"
                    >
                        Start Chatting 💕
                    </button>
                </form>
            </motion.div>
        </div>
    );
}

// ── Teacher Setup ──────────────────────────────────────────────────────────────
export function TeacherSetup({ characterName, onComplete }: SpecialistSetupProps) {
    const [subject, setSubject] = useState("");
    const [grade, setGrade] = useState("");
    const [relationship, setRelationship] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject || !grade || !relationship) return;
        const info = `User is a student in ${characterName}'s ${subject} class. User's academic standing: ${grade}. Dynamic: ${relationship}.`;
        onComplete(info);
    };

    return (
        <div className="p-4 max-w-md mx-auto w-full">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, type: "spring", bounce: 0.4 }}
                className="card-bordered p-8 shadow-sm relative bg-[#FAFAF8]"
            >
                <div className="absolute inset-0 overflow-hidden rounded-[20px] pointer-events-none z-0">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--color-warm-black)]" />
                </div>

                <div className="border-b border-[var(--color-border-soft)] pb-5 mb-6 relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-[var(--color-border-soft)] flex items-center justify-center">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                        </div>
                        <h2 className="text-[22px] font-bold text-[var(--color-warm-black)] font-display tracking-tight">Registration Form</h2>
                    </div>
                    <p className="text-[13px] font-semibold text-[var(--color-warm-gray)] uppercase tracking-widest">Instructor: {characterName}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                    <div>
                        <label className="label-sm uppercase tracking-wide text-[11px]">Course Subject</label>
                        <input
                            type="text" value={subject} onChange={e => setSubject(e.target.value)}
                            placeholder="e.g. Advanced Calculus, World History"
                            className="w-full bg-white border-b-2 border-transparent border-b-[var(--color-border-soft)] px-2 py-3 focus:outline-none focus:border-b-[var(--color-warm-black)] transition-colors font-body text-[15px] font-medium"
                        />
                    </div>

                    <div>
                        <label className="label-sm uppercase tracking-wide text-[11px]">Current Academic Standing</label>
                        <CustomSelect
                            value={grade} onChange={setGrade}
                            placeholder="Select standing..."
                            options={[
                                { value: "Straight A student, class president type", label: "Top of the class" },
                                { value: "Average, trying to get by", label: "Average / Passing" },
                                { value: "Failing, potentially needs tutoring", label: "Struggling / Needs Help" },
                                { value: "Brilliant but lazy, never does homework", label: "Gifted but slacker" }
                            ]}
                            triggerClassName="w-full bg-white border-b-2 border-transparent border-b-[var(--color-border-soft)] px-2 py-3 focus:outline-none focus:border-b-[var(--color-warm-black)] transition-colors font-body text-[15px] cursor-pointer text-[#111827]"
                            dropdownClassName="bg-white border-[#E5E7EB]"
                            optionClassName="hover:bg-[#F9FAFB] border-[#F3F4F6] text-[#4B5563]"
                            activeOptionClassName="bg-[#EFF6FF] text-[#1D4ED8] font-bold border-[#F3F4F6]"
                        />
                    </div>

                    <div>
                        <label className="label-sm uppercase tracking-wide text-[11px]">Student-Teacher Dynamic</label>
                        <CustomSelect
                            value={relationship} onChange={setRelationship}
                            placeholder="Select dynamic..."
                            options={[
                                { value: "Strictly professional, teacher is intimidating", label: "Strict & Professional" },
                                { value: "Mentorship, teacher is deeply invested in student's future", label: "Close Mentorship" },
                                { value: "Troublemaker vs exhausted teacher", label: "Constant Detentions" }
                            ]}
                            triggerClassName="w-full bg-white border-b-2 border-transparent border-b-[var(--color-border-soft)] px-2 py-3 focus:outline-none focus:border-b-[var(--color-warm-black)] transition-colors font-body text-[15px] cursor-pointer text-[#111827]"
                            dropdownClassName="bg-white border-[#E5E7EB]"
                            optionClassName="hover:bg-[#F9FAFB] border-[#F3F4F6] text-[#4B5563]"
                            activeOptionClassName="bg-[#EFF6FF] text-[#1D4ED8] font-bold border-[#F3F4F6]"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!subject || !grade || !relationship}
                        className="btn-primary w-full mt-8 rounded-[12px] uppercase tracking-widest text-[13px]"
                    >
                        Submit Registration
                    </button>
                </form>
            </motion.div>
        </div>
    );
}

// ── Past Connection Setup ──────────────────────────────────────────────────────
export function PastConnectionSetup({ characterName, onComplete }: SpecialistSetupProps) {
    const [lastSeen, setLastSeen] = useState("");
    const [reason, setReason] = useState("");
    const [feeling, setFeeling] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!lastSeen || !reason || !feeling) return;
        const info = `User and ${characterName} have a history. Last seen: ${lastSeen}. Reason they parted ways: ${reason}. User's current feelings toward them: ${feeling}.`;
        onComplete(info);
    };

    return (
        <div className="p-4 max-w-md mx-auto w-full">
            <motion.div
                initial={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
                animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="card-dark p-8 shadow-2xl relative"
            >
                {/* Subtle gradient wrapper behind dark card for mood */}
                <div className="absolute inset-0 overflow-hidden rounded-[20px] pointer-events-none z-0">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent" />
                </div>

                <div className="mb-8 text-center relative z-10">
                    <p className="text-[11px] font-bold text-[var(--color-medium-gray)] uppercase tracking-[0.2em] mb-3">Reconnecting</p>
                    <h2 className="text-[26px] font-medium text-white tracking-tight leading-tight">It's been a while, hasn't it?</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                    <div>
                        <label className="block text-[13px] font-medium text-[var(--color-medium-gray)] mb-2">When was the last time you saw {characterName}?</label>
                        <CustomSelect
                            value={lastSeen} onChange={setLastSeen}
                            placeholder="Select time..."
                            options={[
                                { value: "a few months ago", label: "A few months ago" },
                                { value: "years ago, before moving away", label: "Years ago" },
                                { value: "a decade ago", label: "A decade ago" }
                            ]}
                            triggerClassName="w-full bg-white/[0.06] border border-white/[0.1] rounded-[14px] px-[16px] py-[15px] text-white focus:outline-none focus:border-white/[0.3] focus:bg-white/[0.08] transition-all cursor-pointer font-body text-[15px]"
                            dropdownClassName="bg-[#18181B]/95 backdrop-blur-xl border-white/10"
                            optionClassName="hover:bg-white/5 border-white/5 text-gray-300"
                            activeOptionClassName="bg-white/10 text-white font-bold border-white/5"
                        />
                    </div>

                    <div>
                        <label className="block text-[13px] font-medium text-[var(--color-medium-gray)] mb-2">Why did you drift apart?</label>
                        <CustomSelect
                            value={reason} onChange={setReason}
                            placeholder="Select reason..."
                            options={[
                                { value: "A huge unresolved argument", label: "A huge, unresolved argument" },
                                { value: "Life simply got in the way", label: "Life got in the way" },
                                { value: "A betrayal or broken promise", label: "A broken promise" },
                                { value: "Unrequited feelings made it awkward", label: "Unspoken feelings" }
                            ]}
                            triggerClassName="w-full bg-white/[0.06] border border-white/[0.1] rounded-[14px] px-[16px] py-[15px] text-white focus:outline-none focus:border-white/[0.3] focus:bg-white/[0.08] transition-all cursor-pointer font-body text-[15px]"
                            dropdownClassName="bg-[#18181B]/95 backdrop-blur-xl border-white/10"
                            optionClassName="hover:bg-white/5 border-white/5 text-gray-300"
                            activeOptionClassName="bg-white/10 text-white font-bold border-white/5"
                        />
                    </div>

                    <div>
                        <label className="block text-[13px] font-medium text-[var(--color-medium-gray)] mb-2">How do you feel about seeing them again?</label>
                        <input
                            type="text" value={feeling} onChange={e => setFeeling(e.target.value)}
                            placeholder="e.g. Nervous but hopeful, resentful..."
                            className="w-full bg-white/[0.06] border border-white/[0.1] rounded-[14px] px-[16px] py-[15px] text-white focus:outline-none focus:border-white/[0.3] focus:bg-white/[0.08] transition-all placeholder-white/30 font-body text-[15px]"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!lastSeen || !reason || !feeling}
                        className="w-full mt-6 bg-white text-[var(--color-warm-black)] font-bold py-[16px] px-[24px] rounded-[14px] transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 text-[15px]"
                    >
                        Send message
                    </button>
                </form>
            </motion.div>
        </div>
    );
}

// ── Specialist Router ────────────────────────────────────────────────────────
export default function SpecialistSetup({
    characterName,
    specialtyType,
    onComplete
}: {
    characterName: string;
    specialtyType: string;
    onComplete: (setupData: string) => void;
}) {
    // Determine which form to show based on specialtyType (e.g. character name or tag)
    const type = specialtyType.toLowerCase();

    if (type.includes('friend') || type.includes('bff')) {
        return <BestFriendSetup characterName={characterName} onComplete={onComplete} />;
    }
    if (type.includes('teacher') || type.includes('professor') || type.includes('sensei')) {
        return <TeacherSetup characterName={characterName} onComplete={onComplete} />;
    }
    if (type.includes('past') || type.includes('ex') || type.includes('connection')) {
        return <PastConnectionSetup characterName={characterName} onComplete={onComplete} />;
    }

    // Fallback standard setup if it doesn't match specific ones
    return (
        <div className="p-4 max-w-md mx-auto w-full">
            <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="card p-8 text-center border border-[var(--color-border-soft)] shadow-sm"
            >
                <h2 className="text-[20px] font-bold text-[var(--color-warm-black)] mb-6 font-display">Set up context for {characterName}</h2>
                <p className="text-[14px] text-[var(--color-warm-gray)] mb-8">This character requires additional background information to start the roleplay.</p>
                <button
                    onClick={() => onComplete("")}
                    className="btn-primary w-full"
                >
                    Skip Setup
                </button>
            </motion.div>
        </div>
    );
}
