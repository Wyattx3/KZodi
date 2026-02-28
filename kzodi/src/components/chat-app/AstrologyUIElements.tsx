"use client";
import React from "react";
import { motion } from "framer-motion";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid } from 'recharts';
import { Sparkles, CheckCircle2, ChevronRight, Hash, Layers } from "lucide-react";

/* ── UI Element Types (Thesys C1 / Perplexity Style) ── */

// Helper to map card names to classic Rider-Waite-Smith images from sacred-texts
const getTarotImageUrl = (cardName: string) => {
    const name = cardName.toLowerCase();

    // Major Arcana
    const majorArcana: Record<string, string> = {
        "fool": "ar00", "magician": "ar01", "high priestess": "ar02", "priestess": "ar02",
        "empress": "ar03", "emperor": "ar04", "hierophant": "ar05", "lovers": "ar06",
        "chariot": "ar07", "strength": "ar08", "hermit": "ar09", "wheel": "ar10", "fortune": "ar10",
        "justice": "ar11", "hanged": "ar12", "death": "ar13", "temperance": "ar14",
        "devil": "ar15", "tower": "ar16", "star": "ar17", "moon": "ar18", "sun": "ar19",
        "judgement": "ar20", "world": "ar21"
    };

    for (const [key, code] of Object.entries(majorArcana)) {
        if (name.includes(key)) return `https://sacred-texts.com/tarot/xr/${code}.jpg`;
    }

    // Minor Arcana
    let suitCode = "";
    if (name.includes("wand")) suitCode = "wa";
    else if (name.includes("cup")) suitCode = "cu";
    else if (name.includes("sword")) suitCode = "sw";
    else if (name.includes("pentacle") || name.includes("coin")) suitCode = "pe";

    if (suitCode) {
        const ranks: Record<string, string> = {
            "ace": "01", "one": "01", "two": "02", "three": "03", "four": "04", "five": "05",
            "six": "06", "seven": "07", "eight": "08", "nine": "09", "ten": "10",
            "page": "11", "knight": "12", "queen": "13", "king": "14"
        };
        for (const [key, code] of Object.entries(ranks)) {
            if (name.includes(key)) return `https://sacred-texts.com/tarot/xr/${suitCode}${code}.jpg`;
        }
        // Fallback for numeral strings like "10"
        for (let i = 1; i <= 14; i++) {
            if (name.includes(i.toString())) return `https://sacred-texts.com/tarot/xr/${suitCode}${i.toString().padStart(2, '0')}.jpg`;
        }
    }

    // Ultimate fallback image (The Fool) if no match found
    return "https://sacred-texts.com/tarot/xr/ar00.jpg";
};

export const TarotCard = ({ card, meaning, status }: { card: string; meaning: string; status: string }) => {
    const isReversed = status.toLowerCase().includes("reverse");

    return (
        <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            style={{
                background: "linear-gradient(145deg, rgba(23, 23, 23, 0.95), rgba(10, 10, 10, 0.9))",
                border: "1px solid rgba(139, 92, 246, 0.2)",
                borderRadius: "20px",
                padding: "24px",
                color: "white",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "16px",
                maxWidth: "320px",
                boxShadow: "0 20px 40px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
                margin: "16px 0",
                position: "relative",
                overflow: "hidden",
                backdropFilter: "blur(20px)"
            }}
        >
            {/* Thesys Ambient Glow */}
            <div style={{ position: "absolute", top: -50, right: -50, width: 120, height: 120, background: "#8B5CF6", filter: "blur(80px)", opacity: 0.4 }} />
            <div style={{ position: "absolute", bottom: -50, left: -50, width: 100, height: 100, background: "#3B82F6", filter: "blur(80px)", opacity: 0.3 }} />

            <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "12px" }}>
                <Layers size={14} color="#A78BFA" />
                <h4 style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#A78BFA", fontWeight: 700 }}>Tarot Draw</h4>
            </div>

            <div style={{
                width: "140px", height: "240px",
                border: "1px solid rgba(216, 180, 254, 0.4)", borderRadius: "12px",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "linear-gradient(180deg, rgba(76, 29, 149, 0.4), rgba(46, 16, 101, 0.6))",
                transform: isReversed ? "rotate(180deg)" : "rotate(0deg)",
                boxShadow: "inset 0 0 30px rgba(0,0,0,0.6), 0 10px 20px rgba(0,0,0,0.4)",
                position: "relative",
                overflow: "hidden"
            }}>
                {/* Image directly fitted to the card bounding box */}
                <img
                    src={getTarotImageUrl(card)}
                    alt={card}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div style={{ position: "absolute", inset: "0", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", pointerEvents: "none" }} />
            </div>

            <div style={{ textAlign: "center", zIndex: 1, width: "100%" }}>
                <h3 style={{ margin: "8px 0 4px", fontSize: "22px", color: "#F9FAFB", fontWeight: 800, letterSpacing: "-0.5px" }}>{card}</h3>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                    <span style={{
                        fontSize: "11px", padding: "4px 10px",
                        background: isReversed ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
                        color: isReversed ? "#FCA5A5" : "#6EE7B7",
                        borderRadius: "20px", fontWeight: 600,
                        border: `1px solid ${isReversed ? "rgba(239, 68, 68, 0.3)" : "rgba(16, 185, 129, 0.3)"}`
                    }}>
                        {isReversed ? "Reversed" : "Upright"}
                    </span>
                </div>
            </div>

            <div style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: "12px", padding: "16px", width: "100%", zIndex: 1
            }}>
                <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: "#D1D5DB", fontWeight: 400 }}>
                    <Sparkles size={14} style={{ display: "inline", marginRight: "6px", verticalAlign: "text-top", color: "#D8B4FE" }} />
                    {meaning}
                </p>
            </div>
        </motion.div>
    );
};

