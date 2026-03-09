const { Pool } = require("pg");
require("dotenv").config();

const DATABASE_URL = (process.env.DATABASE_URL || "").replace(/[?&]sslmode=[^&]*/g, "");

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const CATEGORIES_TO_SEED = [
    "Manga", "Game", "K-pop", "Movies", "TV", "Books",
    "VTuber", "Original", "History", "Mythology", "Philosophy",
    "Celebrity", "Roleplay", "BL", "GL", "Specialist"
];

const firstNames = ["Kael", "Lyra", "Zane", "Nova", "Ryder", "Luna", "Finn", "Aria", "Jaxon", "Aurora", "Kai", "Hazel", "Ezra", "Mila", "Silas", "Freya", "Asher", "Stella", "Leo", "Ivy", "Jin", "Minho", "Eun", "Jisu", "Tae", "Yuna"];
const lastNames = ["Vane", "Sterling", "Blackwood", "Frost", "Mercer", "Vale", "Storm", "Everly", "Thorne", "Ash", "Wong", "Kim", "Park", "Bae", "Han"];
const titles = ["The Wanderer", "The Crimson Shadow", "The Silent Blade", "The Golden Idol", "The Forgotten King", "The Archmage", "The Last Survivor", "The Oracle"];
const traits = ["brave", "mysterious", "cunning", "loyal", "arrogant", "charming", "reckless", "quiet", "energetic", "stoic"];
const worlds = ["Eldoria", "Cyber City", "Neo Tokyo", "The Wasteland", "The Hidden Kingdom", "Seoul", "Olympus", "The Underworld"];

function getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateCharacters(category, count) {
    const characters = [];
    for (let i=0; i<count; i++) {
        const name = `${getRandom(firstNames)} ${getRandom(lastNames)}`;
        const title = getRandom(titles);
        const world = getRandom(worlds);
        
        characters.push({
            name: name,
            description: `${title} from ${world}.`,
            longDescription: `${name} is known as ${title} across ${world}. They possess a unique blend of skills that make them both feared and respected in their category of ${category}.`,
            greeting: `Hello. I am ${name}. What brings you to ${world}?`,
            personality: `${getRandom(traits)}, ${getRandom(traits)}, ${getRandom(traits)}`,
            source: world
        });
    }
    return characters;
}

function getAvatarUrl(name, category) {
    const encoded = encodeURIComponent(name);
    let style = "avataaars";
    if (["History", "Mythology", "Philosophy"].includes(category)) style = "bottts";
    if (["Roleplay", "Original"].includes(category)) style = "adventurer";
    if (["Game", "VTuber"].includes(category)) style = "pixel-art";
    if (["Manga", "BL", "GL"].includes(category)) style = "miniavs";
    return `https://api.dicebear.com/9.x/${style}/svg?seed=${encoded}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

async function seed() {
    console.log("Connecting to database...");
    const client = await pool.connect();
    try {
        let totalCount = 0;
        for (const category of CATEGORIES_TO_SEED) {
            console.log(`Seeding Category: ${category}`);
            const categoryCharacters = generateCharacters(category, 100);
            
            let inserted = 0;
            for (let j = 0; j < categoryCharacters.length; j++) {
                const char = categoryCharacters[j];
                const id = `mock-${category.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}-${j}`;
                const tags = [category];
                const image = getAvatarUrl(char.name, category);
                const likes = Math.floor(Math.random() * 2000);
                const chatter = Math.floor(Math.random() * 5000) + likes;

                await client.query(`
                    INSERT INTO characters (
                        id, name, tag, tags, description, long_description,
                        image, greeting, personality, visibility, source, likes_count, chatter_count
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
                    )
                `, [
                    id, char.name, category, JSON.stringify(tags), 
                    char.description, char.longDescription, image, 
                    char.greeting, char.personality, 'public', char.source, likes, chatter
                ]);
                inserted++;
                totalCount++;
            }
        }
        console.log(`\n=== SUCCESSFULLY SEEDED ${totalCount} CHARACTERS TOTAL! ===`);
    } catch(e) { console.error(e); } finally { client.release(); await pool.end(); }
}
seed();
