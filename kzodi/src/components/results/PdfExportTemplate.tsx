import React, { forwardRef } from "react";
import { zodiacSvgIcons } from "@/components/svg/ZodiacIcons";
import { type ZodiacSign } from "@/lib/zodiac";
import { type PersonInfo } from "@/lib/store";
import BirthChartWheel from "./BirthChartWheel";

interface PdfExportTemplateProps {
    person: PersonInfo;
    sign: ZodiacSign;
    signKey: string;
    aiInsights: Record<string, unknown> | null;
    birthChartData: Record<string, unknown> | null;
}

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

                    {/* Birth Chart */}
                    {birthChartData && (
                        <section className="bg-[#f9fafb] p-6 rounded-[24px]">
                            <h2 className="text-[20px] font-bold border-b border-[#e5e7eb] pb-3 mb-4 uppercase tracking-wider text-[#111827]">
                                Birth Chart
                            </h2>
                            <div className="transform scale-[0.8] origin-top flex justify-center">
                                <BirthChartWheel birthChartData={birthChartData} />
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
