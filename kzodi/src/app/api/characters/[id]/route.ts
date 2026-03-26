import { NextRequest, NextResponse } from "next/server";
import { CHARACTERS } from "@/data/characters";
import { ensureSchema, pool } from "@/lib/db";
import { auth } from "@/auth";
import valkey from "@/lib/redis";

function mapCharacterRow(row: any) {
    return {
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
        likes: row.likes_count,
        totalUsers: row.chatter_count,
        creatorId: row.creator_id,
        msgCount: row.msg_count,
        likesCount: row.likes_count,
        chatterCount: row.chatter_count,
        createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
        isPublic: row.visibility === "public",
        userHasLiked: Boolean(row.user_has_liked),
    };
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // 1. First, check the static built-in characters array
        let character = CHARACTERS.find(c => c.id === id);

        if (character) {
            // Might want to fetch accurate likes from db for static, but for basic share link returning static is fast
            return NextResponse.json({ character, origin: 'static' });
        }

        // 2. Fallback to querying the database for user-created / dynamic characters
        const session = await auth();
        const userId = session?.user ? (session.user as any).id : null;

        const queryStr = `
            SELECT c.*, 
                   EXISTS(SELECT 1 FROM character_likes cl WHERE cl.character_id = c.id AND cl.user_id = CAST($1 AS VARCHAR)) as user_has_liked
            FROM characters c 
            WHERE c.id = $2
        `;

        const result = await pool.query(queryStr, [userId, id]);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: "Character not found" }, { status: 404 });
        }

        const dbCharacter = mapCharacterRow(result.rows[0]);

        // Enforce visibility: don't let people fetch non-public chars unless they created it
        if (!dbCharacter.isPublic && dbCharacter.creatorId !== userId) {
            return NextResponse.json({ error: "Private character" }, { status: 403 });
        }

        return NextResponse.json({ character: dbCharacter, origin: 'database' });

    } catch (error) {
        console.error("Error fetching individual character:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = session?.user ? (session.user as any).id : null;

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await ensureSchema();

        const { id } = await params;
        const body = await request.json();
        const {
            name,
            nickname = null,
            tag,
            tags = [],
            description,
            longDescription = null,
            scenario = null,
            exampleDialogue = null,
            image,
            greeting,
            personality,
            visibility = "public",
            zodiac_sign = null,
            birthday = null,
        } = body;

        if (!name || !tag || !description || !image || !greeting || !personality) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const existing = await pool.query(
            `SELECT creator_id, source FROM characters WHERE id = $1`,
            [id]
        );

        if (existing.rows.length === 0) {
            return NextResponse.json({ error: "Character not found" }, { status: 404 });
        }

        if (existing.rows[0].creator_id !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const resolvedSource = Object.prototype.hasOwnProperty.call(body, "source")
            ? body.source
            : existing.rows[0].source;

        const result = await pool.query(
            `UPDATE characters
             SET name = $2,
                 nickname = $3,
                 tag = $4,
                 tags = $5,
                 description = $6,
                 long_description = $7,
                 scenario = $8,
                 example_dialogue = $9,
                 image = $10,
                greeting = $11,
                personality = $12,
                visibility = $13,
                source = $14,
                 zodiac_sign = $15,
                 birthday = $16,
                 updated_at = NOW()
             WHERE id = $1 AND creator_id = $17
             RETURNING *`,
            [
                id,
                name,
                nickname,
                tag,
                JSON.stringify(tags),
                description,
                longDescription,
                scenario,
                exampleDialogue,
                image,
                greeting,
                personality,
                visibility,
                resolvedSource,
                zodiac_sign,
                birthday,
                userId,
            ]
        );

        // Invalidate Redis character listing cache
        try {
            const keys = await valkey.keys('chars:*');
            if (keys.length > 0) {
                await valkey.del(...keys);
            }
        } catch (e) { /* cache clear is best-effort */ }

        return NextResponse.json({ success: true, character: mapCharacterRow(result.rows[0]) });
    } catch (error) {
        console.error("Error updating character:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
