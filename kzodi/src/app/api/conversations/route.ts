import { NextResponse } from "next/server";
import { query, ensureSchema } from "@/lib/db";
import { auth } from "@/auth";

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

        await ensureSchema();

        // Get distinct conversations for this user with their latest message info
        const dbRes = await query(
            `SELECT 
                conversation_id,
                MAX(content) FILTER (WHERE timestamp = sub.max_ts) as last_message,
                MAX(timestamp) as last_timestamp,
                COUNT(*) as message_count
            FROM messages m
            INNER JOIN (
                SELECT conversation_id as cid, MAX(timestamp) as max_ts
                FROM messages
                WHERE user_id = $1
                GROUP BY conversation_id
            ) sub ON m.conversation_id = sub.cid AND m.user_id = $1
            GROUP BY conversation_id
            ORDER BY MAX(timestamp) DESC`,
            [userId]
        );

        const conversations = dbRes.rows.map((row: any) => ({
            characterId: row.conversation_id,
            lastMessage: row.last_message || "",
            lastTimestamp: Number(row.last_timestamp),
            messageCount: Number(row.message_count),
        }));

        return NextResponse.json({ conversations });
    } catch (error) {
        console.error("Error fetching conversations:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
