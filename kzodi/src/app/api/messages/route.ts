import { NextResponse } from "next/server";
import { query, ensureSchema } from "@/lib/db";
import valkey from "@/lib/redis";
import { auth } from "@/auth";

export async function POST(req: Request) {
    try {
        const session = await auth();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userId = (session?.user as any)?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { conversationId, messages } = body;

        if (!conversationId || !messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
        }

        await ensureSchema();

        // Insert messages into PostgreSQL, scoped to this user
        for (const msg of messages) {
            await query(
                `INSERT INTO messages 
                (id, conversation_id, user_id, role, content, timestamp, status, reply_to_id, reactions, attachment, sender_id, sender_name)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (id) DO UPDATE SET 
                status = CASE 
                    WHEN messages.status = 'seen' THEN 'seen'
                    ELSE EXCLUDED.status
                END, 
                reactions = EXCLUDED.reactions`,
                [
                    msg.id,
                    conversationId,
                    userId,
                    msg.role,
                    msg.content || "",
                    msg.timestamp,
                    msg.status,
                    msg.replyToId || null,
                    msg.reactions ? JSON.stringify(msg.reactions) : null,
                    msg.attachment ? JSON.stringify(msg.attachment) : null,
                    msg.senderId || null,
                    msg.senderName || null
                ]
            );
        }

        // Accurately recalculate the counts based on actual database state
        // This prevents double-counting if the frontend syncs the same message twice (updates instead of inserts)
        await query(`
            UPDATE characters 
            SET 
                msg_count = (SELECT COUNT(id) FROM messages WHERE conversation_id = $1),
                chatter_count = (SELECT COUNT(DISTINCT user_id) FROM messages WHERE conversation_id = $1 AND role = 'user')
            WHERE id = $1
        `, [conversationId]);

        // Invalidate cache in Valkey
        try {
            await valkey.del(`messages:${userId}:${conversationId}`);
        } catch (redisErr) {
            console.warn("Valkey cache deletion failed:", redisErr);
        }

        return NextResponse.json({ success: true, count: messages.length });
    } catch (error) {
        console.error("Error saving messages:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const session = await auth();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userId = (session?.user as any)?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const conversationId = searchParams.get("conversationId");

        if (!conversationId) {
            return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });
        }

        // Always query PostgreSQL directly for fresh data (no cache — real-time sync needs it)
        await ensureSchema();
        const dbRes = await query(
            `SELECT * FROM messages WHERE conversation_id = $1 AND user_id = $2 ORDER BY timestamp ASC`,
            [conversationId, userId]
        );

        // Map DB snake_case column names to camelCase for the frontend
        const messages = dbRes.rows.map((row: any) => ({
            id: row.id,
            role: row.role,
            content: row.content,
            timestamp: Number(row.timestamp),
            status: row.status,
            replyToId: row.reply_to_id,
            reactions: row.reactions,
            attachment: row.attachment,
            senderId: row.sender_id,
            senderName: row.sender_name
        }));

        return NextResponse.json({ messages });
    } catch (error) {
        console.error("Error fetching messages:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await auth();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userId = (session?.user as any)?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { conversationId } = body;

        if (!conversationId) {
            return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });
        }

        await ensureSchema();

        // Delete all messages for this user + conversation from PostgreSQL
        await query(
            `DELETE FROM messages WHERE conversation_id = $1 AND user_id = $2`,
            [conversationId, userId]
        );

        // Recalculate accurately
        await query(`
            UPDATE characters 
            SET 
                msg_count = (SELECT COUNT(id) FROM messages WHERE conversation_id = $1),
                chatter_count = (SELECT COUNT(DISTINCT user_id) FROM messages WHERE conversation_id = $1 AND role = 'user')
            WHERE id = $1
        `, [conversationId]);

        // Invalidate Valkey cache
        try {
            await valkey.del(`messages:${userId}:${conversationId}`);
        } catch (redisErr) {
            console.warn("Valkey cache deletion failed:", redisErr);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting messages:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
