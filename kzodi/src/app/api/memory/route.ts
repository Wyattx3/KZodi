import { NextRequest, NextResponse } from "next/server";
import { Pinecone } from '@pinecone-database/pinecone';
import { auth } from "@/auth";

let pineconeInstance: Pinecone | null = null;
function getPinecone() {
    if (!pineconeInstance && process.env.PINECONE_API_KEY) {
        try {
            pineconeInstance = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
        } catch (e) {
            console.error("Failed to init Pinecone:", e);
        }
    }
    return pineconeInstance;
}
const INDEX_NAME = 'kakoei-multilingual-memory';
const INDEX_HOST = process.env.PINECONE_INDEX_HOST || '';

function getPineconeIndex() {
    const pc = getPinecone();
    if (!pc) return null;
    try {
        if (INDEX_HOST) {
            return pc.index(INDEX_NAME, INDEX_HOST);
        }
        return pc.index(INDEX_NAME);
    } catch {
        return null;
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await auth();

        // Block unauthenticated access
        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userId = (session.user as any).id;

        const body = await request.json();
        const { characterId } = body;

        if (!characterId) {
            return NextResponse.json(
                { error: "characterId is required" },
                { status: 400 }
            );
        }

        const index = getPineconeIndex();
        if (index) {

            // Delete all memories for this character and user combination
            try {
                // Delete using metadata filter
                await index.deleteMany({ filter: { characterId: characterId, userId: userId } });
                console.log(`[Memory] Deleted all memories for user ${userId} and character ${characterId}`);
            } catch (err) {
                console.error("[Memory] Failed to delete from Pinecone via filter:", err);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Memory delete error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
