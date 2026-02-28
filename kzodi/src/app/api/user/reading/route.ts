import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const body = await req.json();
        const { zodiac_sign, mbti_type } = body;

        // 1. First, we check if the user already has a reading_results entry
        //    If they do, we delete it to ensure a clean slate.
        await query(
            `DELETE FROM reading_results WHERE user_id = $1`,
            [userId]
        );

        // 2. Insert the fresh forced-data profile
        //    We set ai_response to empty so the AI knows to generate new context next time
        await query(
            `INSERT INTO reading_results (
                id, user_id, user_name, birthday, birth_time, birth_location,
                zodiac_sign, mbti_type, reading_focus, ai_response, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
                crypto.randomUUID(),
                userId,
                session.user.name || "User",
                "Updated Manually", // Placeholder
                "Updated Manually", // Placeholder
                "Updated Manually", // Placeholder
                zodiac_sign || null,
                mbti_type || null,
                "Manual Override", // Reading Focus
                JSON.stringify({}), // Clear old AI contexts completely 
                "completed" // Mark as completed so the brain.ts picks it up
            ]
        );

        return NextResponse.json({ success: true, message: "Profile successfully overwritten." });
    } catch (error) {
        console.error("[POST /api/user/reading] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
