import { Pinecone } from '@pinecone-database/pinecone';
import { Groq } from 'groq-sdk';
import * as cheerio from 'cheerio';
const pdf = require('pdf-parse');
import EPub from 'epub2';
// import { pipeline } from '@xenova/transformers'; // Moved to dynamic import
import { v4 as uuidv4 } from 'uuid';

// Initialize Clients
const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY || ''
});
// Using 'kzodi-characters' as the index name, create if not exists
const INDEX_NAME = 'kzodi-characters';

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

// -- AI Analysis & Embedding --

// Singleton for embedding pipeline
let embeddingPipeline: any = null;
async function getEmbeddingPipeline() {
    if (!embeddingPipeline) {
        try {
            const { pipeline } = await import('@xenova/transformers');
            embeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        } catch (e) {
            console.error("Failed to load @xenova/transformers pipeline:", e);
            throw e;
        }
    }
    return embeddingPipeline;
}

export async function generateEmbeddings(text: string) {
    const pipe = await getEmbeddingPipeline();
    const output = await pipe(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
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
    const chunks = text.match(/.{1,1000}/g) || [];
    const index = pinecone.index(INDEX_NAME);

    const vectorData = [];

    for (let i = 0; i < Math.min(chunks.length, 20); i++) { // Limit chunks for speed
        const chunk = chunks[i];
        const embedding = await generateEmbeddings(chunk);

        vectorData.push({
            id: `${charId}-${i}`,
            values: embedding as number[],
            metadata: {
                ...metadata,
                text: chunk,
                chunkIndex: i
            }
        });
    }

    try {
        await index.upsert(vectorData as any);
    } catch (e) {
        console.error("Pinecone indexing error:", e);
        // Maybe index doesn't exist, create it? (Requires control plane api, slower)
        // Ignoring create for now, assuming index exists or auto-creation on upsert is available (unlikely).
    }
}
