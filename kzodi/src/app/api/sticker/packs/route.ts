import { NextRequest, NextResponse } from "next/server";
import { valkey } from "@/lib/redis";
import { getInitialPacks, generateDailyPack, type StickerPackData } from "@/lib/stickerPacks";

export async function GET(req: NextRequest) {
    try {
        const fileData = await valkey.get("kb_sticker_packs");
        let packs: StickerPackData[] = fileData ? JSON.parse(fileData) : getInitialPacks();

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
            await valkey.set("kb_sticker_packs", JSON.stringify(packs));
            return NextResponse.json(packs);
        }

        // Return all available packs, limited to newest 20.
        return NextResponse.json(packs);
    } catch (error) {
        console.error("Failed to fetch sticker packs", error);
        return NextResponse.json({ error: "Failed to load packs" }, { status: 500 });
    }
}
