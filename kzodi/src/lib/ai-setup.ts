import { Pinecone } from '@pinecone-database/pinecone';
import { Groq } from 'groq-sdk';
import * as cheerio from 'cheerio';
const pdf = require('pdf-parse');
import EPub from 'epub2';
import { v4 as uuidv4 } from 'uuid';

let pineconeInstance: Pinecone | null = null;
function getPinecone() {
    if (!pineconeInstance && process.env.PINECONE_API_KEY) {
        try {
            pineconeInstance = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
        } catch (e) { console.error("Pinecone init fail:", e); }
    }
    return pineconeInstance;
}

// 1024-dimension index for Pinecone Multilingual AI embeddings
const INDEX_NAME = 'kzodi-multi';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || ''
});

// -- Text Extraction Helpers --

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    const data = await pdf(buffer);
    return data.text;
}

export async function extractTextFromEPUB(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const epub = new EPub(filePath);
        epub.on('end', () => {
            let text = '';
            epub.flow.forEach((chapter: any) => {
                epub.getChapter(chapter.id, (err: any, d: string | undefined) => {
                    if (err || !d) return;
                    const $ = cheerio.load(d);
                    text += $('body').text() + '\n';
                    // This is async inside a loop, simplistic. Better use epub-parser logic or similar.
                    // For now, this is a basic implementation.
                });
            });
            // Wait a bit for chapters to load (epub2 is weird with sync access)
            setTimeout(() => resolve(text), 1000);
        });
        epub.on('error', reject);
        epub.parse();
    });
}
// Note: EPUB handling in Node can be tricky with buffers. EPub2 usually needs a file path.
// If we receive a buffer, we might need to write it to a temp file first.

export async function extractTextFromUrl(url: string): Promise<string> {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove scripts, styles
    $('script').remove();
    $('style').remove();
    $('nav').remove();
    $('footer').remove();
    $('header').remove();

    // extract text from paragraphs and headings
    const text = $('body').text().replace(/\s+/g, ' ').trim();
    return text.substring(0, 50000); // Limit context
}

// -- AI Analysis & Embedding (Pinecone Inference Multilingual) --

export async function generateEmbeddings(text: string) {
    const pc = getPinecone();
    if (!pc) {
        console.warn("Pinecone not initialized. Cannot embed.");
        return [];
    }
    try {
        // Using Pinecone's multilingual model (1024 dimensions)
        const e = await pc.inference.embed({
            model: 'multilingual-e5-large',
            inputs: [text],
            parameters: { inputType: 'passage', truncate: 'END' }
        });
        return (e.data[0] as any).values;
    } catch (err) {
        console.error("Failed to fetch multilingual embeddings from Pinecone:", err);
        return [];
    }
}

// Analyze text with Groq to get Character JSON
export async function analyzeCharacterSource(text: string, name: string) {
    const prompt = `
    Analyze the following text source and extract character details for "${name}".
    Return ONLY a JSON object with the following fields:
    - name: string (The character's name)
    - description: string (Short description, max 150 chars)
    - longDescription: string (Detailed biography and appearance)
    - personality: string (Keywords like "Brave, Kind, Stubborn")
    - scenario: string (A default scenario for chatting)
    - greeting: string (A first message from the character)
    - exampleDialogue: string (Example conversation in format "User: ...\nChar: ...")
    - tags: string[] (Array of relevant tags like "Anime", "Hero", etc.)
    - voice: string (One of: "Sweet", "Energetic", "Sultry", "Deep", "Serious", "Playful", "Monotone")

    Context Text:
    ${text.substring(0, 15000)}... (truncated)
    `;

    const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
        temperature: 0.5,
        response_format: { type: "json_object" }
    });

    return JSON.parse(completion.choices[0]?.message?.content || "{}");
}

// Index into Pinecone
export async function indexCharacterData(charId: string, text: string, metadata: any) {
    const pc = getPinecone();
    if (!pc) return;

    const chunks = text.match(/.{1,1000}/g) || [];
    const index = pc.index(INDEX_NAME);

    const vectorData = [];

    for (let i = 0; i < Math.min(chunks.length, 20); i++) { // Limit chunks for speed
        const chunk = chunks[i];
        const embedding = await generateEmbeddings(chunk);

        if (embedding.length > 0) {
            vectorData.push({
                id: `${charId}-${i}`,
                values: embedding as number[],
                metadata: {
                    ...metadata,
                    characterId: charId,
                    text: chunk,
                    chunkIndex: i
                }
            });
        }
    }

    try {
        if (vectorData.length > 0) {
            await index.upsert({ records: vectorData as any });
        }
    } catch (e) {
        console.error("Pinecone indexing error:", e);
        // Might need explicit index creation for new dimensions before upserting.
    }
}
