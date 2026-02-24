import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { auth } from "@/auth";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const userId = session?.user ? (session.user as any).id : null;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const params = await context.params;
        const characterId = params.id;

        // Check if character exists
        const charRes = await pool.query("SELECT id FROM characters WHERE id = $1", [characterId]);
        if (charRes.rows.length === 0) {
            return NextResponse.json({ error: "Character not found" }, { status: 404 });
        }

        // Toggle Like
        const likeRes = await pool.query(
            "SELECT 1 FROM character_likes WHERE character_id = $1 AND user_id = $2",
            [characterId, userId]
        );

        let liked = false;

        if (likeRes.rows.length > 0) {
            // Un-like
            await pool.query(
                "DELETE FROM character_likes WHERE character_id = $1 AND user_id = $2",
                [characterId, userId]
            );
            await pool.query(
                "UPDATE characters SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1",
                [characterId]
            );
        } else {
            // Like
            await pool.query(
                "INSERT INTO character_likes (character_id, user_id) VALUES ($1, $2)",
                [characterId, userId]
            );
            await pool.query(
                "UPDATE characters SET likes_count = likes_count + 1 WHERE id = $1",
                [characterId]
            );
            liked = true;
        }

        // Get updated count
        const countRes = await pool.query("SELECT likes_count FROM characters WHERE id = $1", [characterId]);
        const likesCount = countRes.rows[0].likes_count;

        return NextResponse.json({ success: true, liked, likesCount });
    } catch (error) {
        console.error("Failed to toggle character like:", error);
        return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 });
    }
}
