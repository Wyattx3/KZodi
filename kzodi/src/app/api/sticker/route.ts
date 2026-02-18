import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = "AIzaSyAfQJJxAisZfO1Wd0YPMkhSu3UKl_w1cWI";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GEMINI_API_KEY}`;

export async function POST(request: NextRequest) {
    let stickerPrompt = "";
    try {
        const body = await request.json();
        stickerPrompt = body.prompt || "";

        if (!stickerPrompt) {
            return NextResponse.json({ error: "No prompt provided" }, { status: 400 });
        }

        const response = await fetch(GEMINI_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Generate a cute, kawaii sticker image (PNG, transparent background, no text) for the action/emotion: "${stickerPrompt}". 
Style: chibi anime character sticker, soft pastel colors, simple clean lines, expressive, no background.` }]
                }],
                generationConfig: {
                    responseModalities: ["TEXT", "IMAGE"],
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini API Error:", response.status, errorText);

            // Fallback: generate SVG with gemini-2.5-flash
            return await generateSvgFallback(stickerPrompt);
        }

        const data = await response.json();
        const parts = data.candidates?.[0]?.content?.parts || [];

        // Look for image in the response parts
        for (const part of parts) {
            if (part.inlineData) {
                const base64 = part.inlineData.data;
                const mimeType = part.inlineData.mimeType || "image/png";
                const dataUrl = `data:${mimeType};base64,${base64}`;
                return NextResponse.json({ image: dataUrl, type: "image" });
            }
        }

        // If no image returned, fallback to SVG
        return await generateSvgFallback(stickerPrompt);
    } catch (error) {
        console.error("Sticker API Error:", error);
        // Fallback to SVG on any error
        return await generateSvgFallback(stickerPrompt);
    }
}

// Fallback: generate SVG sticker using text model
async function generateSvgFallback(prompt: string) {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `You are an expert SVG artist. Create a CUTE, KAWAII, SIMPLE SVG sticker for the action: "${prompt}".
- Use soft, pastel or vibrant colors.
- Keep the design simple and readable at small sizes.
- Return ONLY the raw SVG code.
- Do NOT wrap in markdown.
- Do NOT add any text explanations.
- The SVG should be fully self-contained.` }]
                }]
            }),
        });

        if (!response.ok) {
            return NextResponse.json({ image: null, svg: null });
        }

        const data = await response.json();
        let svgCode = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        svgCode = svgCode.replace(/```xml/g, "").replace(/```svg/g, "").replace(/```html/g, "").replace(/```/g, "").trim();

        if (svgCode.includes("<svg")) {
            // Extract just the SVG part
            const svgMatch = svgCode.match(/<svg[\s\S]*<\/svg>/);
            if (svgMatch) {
                return NextResponse.json({ svg: svgMatch[0], type: "svg" });
            }
        }

        return NextResponse.json({ image: null, svg: null });
    } catch {
        return NextResponse.json({ image: null, svg: null });
    }
}
