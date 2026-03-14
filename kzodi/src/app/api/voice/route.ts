import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * POST /api/voice
 * Accepts audio file (FormData) and returns transcribed text using Groq Whisper.
 */
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

        // Get the best available Groq API key
        const apiKey = process.env.GROQ_API_KEY || process.env.GROQ_API_KEY_4 || process.env.GROQ_API_KEY_5;
        if (!apiKey) {
            return NextResponse.json({ error: "Groq API key not configured" }, { status: 500 });
        }

        // Forward to Groq Whisper API
        const groqFormData = new FormData();
        groqFormData.append("file", audioFile, audioFile.name || "audio.webm");
        groqFormData.append("model", "whisper-large-v3");
        groqFormData.append("response_format", "json");

        const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
            },
            body: groqFormData,
        });

        if (!groqRes.ok) {
            const errText = await groqRes.text();
            console.error(`[Voice] Groq Whisper error ${groqRes.status}:`, errText);
            return NextResponse.json(
                { error: "Transcription failed", details: errText },
                { status: groqRes.status }
            );
        }

        const result = await groqRes.json();
        const transcribedText = result.text || "";

        console.log(`[Voice] Transcribed: "${transcribedText.slice(0, 100)}..." (${transcribedText.length} chars)`);

        return NextResponse.json({ text: transcribedText });
    } catch (error) {
        console.error("[Voice] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
