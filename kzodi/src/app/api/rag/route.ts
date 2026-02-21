import { NextRequest, NextResponse } from "next/server";
import { Pinecone } from '@pinecone-database/pinecone';
import { generateEmbeddings } from "@/lib/ai-setup";
import { auth } from "@/auth";

const INDEX_NAME = 'kzodi-multi';

let pineconeInstance: Pinecone | null = null;
function getPinecone() {
    if (!pineconeInstance && process.env.PINECONE_API_KEY) {
        try {
            pineconeInstance = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
        } catch (e) { console.error("Pinecone init fail:", e); }
    }
    return pineconeInstance;
}

// GET: List memories for a character
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userId = (session.user as any).id;

        const { searchParams } = new URL(request.url);
        const characterId = searchParams.get("characterId");
        const query = searchParams.get("query") || "";

        if (!characterId) {
            return NextResponse.json({ error: "characterId required" }, { status: 400 });
        }

        const pc = getPinecone();
        if (!pc) {
            return NextResponse.json({ error: "Pinecone not configured" }, { status: 500 });
        }

        const index = pc.index(INDEX_NAME);

        // If a query is provided, do semantic search; otherwise list recent
        let vector: number[] | undefined;
        if (query) {
            vector = await generateEmbeddings(query) as number[];
            if (!vector || vector.length === 0) {
                return NextResponse.json({ memories: [], message: "Embedding failed" });
            }
        } else {
            // Generate a generic query to retrieve recent memories
            vector = await generateEmbeddings(`${characterId} conversation memory`) as number[];
        }

        const results = await index.query({
            vector: vector!,
            topK: 20,
            filter: { characterId, userId },
            includeMetadata: true
        });

        const memories = results.matches.map((m) => ({
            id: m.id,
            score: m.score,
            text: (m.metadata as any)?.text || "",
            timestamp: (m.metadata as any)?.timestamp || 0,
            importance: (m.metadata as any)?.importance || "medium"
        }));

        return NextResponse.json({
            memories,
            total: memories.length,
            characterId
        });
    } catch (error) {
        console.error("RAG list error:", error);
        return NextResponse.json({ error: "Failed to list memories" }, { status: 500 });
    }
}

// DELETE: Remove specific memories or all for a character
export async function DELETE(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userId = (session.user as any).id;

        const body = await request.json();
        const { characterId, memoryIds, clearAll } = body;

        if (!characterId) {
            return NextResponse.json({ error: "characterId required" }, { status: 400 });
        }

        const pc = getPinecone();
        if (!pc) {
            return NextResponse.json({ error: "Pinecone not configured" }, { status: 500 });
        }

        const index = pc.index(INDEX_NAME);

        if (clearAll) {
            // Delete all vectors for this character + user
            // Pinecone doesn't support delete by filter in all tiers,
            // so we query and delete by IDs
            const dummyVector = await generateEmbeddings(`${characterId} memory`) as number[];
            if (dummyVector && dummyVector.length > 0) {
                const all = await index.query({
                    vector: dummyVector,
                    topK: 100,
                    filter: { characterId, userId },
                    includeMetadata: false
                });
                const ids = all.matches.map(m => m.id);
                if (ids.length > 0) {
                    await index.deleteMany(ids);
                }
            }
            return NextResponse.json({ deleted: true, message: `Cleared all memories for ${characterId}` });
        }

        if (memoryIds && Array.isArray(memoryIds) && memoryIds.length > 0) {
            await index.deleteMany(memoryIds);
            return NextResponse.json({ deleted: true, count: memoryIds.length });
        }

        return NextResponse.json({ error: "No memoryIds or clearAll specified" }, { status: 400 });
    } catch (error) {
        console.error("RAG delete error:", error);
        return NextResponse.json({ error: "Failed to delete memories" }, { status: 500 });
    }
}

// POST: Manually add a memory
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userId = (session.user as any).id;

        const body = await request.json();
        const { characterId, text, importance = "high" } = body;

        if (!characterId || !text) {
            return NextResponse.json({ error: "characterId and text required" }, { status: 400 });
        }

        const pc = getPinecone();
        if (!pc) {
            return NextResponse.json({ error: "Pinecone not configured" }, { status: 500 });
        }

        const index = pc.index(INDEX_NAME);
        const vector = await generateEmbeddings(text);
        if (!vector || vector.length === 0) {
            return NextResponse.json({ error: "Embedding failed" }, { status: 500 });
        }

        // Dedup check
        const existing = await index.query({
            vector: vector as number[],
            topK: 1,
            filter: { characterId, userId },
            includeMetadata: true
        });
        if (existing.matches.length > 0 && (existing.matches[0].score || 0) > 0.92) {
            return NextResponse.json({ added: false, message: "Near-duplicate memory already exists" });
        }

        const id = `${userId}-${characterId}-${Date.now()}`;
        await index.upsert({
            records: [{
                id,
                values: vector as number[],
                metadata: {
                    text,
                    characterId,
                    userId,
                    timestamp: Date.now(),
                    importance
                }
            }]
        });

        return NextResponse.json({ added: true, id, message: "Memory saved" });
    } catch (error) {
        console.error("RAG add error:", error);
        return NextResponse.json({ error: "Failed to add memory" }, { status: 500 });
    }
}
