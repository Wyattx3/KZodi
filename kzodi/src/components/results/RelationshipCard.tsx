import React, { forwardRef } from "react";
import { zodiacSvgIcons } from "@/components/svg/ZodiacIcons";
import { type ZodiacSign } from "@/lib/zodiac";
import { type PersonInfo } from "@/lib/store";

interface RelationshipCardProps {
    person1: PersonInfo;
    sign1: ZodiacSign;
    sign1Key: string;
    person2: PersonInfo;
    sign2: ZodiacSign;
    sign2Key: string;
    compatScore: number | null;
    rsDuration: string | undefined;
}

const RelationshipCard = forwardRef<HTMLDivElement, RelationshipCardProps>(
    ({ person1, sign1, sign1Key, person2, sign2, sign2Key, compatScore, rsDuration }, ref) => {
        const ZodiacIcon1 = zodiacSvgIcons[sign1Key];
        const ZodiacIcon2 = zodiacSvgIcons[sign2Key];

        return (
            <div
                ref={ref}
                className="relative overflow-hidden bg-[#fafafa]"
                style={{
                    width: "1000px",
                    height: "600px", // Widescreen Ratio
                    display: "flex",
                    fontFamily: "var(--font-sans, system-ui, sans-serif)",
                    color: "#1c1c1e",
                }}
            >
                {/* Background Layer */}
                <div
                    className="absolute inset-0 z-0 overflow-hidden"
                    style={{ background: "linear-gradient(to bottom right, #ffffff, #f0f0f5)" }}
                >
                    <div
                        className="absolute inset-0"
                        style={{ background: "radial-gradient(ellipse at center, #f3f4f6 0%, #ffffff 50%, #ffffff 100%)" }}
                    />
                    
                    {/* Faded Zodiac Icons on sides */}
                    {ZodiacIcon1 && (
                        <div
                            className="absolute pointer-events-none"
                            style={{
                                top: "50%",
                                left: "15%",
                                transform: "translate(-50%, -50%)",
                                opacity: 0.04,
                                color: "#000",
                            }}
                        >
                            <ZodiacIcon1 size={500} />
                        </div>
                    )}
                    
                    {ZodiacIcon2 && (
                        <div
                            className="absolute pointer-events-none"
                            style={{
                                top: "50%",
                                left: "85%",
                                transform: "translate(-50%, -50%)",
                                opacity: 0.04,
                                color: "#000",
                            }}
                        >
                            <ZodiacIcon2 size={500} />
                        </div>
                    )}
                </div>

                {/* Content Container */}
                <div className="relative z-10 flex flex-col w-full h-full p-12">
                    {/* Header */}
                    <div className="flex items-center justify-center pb-6 mb-8" style={{ borderBottom: "1px solid #e5e5ea", width: "100%" }}>
                        <div className="flex items-center gap-3">
                            <img src="/logo.png" alt="Kakoei Logo" style={{ width: 40, height: 40, objectFit: "contain" }} crossOrigin="anonymous" />
                            <div>
                                <h1 className="text-[20px] font-[700] tracking-tight leading-none" style={{ color: "#1c1c1e" }}>Kakoei</h1>
                                <p className="text-[12px] font-[500] tracking-widest uppercase mt-1" style={{ color: "#8e8e93" }}>Cosmic Compatibility</p>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex flex-1 items-center justify-between px-8">
                        
                        {/* Person 1 (Left) */}
                        <div className="flex flex-col items-center text-center w-[250px]">
                            {ZodiacIcon1 && (
                                <div className="mb-4" style={{ color: "#1c1c1e" }}>
                                    <ZodiacIcon1 size={60} />
                                </div>
                            )}
                            <h2 className="text-[32px] font-[800] leading-tight mb-1">{person1.name || "Person 1"}</h2>
                            <p className="text-[14px] font-[600] uppercase tracking-widest" style={{ color: "#8e8e93" }}>{sign1.name}</p>
                            
                            <div className="mt-6 pt-4 w-full" style={{ borderTop: "1px solid #e5e5ea" }}>
                                <div className="mb-3">
                                    <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: "#8e8e93" }}>Love Language</p>
                                    <p className="text-[14px] font-[600]">{sign1.loveStyle}</p>
                                </div>
                                {person1.mbti && (
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: "#8e8e93" }}>MBTI</p>
                                        <p className="text-[18px] font-[700]">{person1.mbti}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Center (Scores) */}
                        <div className="flex flex-col items-center justify-center px-6 text-center">
                             {compatScore !== null && (
                                 <div className="mb-6">
                                    <p className="text-[12px] uppercase tracking-widest font-bold mb-2" style={{ color: "#8e8e93" }}>Match Score</p>
                                    <h2 className="text-[80px] font-[900] leading-none tracking-tighter" style={{ color: "#1c1c1e" }}>{compatScore}%</h2>
                                 </div>
                             )}
                             
                             {rsDuration && (
                                 <div className="px-6 py-3 rounded-2xl" style={{ backgroundColor: "#f3f4f6" }}>
                                    <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: "#8e8e93" }}>Relationship Duration</p>
                                    <p className="text-[18px] font-[700]">{rsDuration}</p>
                                 </div>
                             )}
                        </div>

                        {/* Person 2 (Right) */}
                        <div className="flex flex-col items-center text-center w-[250px]">
                            {ZodiacIcon2 && (
                                <div className="mb-4" style={{ color: "#1c1c1e" }}>
                                    <ZodiacIcon2 size={60} />
                                </div>
                            )}
                            <h2 className="text-[32px] font-[800] leading-tight mb-1">{person2.name || "Partner"}</h2>
                            <p className="text-[14px] font-[600] uppercase tracking-widest" style={{ color: "#8e8e93" }}>{sign2.name}</p>
                            
                            <div className="mt-6 pt-4 w-full" style={{ borderTop: "1px solid #e5e5ea" }}>
                                <div className="mb-3">
                                    <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: "#8e8e93" }}>Love Language</p>
                                    <p className="text-[14px] font-[600]">{sign2.loveStyle}</p>
                                </div>
                                {person2.mbti && (
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: "#8e8e93" }}>MBTI</p>
                                        <p className="text-[18px] font-[700]">{person2.mbti}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        );
    }
);

RelationshipCard.displayName = "RelationshipCard";
export default RelationshipCard;
