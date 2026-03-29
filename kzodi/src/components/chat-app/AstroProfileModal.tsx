"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Calendar, Clock, Brain } from "lucide-react";
import { useIOSViewportContainment } from "@/lib/useIOSViewportContainment";

interface AstroProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { date: string; time: string; mbti: string }) => void;
}

export default function AstroProfileModal({ isOpen, onClose, onSave }: AstroProfileModalProps) {
    const rootRef = React.useRef<HTMLDivElement>(null);
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [mbti, setMbti] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const { viewportStyle } = useIOSViewportContainment({
        rootRef,
        enabled: isOpen,
        scrollableSelectors: [".astro-profile-scroll-surface"],
    });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        // Simulate a small delay for UX so it feels like a heavy process
        await new Promise(resolve => setTimeout(resolve, 600));
        await onSave({ date, time, mbti });
        setIsSaving(false);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    ref={rootRef}
                    style={{
                        ...viewportStyle,
                        position: "fixed",
                        top: "var(--ios-viewport-top, 0px)",
                        left: 0,
                        right: 0,
                        height: "var(--ios-viewport-height, 100dvh)",
                        zIndex: 999,
                    }}
                >
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            position: "absolute",
                            inset: 0,
                            background: "rgba(17, 24, 39, 0.4)",
                            backdropFilter: "blur(4px)",
                        }}
                        onClick={onClose}
                    />

                    {/* Bottom Sheet */}
                    <motion.div
                        initial={{ y: "100%", opacity: 0.5 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0.5 }}
                        transition={{ type: "spring", damping: 25, stiffness: 250 }}
                        style={{
                            position: "absolute",
                            bottom: 0, left: 0, right: 0,
                            background: "#ffffff",
                            borderTop: "3px solid #111827",
                            borderTopLeftRadius: "24px",
                            borderTopRightRadius: "24px",
                            padding: "24px",
                            boxShadow: "0 -10px 40px rgba(0,0,0,0.1)",
                            maxHeight: "85vh",
                            overflowY: "auto"
                        }}
                        className="no-scrollbar astro-profile-scroll-surface"
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 900, color: "#111827", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                Update Reading Data
                            </h2>
                            <button
                                onClick={onClose}
                                style={{
                                    background: "#F3F4F6", border: "2px solid #111827", borderRadius: "50%",
                                    width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center",
                                    cursor: "pointer", boxShadow: "2px 2px 0px #111827"
                                }}
                            >
                                <X size={20} color="#111827" strokeWidth={2.5} />
                            </button>
                        </div>

                        <p style={{ margin: "0 0 20px 0", fontSize: "14px", color: "#4B5563", lineHeight: 1.5, fontWeight: 500 }}>
                            To get accurate, hyper-personalized readings from your Astrologer, provide your precise details below.
                            <br /><span style={{ color: "#EF4444", fontWeight: 700 }}>Warning: Saving this will overwrite your previous readings context.</span>
                        </p>

                        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {/* Date Field */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                <label style={{ fontSize: "13px", fontWeight: 800, color: "#111827", display: "flex", alignItems: "center", gap: "6px" }}>
                                    <Calendar size={14} color="#FACC15" fill="#111827" /> Date of Birth <span style={{ color: "#EF4444" }}>*</span>
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    style={{
                                        padding: "12px", border: "2px solid #111827", borderRadius: "10px",
                                        fontSize: "15px", fontFamily: "inherit", background: "#F9FAFB", outline: "none"
                                    }}
                                />
                            </div>

                            {/* Time Field */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                <label style={{ fontSize: "13px", fontWeight: 800, color: "#111827", display: "flex", alignItems: "center", gap: "6px" }}>
                                    <Clock size={14} color="#FACC15" fill="#111827" /> Time of Birth
                                </label>
                                <input
                                    type="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    style={{
                                        padding: "12px", border: "2px solid #111827", borderRadius: "10px",
                                        fontSize: "15px", fontFamily: "inherit", background: "#F9FAFB", outline: "none"
                                    }}
                                />
                                <span style={{ fontSize: "11px", color: "#6B7280", fontWeight: 500 }}>Optional. Helps calculate Ascendant.</span>
                            </div>

                            {/* MBTI Field */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                <label style={{ fontSize: "13px", fontWeight: 800, color: "#111827", display: "flex", alignItems: "center", gap: "6px" }}>
                                    <Brain size={14} color="#FACC15" fill="#111827" /> MBTI Personality
                                </label>
                                <select
                                    value={mbti}
                                    onChange={(e) => setMbti(e.target.value)}
                                    style={{
                                        padding: "12px", border: "2px solid #111827", borderRadius: "10px",
                                        fontSize: "15px", fontFamily: "inherit", background: "#F9FAFB", outline: "none", cursor: "pointer"
                                    }}
                                >
                                    <option value="">Select MBTI (Optional)</option>
                                    <option value="INTJ">INTJ - The Architect</option>
                                    <option value="INTP">INTP - The Logician</option>
                                    <option value="ENTJ">ENTJ - The Commander</option>
                                    <option value="ENTP">ENTP - The Debater</option>
                                    <option value="INFJ">INFJ - The Advocate</option>
                                    <option value="INFP">INFP - The Mediator</option>
                                    <option value="ENFJ">ENFJ - The Protagonist</option>
                                    <option value="ENFP">ENFP - The Campaigner</option>
                                    <option value="ISTJ">ISTJ - The Logistician</option>
                                    <option value="ISFJ">ISFJ - The Defender</option>
                                    <option value="ESTJ">ESTJ - The Executive</option>
                                    <option value="ESFJ">ESFJ - The Consul</option>
                                    <option value="ISTP">ISTP - The Virtuoso</option>
                                    <option value="ISFP">ISFP - The Adventurer</option>
                                    <option value="ESTP">ESTP - The Entrepreneur</option>
                                    <option value="ESFP">ESFP - The Entertainer</option>
                                </select>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isSaving}
                                style={{
                                    marginTop: "12px",
                                    padding: "16px",
                                    background: isSaving ? "#D1D5DB" : "#FACC15",
                                    color: "#111827",
                                    border: "3px solid #111827",
                                    borderRadius: "14px",
                                    fontSize: "16px",
                                    fontWeight: 900,
                                    textTransform: "uppercase",
                                    letterSpacing: "1px",
                                    cursor: isSaving ? "not-allowed" : "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                    boxShadow: isSaving ? "none" : "4px 4px 0px #111827",
                                    transition: "all 0.1s ease"
                                }}
                            >
                                {isSaving ? "Replacing Data..." : (
                                    <>
                                        <Save size={18} strokeWidth={2.5} /> Save & Erase Old Profile
                                    </>
                                )}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
