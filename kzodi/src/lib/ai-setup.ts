import { Pinecone } from '@pinecone-database/pinecone';
import { Groq } from 'groq-sdk';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';

// Vercel Serverless/Edge polyfill for pdf-parse which depends on DOMMatrix
if (typeof globalThis.DOMMatrix === 'undefined') {
    (globalThis as any).DOMMatrix = class DOMMatrix { };
}
const pdf = require('pdf-parse');
import EPub from 'epub2';

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
const INDEX_NAME = 'kakoei-multi';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || ''
});

// -- Text Extraction Helpers --

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
        const data = await pdf(buffer);
        return data.text;
    } catch (e) {
        console.error("PDF Parsing error:", e);
        throw new Error("Failed to parse PDF file.");
    }
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
                });
            });
            setTimeout(() => resolve(text), 1000); // Allow async chapter fetching
        });
        epub.on('error', reject);
        epub.parse();
    });
}

export async function extractTextFromUrl(url: string): Promise<string> {
    let text = "";

    // 1. Try Exa if available (Exa is great for fetching clean text)
    if (process.env.EXA_API_KEY) {
        try {
            console.log("Extracting with Exa API:", url);
            const exaResp = await fetch("https://api.exa.ai/contents", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": process.env.EXA_API_KEY
                },
                body: JSON.stringify({ ids: [url], text: true })
            });

            if (exaResp.ok) {
                const data = await exaResp.json();
                if (data.results && data.results[0] && data.results[0].text) {
                    text = data.results[0].text;
                    if (text.length > 500) return text.substring(0, 50000);
                }
            }
        } catch (e) {
            console.error("Exa extraction failed:", e);
        }
    }

    // 2. Try Tavily if Exa failed or unavailable
    if (process.env.TAVILY_API_KEY) {
        try {
            console.log("Extracting with Tavily API:", url);
            const tavilyResp = await fetch("https://api.tavily.com/extract", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.TAVILY_API_KEY}`
                },
                body: JSON.stringify({ urls: [url] })
            });

            if (tavilyResp.ok) {
                const data = await tavilyResp.json();
                if (data.results && data.results[0] && data.results[0].raw_content) {
                    text = data.results[0].raw_content;
                    if (text.length > 500) return text.substring(0, 50000);
                }
            }
        } catch (e) {
            console.error("Tavily extraction failed:", e);
        }
    }

    // 3. Fallback to basic fetch + cheerio
    console.log("Falling back to basic fetch + cheerio:", url);
    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        });
        const html = await response.text();
        const $ = cheerio.load(html);

        // Remove scripts, styles
        $('script').remove();
        $('style').remove();
        $('nav').remove();
        $('footer').remove();
        $('header').remove();

        // extract text from paragraphs and headings
        text = $('body').text().replace(/\s+/g, ' ').trim();
        return text.substring(0, 50000); // Limit context
    } catch (e) {
        console.error("Basic fetch fallback failed:", e);
    }

    throw new Error("Failed to extract meaningful text from URL using all available methods.");
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
