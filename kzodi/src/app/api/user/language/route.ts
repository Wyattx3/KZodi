import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { pool, ensureSchema } from "@/lib/db";
import valkey from "@/lib/redis";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ language: "English (Default)" }, { status: 200 });
        }

        const userId = session.user.id;
        const cacheKey = `user:${userId}:language`;

        // 1. Try Redis cache first
        try {
            const cachedLang = await valkey.get(cacheKey);
            if (cachedLang) {
                return NextResponse.json({ language: cachedLang }, { status: 200 });
            }
        } catch (e) {
            console.warn("[API Language] Valkey getter error:", e);
        }

        // 2. Fallback to Database
        await ensureSchema();
        const res = await pool.query("SELECT language FROM users WHERE id = $1 LIMIT 1", [userId]);
        const dbLang = res.rows[0]?.language || "English (Default)";

        // 3. Populate cache
        try {
            await valkey.set(cacheKey, dbLang, "EX", 60 * 60 * 24 * 7); // Cache for 7 days
        } catch (e) {
            console.warn("[API Language] Valkey setter error:", e);
        }

        return NextResponse.json({ language: dbLang }, { status: 200 });
    } catch (error) {
        console.error("[API Language] GET error:", error);
        return NextResponse.json({ error: "Failed to fetch language" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const language = body.language;

        if (!language || typeof language !== "string") {
            return NextResponse.json({ error: "Invalid language payload" }, { status: 400 });
        }

        const userId = session.user.id;

        // 1. Update DB
        await ensureSchema();
        await pool.query("UPDATE users SET language = $1 WHERE id = $2", [language, userId]);

        // 2. Update Redis
        const cacheKey = `user:${userId}:language`;
        try {
            await valkey.set(cacheKey, language, "EX", 60 * 60 * 24 * 7); // Cache for 7 days
        } catch (e) {
            console.warn("[API Language] Valkey setter error:", e);
        }

        return NextResponse.json({ success: true, language }, { status: 200 });
    } catch (error) {
        console.error("[API Language] POST error:", error);
        return NextResponse.json({ error: "Failed to update language" }, { status: 500 });
    }
}
