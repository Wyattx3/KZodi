const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const DATABASE_URL = (process.env.DATABASE_URL || "").replace(/[?&]sslmode=[^&]*/g, "");
const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// Hardcoded PERFECT authentic character list for 100% accuracy (no AI hallucinations)
const HARDCODED_GAMES = {
    "Love and deepspace": [
        {name: "Xavier", desc: "A mysterious Deepspace Hunter with light evol.", pers: "Calm, protective"},
        {name: "Zayne", desc: "A genius cardiac surgeon with ice evol.", pers: "Cold but caring"},
        {name: "Rafayel", desc: "A passionate artist from Lemuria with fire evol.", pers: "Dramatic, clingy"},
        {name: "Sylus", desc: "A dangerous outlaw from the N109 Zone.", pers: "Dominant, ruthless"},
        {name: "Caleb", desc: "Your childhood friend and fellow hunter.", pers: "Cheerful, brotherly"}
    ],
    "Genshin impact": [
        {name: "Raiden Shogun", desc: "The Electro Archon of Inazuma.", pers: "Stern, unyielding"},
        {name: "Zhongli", desc: "The Geo Archon of Liyue.", pers: "Calm, knowledgeable"},
        {name: "Furina", desc: "The hydro archon figurehead of Fontaine.", pers: "Theatrical, anxious"},
        {name: "Nahida", desc: "The Dendro Archon of Sumeru.", pers: "Curious, wise"},
        {name: "Venti", desc: "The Anemo Archon of Mondstadt.", pers: "Carefree, musical"}
    ],
    "Project sekai: colorful stage": [
        {name: "Hatsune Miku", desc: "The world's most famous virtual singer.", pers: "Cheerful, supportive"},
        {name: "Kanade Yoisaki", desc: "Composer for the underground circle Nightcord at 25:00.", pers: "Quiet, dedicated"},
        {name: "Tsukasa Tenma", desc: "The self-proclaimed future star of Wonderlands x Showtime.", pers: "Loud, confident"},
        {name: "Rui Kamishiro", desc: "A genius stage director and inventor.", pers: "Eccentric, brilliant"},
        {name: "Mafuyu Asahina", desc: "An honors student who lost her sense of self.", pers: "Empty, polite"}
    ],
    "Honkai: star rail": [
        {name: "Kafka", desc: "A mysterious Stellaron Hunter.", pers: "Manipulative, elegant"},
        {name: "Firefly", desc: "A sweet girl who secretly pilots the SAM armor.", pers: "Gentle, determined"},
        {name: "Acheron", desc: "A Galaxy Ranger walking the path of Nihility.", pers: "Forgetful, powerful"},
        {name: "Dan Heng", desc: "The stoic archivist of the Astral Express.", pers: "Quiet, reliable"},
        {name: "March 7th", desc: "A cheery girl found frozen in ice.", pers: "Energetic, photogenic"}
    ],
    "Disney twisted-wonderland": [
        {name: "Riddle Rosehearts", desc: "Housewarden of Heartslabyul, strict on rules.", pers: "Strict, angry"},
        {name: "Leona Kingscholar", desc: "Housewarden of Savanaclaw, a lazy prince.", pers: "Lazy, cynical"},
        {name: "Azul Ashengrotto", desc: "Housewarden of Octavinelle, deals in contracts.", pers: "Calculating, greedy"},
        {name: "Malleus Draconia", desc: "Housewarden of Diasomnia, a powerful fae prince.", pers: "Lonely, majestic"},
        {name: "Idia Shroud", desc: "Housewarden of Ignihyde, an introverted gamer.", pers: "Shut-in, cynical"}
    ],
    "Light and night": [
        {name: "Osborn", desc: "A famous race car driver with a fiery spirit.", pers: "Passionate, straightforward"},
        {name: "Evan", desc: "The elegant CEO of Group W.", pers: "Gentle, secretive"},
        {name: "Sariel", desc: "A top designer with a sharp tongue.", pers: "Strict, perfectionist"},
        {name: "Charlie", desc: "A charismatic doctor from a wealthy family.", pers: "Playful, devoted"},
        {name: "Jesse", desc: "A cheerful stage actor.", pers: "Sunny, energetic"}
    ],
    "Ashes of the kingdom": [
        {name: "Liu Bian", desc: "The young Emperor of Han.", pers: "Tragic, devoted"},
        {name: "Yuan Ji", desc: "A mysterious strategist.", pers: "Calculating, gentle"},
        {name: "Fu Rong", desc: "A fiery general from a military family.", pers: "Brave, impulsive"},
        {name: "Zuo Ci", desc: "Your master, a celestial being.", pers: "Aloof, protective"},
        {name: "Sun Ce", desc: "The young conqueror of Jiangdong.", pers: "Bold, charismatic"}
    ],
    "Zenless zone zero": [
        {name: "Anby Demara", desc: "A quiet girl who loves movies.", pers: "Stoic, obsessed"},
        {name: "Nicole Demara", desc: "Leader of the Cunning Hares.", pers: "Greedy, cunning"},
        {name: "Billy Kid", desc: "A cyborg who acts like a movie gunslinger.", pers: "Flashy, goofy"},
        {name: "Von Lycaon", desc: "A gentlemanly wolf butler.", pers: "Polite, elegant"},
        {name: "Ellen Joe", desc: "A shark-tailed maid of Victoria Housekeeping.", pers: "Lazy, sharp"}
    ],
    "Pokémon": [
        {name: "Pikachu", desc: "The iconic electric mouse Pokémon.", pers: "Loyal, energetic"},
        {name: "Charizard", desc: "A powerful fire and flying type dragon.", pers: "Proud, fiery"},
        {name: "Lucario", desc: "An aura-sensing fighting/steel type Pokémon.", pers: "Noble, serious"},
        {name: "Gengar", desc: "A mischievous ghost-type Pokémon.", pers: "Playful, spooky"},
        {name: "Mewtwo", desc: "A genetically engineered psychic Pokémon.", pers: "Brooding, powerful"}
    ],
    "Uma musume: pretty derby": [
        {name: "Special Week", desc: "A hard-working horse girl from Hokkaido.", pers: "Earnest, gluttonous"},
        {name: "Silence Suzuka", desc: "A quiet runner who leads from the front.", pers: "Focused, serene"},
        {name: "Tokai Teio", desc: "A cheerful girl aiming to be undefeated.", pers: "Energetic, proud"},
        {name: "Gold Ship", desc: "Eratic, unpredictable, but incredibly fast.", pers: "Eccentric, wild"},
        {name: "Mejiro McQueen", desc: "A refined and elegant long-distance runner.", pers: "Elegant, proud"}
    ],
    "God of war": [
        {name: "Kratos", desc: "The Ghost of Sparta.", pers: "Gruff, stern"},
        {name: "Atreus", desc: "Kratos's son, also known as Loki.", pers: "Curious, rebellious"},
        {name: "Freya", desc: "Vanir Goddess and former Queen of Valkyries.", pers: "Fierce, maternal"},
        {name: "Mimir", desc: "The smartest man alive, now a head.", pers: "Wise, talkative"},
        {name: "Baldur", desc: "Aesir god who feels no pain.", pers: "Unhinged, aggressive"}
    ],
    "Ghost of tsushima": [
        {name: "Jin Sakai", desc: "The Ghost of Tsushima, fighting Mongols.", pers: "Honorable, conflicted"},
        {name: "Lord Shimura", desc: "Jito of Tsushima and Jin's uncle.", pers: "Strict, traditional"},
        {name: "Yuna", desc: "A thief who helps Jin.", pers: "Pragmatic, survivor"},
        {name: "Norio", desc: "A warrior monk of Cedar Temple.", pers: "Gentle, fierce"},
        {name: "Khotun Khan", desc: "The ruthless Mongol leader.", pers: "Calculating, brutal"}
    ]
};

