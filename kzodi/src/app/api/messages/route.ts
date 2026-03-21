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
        const { conversationId, messages, conversationType, conversationMetadata } = body;

        if (!conversationId) {
            return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
        }
        
        const hasMessages = Array.isArray(messages);
        if (!hasMessages && !conversationMetadata) {
            return NextResponse.json({ error: "No payload data" }, { status: 400 });
        }

        await ensureSchema();

        if (hasMessages) {
            // Insert messages into PostgreSQL, scoped to this user
            for (const msg of messages) {
                await query(
                    `INSERT INTO messages 
                    (id, conversation_id, user_id, role, content, timestamp, status, reply_to_id, reactions, attachment, sender_id, sender_name, conversation_type)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                    ON CONFLICT (id) DO UPDATE SET 
                    status = CASE 
                        WHEN messages.status = 'seen' THEN 'seen'
                        ELSE EXCLUDED.status
                    END, 
                    reactions = EXCLUDED.reactions,
                    conversation_type = COALESCE(NULLIF(EXCLUDED.conversation_type, 'personal'), messages.conversation_type, EXCLUDED.conversation_type)`,
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
                        msg.senderName || null,
                        conversationType || "personal"
                    ]
                );
            }
        }

        // ── Persist conversation metadata ──────────────────────────────
        // When the caller supplies groupName, groupImage, groupMemberIds,
        // worldData or storyData, upsert into conversation_metadata so the
        // data survives reload and cross-device access.
        if (conversationMetadata && typeof conversationMetadata === "object") {
            const { groupName, groupImage, groupMemberIds, worldData, storyData } = conversationMetadata;
            await query(
                `INSERT INTO conversation_metadata
                 (conversation_id, user_id, group_name, group_image, group_member_ids, world_data, story_data, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                 ON CONFLICT (conversation_id, user_id) DO UPDATE SET
                 group_name = COALESCE(EXCLUDED.group_name, conversation_metadata.group_name),
                 group_image = COALESCE(EXCLUDED.group_image, conversation_metadata.group_image),
                 group_member_ids = COALESCE(EXCLUDED.group_member_ids, conversation_metadata.group_member_ids),
                 world_data = COALESCE(EXCLUDED.world_data, conversation_metadata.world_data),
                 story_data = COALESCE(EXCLUDED.story_data, conversation_metadata.story_data),
                 updated_at = NOW()`,
                [
                    conversationId,
                    userId,
                    groupName || null,
                    groupImage || null,
                    groupMemberIds ? JSON.stringify(groupMemberIds) : null,
                    worldData ? JSON.stringify(worldData) : null,
                    storyData ? JSON.stringify(storyData) : null,
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

        // Invalidate cache in Valkey — both the per-conversation messages cache
        // and the user-level conversations list cache (convos:userId) so that
        // startup reconciliation always reads a fresh snapshot from the DB.
        try {
            await valkey.del(`messages:${userId}:${conversationId}`);
            await valkey.del(`convos:${userId}`);
        } catch (redisErr) {
            console.warn("Valkey cache deletion failed:", redisErr);
        }

        return NextResponse.json({ success: true, count: hasMessages ? messages.length : 0 });
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
        const { conversationId, deleteConversation: isFullDelete } = body;

        if (!conversationId) {
            return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });
        }

        await ensureSchema();

        // Delete all messages for this user + conversation from PostgreSQL
        await query(
            `DELETE FROM messages WHERE conversation_id = $1 AND user_id = $2`,
            [conversationId, userId]
        );

        // When the client signals a true delete (not just clear-chat), also
        // remove the conversation_metadata row so the conversation cannot be
        // resurrected on next hydration/reconciliation.
        if (isFullDelete) {
            await query(
                `DELETE FROM conversation_metadata WHERE conversation_id = $1 AND user_id = $2`,
                [conversationId, userId]
            );
        }

        // Recalculate accurately
        await query(`
            UPDATE characters 
            SET 
                msg_count = (SELECT COUNT(id) FROM messages WHERE conversation_id = $1),
                chatter_count = (SELECT COUNT(DISTINCT user_id) FROM messages WHERE conversation_id = $1 AND role = 'user')
            WHERE id = $1
        `, [conversationId]);

        // Invalidate Valkey cache — both the per-conversation messages cache
        // and the conversations list cache so reconciliation cannot use a stale snapshot.
        try {
            await valkey.del(`messages:${userId}:${conversationId}`);
            await valkey.del(`convos:${userId}`);
        } catch (redisErr) {
            console.warn("Valkey cache deletion failed:", redisErr);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting messages:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