export const AstroChart = ({ type, dataStr }: { type: string, dataStr: string }) => {
    const parsedData = dataStr.split(",").map(item => {
        const [subject, val] = item.split(":");
        return {
            subject: subject.trim(),
            val: parseInt(val?.trim() || "50", 10),
            fullMark: 100
        };
    }).filter(i => i.subject && !isNaN(i.val));

    if (parsedData.length === 0) return null;

    const useRadar = type.toLowerCase().includes("radar") || type.toLowerCase().includes("aspect") || parsedData.length >= 3;

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "circOut" }}
            style={{
                background: "#ffffff",
                border: "1px solid rgba(0, 0, 0, 0.08)",
                borderRadius: "24px",
                padding: "24px",
                margin: "16px 0",
                boxShadow: "0 12px 30px -10px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04)",
                width: "100%",
                maxWidth: "360px",
                position: "relative",
                overflow: "hidden"
            }}
        >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: "linear-gradient(90deg, #8B5CF6, #3B82F6, #10B981)" }} />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#111827", letterSpacing: "-0.3px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "32px", height: "32px", background: "rgba(139, 92, 246, 0.1)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Hash size={16} color="#8B5CF6" />
                    </div>
                    {type}
                </h4>
            </div>

            <div style={{ width: '100%', height: 260, background: "rgba(249, 250, 251, 0.5)", borderRadius: "16px", padding: "10px" }}>
                <ResponsiveContainer width="100%" height="100%">
                    {useRadar ? (
                        <RadarChart data={parsedData} outerRadius="70%">
                            <PolarGrid stroke="#E5E7EB" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: "#6B7280", fontSize: 11, fontWeight: 600 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar name="Score" dataKey="val" stroke="#8B5CF6" fill="url(#colorUv)" fillOpacity={0.6} />
                            <defs>
                                <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.2} />
                                </linearGradient>
                            </defs>
                            <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 600 }} />
                        </RadarChart>
                    ) : (
                        <BarChart data={parsedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                            <XAxis dataKey="subject" tick={{ fill: "#6B7280", fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 600 }} />
                            <Bar dataKey="val" fill="#8B5CF6" radius={[6, 6, 0, 0]} barSize={32} />
                        </BarChart>
                    )}
                </ResponsiveContainer>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "16px" }}>
                {parsedData.map((d, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#F3F4F6", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", color: "#4B5563", fontWeight: 600 }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#8B5CF6" }} />
                        {d.subject}: {d.val}
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

export const AstroTable = ({ title, headersStr, rowsStr }: { title: string, headersStr: string, rowsStr: string }) => {
    const headers = headersStr.split("|").map(h => h.trim());
    const rowRaw = rowsStr.split("||").map(r => r.trim()).filter(Boolean);
    const rows = rowRaw.map(r => r.split("|").map(c => c.trim()));

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "circOut" }}
            style={{
                background: "#ffffff",
                border: "1px solid rgba(0, 0, 0, 0.08)",
                borderRadius: "24px",
                margin: "16px 0",
                boxShadow: "0 12px 30px -10px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04)",
                width: "100%",
                maxWidth: "400px",
                overflow: "hidden"
            }}
        >
            <div style={{ background: "#F9FAFB", padding: "20px 24px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ background: "white", padding: "8px", borderRadius: "10px", boxShadow: "0 2px 5px rgba(0,0,0,0.05)" }}>
                    <Sparkles size={18} color="#10B981" />
                </div>
                <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#111827", letterSpacing: "-0.3px" }}>
                    {title}
                </h4>
            </div>

            <div style={{ overflowX: "auto", padding: "0 12px 12px" }} className="no-scrollbar">
                <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 8px", fontSize: "14px" }}>
                    <thead>
                        <tr>
                            {headers.map((h, i) => (
                                <th key={i} style={{ textAlign: "left", padding: "4px 12px", color: "#6B7280", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr key={i}>
                                {row.map((cell, j) => (
                                    <td key={j} style={{
                                        padding: "16px 12px",
                                        color: j === 0 ? "#111827" : "#4B5563",
                                        fontWeight: j === 0 ? 700 : 400,
                                        background: "#F9FAFB",
                                        borderTopLeftRadius: j === 0 ? "12px" : "0",
                                        borderBottomLeftRadius: j === 0 ? "12px" : "0",
                                        borderTopRightRadius: j === row.length - 1 ? "12px" : "0",
                                        borderBottomRightRadius: j === row.length - 1 ? "12px" : "0",
                                    }}>
                                        {j === 0 ? (
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                {cell.includes("Sun") ? "☀️" : cell.includes("Moon") ? "🌙" : cell.includes("Venus") ? "♀️" : cell.includes("Mars") ? "♂️" : <ChevronRight size={14} color="#9CA3AF" />}
                                                {cell}
                                            </div>
                                        ) : (
                                            <span style={{ lineHeight: 1.5 }}>{cell}</span>
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );
};

// Extractor that works with ChatRoom rendering
export const extractAstrologyTags = (content: string) => {
    const elements: React.ReactNode[] = [];
    let cleanText = content;

    // 1. Tarot: [[TAROT: Card Name | Meaning | Upright/Reversed]]
    const tarotRegex = /\[\[\s*TAROT\s*:\s*([\s\S]*?)\]\]/gi;
    cleanText = cleanText.replace(tarotRegex, (match, inner) => {
        const parts = inner.split("|").map((p: string) => p.trim());
        const card = parts[0] || "Unknown Card";
        const meaning = parts[1] || "";
        const status = parts[2] || "Upright";
        elements.push(<TarotCard key={`tarot-${match}`} card={card} meaning={meaning} status={status} />);
        return ""; // remove from text
    });

    // 2. Chart: [[CHART: Chart Type | Label: 80, Label2: 90]]
    const chartRegex = /\[\[\s*CHART\s*:\s*([\s\S]*?)\]\]/gi;
    cleanText = cleanText.replace(chartRegex, (match, inner) => {
        const parts = inner.split("|").map((p: string) => p.trim());
        const type = parts[0] || "Astrology Chart";
        const dataStr = parts[1] || "";
        elements.push(<AstroChart key={`chart-${match}`} type={type} dataStr={dataStr} />);
        return "";
    });

    // 3. Table: Either @@ or newline row separators
    const tableRegex = /\[\[\s*TABLE\s*:\s*([\s\S]*?)\]\]/gi;
    cleanText = cleanText.replace(tableRegex, (match, inner) => {
        const firstPipeIndex = inner.indexOf("|");
        const title = firstPipeIndex !== -1 ? inner.substring(0, firstPipeIndex).trim() : "Astrology Data";
        const restContent = firstPipeIndex !== -1 ? inner.substring(firstPipeIndex + 1).trim() : inner.trim();

        let headersStr = "";
        let rowsStr = "";

        if (restContent.includes("@@")) {
            const rowParts = restContent.split("@@");
            headersStr = rowParts[0];
            rowsStr = rowParts.slice(1).join("||");
        } else if (restContent.includes("\n")) {
            const rowParts = restContent.split("\n").filter((p: string) => p.trim());
            headersStr = rowParts[0];
            rowsStr = rowParts.slice(1).join("||");
        } else {
            headersStr = restContent;
            rowsStr = "";
        }

        elements.push(<AstroTable key={`table-${match}`} title={title} headersStr={headersStr} rowsStr={rowsStr} />);
        return "";
    });

    return { cleanText: cleanText.trim(), elements };
};
