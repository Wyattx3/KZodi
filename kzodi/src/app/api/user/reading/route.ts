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

        // 1. First, we check if the user already has a readings entry
        //    If they do, we delete it to ensure a clean slate.
        await query(
            `DELETE FROM readings WHERE user_id = $1`,
            [userId]
        );

        // 2. Insert the fresh forced-data profile Into readings
        //    We set ai_response to empty so the AI knows to generate new context next time
        await query(
            `INSERT INTO readings (
                session_id, birth_chart, ai_response, zodiac_sign, mbti_type, user_id
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                `MANUAL_OVERRIDE_${Date.now()}`,
                JSON.stringify({}),
                JSON.stringify({}),
                zodiac_sign || null,
                mbti_type || null,
                userId
            ]
        );

        return NextResponse.json({ success: true, message: "Profile successfully overwritten." });
    } catch (error) {
        console.error("[POST /api/user/reading] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
