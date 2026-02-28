"use client";
import React from "react";
import { motion } from "framer-motion";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid } from 'recharts';
import { Sparkles, CheckCircle2, ChevronRight, Hash, Layers, Sun, Heart, Gem } from "lucide-react";

/* ── UI Element Types (Thesys C1 / Perplexity Style) ── */

// Helper to map card names to classic Rider-Waite-Smith images from sacred-texts
// Helper to map card names to local Figma-exported files in /public/tarot/
const getTarotImageUrl = (cardName: string) => {
    // We expect the user to export the provided Figma cards into /public/tarot/ 
    // named consistently. We will format the requested card name into a standard 
    // readable format (e.g., "The Fool" -> "the_fool.png", "Eight of Cups" -> "eight_of_cups.png")

    const numberToWord: Record<string, string> = {
        '1': 'ace', '2': 'two', '3': 'three', '4': 'four', '5': 'five',
        '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten'
    };

    // Clean and snake_case the card name
    let cleanName = cardName.toLowerCase().trim();

    // Convert digit numbers to words (e.g. "8" -> "eight")
    cleanName = cleanName.replace(/\b(10|[1-9])\b/g, match => numberToWord[match] || match);

    cleanName = cleanName
        .replace(/[^a-z0-9\s]/g, '') // Remove punctuation
        .replace(/\s+/g, '_');             // Replace spaces with underscores

    // Add "the_" prefix to Major Arcana cards if missing and it's a known major arcana
    const majorArcanaNames = ['fool', 'magician', 'high_priestess', 'empress', 'emperor', 'hierophant', 'lovers', 'chariot', 'hermit', 'wheel_of_fortune', 'hanged_man', 'devil', 'tower', 'star', 'moon', 'sun', 'world'];

    if (majorArcanaNames.includes(cleanName) && !cleanName.startsWith('the_')) {
        cleanName = `the_${cleanName}`;
    }

    // Default return local path
    // If the image doesn't exist, the UI will fall back to using the_fool.png
    return `/tarot/${cleanName}.png`;
};

export const TarotCard = ({ card, meaning, status }: { card: string; meaning: string; status: string }) => {
    const isReversed = status.toLowerCase().includes("reverse");
    const [imgSrc, setImgSrc] = React.useState(getTarotImageUrl(card));

    return (
        <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            style={{
                background: "#ffffff",
                border: "2px solid #111827",
                borderRadius: "14px",
                padding: "14px",
                color: "#111827",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
                width: "100%",
                boxSizing: "border-box" as const,
                boxShadow: "5px 5px 0px #FACC15",
                margin: "8px 0",
            }}
        >
            {/* Header row: title + sparkle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", borderBottom: "2px solid #111827", paddingBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Layers size={14} color="#111827" strokeWidth={2.5} />
                    <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1.5px", color: "#111827", fontWeight: 900 }}>Tarot Draw</span>
                </div>
                <Sparkles size={16} color="#FACC15" fill="#FACC15" />
            </div>

            {/* Card image — centered, moderate size */}
            <div style={{
                width: "120px", flexShrink: 0,
                border: "2px solid #111827",
                borderRadius: "10px",
                overflow: "hidden",
                background: "#F9FAFB",
                transform: isReversed ? "rotate(180deg)" : "none",
            }}>
                <img
                    src={imgSrc}
                    alt={card}
                    onError={() => setImgSrc("/tarot/the_fool.png")}
                    style={{ width: "100%", height: "auto", display: "block" }}
                />
            </div>

            {/* Card name + badge in one row */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
                <h3 style={{ margin: 0, fontSize: "18px", color: "#111827", fontWeight: 900, fontFamily: "Georgia, serif" }}>{card}</h3>
                <span style={{
                    fontSize: "10px", padding: "3px 10px",
                    background: isReversed ? "#111827" : "#FACC15",
                    color: isReversed ? "#FACC15" : "#111827",
                    borderRadius: "20px", fontWeight: 800,
                    border: "2px solid #111827",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    whiteSpace: "nowrap",
                }}>
                    {isReversed ? "Reversed" : "Upright"}
                </span>
            </div>

            {/* Meaning */}
            <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.5, color: "#374151", fontWeight: 500, textAlign: "center", width: "100%" }}>
                <span style={{ color: "#FACC15", fontWeight: 800, marginRight: "4px" }}>✦</span>
                {meaning}
            </p>
        </motion.div>
    );
};

