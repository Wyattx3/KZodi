const Exa = require('exa-js').default;
const { Pool } = require('pg');
const dotenv = require('dotenv');
const { generateText } = require('ai');
const { createOpenAI } = require('@ai-sdk/openai');

dotenv.config();

const exa = new Exa(process.env.EXA_API_KEY);

const DATABASE_URL = (process.env.DATABASE_URL || "").replace(/[?&]sslmode=[^&]*/g, "");

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
});

// We need an AI to format the Exa search results into character data
const groq = createOpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const TAGS_TO_POPULATE = [
    "Manga", "Game", "K-pop", "Movies", "TV", "Books",
    "VTuber", "Original", "History", "Mythology", "Philosophy",
    "Celebrity", "Roleplay", "BL", "GL"
];

const CHARACTERS_PER_TAG = 5;

async function getCharactersForTag(tag) {
    console.log(`\nFetching ${CHARACTERS_PER_TAG} popular characters/figures for tag: ${tag}...`);
    
    // 1. Ask Exa for articles/lists about top characters in this category
    const searchResult = await exa.searchAndContents(
      `Top 10 most popular ${tag} characters of all time`, 
      {
        numResults: 2,
        text: true,
      }
    );

    const context = searchResult.results.map(r => r.text).join('\n\n').substring(0, 10000); // Limit context length

    // 2. Use Groq to extract and format characters based on the search context
    const prompt = `
      Based on the following text about popular ${tag} characters:
      ${context}

      Extract exactly ${CHARACTERS_PER_TAG} unique and famous characters/figures that strictly belong to the category "${tag}".
      For example, if the category is "Game", extract ONLY characters originating from video games (e.g., Mario, Kratos, Master Chief), NOT anime characters (e.g., Goku, Naruto).
      
      Format the output ONLY as a valid JSON array of objects. Do not include any markdown formatting, backticks, or explanatory text.
      Each object MUST have the following properties:
      - "name": (string) The character's full name.
      - "description": (string) A short 1-2 sentence description of who they are.
      - "personality": (string) A brief description of their personality (e.g., "Brave and determined").
      - "greeting": (string) A typical in-character greeting they might say.
      - "source": (string) The name of the specific work they are from (e.g., the specific game, movie, book, or band name).
    `;

    try {
      const response = await generateText({
         model: groq('llama-3.3-70b-versatile'),
         prompt: prompt,
      });

      // Clean up the response to ensure it parses as JSON
      let jsonStr = response.text.trim();
      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```')) {
         const firstNewline = jsonStr.indexOf('\n');
         const lastBacktick = jsonStr.lastIndexOf('```');
         if (firstNewline !== -1 && lastBacktick !== -1) {
             jsonStr = jsonStr.substring(firstNewline + 1, lastBacktick).trim();
         }
      }

      const characters = JSON.parse(jsonStr);
      return characters;
    } catch (e) {
      console.error(`Failed to parse Groq response for tag ${tag}:`, e.message);
      // Fallback: If AI parsing fails, attempt a more robust manual fallback or skip
      return [];
    }
}

async function insertCharacter(char, tag) {
    const id = `exa-${tag.toLowerCase()}-${char.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}-${Date.now()}`;
    // Simple placeholder image based on name
    const image = `https://ui-avatars.com/api/?name=${encodeURIComponent(char.name)}&background=random&size=200`;
    
    const query = `
      INSERT INTO characters 
        (id, name, tag, description, image, greeting, personality, visibility, source, likes_count, msg_count, chatter_count)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, 'public', $8, 0, 0, 0)
    `;

    try {
      await pool.query(query, [
        id, 
        char.name, 
        tag, 
        char.description || "A well-known character.", 
        image, 
        char.greeting || "Hello there!", 
        char.personality || "Unknown",
        char.source || tag
      ]);
      console.log(`  -> Inserted: ${char.name} (${char.source})`);
    } catch (e) {
      console.error(`  -> Failed to insert ${char.name}:`, e.message);
    }
}

async function main() {
    console.log("Starting to populate tags...");
    
    for (const tag of TAGS_TO_POPULATE) {
        try {
            const characters = await getCharactersForTag(tag);
            
            if (characters && characters.length > 0) {
               console.log(`Extracted ${characters.length} characters for ${tag}. Inserting...`);
               for (const char of characters) {
                   await insertCharacter(char, tag);
               }
            } else {
               console.log(`Could not get valid characters for ${tag}.`);
            }
        } catch (err) {
            console.error(`Error processing tag ${tag}:`, err);
        }
        
        // Wait a small amount of time between tags to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log("\nFinished populating tags!");
    pool.end();
}

main();
