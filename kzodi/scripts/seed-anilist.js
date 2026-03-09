const { Pool } = require("pg");
require("dotenv").config();

const DATABASE_URL = (process.env.DATABASE_URL || "").replace(/[?&]sslmode=[^&]*/g, "");

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const ANILIST_QUERY = `
query($page: Int) {
    Page(page: $page, perPage: 50) {
        characters(sort: FAVOURITES_DESC) {
            id
            name {
                full
            }
            image {
                large
            }
            description
            media(sort: POPULARITY_DESC, perPage: 1) {
                nodes {
                    title {
                        romaji
                        english
                    }
                }
            }
        }
    }
}
`;

// Helper to sanitize the AniList description to base length
function cleanDescription(desc) {
    if (!desc) return "";
    return desc.replace(/__+/g, '').replace(/~!.*?!~/g, '').replace(/[\\*_~`]/g, '').trim().substring(0, 500);
}

// Simple prompt template engine locally to save API calls
function generateGreeting(name, source) {
    if (source) {
        return `Ah, you're awake. I'm ${name} from ${source}. What do you need right now?`;
    }
    return `Hello. I am ${name}. Do you need something?`;
}

function generatePersonality(name) {
    return `A complex individual named ${name}, driven by intense motivations and loyalty to their cause. Quiet, confident, powerful.`;
}

async function fetchAniListCharacters() {
    console.log("Fetching top 100 characters from AniList API...");
    
    const fetchPage = async (page) => {
        const res = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ query: ANILIST_QUERY, variables: { page } })
        });
        const data = await res.json();
        return data.data.Page.characters;
    };

    const page1 = await fetchPage(1);
    const page2 = await fetchPage(2);
    const allChars = [...page1, ...page2];

    const characters = allChars.map(char => {
        const source = char.media?.nodes?.[0]?.title?.english || char.media?.nodes?.[0]?.title?.romaji || "Anime";
        return {
            id: `anilist-${char.id}`,
            name: char.name.full,
            tag: "Anime",
            tags: ["Anime", "Popular"],
            description: `${char.name.full} from ${source}.`,
            longDescription: cleanDescription(char.description),
            image: char.image.large,
            greeting: generateGreeting(char.name.full, source),
            personality: generatePersonality(char.name.full),
            visibility: 'public',
            source: source,
            likes: Math.floor(Math.random() * 5000),
            totalUsers: Math.floor(Math.random() * 10000)
        }
    });

    return characters;
}

async function seed() {
    console.log("Connecting to database...");
    const client = await pool.connect();

    try {
        const characters = await fetchAniListCharacters();
        console.log(`Seeding ${characters.length} AniList characters into database...`);

        let count = 0;
        for (const char of characters) {
            await client.query(`
                INSERT INTO characters (
                    id, name, tag, tags, description, long_description,
                    image, greeting, personality, visibility, source, likes_count, chatter_count
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
                ) ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    tag = EXCLUDED.tag,
                    description = EXCLUDED.description,
                    long_description = EXCLUDED.long_description,
                    image = EXCLUDED.image,
                    greeting = EXCLUDED.greeting,
                    personality = EXCLUDED.personality,
                    source = EXCLUDED.source,
                    likes_count = GREATEST(characters.likes_count, EXCLUDED.likes_count),
                    chatter_count = GREATEST(characters.chatter_count, EXCLUDED.chatter_count)
            `, [
                char.id, char.name, char.tag, JSON.stringify(char.tags), char.description, char.longDescription,
                char.image, char.greeting, char.personality, char.visibility, char.source, char.likes, char.totalUsers
            ]);
            count++;
        }

        console.log(`Successfully seeded ${count} AniList characters!`);
    } catch (e) {
        console.error("Error seeding characters:", e);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
