import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search") || "";
        const tag = searchParams.get("category") || "All";
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");
        const mine = searchParams.get("mine") === "true";

        // Base query - only fetch public characters or ones created by the current user
        let queryStr = `
            SELECT c.*, 
                   EXISTS(SELECT 1 FROM character_likes cl WHERE cl.character_id = c.id AND cl.user_id = CAST($1 AS VARCHAR)) as user_has_liked
            FROM characters c 
        `;

        // Count query for total
        let countStr = `SELECT COUNT(*) FROM characters c `;

        let params: any[] = [null]; // Placeholder for user ID (can be null if not logged in)
        let countParams: any[] = [];
        let paramCount = 2; // Since $1 is user_id
        let countParamCount = 1;

        const session = await auth();
        const userId = session?.user && (session.user as any).id ? (session.user as any).id : null;
        params[0] = userId;

        // If mine=true, only show characters created by the logged-in user (any visibility)
        if (mine) {
            queryStr += ` WHERE c.creator_id = $1`;
            countStr += ` WHERE c.creator_id = $${countParamCount}`;
            countParams.push(userId);
            countParamCount++;
        } else {
            // Explore page: only show public characters
            queryStr += ` WHERE c.visibility = 'public'`;
            countStr += ` WHERE c.visibility = 'public'`;
        }

        // Add filters
        if (tag !== "All") {
            if (tag === "Original") {
                queryStr += ` AND (tag = $${paramCount} OR tag = 'Specialist')`;
                countStr += ` AND (tag = $${countParamCount} OR tag = 'Specialist')`;
            } else {
                queryStr += ` AND tag = $${paramCount}`;
                countStr += ` AND tag = $${countParamCount}`;
            }
            params.push(tag);
            countParams.push(tag);
            paramCount++;
            countParamCount++;
        }

        if (search) {
            queryStr += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount} OR long_description ILIKE $${paramCount})`;
            countStr += ` AND (name ILIKE $${countParamCount} OR description ILIKE $${countParamCount} OR long_description ILIKE $${countParamCount})`;
            params.push(`%${search}%`);
            countParams.push(`%${search}%`);
            paramCount++;
            countParamCount++;
        }

        // Sort by trending (likes + msg count) with pagination
        queryStr += ` ORDER BY (likes_count * 2 + msg_count) DESC NULLS LAST LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const [result, countResult] = await Promise.all([
            pool.query(queryStr, params),
            pool.query(countStr, countParams)
        ]);

        const total = parseInt(countResult.rows[0].count);
        const hasMore = offset + limit < total;

        // Map snake_case to camelCase for frontend
        const characters = result.rows.map(row => {
            const char = {
                id: row.id,
                name: row.name,
                nickname: row.nickname,
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
                zodiac_sign: row.zodiac_sign,
                birthday: row.birthday,
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

        return NextResponse.json({ characters, total, hasMore, offset });
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
            id, name, nickname = null, tag, tags = [], description, longDescription = null,
            scenario = null, exampleDialogue = null, image, greeting,
            personality, visibility = 'public', source = null, zodiac_sign = null, birthday = null
        } = body;

        if (!id || !name || !tag || !description || !image || !greeting || !personality) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await pool.query(`
            INSERT INTO characters (
                id, name, nickname, tag, tags, description, long_description, scenario, example_dialogue,
                image, greeting, personality, visibility, source, zodiac_sign, birthday, creator_id
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
            ) ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                nickname = EXCLUDED.nickname,
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
                zodiac_sign = EXCLUDED.zodiac_sign,
                birthday = EXCLUDED.birthday,
                updated_at = NOW()
        `, [
            id, name, nickname, tag, JSON.stringify(tags), description, longDescription, scenario, exampleDialogue,
            image, greeting, personality, visibility, source, zodiac_sign, birthday, userId
        ]);

        return NextResponse.json({ success: true, character: body });
    } catch (error) {
        console.error("Failed to save character:", error);
        return NextResponse.json({ error: "Failed to save character" }, { status: 500 });
    }
}
