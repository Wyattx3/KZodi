import { NextRequest, NextResponse } from "next/server";
import { linkReadingToUser } from "@/lib/db";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        const userId = session?.user ? (session.user as any).id : null;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { sessionId } = body;

        if (!sessionId) {
            return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
        }

        // Link the reading and feedback to the current user
        await linkReadingToUser(sessionId, userId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to link reading to user:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
