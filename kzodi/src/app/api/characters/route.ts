import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search") || "";
        const tag = searchParams.get("category") || "All";
        const limit = parseInt(searchParams.get("limit") || "50");

        // Base query - only fetch public characters or ones created by the current user
        let queryStr = `
            SELECT c.*, 
                   EXISTS(SELECT 1 FROM character_likes cl WHERE cl.character_id = c.id AND cl.user_id = $1) as user_has_liked
            FROM characters c 
            WHERE (c.visibility = 'public' OR c.creator_id = $1)
        `;

        let params: any[] = [null]; // Placeholder for user ID (can be null if not logged in)

        const session = await auth();
        if (session?.user && (session.user as any).id) {
            params[0] = (session.user as any).id;
        }

        // Add filters
        let paramCount = 2; // Since $1 is user_id
        if (tag !== "All") {
            queryStr += ` AND tag = $${paramCount}`;
            params.push(tag);
            paramCount++;
        }

        if (search) {
            queryStr += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount} OR long_description ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }

        // Sort by trending (likes + msg count)
        queryStr += ` ORDER BY (likes_count * 2 + msg_count) DESC NULLS LAST LIMIT $${paramCount}`;
        params.push(limit);

        const result = await pool.query(queryStr, params);

        // Map snake_case to camelCase for frontend
        const characters = result.rows.map(row => {
            const char = {
                id: row.id,
                name: row.name,
                tag: row.tag,
                tags: typeof row.tags === "string" ? JSON.parse(row.tags) : (row.tags || []),
                description: row.description,
                longDescription: row.long_description,
                scenario: row.scenario,
                exampleDialogue: row.example_dialogue,
                image: row.image,
                greeting: row.greeting,
                personality: row.personality,
                visibility: row.visibility,
                source: row.source,
                likes: row.likes_count,        // For backward compatibility
                totalUsers: row.chatter_count, // For backward compatibility
                creatorId: row.creator_id,
                msgCount: row.msg_count,
                likesCount: row.likes_count,
                chatterCount: row.chatter_count,
                createdAt: new Date(row.created_at).getTime(),
                isPublic: row.visibility === "public",
                userHasLiked: row.user_has_liked
            };
            return char;
        });

        return NextResponse.json(characters);
    } catch (error) {
        console.error("Failed to fetch characters:", error);
        return NextResponse.json({ error: "Failed to fetch characters" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        const userId = session?.user ? (session.user as any).id : null;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        const {
            id, name, tag, tags = [], description, longDescription = null,
            scenario = null, exampleDialogue = null, image, greeting,
            personality, visibility = 'public', source = null
        } = body;

        if (!id || !name || !tag || !description || !image || !greeting || !personality) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await pool.query(`
            INSERT INTO characters (
                id, name, tag, tags, description, long_description, scenario, example_dialogue,
                image, greeting, personality, visibility, source, creator_id
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
            ) ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                tag = EXCLUDED.tag,
                tags = EXCLUDED.tags,
                description = EXCLUDED.description,
                long_description = EXCLUDED.long_description,
                scenario = EXCLUDED.scenario,
                example_dialogue = EXCLUDED.example_dialogue,
                image = EXCLUDED.image,
                greeting = EXCLUDED.greeting,
                personality = EXCLUDED.personality,
                visibility = EXCLUDED.visibility,
                source = EXCLUDED.source,
                updated_at = NOW()
        `, [
            id, name, tag, JSON.stringify(tags), description, longDescription, scenario, exampleDialogue,
            image, greeting, personality, visibility, source, userId
        ]);

        return NextResponse.json({ success: true, character: body });
    } catch (error) {
        console.error("Failed to save character:", error);
        return NextResponse.json({ error: "Failed to save character" }, { status: 500 });
    }
}
