import { NextRequest, NextResponse } from "next/server";
import { CHARACTERS } from "@/data/characters";
import { pool } from "@/lib/db";
import { auth } from "@/auth";

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
                   EXISTS(SELECT 1 FROM character_likes cl WHERE cl.character_id = c.id AND cl.user_id = $1) as user_has_liked
            FROM characters c 
            WHERE c.id = $2
        `;

        const result = await pool.query(queryStr, [userId, id]);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: "Character not found" }, { status: 404 });
        }

        const row = result.rows[0];

        // Format exactly how the frontend expects it (matching the bulk fetch mapping)
        const dbCharacter = {
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
            createdAt: new Date(row.created_at).getTime(),
            isPublic: row.visibility === "public",
            userHasLiked: row.user_has_liked
        };

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
