import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { pool, ensureSchema } from "@/lib/db";
import valkey from "@/lib/redis";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ nickname: "", gender: "", birthday: "", timezone: "" }, { status: 200 });
        }

        const userId = session.user.id;
        const cacheKey = `user:${userId}:profile`;

        // 1. Try Redis cache first
        try {
            const cachedProfile = await valkey.get(cacheKey);
            if (cachedProfile) {
                return NextResponse.json(JSON.parse(cachedProfile), { status: 200 });
            }
        } catch (e) {
            console.warn("[API Profile] Valkey getter error:", e);
        }

        // 2. Fallback to Database
        await ensureSchema();
        const res = await pool.query("SELECT nickname, gender, birthday, timezone FROM users WHERE id = $1 LIMIT 1", [userId]);
        const dbProfile = res.rows[0] || { nickname: "", gender: "", birthday: "", timezone: "" };
        
        // Format birthday if exists
        if (dbProfile.birthday instanceof Date) {
            const offset = dbProfile.birthday.getTimezoneOffset();
            dbProfile.birthday = new Date(dbProfile.birthday.getTime() - (offset*60*1000)).toISOString().split('T')[0];
        }

        // 3. Populate cache
        try {
            await valkey.set(cacheKey, JSON.stringify(dbProfile), "EX", 60 * 60 * 24 * 7); // Cache for 7 days
        } catch (e) {
            console.warn("[API Profile] Valkey setter error:", e);
        }

        return NextResponse.json(dbProfile, { status: 200 });
    } catch (error) {
        console.error("[API Profile] GET error:", error);
        return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { nickname, gender, birthday, timezone } = body;

        const userId = session.user.id;

        // 1. Update DB
        await ensureSchema();
        await pool.query(
            "UPDATE users SET nickname = $1, gender = $2, birthday = $3, timezone = $4 WHERE id = $5",
            [nickname || null, gender || null, birthday || null, timezone || null, userId]
        );

        // 2. Update Redis
        const cacheKey = `user:${userId}:profile`;
        const profileObj = { nickname, gender, birthday, timezone };
        try {
            await valkey.set(cacheKey, JSON.stringify(profileObj), "EX", 60 * 60 * 24 * 7); // Cache for 7 days
        } catch (e) {
            console.warn("[API Profile] Valkey setter error:", e);
        }

        return NextResponse.json({ success: true, profile: profileObj }, { status: 200 });
    } catch (error) {
        console.error("[API Profile] POST error:", error);
        return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }
}
