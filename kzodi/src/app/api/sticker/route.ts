import { NextRequest, NextResponse } from "next/server";
import { Buffer } from "buffer";
import sharp from "sharp";
import { valkey } from "@/lib/redis";
import { query } from "@/lib/db";
import { auth } from "@/auth";

const FIREWORKS_API_KEY = process.env.FIREWORKS_API_KEY || "";

async function getFromCache(key: string): Promise<string | null> {
    try {
        const cached = await valkey.get(`sticker_v2:${key}`);
        if (cached) return cached;
    } catch (e) {
        console.error("Valkey cache read error:", e);
    }
    return null;
}

async function saveToCache(key: string, dataUrl: string, userId?: string, characterName?: string, prompt?: string) {
    try {
        // Save to Redis cache for fast retrieval (expire in 7 days or keep forever)
        await valkey.set(`sticker_v2:${key}`, dataUrl);

        // Save to PostgreSQL if user is logged in
        if (userId && characterName && prompt) {
            await query(
                `INSERT INTO user_stickers (user_id, character_name, prompt, image_url)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (user_id, character_name, prompt) DO UPDATE SET image_url = EXCLUDED.image_url`,
                [userId, characterName, prompt, dataUrl]
            );
        }
    } catch (e) {
        console.error("Valkey/Postgres cache write error:", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        const userId = session?.user?.id;

        const body = await request.json();
        const stickerPrompt = body.prompt || "";
        const characterName = body.characterName || "Character";
        const characterSource = body.characterSource || "";
        const characterTags = body.characterTags || [];
        const characterPersonality = body.characterPersonality || "";

        if (!stickerPrompt) {
            return NextResponse.json({ error: "No prompt provided" }, { status: 400 });
        }

        // Cache Check
        const cleanPrompt = stickerPrompt.trim().toLowerCase();
        const cleanChar = characterName.trim().toLowerCase();

        // Simplified deterministic key (name + prompt) prevents cache misses on trait re-ordering
        const cacheKey = `${cleanChar}-${cleanPrompt}`;

        const cachedImage = await getFromCache(cacheKey);
        if (cachedImage) {
            console.log(`Serving cached sticker for: ${cacheKey}`);
            return NextResponse.json({ image: cachedImage, type: "image", cached: true });
        }

        // Construct Prompt
        let subject = characterName;
        if (characterSource) {
            subject = `${characterName} from ${characterSource}`;
        }
        const visualTraits = [...(characterTags || []), characterPersonality].filter(Boolean).join(", ");

        // Enforce PURE WHITE background so the frontend can chroma-key it perfectly!
        const fullPrompt = `(best quality, masterpiece), solo chibi sticker of ${subject}. Action/Emotion: ${stickerPrompt}. Style: cute chibi, flat vector color, thick white outline, sticker design. Traits: ${visualTraits}. Background: PURE SOLID WHITE BACKGROUND. Negative prompt: text, words, watermark, transparent background, colored background, gradient background, extra characters.`;
        console.log(`Generating sticker for: ${stickerPrompt} using Fireworks AI...`);

        let imageData = "";

        // ─── STEP 1: Try Primary (xAI: grok-imagine-image) ─────────────
        try {
            console.log(`Generating sticker for: ${stickerPrompt} using xAI (Primary)...`);
            const xaiResponse = await fetch("https://api.x.ai/v1/images/generations", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.XAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "grok-imagine-image",
                    prompt: fullPrompt,
                    n: 1,
                    aspect_ratio: "auto",
                    resolution: "1k"
                }),
                signal: AbortSignal.timeout(45000) // 45s timeout for image generation
            });

            if (!xaiResponse.ok) {
                const errText = await xaiResponse.text();
                throw new Error(`xAI error: ${xaiResponse.status} ${errText}`);
            }

            const xaiResult = await xaiResponse.json();
            const imgItem = xaiResult.data?.[0];

            if (imgItem?.b64_json) {
                imageData = imgItem.b64_json;
                console.log("xAI image generation successful (base64).");
            } else if (imgItem?.url) {
                // xAI returned a URL instead of base64: download it
                console.log("xAI returned URL, downloading...");
                const dlRes = await fetch(imgItem.url);
                const dlBuf = await dlRes.arrayBuffer();
                imageData = Buffer.from(dlBuf).toString("base64");
                console.log("xAI image downloaded successfully.");
            } else {
                throw new Error("xAI returned successful response but no image data.");
            }
        } catch (xaiError) {
            console.warn(`xAI primary generation failed:`, xaiError);
            console.log("Falling back to Fireworks AI (flux-kontext-pro)...");

            // ─── STEP 2: Fallback to Fireworks AI (Async Workflow) ──────────
            const workflowsUrl = "https://api.fireworks.ai/inference/v1/workflows/accounts/fireworks/models/flux-kontext-pro";

            let submitResponse;
            let submitRetries = 0;
            const maxRetries = 5;

            while (submitRetries <= maxRetries) {
                if (request.signal.aborted) {
                    return NextResponse.json({ error: "aborted" }, { status: 499 });
                }

                submitResponse = await fetch(workflowsUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "Authorization": `Bearer ${FIREWORKS_API_KEY}`
                    },
                    body: JSON.stringify({ prompt: fullPrompt }),
                    signal: AbortSignal.timeout(15000)
                }).catch(e => {
                    console.error("Fireworks Fetch Error:", e);
                    return null;
                });

                if (!submitResponse) {
                    submitRetries++;
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    continue;
                }

                if (submitResponse.status === 429) {
                    submitRetries++;
                    const waitTime = 2000 * Math.pow(1.5, submitRetries) + Math.random() * 1000;
                    console.log(`Fireworks API Rate Limit. Retrying in ${Math.round(waitTime / 1000)}s...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }
                break;
            }

            if (!submitResponse || !submitResponse.ok) {
                const errText = submitResponse ? await submitResponse.text() : "No response after retries";
                throw new Error(`Fireworks Submit Error: ${submitResponse?.status} ${errText}`);
            }

            const submitResult = await submitResponse.json();
            const requestId = submitResult.id || submitResult.request_id;

            if (!requestId) throw new Error("No request ID returned from Fireworks AI");

            console.log(`Fireworks Request ID: ${requestId}`);

            const resultEndpoint = `${workflowsUrl}/get_result`;

            for (let attempts = 0; attempts < 60; attempts++) {
                if (request.signal.aborted) return NextResponse.json({ error: "aborted" }, { status: 499 });

                await new Promise(resolve => setTimeout(resolve, 3000 + (attempts > 5 ? 2000 : 0)));

                let pollResponse;
                try {
                    pollResponse = await fetch(resultEndpoint, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json",
                            "Authorization": `Bearer ${FIREWORKS_API_KEY}`
                        },
                        body: JSON.stringify({ id: requestId }),
                        signal: AbortSignal.timeout(10000)
                    });
                } catch (e) {
                    console.warn("Poll fetch error (network):", e);
                    continue;
                }

                if (!pollResponse.ok) {
                    if (pollResponse.status === 429) {
                        const waitTime = 5000 + Math.random() * 2000;
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        continue;
                    }
                    continue;
                }

                const pollResult = await pollResponse.json();
                const status = pollResult.status || "UNKNOWN";
                console.log(`Poll status: ${status} (Attempt ${attempts + 1})`);

                if (['Ready', 'Complete', 'Finished', 'COMPLETED', 'SUCCEEDED'].includes(status)) {
                    const sample = pollResult.result?.sample || pollResult.output?.sample;
                    if (sample) {
                        if (sample.startsWith("http")) {
                            const imgRes = await fetch(sample);
                            const buf = await imgRes.arrayBuffer();
                            imageData = Buffer.from(buf).toString("base64");
                        } else {
                            imageData = sample;
                        }
                    }
                    break;
                }

                if (['Failed', 'Error', 'FAILED'].includes(status)) {
                    throw new Error(`Generation failed: ${pollResult.details || JSON.stringify(pollResult)}`);
                }
            }
        } // End of Fallback Logic

        if (imageData) {
            const buf = Buffer.from(imageData, "base64");

            // Relying on Flux zero-background Prompting + sharp crop/resize.
            const processed = await sharp(buf)
                .trim()
                .resize(150, 150, { fit: 'inside' })
                .toFormat("png")
                .toBuffer();

            const dataUrl = `data:image/png;base64,${processed.toString("base64")}`;
            saveToCache(cacheKey, dataUrl, userId, characterName, stickerPrompt);
            return NextResponse.json({ image: dataUrl, type: "image" });
        }

        throw new Error("Timed out waiting for image generation");

    } catch (error) {
        console.error("Sticker API Exception:", error);
        return NextResponse.json({ error: "internal_error", details: String(error) }, { status: 500 });
    }
}