export const AstroDailyCard = ({ title, score, body }: { title: string, score: string, body: string }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "circOut" }}
            style={{
                background: "#ffffff",
                border: "2px solid #111827",
                borderRadius: "14px",
                padding: "16px",
                margin: "12px 0",
                width: "100%",
                maxWidth: "360px",
                minWidth: 0,
                boxSizing: "border-box" as const,
                boxShadow: "5px 5px 0px #FACC15",
                position: "relative",
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", borderBottom: "2px solid #111827", paddingBottom: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px", color: "#111827", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Sun size={14} color="#111827" strokeWidth={2.5} />
                        Daily Insight
                    </span>
                    <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 900, color: "#111827", fontFamily: "Georgia, serif" }}>{title}</h3>
                </div>
                <div style={{ background: "#FACC15", border: "2px solid #111827", borderRadius: "12px", padding: "8px 12px", textAlign: "center", boxShadow: "2px 2px 0px #111827" }}>
                    <span style={{ display: "block", fontSize: "10px", fontWeight: 800, textTransform: "uppercase" }}>Score</span>
                    <span style={{ display: "block", fontSize: "18px", fontWeight: 900 }}>{score}/10</span>
                </div>
            </div>
            <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: "#374151", fontWeight: 500 }}>
                {body}
            </p>
        </motion.div>
    );
};

