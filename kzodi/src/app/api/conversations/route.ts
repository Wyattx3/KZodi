import { NextResponse } from "next/server";
import { query, ensureSchema } from "@/lib/db";
import { auth } from "@/auth";
import valkey from "@/lib/redis";

const CONV_CACHE_TTL = 30; // seconds

/**
 * GET /api/conversations
 * Returns a list of all conversation IDs and metadata for the current user.
 * Used to populate the sidebar conversation list from the database.
 */
export async function GET() {
    try {
        const session = await auth();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userId = (session?.user as any)?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // ─── Redis Cache Layer ─────────────────────────────────────────
        const cacheKey = `convos:${userId}`;
        try {
            const cached = await valkey.get(cacheKey);
            if (cached) {
                return NextResponse.json(JSON.parse(cached));
            }
        } catch (e) { /* cache miss, continue to DB */ }

        await ensureSchema();

        // Get distinct conversations for this user with their latest message info
        const dbRes = await query(
            `SELECT 
                m.conversation_id,
                MAX(m.content) FILTER (WHERE m.timestamp = sub.max_ts) as last_message,
                MAX(m.timestamp) as last_timestamp,
                COUNT(*) as message_count,
                c.name as char_name,
                c.image as char_image,
                c.tag as char_tag
            FROM messages m
            INNER JOIN (
                SELECT conversation_id as cid, MAX(timestamp) as max_ts
                FROM messages
                WHERE user_id = $1
                GROUP BY conversation_id
            ) sub ON m.conversation_id = sub.cid AND m.user_id = $1
            LEFT JOIN characters c ON c.id = m.conversation_id
            GROUP BY m.conversation_id, c.name, c.image, c.tag
            ORDER BY MAX(m.timestamp) DESC`,
            [userId]
        );

        const conversations = dbRes.rows.map((row: any) => ({
            characterId: row.conversation_id,
            lastMessage: row.last_message || "",
            lastTimestamp: Number(row.last_timestamp),
            messageCount: Number(row.message_count),
            character: row.char_name ? {
                id: row.conversation_id,
                name: row.char_name,
                image: row.char_image,
                tag: row.char_tag
            } : null
        }));

        const responsePayload = { conversations };

        // Cache (non-blocking)
        valkey.set(cacheKey, JSON.stringify(responsePayload), 'EX', CONV_CACHE_TTL).catch(() => {});

        return NextResponse.json(responsePayload);
    } catch (error) {
        console.error("Error fetching conversations:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
