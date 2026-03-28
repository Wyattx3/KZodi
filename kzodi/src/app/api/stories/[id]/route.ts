import { NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await ensureSchema();
        const { id } = await params;

        const result = await pool.query(
            `SELECT *, user_id AS creator_id FROM stories WHERE id = $1 LIMIT 1`,
            [id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: "Story not found" }, { status: 404 });
        }

        return NextResponse.json({ story: result.rows[0] });
    } catch (e) {
        console.error("Failed to fetch story by ID", e);
        return NextResponse.json({ error: "DB Error" }, { status: 500 });
    }
}
