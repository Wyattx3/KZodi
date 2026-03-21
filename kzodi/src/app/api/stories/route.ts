import { NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { auth } from "@/auth";

export async function GET(req: Request) {
    try {
        await ensureSchema();

        const { searchParams } = new URL(req.url);
        const MAX_LIMIT = 50;
        const DEFAULT_LIMIT = 20;
        let limit = parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10);
        let offset = parseInt(searchParams.get("offset") || "0", 10);
        const search = (searchParams.get("search") || "").trim();

        // Clamp to sane bounds
        if (isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;
        if (limit > MAX_LIMIT) limit = MAX_LIMIT;
        if (isNaN(offset) || offset < 0) offset = 0;

        // Build query with optional search filter
        let query: string;
        let params: (string | number)[];

        if (search) {
            // Case-insensitive search across name, synopsis, and genre
            const pattern = `%${search}%`;
            query = `SELECT *, user_id AS creator_id FROM stories
                     WHERE is_published = true
                       AND (name ILIKE $1 OR synopsis ILIKE $1 OR genre ILIKE $1)
                     ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
            params = [pattern, limit + 1, offset];
        } else {
            query = `SELECT *, user_id AS creator_id FROM stories
                     WHERE is_published = true
                     ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
            params = [limit + 1, offset];
        }

        // Fetch one extra to determine hasMore
        const res = await pool.query(query, params);

        const hasMore = res.rows.length > limit;
        const items = hasMore ? res.rows.slice(0, limit) : res.rows;

        return NextResponse.json({
            items,
            hasMore,
            nextOffset: hasMore ? offset + limit : null,
        });
    } catch (e) {
        return NextResponse.json({ error: "DB Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!session?.user || !(session.user as any).id) {
        return NextResponse.json({error: "Unauthorized"}, {status: 401});
    }

    try {
        await ensureSchema();
        const body = await req.json();
        const { id, name, synopsis, genre, image, story_data, world_data, is_published } = body;

        // Validate required fields
        if (!id || !name) {
            return NextResponse.json({ error: "Missing required fields: id and name" }, { status: 400 });
        }
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userId = (session.user as any).id;

        // ─── ID Format & Namespace Guard ────────────────────────────
        if (!id.startsWith('story-')) {
            return NextResponse.json({ error: "Invalid story ID format. IDs must begin with 'story-'" }, { status: 400 });
        }

        // ─── Ownership & Draft Validation Guard ─────────────────────
        const existing = await pool.query(
            `SELECT user_id FROM stories WHERE id = $1`,
            [id]
        );
        
        if (existing.rows.length > 0) {
            // Updating existing published story
            if (existing.rows[0].user_id !== userId) {
                return NextResponse.json(
                    { error: "Forbidden: you do not own this story" },
                    { status: 403 }
                );
            }
        } else {
            // Publishing a new story draft: verify ownership of metadata draft
            const draft = await pool.query(
                `SELECT 1 FROM conversation_metadata WHERE conversation_id = $1 AND user_id = $2 AND story_data IS NOT NULL`,
                [id, userId]
            );
            if (draft.rows.length === 0) {
                return NextResponse.json(
                    { error: "Forbidden: no story draft metadata found for this ID" },
                    { status: 403 }
                );
            }
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const result = await client.query(
                `INSERT INTO stories (id, user_id, name, synopsis, genre, image, story_data, world_data, is_published) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (id) DO UPDATE SET 
                 name = EXCLUDED.name, 
                 synopsis = EXCLUDED.synopsis, 
                 genre = EXCLUDED.genre, 
                 image = EXCLUDED.image, 
                 story_data = EXCLUDED.story_data, 
                 world_data = EXCLUDED.world_data, 
                 is_published = EXCLUDED.is_published
                 RETURNING id`,
                [id, userId, name, synopsis, genre, image, story_data, world_data, is_published]
            );

            // Also update conversation metadata atomically to prevent 
            // the ChatApp from having a stale published status on reconnect.
            await client.query(
                `INSERT INTO conversation_metadata (conversation_id, user_id, story_data, group_name, group_image, world_data, updated_at) 
                 VALUES ($1, $2, $3, $4, $5, $6, NOW())
                 ON CONFLICT (conversation_id, user_id) DO UPDATE SET 
                 story_data = EXCLUDED.story_data,
                 group_name = EXCLUDED.group_name,
                 group_image = EXCLUDED.group_image,
                 world_data = EXCLUDED.world_data,
                 updated_at = NOW()`,
                [id, userId, story_data, name, image, world_data]
            );

            await client.query('COMMIT');
            return NextResponse.json({ success: true, storyId: result.rows[0].id });
        } catch (e) {
            await client.query('ROLLBACK');
            console.error(e);
            return NextResponse.json({ error: "DB Error" }, { status: 500 });
        } finally {
            client.release();
        }
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
