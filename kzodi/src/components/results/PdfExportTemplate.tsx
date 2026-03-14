import React, { forwardRef } from "react";
import { zodiacSvgIcons } from "@/components/svg/ZodiacIcons";
import { type ZodiacSign } from "@/lib/zodiac";
import { type PersonInfo } from "@/lib/store";

interface PdfExportTemplateProps {
    person: PersonInfo;
    sign: ZodiacSign;
    signKey: string;
    aiInsights: Record<string, unknown> | null;
    birthChartData: Record<string, unknown> | null;
}

const P_INFO: Record<string, string> = {
    Sun: "Su", Moon: "Mo", Mercury: "Me", Venus: "Ve", Mars: "Ma",
    Jupiter: "Ju", Saturn: "Sa", Uranus: "Ur", Neptune: "Ne", Pluto: "Pl",
    NorthNode: "NN", Chiron: "Ch", Ceres: "Ce", Pallas: "Pa", Juno: "Jn", Vesta: "Vs",
};

const PdfExportTemplate = forwardRef<HTMLDivElement, PdfExportTemplateProps>(
    ({ person, sign, signKey, aiInsights, birthChartData }, ref) => {
        const ZodiacIcon = zodiacSvgIcons[signKey];

        const aiPersonality = (aiInsights?.personality as string) || "";
        const aiLove = (aiInsights?.love as string) || "";
        const aiCompatibility = (aiInsights?.compatibility as string) || "";
        const aiLikes = (aiInsights?.likes as string) || "";
        const aiChartReading = (aiInsights?.chartReading as string) || "";

        const renderText = (text: string) => {
            if (!text) return <p className="text-[#9ca3af] italic">Not available</p>;
            const paragraphs = text.split("\n\n").filter(Boolean);
            return (
                <div className="flex flex-col gap-4 text-[14px] leading-relaxed text-[#1f2937]">
                    {paragraphs.map((p, i) => (
                        <p key={i}>{p.trim()}</p>
                    ))}
                </div>
            );
        };

        return (
            <div
                ref={ref}
                className="bg-white text-black p-[40px]"
                style={{
                    width: "794px", // Standard A4 width at 96 DPI
                    minHeight: "1123px", // A4 height
                    fontFamily: "var(--font-sans, system-ui, sans-serif)",
                }}
            >
                {/* Header */}
                <div className="flex items-start justify-between border-b-2 border-[#111827] pb-6 mb-8">
                    <div>
                        <h1 className="text-[36px] font-black tracking-tight leading-none mb-2">Kakoei Reading</h1>
                        <p className="text-[18px] text-[#6b7280] font-semibold uppercase tracking-wider">
                            {person.name || "Anonymous"} • {sign.name}
                        </p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                        {ZodiacIcon && <ZodiacIcon size={48} className="text-[#111827] mb-2" />}
                        {person.mbti && (
                            <span className="bg-[#f3f4f6] px-3 py-1 rounded-full text-[12px] font-bold">
                                MBTI: {person.mbti}
                            </span>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="flex flex-col gap-10">

                    {/* Birth Chart Data (Print Friendly) */}
                    {birthChartData && (
                        <section className="bg-[#f9fafb] border border-[#e5e7eb] rounded-[24px] overflow-hidden">
                            <div className="bg-[#f3f4f6] px-8 py-4 border-b border-[#e5e7eb]">
                                <h2 className="text-[18px] font-bold uppercase tracking-widest text-[#111827]">
                                    Astrological Placements
                                </h2>
                            </div>
                            
                            <div className="p-8">
                                {/* Angles */}
                                {(birthChartData.angles as any)?.ascendant && (
                                    <div className="mb-8">
                                        <h3 className="text-[14px] font-bold text-[#6b7280] uppercase tracking-wider mb-4 border-b border-[#e5e7eb] pb-2">Chart Angles</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            {[
                                                { label: "Ascendant (Rising)", data: (birthChartData.angles as any).ascendant },
                                                { label: "Midheaven (MC)", data: (birthChartData.angles as any).midheaven },
                                            ].map((angle, i) => angle.data && (
                                                <div key={i} className="flex justify-between items-center p-3 bg-white border border-[#e5e7eb] rounded-lg">
                                                    <span className="text-[14px] font-semibold text-[#374151]">{angle.label}</span>
                                                    <div className="text-right">
                                                        <span className="block text-[15px] font-bold text-[#111827]">{angle.data.sign}</span>
                                                        <span className="block text-[12px] text-[#6b7280]">{angle.data.degree}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Planets */}
                                {birthChartData.planets && (
                                    <div>
                                        <h3 className="text-[14px] font-bold text-[#6b7280] uppercase tracking-wider mb-4 border-b border-[#e5e7eb] pb-2">Planetary Positions</h3>
                                        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                                            {(birthChartData.planets as any[]).map((p: any, i: number) => (
                                                <div key={i} className="flex items-center justify-between py-2 border-b border-[#f3f4f6] last:border-0">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-[#111827] flex items-center justify-center text-white text-[11px] font-bold">
                                                            {P_INFO[p.name] || p.name.slice(0, 2)}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[14px] font-bold text-[#111827]">{p.name}</span>
                                                                {p.isRetrograde && <span className="text-[10px] font-bold text-[#ef4444]">(Rx)</span>}
                                                            </div>
                                                            <span className="text-[13px] text-[#6b7280]">House {p.house}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="block text-[14px] font-bold text-[#374151]">{p.sign}</span>
                                                        <span className="block text-[12px] text-[#9ca3af]">{p.degree}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Personality */}
                    {aiPersonality && (
                        <section>
                            <h2 className="text-[20px] font-bold border-b border-[#e5e7eb] pb-3 mb-4 uppercase tracking-wider text-[#111827]">
                                Personality Analysis
                            </h2>
                            {renderText(aiPersonality)}
                        </section>
                    )}

                    {/* Chart Reading */}
                    {aiChartReading && (
                        <section>
                            <h2 className="text-[20px] font-bold border-b border-[#e5e7eb] pb-3 mb-4 uppercase tracking-wider text-[#111827]">
                                Full Chart Reading
                            </h2>
                            {renderText(aiChartReading)}
                        </section>
                    )}

                    {/* Love */}
                    {aiLove && (
                        <section>
                            <h2 className="text-[20px] font-bold border-b border-[#e5e7eb] pb-3 mb-4 uppercase tracking-wider text-[#111827]">
                                Love & Romance
                            </h2>
                            {renderText(aiLove)}
                        </section>
                    )}

                    {/* Compatibility */}
                    {aiCompatibility && (
                        <section>
                            <h2 className="text-[20px] font-bold border-b border-[#e5e7eb] pb-3 mb-4 uppercase tracking-wider text-[#111827]">
                                Compatibility Profile
                            </h2>
                            {renderText(aiCompatibility)}
                        </section>
                    )}

                    {/* Likes & Interests */}
                    {aiLikes && (
                        <section>
                            <h2 className="text-[20px] font-bold border-b border-[#e5e7eb] pb-3 mb-4 uppercase tracking-wider text-[#111827]">
                                Interests & Career
                            </h2>
                            {renderText(aiLikes)}
                        </section>
                    )}

                </div>

                {/* Footer */}
                <div className="mt-12 pt-6 border-t border-[#e5e7eb] text-center text-[#9ca3af] text-[12px] font-semibold tracking-widest uppercase">
                    Generated by Kakoei • Cosmic Identity
                </div>
            </div>
        );
    }
);

PdfExportTemplate.displayName = "PdfExportTemplate";
export default PdfExportTemplate;