async function getImageUrlWithTavily(charName, gameName) {
    console.log(`🔍 Searching explicit image for: ${charName} (${gameName})`);
    try {
        const query = `${charName} ${gameName} official character art portrait png`;
        const res = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`
            },
            body: JSON.stringify({
                query: query,
                search_depth: "basic",
                include_images: true,
                max_results: 3
            })
        });

        const data = await res.json();
        
        let validImage = null;
        if (data.images && data.images.length > 0) {
            // Prefer wikia/fandom/png
            validImage = data.images.find(img => img.includes('wikia.nocookie.net') || img.includes('fandom'));
            if (!validImage) validImage = data.images.find(img => img.match(/\.(png|jpg|jpeg|webp)/i));
            if (!validImage) validImage = data.images[0];
        }

        if (!validImage || validImage.includes("ui-avatars")) {
             return `https://ui-avatars.com/api/?name=${encodeURIComponent(charName)}&background=random&size=200`;
        }
        return validImage;

    } catch (e) {
        console.error(`❌ Tavily Search failed for ${charName}:`, e.message);
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(charName)}&background=random&size=200`;
    }
}

async function insertCharacter(char, gameName) {
    const id = `game-${gameName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}-${char.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;
    
    const image = await getImageUrlWithTavily(char.name, gameName);
    const tag = "Game";
    const tagsArr = JSON.stringify([tag, gameName]);
    
    const query = `
      INSERT INTO characters 
        (id, name, tag, tags, description, image, greeting, personality, visibility, source, likes_count, msg_count, chatter_count)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, 'public', $9, $10, 0, $11)
      ON CONFLICT (id) DO NOTHING
    `;

    try {
      const likes = Math.floor(Math.random() * 2000 + 100);
      const chats = Math.floor(Math.random() * 5000 + 200);

      await pool.query(query, [
        id, 
        char.name, 
        tag,
        tagsArr, 
        char.desc, 
        image, 
        `Hello, I'm ${char.name}.`, 
        char.pers,
        gameName, 
        likes, 
        chats
      ]);
      console.log(`  ✅ Inserted: ${char.name} [${gameName}] - Img: ${image.substring(0,40)}...`);
    } catch (e) {
      console.error(`  ❌ Failed to insert ${char.name}:`, e.message);
    }
}

async function main() {
    console.log("=== SEEDING PERFECT GAME CHARACTERS (HARDCODED LIST + TAVILY IMAGES) ===\n");
    
    for (const [gameName, characters] of Object.entries(HARDCODED_GAMES)) {
        console.log(`\n🎮 Seeding for Game: ${gameName}`);
        for (const char of characters) {
            await insertCharacter(char, gameName);
        }
    }

    const res = await pool.query("SELECT source, COUNT(*) as cnt FROM characters WHERE tag='Game' GROUP BY source ORDER BY cnt DESC");
    console.log("\n=== GAME TAG COUNTS IN DB ===");
    res.rows.forEach(r => console.log(`  ${r.source}: ${r.cnt}`));

    console.log("\n🎉 Seeding Complete!");
    process.exit(0);
}

main();
