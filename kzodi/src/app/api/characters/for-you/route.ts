import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { auth } from "@/auth";

/**
 * GET /api/characters/for-you
 * Returns personalized character recommendations based on user's liked and chatted characters.
 * Falls back to popular characters for new/logged-out users.
 */
export async function GET() {
    try {
        const session = await auth();
        const userId = session?.user ? (session.user as any).id : null;

        // Fallback for logged-out or new users: return popular characters
        if (!userId) {
            return getPopularCharacters(null);
        }

        // 1. Get characters the user has liked
        const likedRes = await pool.query(
            `SELECT character_id FROM character_likes WHERE user_id = $1`,
            [userId]
        );
        const likedIds: string[] = likedRes.rows.map((r: any) => r.character_id);

        // 2. Get characters the user has chatted with (from messages table)
        const chattedRes = await pool.query(
            `SELECT DISTINCT conversation_id FROM messages WHERE user_id = $1`,
            [userId]
        );
        const chattedIds: string[] = chattedRes.rows.map((r: any) => r.conversation_id);

        // Combine unique interacted character IDs
        const interactedIds = [...new Set([...likedIds, ...chattedIds])];

        // If user has no interactions, return popular characters
        if (interactedIds.length === 0) {
            return getPopularCharacters(userId);
        }

        // 3. Get the profile data (tag, tags, personality) of interacted characters
        const profileRes = await pool.query(
            `SELECT tag, tags, personality FROM characters WHERE id = ANY($1)`,
            [interactedIds]
        );

        // Build preference maps
        const tagCounts: Record<string, number> = {};
        const tagSetCounts: Record<string, number> = {};
        const traitCounts: Record<string, number> = {};

        for (const row of profileRes.rows) {
            // Category
            const cat = row.tag;
            tagCounts[cat] = (tagCounts[cat] || 0) + 1;

            // Tags (JSONB array)
            const tags: string[] = typeof row.tags === "string" ? JSON.parse(row.tags) : (row.tags || []);
            for (const t of tags) {
                tagSetCounts[t.toLowerCase()] = (tagSetCounts[t.toLowerCase()] || 0) + 1;
            }

            // Personality traits
            if (row.personality) {
                const traits = row.personality.split(",").map((s: string) => s.trim().toLowerCase());
                for (const trait of traits) {
                    if (trait) traitCounts[trait] = (traitCounts[trait] || 0) + 1;
                }
            }
        }

        // 4. Get all public candidate characters (excluding already interacted ones)
        const candidateRes = await pool.query(
            `SELECT c.*,
                    EXISTS(SELECT 1 FROM character_likes cl WHERE cl.character_id = c.id AND cl.user_id = CAST($1 AS VARCHAR)) as user_has_liked
             FROM characters c
             WHERE c.visibility = 'public'
               AND c.id != ALL($2)
             ORDER BY likes_count DESC NULLS LAST
             LIMIT 100`,
            [userId, interactedIds]
        );

        // 5. Score each candidate
        const scored = candidateRes.rows.map((row: any) => {
            let score = 0;

            // Category match
            if (tagCounts[row.tag]) {
                score += 3 * tagCounts[row.tag];
            }

            // Tags overlap
            const candidateTags: string[] = typeof row.tags === "string" ? JSON.parse(row.tags) : (row.tags || []);
            for (const t of candidateTags) {
                if (tagSetCounts[t.toLowerCase()]) {
                    score += 2 * tagSetCounts[t.toLowerCase()];
                }
            }

            // Personality overlap
            if (row.personality) {
                const traits = row.personality.split(",").map((s: string) => s.trim().toLowerCase());
                for (const trait of traits) {
                    if (traitCounts[trait]) {
                        score += 1 * traitCounts[trait];
                    }
                }
            }

            // Small popularity bonus
            score += Math.min((row.likes_count || 0) * 0.1, 5);

            return { row, score };
        });

        // Sort by score descending, take top 6
        scored.sort((a, b) => b.score - a.score);
        const topResults = scored.slice(0, 6);

        // Map to frontend format
        const characters = topResults.map(({ row }) => mapRow(row));

        return NextResponse.json(characters);
    } catch (error) {
        console.error("Failed to fetch for-you characters:", error);
        return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 });
    }
}

async function getPopularCharacters(userId: string | null) {
    const result = await pool.query(
        `SELECT c.*,
                EXISTS(SELECT 1 FROM character_likes cl WHERE cl.character_id = c.id AND cl.user_id = CAST($1 AS VARCHAR)) as user_has_liked
         FROM characters c
         WHERE c.visibility = 'public'
         ORDER BY (likes_count * 2 + msg_count) DESC NULLS LAST
         LIMIT 6`,
        [userId]
    );
    return NextResponse.json(result.rows.map(mapRow));
}

function mapRow(row: any) {
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
        createdAt: new Date(row.created_at).getTime(),
        isPublic: row.visibility === "public",
        userHasLiked: row.user_has_liked,
    };
}
