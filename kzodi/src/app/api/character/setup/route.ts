import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import os from "os";
import { extractTextFromPDF, extractTextFromUrl, analyzeCharacterSource, indexCharacterData, extractTextFromEPUB } from "@/lib/ai-setup";



export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const type = formData.get("type") as string;
        const name = formData.get("name") as string;

        let textContent = "";

        if (type === "file") {
            const file = formData.get("file") as File;
            if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

            const buffer = Buffer.from(await file.arrayBuffer());
            const filename = file.name.toLowerCase();

            if (filename.endsWith(".pdf")) {
                textContent = await extractTextFromPDF(buffer);
            } else if (filename.endsWith(".txt")) {
                textContent = buffer.toString("utf-8");
            } else if (filename.endsWith(".epub")) {
                const tempPath = path.join(os.tmpdir(), `temp-${uuidv4()}.epub`);
                fs.writeFileSync(tempPath, buffer);
                try {
                    textContent = await extractTextFromEPUB(tempPath);
                } finally {
                    try { fs.unlinkSync(tempPath); } catch (e) { }
                }
            } else {
                return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
            }

        } else if (type === "link") {
            const url = formData.get("url") as string;
            if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });
            textContent = await extractTextFromUrl(url);
        } else {
            return NextResponse.json({ error: "Invalid type" }, { status: 400 });
        }

        if (!textContent || textContent.length < 50) {
            return NextResponse.json({ error: "Extracted text is too short or empty." }, { status: 400 });
        }

        // Generate Character Profile
        const characterData = await analyzeCharacterSource(textContent, name);
        const charId = uuidv4();

        // Index Vector Data (Optional step, don't fail properly if it breaks)
        try {
            await indexCharacterData(charId, textContent, { name: characterData.name, id: charId });
        } catch (idxError) {
            console.error("Indexing failed (non-fatal):", idxError);
        }

        return NextResponse.json({
            success: true,
            data: { ...characterData, id: charId },
            message: "Character setup complete!"
        });

    } catch (error: any) {
        console.error("Auto Setup Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