export const AstroCompatibility = ({ sign1, sign2, score, aspect }: { sign1: string, sign2: string, score: string, aspect: string }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "circOut" }}
            style={{
                background: "#ffffff",
                border: "2px solid #111827",
                borderRadius: "14px",
                padding: "16px",
                margin: "12px 0",
                width: "100%",
                maxWidth: "360px",
                minWidth: 0,
                boxSizing: "border-box" as const,
                boxShadow: "5px 5px 0px #FACC15",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div style={{ flex: 1, textAlign: "center", background: "#F9FAFB", border: "2px solid #111827", borderRadius: "12px", padding: "12px 8px" }}>
                    <span style={{ fontSize: "16px", fontWeight: 900, color: "#111827" }}>{sign1}</span>
                </div>

                <div style={{ margin: "0 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                    <Heart size={24} color="#111827" fill="#FACC15" />
                    <span style={{ fontSize: "14px", fontWeight: 900 }}>{score}%</span>
                </div>

                <div style={{ flex: 1, textAlign: "center", background: "#F9FAFB", border: "2px solid #111827", borderRadius: "12px", padding: "12px 8px" }}>
                    <span style={{ fontSize: "16px", fontWeight: 900, color: "#111827" }}>{sign2}</span>
                </div>
            </div>

            <div style={{ background: "#FACC15", border: "2px solid #111827", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "4px" }}>Key Aspect</span>
                <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#111827", lineHeight: 1.4 }}>{aspect}</p>
            </div>
        </motion.div>
    );
};

export const AstroRemedy = ({ remediesStr }: { remediesStr: string }) => {
    const rawItems = remediesStr.split("@@").map(r => r.trim()).filter(Boolean);
    const remedies = rawItems.map(item => {
        const parts = item.split("|");
        return { name: parts[0]?.trim() || "Crystal", purpose: parts[1]?.trim() || "Healing" };
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "circOut" }}
            style={{
                background: "#ffffff",
                border: "2px solid #111827",
                borderRadius: "14px",
                padding: "16px",
                margin: "12px 0",
                width: "100%",
                maxWidth: "360px",
                minWidth: 0,
                boxSizing: "border-box" as const,
                boxShadow: "5px 5px 0px #111827",
            }}
        >
            <h4 style={{ margin: "0 0 16px 0", fontSize: "15px", fontWeight: 900, color: "#111827", textTransform: "uppercase", letterSpacing: "1px", display: "flex", alignItems: "center", gap: "8px", borderBottom: "2px solid #111827", paddingBottom: "10px" }}>
                <Gem size={18} color="#111827" fill="#FACC15" strokeWidth={2} />
                Prescribed Remedies
            </h4>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {remedies.map((remedy, i) => (
                    <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start", background: "#F9FAFB", border: "2px solid #111827", padding: "12px", borderRadius: "10px" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#FACC15", border: "2px solid #111827", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Sparkles size={16} color="#111827" fill="#111827" />
                        </div>
                        <div>
                            <h5 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: 800, color: "#111827" }}>{remedy.name}</h5>
                            <p style={{ margin: 0, fontSize: "13px", color: "#374151", fontWeight: 500, lineHeight: 1.4 }}>{remedy.purpose}</p>
                        </div>
                    </div>
                ))}
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
                border: "2px solid #111827",
                borderRadius: "14px",
                padding: "16px",
                margin: "12px 0",
                width: "100%",
                maxWidth: "360px",
                minWidth: 0,
                boxSizing: "border-box" as const,
                boxShadow: "5px 5px 0px #FACC15",
                position: "relative",
                overflow: "hidden"
            }}
        >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", borderBottom: "2px solid #111827", paddingBottom: "10px" }}>
                <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 900, color: "#111827", textTransform: "uppercase", letterSpacing: "1px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Hash size={18} color="#111827" strokeWidth={2.5} />
                    {type}
                </h4>
                <Sparkles size={18} color="#FACC15" fill="#FACC15" />
            </div>

            <div style={{ width: '100%', minWidth: 0, height: 260, background: "#F9FAFB", border: "2px solid #111827", borderRadius: "10px", padding: "10px", boxSizing: "border-box" }}>
                <ResponsiveContainer width="99%" height="100%">
                    {useRadar ? (
                        <RadarChart data={parsedData} outerRadius="70%">
                            <PolarGrid stroke="#111827" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: "#111827", fontSize: 11, fontWeight: 800 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar name="Score" dataKey="val" stroke="#111827" strokeWidth={2} fill="#FACC15" fillOpacity={0.8} />
                            <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: '2px solid #111827', boxShadow: '4px 4px 0px #FACC15', fontWeight: 700, background: "#ffffff", color: "#111827" }} />
                        </RadarChart>
                    ) : (
                        <BarChart data={parsedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="subject" tick={{ fill: "#111827", fontSize: 12, fontWeight: 700 }} axisLine={{ stroke: "#111827", strokeWidth: 2 }} tickLine={false} />
                            <Tooltip cursor={{ fill: 'rgba(250, 204, 21, 0.2)' }} contentStyle={{ borderRadius: '8px', border: '2px solid #111827', boxShadow: '4px 4px 0px #FACC15', fontWeight: 700, background: "#ffffff", color: "#111827" }} />
                            <Bar dataKey="val" fill="#111827" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    )}
                </ResponsiveContainer>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "16px", justifyContent: "center" }}>
                {parsedData.map((d, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#ffffff", border: "2px solid #111827", padding: "6px 12px", borderRadius: "20px", fontSize: "12px", color: "#111827", fontWeight: 800 }}>
                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#FACC15", border: "1px solid #111827" }} />
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
                border: "2px solid #111827",
                borderRadius: "14px",
                margin: "12px 0",
                boxShadow: "5px 5px 0px #FACC15",
                width: "100%",
                maxWidth: "100%",
                minWidth: 0,
                boxSizing: "border-box" as const,
                overflow: "hidden"
            }}
        >
            <div style={{ background: "#FACC15", padding: "16px 20px", borderBottom: "2px solid #111827", display: "flex", alignItems: "center", gap: "10px" }}>
                <Sparkles size={20} color="#111827" fill="#111827" />
                <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 900, color: "#111827", textTransform: "uppercase", letterSpacing: "1px" }}>
                    {title}
                </h4>
            </div>

            <div style={{ overflowX: "auto", background: "#ffffff" }} className="no-scrollbar">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                    <thead>
                        <tr>
                            {headers.map((h, i) => (
                                <th key={i} style={{
                                    textAlign: "left",
                                    padding: "12px 16px",
                                    background: "#111827",
                                    color: "#ffffff",
                                    fontWeight: 800,
                                    fontSize: "12px",
                                    textTransform: "uppercase",
                                    letterSpacing: "1px",
                                    borderBottom: "2px solid #111827",
                                    borderRight: i < headers.length - 1 ? "1px solid rgba(255,255,255,0.2)" : "none"
                                }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? "1px solid #111827" : "none" }}>
                                {row.map((cell, j) => (
                                    <td key={j} style={{
                                        padding: "16px",
                                        color: "#111827",
                                        fontWeight: j === 0 ? 800 : 500,
                                        background: j === 0 ? "#F9FAFB" : "#ffffff",
                                        borderRight: j < row.length - 1 ? "1px solid #111827" : "none"
                                    }}>
                                        {j === 0 ? (
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                {cell.includes("Sun") ? "☀️" : cell.includes("Moon") ? "🌙" : cell.includes("Venus") ? "♀️" : cell.includes("Mars") ? "♂️" : <ChevronRight size={14} color="#111827" strokeWidth={3} />}
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
    const tarotRegex = /\[{1,3}\s*TAROT\s*:\s*([\s\S]*?)(?:\]{1,3}|$)/gi;
    cleanText = cleanText.replace(tarotRegex, (match, inner) => {
        const parts = inner.split("|").map((p: string) => p.trim());
        const card = parts[0] ? parts[0].replace(/\]/g, '').trim() : "Unknown Card";
        const meaning = parts[1] ? parts[1].replace(/\]/g, '').trim() : "";
        const status = parts[2] ? parts[2].replace(/\]/g, '').trim() : "Upright";
        elements.push(<TarotCard key={`tarot-${match}`} card={card} meaning={meaning} status={status} />);
        return ""; // remove from text
    });

    // 2. Chart: [[CHART: Chart Type | Label: 80, Label2: 90]]
    const chartRegex = /\[{1,3}\s*CHART\s*:\s*([\s\S]*?)(?:\]{1,3}|$)/gi;
    cleanText = cleanText.replace(chartRegex, (match, inner) => {
        const parts = inner.split("|").map((p: string) => p.trim());
        const type = parts[0] ? parts[0].replace(/\]/g, '').trim() : "Astrology Chart";
        const dataStr = parts[1] ? parts[1].replace(/\]/g, '').trim() : "";
        elements.push(<AstroChart key={`chart-${match}`} type={type} dataStr={dataStr} />);
        return "";
    });

    // 3. Table: Either @@ or newline row separators
    const tableRegex = /\[{1,3}\s*TABLE\s*:\s*([\s\S]*?)(?:\]{1,3}|$)/gi;
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

    // 4. Daily: [[DAILY: Title | Score | Body]]
    const dailyRegex = /\[{1,3}\s*DAILY\s*:\s*([\s\S]*?)(?:\]{1,3}|$)/gi;
    cleanText = cleanText.replace(dailyRegex, (match, inner) => {
        const parts = inner.split("|").map((p: string) => p.trim());
        const title = parts[0] ? parts[0].replace(/\]/g, '').trim() : "Daily Insight";
        const score = parts[1] ? parts[1].replace(/\]/g, '').trim() : "5";
        const body = parts[2] ? parts[2].replace(/\]/g, '').trim() : "";
        elements.push(<AstroDailyCard key={`daily-${elements.length}`} title={title} score={score} body={body} />);
        return "";
    });

    // 5. Compatibility: [[COMPATIBILITY: Sign1 | Sign2 | Score | Aspect]]
    const compatRegex = /\[{1,3}\s*COMPATIBILITY\s*:\s*([\s\S]*?)(?:\]{1,3}|$)/gi;
    cleanText = cleanText.replace(compatRegex, (match, inner) => {
        const parts = inner.split("|").map((p: string) => p.trim());
        const sign1 = parts[0] ? parts[0].replace(/\]/g, '').trim() : "You";
        const sign2 = parts[1] ? parts[1].replace(/\]/g, '').trim() : "Them";
        const score = parts[2] ? parts[2].replace(/\]/g, '').trim() : "50";
        const aspect = parts[3] ? parts[3].replace(/\]/g, '').trim() : "";
        elements.push(<AstroCompatibility key={`compat-${elements.length}`} sign1={sign1} sign2={sign2} score={score} aspect={aspect} />);
        return "";
    });

    // 6. Remedy: [[REMEDY: Item1 | Purpose1 @@ Item2 | Purpose2]]
    const remedyRegex = /\[{1,3}\s*REMEDY\s*:\s*([\s\S]*?)(?:\]{1,3}|$)/gi;
    cleanText = cleanText.replace(remedyRegex, (match, inner) => {
        const content = inner.replace(/\]/g, '').trim();
        elements.push(<AstroRemedy key={`rem-${elements.length}`} remediesStr={content} />);
        return "";
    });

    return { cleanText: cleanText.trim(), elements };
};
