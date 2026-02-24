import { NextRequest, NextResponse } from "next/server";
import { Buffer } from "buffer";
import sharp from "sharp";
import { valkey } from "@/lib/redis";
import { query } from "@/lib/db";
import { auth } from "@/auth";

const FIREWORKS_API_KEY = process.env.FIREWORKS_API_KEY || "";

async function getFromCache(key: string): Promise<string | null> {
    try {
        const cached = await valkey.get(`sticker:${key}`);
        if (cached) return cached;
    } catch (e) {
        console.error("Valkey cache read error:", e);
    }
    return null;
}

async function saveToCache(key: string, dataUrl: string, userId?: string, characterName?: string, prompt?: string) {
    try {
        // Save to Redis cache for fast retrieval (expire in 7 days or keep forever)
        await valkey.set(`sticker:${key}`, dataUrl);

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

        // Step 1: Submit Generation Request (async workflow)
        const workflowsUrl = "https://api.fireworks.ai/inference/v1/workflows/accounts/fireworks/models/flux-kontext-max";

        // Note: Removing response_format as it might cause 400s if not supported by this workflow endpoint
        let submitResponse;
        let submitRetries = 0;
        const maxRetries = 12; // Increase max retries

        while (submitRetries <= maxRetries) {
            if (request.signal.aborted) {
                console.log("Client disconnected before Fireworks request submit. Canceling.");
                return NextResponse.json({ error: "aborted" }, { status: 499 });
            }

            submitResponse = await fetch(workflowsUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${FIREWORKS_API_KEY}`
                },
                body: JSON.stringify({
                    prompt: fullPrompt,
                }),
                signal: AbortSignal.timeout(15000) // Prevent hanging tcp
            }).catch(e => {
                console.error("Fetch Error:", e);
                return null;
            });

            if (!submitResponse) {
                submitRetries++;
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue;
            }

            if (submitResponse.status === 429) {
                submitRetries++;
                const waitTime = 3000 * Math.pow(1.5, submitRetries) + Math.random() * 2000;
                console.log(`Fireworks API Rate Limit (Generation queued). Retrying in ${Math.round(waitTime / 1000)}s... (Attempt ${submitRetries}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }
            break;
        }

        if (!submitResponse || !submitResponse.ok) {
            const errText = submitResponse ? await submitResponse.text() : "No response after retries";
            console.error(`Fireworks Submit Error: ${submitResponse?.status} ${errText}`);
            throw new Error(`Fireworks Submit Error: ${submitResponse?.status} ${errText}`);
        }

        const submitResult = await submitResponse.json();
        const requestId = submitResult.id || submitResult.request_id;

        if (!requestId) {
            console.error("Fireworks response missing ID:", submitResult);
            throw new Error("No request ID returned from Fireworks AI");
        }

        console.log(`Fireworks Request ID: ${requestId}`);

        // Step 2: Poll for Result
        const resultEndpoint = `${workflowsUrl}/get_result`;
        let imageData = "";

        // Poll for up to several minutes to survive 429 backoffs
        for (let attempts = 0; attempts < 100; attempts++) {
            if (request.signal.aborted) {
                console.log(`Client disconnected during polling (${requestId}). Canceling.`);
                return NextResponse.json({ error: "aborted" }, { status: 499 });
            }

            await new Promise(resolve => setTimeout(resolve, 5000 + (attempts > 5 ? 2000 : 0))); // Wait 5s between polls, 7s after 5 tries

            if (request.signal.aborted) return NextResponse.json({ error: "aborted" }, { status: 499 });

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
                // If 429, wait longer and retry with exponential backoff
                if (pollResponse.status === 429) {
                    const waitTime = 8000 + (attempts * 1000) + Math.random() * 2000;
                    console.log(`Fireworks AI is busy generating. Retrying in ${Math.round(waitTime / 1000)}s...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }
                const errText = await pollResponse.text();
                // 404 might mean task not ready yet? Or truly not found?
                // Typically we should just continue if it's transient, but log it.
                console.warn(`Poll failed: ${pollResponse.status} - ${errText}`);
                continue;
            }

            const pollResult = await pollResponse.json();
            // Check for success statuses across multiple possible field names
            const status = pollResult.status || "UNKNOWN";
            console.log(`Poll status: ${status} (Attempt ${attempts + 1})`);

            if (['Ready', 'Complete', 'Finished', 'COMPLETED', 'SUCCEEDED'].includes(status)) {
                // Result structure varies. Usually 'result.sample' (URL) or 'output.sample'
                const sample = pollResult.result?.sample || pollResult.output?.sample;

                if (sample) {
                    if (sample.startsWith("http")) {
                        console.log("Downloading image from URL...");
                        const imgRes = await fetch(sample);
                        const buf = await imgRes.arrayBuffer();
                        imageData = Buffer.from(buf).toString("base64");
                    } else {
                        imageData = sample;
                    }
                } else {
                    console.error("Completed but no sample found:", JSON.stringify(pollResult));
                }
                break;
            }

            if (['Failed', 'Error', 'FAILED'].includes(status)) {
                throw new Error(`Generation failed: ${pollResult.details || JSON.stringify(pollResult)}`);
            }
        }

        if (imageData) {
            const buf = Buffer.from(imageData, "base64");

            // Background removal library crashed Next.js. 
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

        throw new Error("Timed out waiting for Fireworks AI generation");

    } catch (error) {
        console.error("Sticker API Exception:", error);
        return NextResponse.json({ error: "internal_error", details: String(error) }, { status: 500 });
    }
}
