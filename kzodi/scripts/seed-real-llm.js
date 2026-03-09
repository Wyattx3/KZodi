const { Pool } = require("pg");
const Groq = require("groq-sdk");
require("dotenv").config();

const DATABASE_URL = (process.env.DATABASE_URL || "").replace(/[?&]sslmode=[^&]*/g, "");
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
    console.error("GROQ_API_KEY is not defined in .env");
    process.exit(1);
}

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const groq = new Groq({ apiKey: GROQ_API_KEY });

const CATEGORIES_TO_SEED = [
    "Manga", "Game", "K-pop", "Movies", "TV", "Books",
    "VTuber", "Original", "History", "Mythology", "Philosophy",
    "Celebrity", "Roleplay", "BL", "GL", "Specialist"
];

// Fallback dicebear 
function getFallbackAvatar(name) {
    return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`;
}

// Function to get 100 real names from LLM
async function getRealNames(category) {
    console.log(`Asking LLM for 100 real names for category: ${category}`);
    
    let instructions = `You are an encyclopedic AI. I need exactly 100 highly recognizable, REAL names for the category "${category}".`;
    
    if (["History", "Philosophy", "Celebrity", "K-pop", "Mythology", "VTuber"].includes(category)) {
        instructions += " Provide actual historical figures, real celebrities, real idols, or real mythological figures.";
    } else if (["Manga", "Game", "Movies", "TV", "Books", "BL", "GL"].includes(category)) {
        instructions += " Provide the actual names of famous fictional characters from popular released media.";
    } else {
        instructions += " Provide widely known tropes, legendary internet personalities, or highly famous real figures that fit this tag.";
    }

    const prompt = `${instructions}
WARNING: Output ONLY a valid JSON array of exactly 100 strings representing their names.
Example: ["Julius Caesar", "Leonardo da Vinci"]`;

    let retries = 3;
    while (retries > 0) {
        try {
            const completion = await groq.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: "llama-3.3-70b-versatile",
                temperature: 0.3,
            });

            let content = completion.choices[0]?.message?.content || "";
            content = content.trim();
            if (content.startsWith("```json")) content = content.substring(7);
            if (content.startsWith("```")) content = content.substring(3);
            if (content.endsWith("```")) content = content.substring(0, content.length - 3);

            const names = JSON.parse(content);
            if (Array.isArray(names) && names.length > 0) {
                return names;
            }
        } catch (error) {
            console.error(`Failed LLM attempt for ${category}. Retries left: ${retries-1}`);
            retries--;
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    return [];
}

// Function to fetch Wikipedia data
async function getWikiData(name) {
    try {
        const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages|extracts&exintro&explaintext&exchars=400&titles=${encodeURIComponent(name)}&format=json&pithumbsize=500`;
        const res = await fetch(url);
        const data = await res.json();
        
        const pages = data.query?.pages;
        if (!pages) return null;
        
        const pageId = Object.keys(pages)[0];
        if (pageId === "-1") return null; // Not found
        
        const page = pages[pageId];
        return {
            extract: page.extract || `The legendary ${name}.`,
            image: page.thumbnail?.source || getFallbackAvatar(name)
        };
    } catch (e) {
        return null;
    }
}

async function seed() {
    console.log("Connecting to database...");
    const client = await pool.connect();
    
    try {
        let totalCount = 0;
        for (const category of CATEGORIES_TO_SEED) {
            console.log(`\n--- Processing Category: ${category} ---`);
            const names = await getRealNames(category);
            
            if (!names || !Array.isArray(names) || names.length === 0) {
                 console.log(`Skipping category ${category} because no valid names were returned.`);
                 continue;
            }
            
            console.log(`Got ${names.length} names from LLM. Fetching wiki data...`);
            
            let inserted = 0;
            // Process sequentially to not hammer wikipedia
            for (let i = 0; i < names.length; i++) {
                const name = names[i];
                let wiki = null;
                try {
                    wiki = await getWikiData(name);
                } catch(e) {}
                
                // Construct the entity
                const bio = wiki ? wiki.extract : `A well-known figure in the world of ${category}.`;
                const image = wiki ? wiki.image : getFallbackAvatar(name);
                
                const id = `real-${category.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}-${i}`;
                
                await client.query(`
                    INSERT INTO characters (
                        id, name, tag, tags, description, long_description,
                        image, greeting, personality, visibility, source, likes_count, chatter_count
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
                    )
                `, [
                    id, 
                    name.substring(0, 100), 
                    category, 
                    JSON.stringify([category]), 
                    `${name} (${category})`, 
                    bio ? bio.substring(0, 1000) : "", 
                    image, 
                    `Hello, I am ${name}. Pleased to meet you.`, 
                    "famous, real, distinguished", 
                    'public', 
                    category, 
                    Math.floor(Math.random() * 2000), 
                    Math.floor(Math.random() * 5000)
                ]);
                
                inserted++;
                totalCount++;
                
                if (i % 25 === 0 && i > 0) {
                    console.log(`   Inserted ${inserted} characters...`);
                }
            }
            console.log(`Finished ${category}: ${inserted} real characters inserted.`);
        }
        
        console.log(`\n=== SUCCESSFULLY SEEDED ${totalCount} REAL WIKIPEDIA FIGURES! ===`);
    } catch (error) {
        console.error("Fatal error:", error);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
