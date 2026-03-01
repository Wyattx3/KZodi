"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";

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
        <div className="p-6 max-w-md mx-auto w-full">
            <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 p-6 rounded-3xl shadow-lg border border-pink-200 dark:border-pink-800"
            >
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-black text-pink-600 dark:text-pink-400 mb-2">BFF Setup ✨</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Let's set the vibe with {characterName}!</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">How long have you been friends?</label>
                        <select
                            value={duration} onChange={e => setDuration(e.target.value)}
                            className="w-full bg-white dark:bg-gray-800 border-2 border-pink-200 dark:border-pink-800 rounded-xl px-4 py-2 focus:outline-none focus:border-pink-500 transition-colors"
                        >
                            <option value="" disabled>Select duration...</option>
                            <option value="since childhood">Since childhood 👶</option>
                            <option value="since middle school">Since middle school 🏫</option>
                            <option value="a few years">A few years 🎈</option>
                            <option value="just recently, but we clicked instantly">Just recently! ✨</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Your core memory together?</label>
                        <input
                            type="text" value={memory} onChange={e => setMemory(e.target.value)}
                            placeholder="e.g. Getting lost in the city at 2AM"
                            className="w-full bg-white dark:bg-gray-800 border-2 border-pink-200 dark:border-pink-800 rounded-xl px-4 py-2 focus:outline-none focus:border-pink-500 transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Friendship Dynamic?</label>
                        <select
                            value={vibe} onChange={e => setVibe(e.target.value)}
                            className="w-full bg-white dark:bg-gray-800 border-2 border-pink-200 dark:border-pink-800 rounded-xl px-4 py-2 focus:outline-none focus:border-pink-500 transition-colors"
                        >
                            <option value="" disabled>Select dynamic...</option>
                            <option value="Chaotic energy, always teasing each other">Chaotic & Teasing 🤪</option>
                            <option value="Wholesome, always supporting each other">Wholesome & Supportive 💖</option>
                            <option value="One is the parent, one is the child">Mom/Dad friend 🛡️</option>
                            <option value="Partners in crime">Partners in crime 🕵️‍♂️</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={!duration || !memory || !vibe}
                        className="w-full mt-6 bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-4 rounded-xl transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100"
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
        <div className="p-6 max-w-md mx-auto w-full">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-gray-900 p-8 rounded-md shadow-xl border-l-4 border-blue-600 font-serif"
            >
                <div className="border-b-2 border-gray-200 dark:border-gray-800 pb-4 mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 uppercase tracking-widest text-center">Registration Form</h2>
                    <p className="text-xs text-gray-500 text-center mt-1 uppercase">Instructor: Prof. {characterName}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Course Subject</label>
                        <input
                            type="text" value={subject} onChange={e => setSubject(e.target.value)}
                            placeholder="e.g. Advanced Calculus, World History"
                            className="w-full bg-gray-50 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-700 px-0 py-2 focus:outline-none focus:border-blue-600 transition-colors font-sans"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Current Academic Standing</label>
                        <select
                            value={grade} onChange={e => setGrade(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-700 px-0 py-2 focus:outline-none focus:border-blue-600 transition-colors font-sans"
                        >
                            <option value="" disabled>Select standing...</option>
                            <option value="Straight A student, class president type">Top of the class</option>
                            <option value="Average, trying to get by">Average / Passing</option>
                            <option value="Failing, potentially needs tutoring">Struggling / Needs Help</option>
                            <option value="Brilliant but lazy, never does homework">Gifted but slacker</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Student-Teacher Dynamic</label>
                        <select
                            value={relationship} onChange={e => setRelationship(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-700 px-0 py-2 focus:outline-none focus:border-blue-600 transition-colors font-sans"
                        >
                            <option value="" disabled>Select dynamic...</option>
                            <option value="Strictly professional, teacher is intimidating">Strict & Professional</option>
                            <option value="Mentorship, teacher is deeply invested in student's future">Close Mentorship</option>
                            <option value="Troublemaker vs exhausted teacher">Constant Detentions</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={!subject || !grade || !relationship}
                        className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition-colors disabled:opacity-50 uppercase tracking-wider text-sm"
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
        <div className="p-6 max-w-md mx-auto w-full">
            <motion.div
                initial={{ opacity: 0, filter: "blur(10px)" }} animate={{ opacity: 1, filter: "blur(0px)" }}
                transition={{ duration: 0.8 }}
                className="bg-black/80 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-white/10 text-gray-300"
            >
                <div className="mb-8 text-center">
                    <p className="text-gray-500 text-xs uppercase tracking-[0.3em] mb-2">Reconnecting</p>
                    <h2 className="text-2xl font-light text-white tracking-wide">It's been a while...</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm text-gray-400 mb-2 font-light">When was the last time you saw {characterName}?</label>
                        <select
                            value={lastSeen} onChange={e => setLastSeen(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-colors appearance-none"
                        >
                            <option value="" disabled className="text-black">Select time...</option>
                            <option value="a few months ago" className="text-black">A few months ago</option>
                            <option value="years ago, before moving away" className="text-black">Years ago</option>
                            <option value="a decade ago" className="text-black">A decade ago</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-2 font-light">Why did you drift apart?</label>
                        <select
                            value={reason} onChange={e => setReason(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-colors appearance-none"
                        >
                            <option value="" disabled className="text-black">Select reason...</option>
                            <option value="A huge unresolved argument" className="text-black">A huge, unresolved argument</option>
                            <option value="Life simply got in the way" className="text-black">Life got in the way</option>
                            <option value="A betrayal or broken promise" className="text-black">A broken promise</option>
                            <option value="Unrequited feelings made it awkward" className="text-black">Unspoken feelings</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-2 font-light">How do you feel about seeing them again?</label>
                        <input
                            type="text" value={feeling} onChange={e => setFeeling(e.target.value)}
                            placeholder="e.g. Nervous but hopeful, resentful..."
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-colors placeholder-white/20"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!lastSeen || !reason || !feeling}
                        className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white font-light py-4 px-4 rounded-lg transition-colors disabled:opacity-30 tracking-widest uppercase text-sm"
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
        <div className="p-6 max-w-md mx-auto w-full text-center py-12">
            <h2 className="text-xl font-bold mb-4">Set up context for {characterName}</h2>
            <button
                onClick={() => onComplete("")}
                className="bg-blue-600 text-white px-6 py-2 rounded-full"
            >
                Skip Setup
            </button>
        </div>
    );
}
