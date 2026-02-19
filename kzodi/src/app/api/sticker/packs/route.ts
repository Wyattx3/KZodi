import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getInitialPacks, generateDailyPack, type StickerPackData } from "@/lib/stickerPacks";

const DB_PATH = path.join(process.cwd(), "src", "data", "sticker_db.json");

// Ensure data directory exists
async function ensureDbExists() {
    try {
        await fs.access(DB_PATH);
    } catch {
        // Create initial packs if file doesn't exist
        const initial = getInitialPacks();
        const dir = path.dirname(DB_PATH);
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch { }
        await fs.writeFile(DB_PATH, JSON.stringify(initial, null, 2));
    }
}

export async function GET(req: NextRequest) {
    await ensureDbExists();

    try {
        const fileData = await fs.readFile(DB_PATH, "utf-8");
        let packs: StickerPackData[] = JSON.parse(fileData);

        // Check date logic - if no pack for today, generate one
        const today = new Date().toISOString().split("T")[0];
        const hasPackForToday = packs.some(p => p.date === today && p.id.startsWith("daily-"));

        if (!hasPackForToday) {
            // Generate a new pack
            // Use time-seeded random pack
            const dailyPack = generateDailyPack(packs.length);
            packs.unshift(dailyPack); // Add to top

            // Limit total packs if we want (e.g. keep last 20)
            if (packs.length > 20) packs = packs.slice(0, 20);

            // Save back
            await fs.writeFile(DB_PATH, JSON.stringify(packs, null, 2));
        }

        return NextResponse.json(packs);
    } catch (error) {
        console.error("Failed to fetch sticker packs", error);
        return NextResponse.json({ error: "Failed to load packs" }, { status: 500 });
    }
}
