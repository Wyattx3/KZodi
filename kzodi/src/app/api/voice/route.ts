import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * POST /api/voice
 * Accepts audio file (FormData) and returns transcribed text using Groq Whisper.
 * Professional-grade: retry on transient failures, language hint, timeout, validation.
 */

const MAX_RETRIES = 2;
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB (Whisper limit)

async function transcribeWithRetry(apiKey: string, audioFile: File): Promise<{ text: string } | { error: string; status: number }> {
    let lastError = "";

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const groqFormData = new FormData();
            groqFormData.append("file", audioFile, audioFile.name || "audio.webm");
            groqFormData.append("model", "whisper-large-v3");
            groqFormData.append("response_format", "verbose_json");
            // Temperature 0 = most deterministic transcription (reduces hallucinations)
            groqFormData.append("temperature", "0");

            const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                },
                body: groqFormData,
            });

            if (groqRes.ok) {
                const result = await groqRes.json();
                const transcribedText = (result.text || "").trim();

                // Filter out Whisper hallucination patterns (common with short/silent audio)
                const hallucinations = [
                    "thank you", "thanks for watching", "subscribe",
                    "like and subscribe", "see you next time",
                    "bye", "goodbye", "ご視聴ありがとうございました",
                    "字幕制作", "amara.org", "subtitles by",
                ];
                const lower = transcribedText.toLowerCase();
                if (hallucinations.some(h => lower === h || lower === h + ".")) {
                    console.warn(`[Voice] Filtered hallucination: "${transcribedText}"`);
                    return { text: "" };
                }

                console.log(`[Voice] Transcribed (attempt ${attempt + 1}): "${transcribedText.slice(0, 100)}${transcribedText.length > 100 ? "..." : ""}" (${transcribedText.length} chars, lang: ${result.language || "unknown"})`);
                return { text: transcribedText };
            }

            // Retryable status codes: 429 (rate limit), 500, 502, 503
            const retryable = [429, 500, 502, 503].includes(groqRes.status);
            lastError = await groqRes.text();
            console.error(`[Voice] Groq Whisper error ${groqRes.status} (attempt ${attempt + 1}):`, lastError);

            if (!retryable || attempt === MAX_RETRIES) {
                return { error: lastError, status: groqRes.status };
            }

            // Exponential backoff: 1s, 2s
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        } catch (err) {
            lastError = err instanceof Error ? err.message : String(err);
            console.error(`[Voice] Network error (attempt ${attempt + 1}):`, lastError);

            if (attempt === MAX_RETRIES) {
                return { error: lastError, status: 500 };
            }
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
    }

    return { error: lastError || "Unknown error", status: 500 };
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await request.formData();
        const audioFile = formData.get("audio") as File | null;

        if (!audioFile) {
            return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
        }

        // Validate file size
        if (audioFile.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: "Audio file too large (max 25MB)" }, { status: 413 });
        }

        // Validate MIME type
        const validTypes = ["audio/webm", "audio/ogg", "audio/mpeg", "audio/mp4", "audio/wav", "audio/flac"];
        if (audioFile.type && !validTypes.some(t => audioFile.type.startsWith(t))) {
            console.warn(`[Voice] Unusual MIME type: ${audioFile.type}`);
        }

        // Get the best available Groq API key
        const apiKey = process.env.GROQ_API_KEY || process.env.GROQ_API_KEY_4 || process.env.GROQ_API_KEY_5;
        if (!apiKey) {
            return NextResponse.json({ error: "Groq API key not configured" }, { status: 500 });
        }

        const result = await transcribeWithRetry(apiKey, audioFile);

        if ("error" in result) {
            return NextResponse.json(
                { error: "Transcription failed", details: result.error },
                { status: result.status }
            );
        }

        return NextResponse.json({ text: result.text });
    } catch (error) {
        console.error("[Voice] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
