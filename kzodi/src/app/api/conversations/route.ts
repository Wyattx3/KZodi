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
export async function GET(req: Request) {
    try {
        const session = await auth();
        const userId = (session?.user as any)?.id;
        const { searchParams } = new URL(req.url);
        const bypassCache = searchParams.get("fresh") === "1";

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // ─── Redis Cache Layer ─────────────────────────────────────────
        const cacheKey = `convos:${userId}`;
        if (!bypassCache) {
            try {
                const cached = await valkey.get(cacheKey);
                if (cached) {
                    return NextResponse.json(JSON.parse(cached));
                }
            } catch (e) { /* cache miss, continue to DB */ }
        }

        await ensureSchema();

        // Get distinct conversations for this user with their latest message info.
        // Also include zero-message conversations that only exist in conversation_metadata
        // (e.g. newly created world/story chats persisted before the first message).
        const dbRes = await query(
            `SELECT 
                conv_id as conversation_id,
                last_message,
                last_timestamp,
                CASE
                    WHEN cm.story_data IS NOT NULL THEN 'story'
                    WHEN cm.world_data IS NOT NULL THEN 'world'
                    WHEN cm.group_member_ids IS NOT NULL THEN 'group'
                    ELSE COALESCE(combined.conversation_type, 'personal')
                END as conversation_type,
                message_count,
                c.name as char_name,
                c.image as char_image,
                c.tag as char_tag,
                cm.group_name,
                cm.group_image,
                cm.group_member_ids,
                cm.world_data,
                cm.story_data,
                s.user_id as story_creator_id
            FROM (
                -- Conversations that have messages
                SELECT
                    m.conversation_id as conv_id,
                    MAX(m.content) FILTER (WHERE m.timestamp = sub.max_ts) as last_message,
                    MAX(m.timestamp) as last_timestamp,
                    MAX(m.conversation_type) FILTER (WHERE m.timestamp = sub.max_ts) as conversation_type,
                    COUNT(*) as message_count
                FROM messages m
                INNER JOIN (
                    SELECT conversation_id as cid, MAX(timestamp) as max_ts
                    FROM messages
                    WHERE user_id = $1
                    GROUP BY conversation_id
                ) sub ON m.conversation_id = sub.cid AND m.user_id = $1
                GROUP BY m.conversation_id

                UNION ALL

                -- Zero-message conversations that only exist in metadata
                SELECT
                    cm2.conversation_id as conv_id,
                    '' as last_message,
                    EXTRACT(EPOCH FROM cm2.updated_at)::bigint * 1000 as last_timestamp,
                    CASE
                        WHEN cm2.story_data IS NOT NULL THEN 'story'
                        WHEN cm2.world_data IS NOT NULL THEN 'world'
                        WHEN cm2.group_member_ids IS NOT NULL THEN 'group'
                        ELSE 'personal'
                    END as conversation_type,
                    0 as message_count
                FROM conversation_metadata cm2
                WHERE cm2.user_id = $1
                AND cm2.conversation_id NOT IN (
                    SELECT DISTINCT conversation_id FROM messages WHERE user_id = $1
                )
            ) combined
            LEFT JOIN characters c ON c.id = combined.conv_id
            LEFT JOIN conversation_metadata cm ON cm.conversation_id = combined.conv_id AND cm.user_id = $1
            LEFT JOIN stories s ON s.id = combined.conv_id
            ORDER BY last_timestamp DESC`,
            [userId]
        );

        const conversations = dbRes.rows.map((row: any) => ({
            characterId: row.conversation_id,
            lastMessage: row.last_message || "",
            lastTimestamp: Number(row.last_timestamp),
            messageCount: Number(row.message_count),
            conversationType: row.conversation_type || "personal",
            groupName: row.group_name || null,
            groupImage: row.group_image || null,
            groupMemberIds: row.group_member_ids || null,
            worldData: row.world_data || null,
            storyData: row.story_data || null,
            creatorId: row.story_creator_id || null,
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
