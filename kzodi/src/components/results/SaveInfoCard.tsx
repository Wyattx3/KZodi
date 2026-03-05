import React, { forwardRef } from "react";
import { zodiacSvgIcons } from "@/components/svg/ZodiacIcons";
import { type ZodiacSign } from "@/lib/zodiac";
import { type PersonInfo } from "@/lib/store";
import { mbtiDescriptions } from "@/data/mbtiQuestions";

interface SaveInfoCardProps {
    person: PersonInfo;
    sign: ZodiacSign;
    signKey: string;
    birthChartData: Record<string, unknown> | null;
}

const SaveInfoCard = forwardRef<HTMLDivElement, SaveInfoCardProps>(
    ({ person, sign, signKey, birthChartData }, ref) => {
        const ZodiacIcon = zodiacSvgIcons[signKey];
        const mbtiDesc = person.mbti ? mbtiDescriptions[person.mbti] : null;

        // Format birthday
        const months = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ];
        const bdayStr =
            person.birthMonth && person.birthDay
                ? `${months[person.birthMonth - 1]} ${person.birthDay}, ${person.birthYear || ""}`.trim()
                : "";

        // Placements
        // Extract all planets/angles
        const placements: { label: string; sign: string; deg: string }[] = [];
        if (birthChartData) {
            // Angles first
            if ((birthChartData.angles as any)?.ascendant?.sign) {
                const angle = (birthChartData.angles as any).ascendant;
                placements.push({
                    label: "Ascendant",
                    sign: angle.sign,
                    deg: angle.degree != null && !isNaN(angle.degree) ? Math.round(angle.degree) + "°" : ""
                });
            }
            if ((birthChartData.angles as any)?.midheaven?.sign) {
                const angle = (birthChartData.angles as any).midheaven;
                placements.push({
                    label: "Midheaven",
                    sign: angle.sign,
                    deg: angle.degree != null && !isNaN(angle.degree) ? Math.round(angle.degree) + "°" : ""
                });
            }
            // Planets
            const planets = (birthChartData.planets as any[]) || [];
            const keyPlanets = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
            keyPlanets.forEach(kp => {
                const found = planets.find(p => p.name === kp);
                if (found && found.sign) {
                    placements.push({
                        label: kp,
                        sign: found.sign,
                        deg: found.degree != null && !isNaN(found.degree) ? Math.round(found.degree) + "°" : ""
                    });
                }
            });
        }

        return (
            <div
                ref={ref}
                className="relative overflow-hidden bg-[#fafafa]"
                style={{
                    width: "800px",
                    height: "600px", // 4:3 Ratio
                    display: "flex",
                    fontFamily: "var(--font-sans, system-ui, sans-serif)",
                    color: "#1c1c1e",
                }}
            >
                {/* Background Layer: Minimalist Apple Aesthetic */}
                <div
                    className="absolute inset-0 z-0 overflow-hidden"
                    style={{ background: "linear-gradient(to bottom right, #ffffff, #f0f0f5)" }}
                >
                    {/* Minimalist gradient / texture */}
                    <div
                        className="absolute inset-0"
                        style={{ background: "radial-gradient(ellipse at top right, #f3f4f6 0%, #ffffff 50%, #ffffff 100%)" }}
                    />
                    <div className="absolute -top-[100px] -right-[100px] w-[600px] h-[600px] rounded-full blur-[120px]" style={{ background: "rgba(229, 231, 235, 0.2)" }} />

                    {/* Giant transparent zodiac background */}
                    {ZodiacIcon && (
                        <div
                            className="absolute pointer-events-none"
                            style={{
                                top: "50%",
                                left: "70%",
                                transform: "translate(-50%, -50%)",
                                opacity: 0.03,
                                color: "#000",
                            }}
                        >
                            <ZodiacIcon size={650} />
                        </div>
                    )}
                </div>

                {/* Content Container (ID Card layout) */}
                <div className="relative z-10 flex flex-col w-full h-full p-12">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-6 mb-8" style={{ borderBottom: "1px solid #e5e5ea" }}>
                        <div className="flex items-center gap-3">
                            <img src="/logo.png" alt="Kakoei Logo" style={{ width: 40, height: 40, objectFit: "contain" }} crossOrigin="anonymous" />
                            <div>
                                <h1 className="text-[20px] font-[700] tracking-tight leading-none" style={{ color: "#1c1c1e" }}>Kakoei</h1>
                                <p className="text-[12px] font-[500] tracking-widest uppercase mt-1" style={{ color: "#8e8e93" }}>Cosmic Identity</p>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex flex-1 gap-10">
                        {/* Left Column: Portrait / Zodiac Area */}
                        <div className="flex flex-col items-center w-[220px]">
                            <div className="relative w-[200px] h-[240px] flex flex-col items-center justify-center mb-6">
                                {ZodiacIcon && (
                                    <div className="drop-shadow-sm mb-4" style={{ color: "#1c1c1e" }}>
                                        <ZodiacIcon size={80} />
                                    </div>
                                )}
                                <div className="text-center px-4">
                                    <h2 className="text-[28px] font-[800] tracking-tight lowercase" style={{ color: "#1c1c1e" }}>{sign.name}</h2>
                                    <p className="text-[11px] font-[600] uppercase tracking-widest mt-1" style={{ color: "#8e8e93" }}>{sign.element}</p>
                                </div>
                            </div>

                            {person.mbti && (
                                <div className="w-full text-center">
                                    <p className="text-[10px] uppercase tracking-widest mb-1 font-bold" style={{ color: "#8e8e93" }}>Personality</p>
                                    <p className="text-[24px] font-[800] tracking-tight" style={{ color: "#1c1c1e" }}>{person.mbti}</p>
                                    {mbtiDesc && (
                                        <p className="text-[11px] font-[500] mt-1" style={{ color: "#1c1c1e" }}>{mbtiDesc.title}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Right Column: Information */}
                        <div className="flex-1 flex flex-col justify-center">
                            <div className="mb-10">
                                <p className="text-[12px] uppercase tracking-widest font-bold mb-2" style={{ color: "#8e8e93" }}>Subject Name</p>
                                <h2 className="text-[48px] font-[800] leading-none tracking-tight" style={{ color: "#1c1c1e" }}>
                                    {person.name || "Anonymous"}
                                </h2>
                            </div>

                            <div className="grid grid-cols-2 gap-y-8 gap-x-12">
                                <div>
                                    <p className="text-[12px] uppercase tracking-widest font-bold mb-1.5" style={{ color: "#8e8e93" }}>Date of Birth</p>
                                    <p className="text-[20px] font-[600]" style={{ color: "#1c1c1e" }}>{bdayStr || "Unknown"}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: "#8e8e93" }}>Time of Birth</p>
                                    <p className="text-[16px] font-[600]" style={{ color: "#1c1c1e" }}>
                                        {person.birthTime ? (() => {
                                            const parts = person.birthTime.split(":");
                                            if (parts.length !== 2) return person.birthTime;
                                            const hour = parseInt(parts[0], 10);
                                            if (isNaN(hour)) return person.birthTime;
                                            const ampm = hour >= 12 ? 'PM' : 'AM';
                                            const hour12 = hour % 12 || 12;
                                            return `${hour12}:${parts[1]} ${ampm}`;
                                        })() : "Not Provided"}
                                    </p>
                                </div>
                            </div>

                            {/* All 12/Full Placements Summary - Clean text grid, no cards/emojis */}
                            <div className="mt-8 pt-6" style={{ borderTop: "1px solid #e5e5ea" }}>
                                <p className="text-[10px] uppercase tracking-widest font-bold mb-4" style={{ color: "#8e8e93" }}>Astral Blueprint</p>
                                <div className="grid grid-cols-4 gap-x-6 gap-y-4">
                                    {placements.length > 0 ? placements.map(pl => (
                                        <div key={pl.label} className="flex flex-col">
                                            <span className="text-[10px] font-[600] uppercase mb-0.5" style={{ color: "#8e8e93" }}>{pl.label}</span>
                                            <span className="text-[13px] font-[700] leading-tight" style={{ color: "#1c1c1e" }}>
                                                {pl.sign} <span className="font-normal" style={{ color: "#8e8e93" }}>{pl.deg}</span>
                                            </span>
                                        </div>
                                    )) : (
                                        <div className="col-span-4 text-[13px]" style={{ color: "#8e8e93" }}>Blueprint data not available</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
);

SaveInfoCard.displayName = "SaveInfoCard";
export default SaveInfoCard;
