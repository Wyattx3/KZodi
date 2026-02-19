import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { Buffer } from "buffer";
import path from "path";

const XAI_API_KEY = process.env.XAI_API_KEY || "xai-902264eb783f982a7f53aa4b6cdb84f3c959714853046761";
const XAI_URL = "https://api.x.ai/v1/images/generations";
const POLLINATIONS_URL = "https://image.pollinations.ai/prompt";
const GEMINI_API_KEY = "AIzaSyAfQJJxAisZfO1Wd0YPMkhSu3UKl_w1cWI";

// Cache file path
const CACHE_DIR = path.join(process.cwd(), "src", "data");
const CACHE_FILE = path.join(CACHE_DIR, "generated_stickers.json");

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}


// Helper: Get from cache
function getFromCache(key: string): string | null {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const data = fs.readFileSync(CACHE_FILE, "utf-8");
            const cache = JSON.parse(data);
            return cache[key] || null;
        }
    } catch (e) {
        console.error("Cache read error:", e);
    }
    return null;
}

// Helper: Save to cache
function saveToCache(key: string, dataUrl: string) {
    try {
        let cache: Record<string, string> = {};
        if (fs.existsSync(CACHE_FILE)) {
            const data = fs.readFileSync(CACHE_FILE, "utf-8");
            cache = JSON.parse(data);
        }
        cache[key] = dataUrl;
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    } catch (e) {
        console.error("Cache write error:", e);
    }
}

export async function POST(request: NextRequest) {
    let stickerPrompt = "";
    try {
        const body = await request.json();
        stickerPrompt = body.prompt || "";
        const characterName = body.characterName || "Character";
        const characterSource = body.characterSource || "";
        const characterTags = body.characterTags || [];
        const characterPersonality = body.characterPersonality || "";

        if (!stickerPrompt) {
            return NextResponse.json({ error: "No prompt provided" }, { status: 400 });
        }

        // 1. Check Cache
        const cleanPrompt = stickerPrompt.trim().toLowerCase();
        const cleanChar = characterName.trim().toLowerCase();
        const cacheKey = `${cleanChar}-${cleanPrompt}`;

        const cachedImage = getFromCache(cacheKey);
        if (cachedImage) {
            console.log(`Serving cached sticker for: ${cacheKey}`);
            return NextResponse.json({ image: cachedImage, type: "image", cached: true });
        }

        // 2. Build a character-focused visual prompt
        // Use Name + Source to leverage model knowledge
        let subject = characterName;
        if (characterSource) {
            subject = `${characterName} from ${characterSource}`;
        }

        const visualTraits: string[] = [];
        if (characterTags.length > 0) visualTraits.push(characterTags.join(", "));
        if (characterPersonality) visualTraits.push(characterPersonality);

        const fullPrompt = `(best quality, masterpiece), chibi sticker of ${subject}.
Action: ${stickerPrompt}.
Style: cute chibi, flat vector color, thick white outline, sticker art, expressive, simple shading.
CRITICAL DETAILS:
- MUST look exactly like ${characterName} from ${characterSource || "their original design"}.
- Use official design, hair, and eyes.
- Single character, white background, isolated.
- Traits: ${visualTraits.join(", ")}.
Negative: generic face, wrong hairstyle, different character, text, cropping, worst quality, low quality, glitch, deformed, mutated, ugly, bad anatomy, complexity, realistic, photorealistic.`;

        console.log(`Generating sticker for: ${stickerPrompt} using xAI grok-2-image...`);

        // STRICTLY xAI Grok-2 for image generation
        const response = await fetch(XAI_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${XAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "grok-2-image",
                prompt: fullPrompt,
                n: 1,
                size: "1024x1024",
                response_format: "b64_json"
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`xAI API Error (${response.status}):`, errorText);

            if (response.status === 402 || response.status === 429 || response.status === 403) {
                // Return specific error for frontend to handle (display specific icon/message)
                return NextResponse.json({ error: "quota_exceeded", message: "xAI API Access Denied or Quota Exceeded" }, { status: 402 });
            }

            throw new Error(`xAI Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        let b64 = data.data?.[0]?.b64_json;
        let imageUrl = data.data?.[0]?.url;

        // If xAI returns a URL but no b64, fetch it manually
        if (imageUrl && !b64) {
            console.log("xAI returned URL, fetching content...");
            const imgRes = await fetch(imageUrl);
            const arrayBuffer = await imgRes.arrayBuffer();
            b64 = Buffer.from(arrayBuffer).toString("base64");
        }

        if (b64) {
            console.log("xAI Sticker generation successful.");
            const dataUrl = `data:image/png;base64,${b64}`;
            saveToCache(cacheKey, dataUrl);
            return NextResponse.json({ image: dataUrl, type: "image" });
        }

        throw new Error("xAI returned no image data");

    } catch (error) {
        console.error("Sticker API Exception:", error);
        return NextResponse.json({ error: "internal_error", details: String(error) }, { status: 500 });
    }
}

// Fallback: generate SVG sticker using text model
async function generateSvgFallback(prompt: string) {
    try {
        // Use gemini-1.5-flash (standard) instead of 2.5
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;


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
