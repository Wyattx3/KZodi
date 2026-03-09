const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const DATABASE_URL = (process.env.DATABASE_URL || "").replace(/[?&]sslmode=[^&]*/g, "");
const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

const CATEGORIES = {
    "Game": {
        "Love and deepspace": ["Xavier", "Zayne", "Rafayel", "Sylus", "Caleb"],
        "Genshin impact": ["Paimon", "Venti", "Zhongli", "Raiden Shogun", "Nahida", "Furina"],
        "Project sekai: colorful stage": ["Hatsune Miku", "Kanade Yoisaki", "Tsukasa Tenma", "Rui Kamishiro", "Mafuyu Asahina"],
        "Honkai: star rail": ["Kafka", "Firefly", "Acheron", "Dan Heng", "March 7th"],
        "Disney twisted-wonderland": ["Riddle Rosehearts", "Leona Kingscholar", "Azul Ashengrotto", "Malleus Draconia", "Idia Shroud"],
        "Light and night": ["Osborn", "Evan", "Sariel", "Charlie", "Jesse"],
        "Ashes of the kingdom": ["Liu Bian", "Yuan Ji", "Fu Rong", "Zuo Ci", "Sun Ce"],
        "Zenless zone zero": ["Anby Demara", "Nicole Demara", "Billy Kid", "Von Lycaon", "Ellen Joe"],
        "Pokémon": ["Pikachu", "Charizard", "Lucario", "Gengar", "Mewtwo"],
        "Uma musume: pretty derby": ["Special Week", "Silence Suzuka", "Tokai Teio", "Gold Ship", "Mejiro McQueen"],
        "God of war": ["Kratos", "Atreus", "Freya", "Mimir", "Baldur"],
        "Ghost of tsushima": ["Jin Sakai", "Lord Shimura", "Yuna", "Norio", "Khotun Khan"]
    },
    "Movie & Tv": {
        "Harry potter": ["Harry Potter", "Hermione Granger", "Ron Weasley", "Albus Dumbledore", "Voldemort"],
        "Supernatural": ["Sam Winchester", "Dean Winchester", "Castiel", "Crowley", "Jack Kline"],
        "Marvel": ["Iron Man", "Captain America", "Spider-Man", "Thor", "Hulk"],
        "Star Wars": ["Luke Skywalker", "Darth Vader", "Han Solo", "Leia Organa", "Yoda"],
        "Dc": ["Batman", "Superman", "Wonder Woman", "Flash", "Joker"],
        "Game of Thrones": ["Jon Snow", "Daenerys Targaryen", "Tyrion Lannister", "Arya Stark", "Cersei Lannister"],
        "Breaking Bad": ["Walter White", "Jesse Pinkman", "Saul Goodman", "Skyler White", "Hank Schrader"],
        "Alchemy of Souls": ["Jang Uk", "Nak-su", "Mu-deok", "Seo Yul", "Go Won"],
        "Welcome to Waikiki": ["Kang Dong-goo", "Lee Joon-ki", "Bong Doo-shik", "Han Yoon-ah", "Kang Seo-jin"],
        "Squid game": ["Seong Gi-hun", "Cho Sang-woo", "Kang Sae-byeok", "Hwang Jun-ho", "Oh Il-nam"]
    },
    "Kpop": {
        "Cortis": ["Martin", "James", "Juhoon", "Seonghyeon", "Keonho"],
        "Enhypen": ["Jungwon", "Heeseung", "Jay", "Jake", "Sunghoon", "Sunoo", "Ni-ki"],
        "Bts": ["RM", "Jin", "Suga", "J-Hope", "Jimin", "V", "Jungkook"],
        "Stray kids": ["Bang Chan", "Lee Know", "Changbin", "Hyunjin", "Han", "Felix", "Seungmin", "I.N"],
        "Exo": ["Suho", "Xiumin", "Lay", "Baekhyun", "Chen", "Chanyeol", "D.O.", "Kai", "Sehun"],
        "Blackpink": ["Jisoo", "Jennie", "Rosé", "Lisa"],
        "Seventeen": ["S.Coups", "Jeonghan", "Joshua", "Jun", "Hoshi", "Wonwoo", "Woozi", "DK", "Mingyu", "The8", "Seungkwan", "Vernon", "Dino"],
        "Txt": ["Yeonjun", "Soobin", "Beomgyu", "Taehyun", "Huening Kai"],
        "Babymonster": ["Ruka", "Pharita", "Asa", "Ahyeon", "Rami", "Rora", "Chiquita"],
        "Tws": ["Shinyu", "Dohoon", "Youngjae", "Hanjin", "Jihoon", "Kyungmin"],
        "Aespa": ["Karina", "Giselle", "Winter", "Ningning"],
        "Twice": ["Nayeon", "Jeongyeon", "Momo", "Sana", "Jihyo", "Mina", "Dahyun", "Chaeyoung", "Tzuyu"],
        "Newjeans": ["Minji", "Hanni", "Danielle", "Haerin", "Hyein"],
        "Itzy": ["Yeji", "Lia", "Ryujin", "Chaeryeong", "Yuna"],
        "Astro": ["MJ", "Jinjin", "Cha Eun-woo", "Moonbin", "Rocky", "Yoon San-ha"],
        "Plave": ["Yejun", "Noah", "Bamby", "Eunho", "Hamin"]
    }
};

async function getWikiData(charName, sourceName) {
    try {
        let searchQuery = charName;
        if(charName !== sourceName && !charName.includes(sourceName.split(' ')[0])) {
             searchQuery = `${charName} ${sourceName}`;
        }

        const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages|extracts&generator=search&gsrsearch=${encodeURIComponent(searchQuery)}&gsrlimit=1&pithumbsize=500&exsentences=2&exintro=1&explaintext=1`;
        
        const res = await fetch(url, { headers: { 'User-Agent': 'KZodiSeederBot/1.0 (contact@example.com)' } });
        const data = await res.json();
        
        if (data && data.query && data.query.pages) {
            const pages = data.query.pages;
            const pageId = Object.keys(pages)[0];
            const pageInfo = pages[pageId];
            
            let imageUrl = null;
            if (pageInfo.thumbnail && pageInfo.thumbnail.source) {
                imageUrl = pageInfo.thumbnail.source;
            }
            
            let extract = pageInfo.extract || `${charName} from ${sourceName}`;
            if(extract.includes('may refer to')) {
                extract = `${charName} is a notable character from ${sourceName}.`;
            }

            return { description: extract, image: imageUrl };
        }
    } catch (e) {
        console.error(`Wiki search failed for ${charName}: `, e.message);
    }
    return { description: `${charName} from ${sourceName}.`, image: null };
}

async function getFallbackImage(charName, sourceName) {
    try {
        const query = `${charName} ${sourceName} character portrait official art png`;
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
        
        if (data.images && data.images.length > 0) {
            let validImage = data.images.find(img => img.includes('wikia.nocookie.net') || img.includes('fandom'));
            if (!validImage) validImage = data.images.find(img => img.match(/\.(png|jpg|jpeg|webp)/i));
            if (!validImage) validImage = data.images[0];
            return validImage;
        }
    } catch (e) {
        // Fallback to UI-avatars below
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(charName)}&background=random&size=200`;
}

async function insertCharacter(charName, sourceName, tag) {
    const id = `${tag.toLowerCase().replace(/[^a-z0-9]/g, '')}-${sourceName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}-${charName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;
    
    let { description, image } = await getWikiData(charName, sourceName);
    
    if (!image) {
        image = await getFallbackImage(charName, sourceName);
    }

    const tagsArr = JSON.stringify([tag, sourceName]);
    
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
      const greeting = `Hello! I'm ${charName} from ${sourceName}.`;
      const personality = `Defined by ${sourceName} traits.`;

      await pool.query(query, [
        id, 
        charName, 
        tag,
        tagsArr, 
        description, 
        image, 
        greeting, 
        personality,
        sourceName, 
        likes, 
        chats
      ]);
      console.log(`  ✅ Inserted: ${charName} [${sourceName}] - Img: ${image.substring(0,60)}...`);
    } catch (e) {
      console.error(`  ❌ Failed to insert ${charName}:`, e.message);
    }
}

async function main() {
    console.log("=== SEEDING PERFECT CHARACTERS FROM WIKIPEDIA & TAVILY ===\n");
    
    for (const [tag, sources] of Object.entries(CATEGORIES)) {
        console.log(`\n=================\n🎯 Seeding for Tag: ${tag}\n=================`);
        for (const [sourceName, characters] of Object.entries(sources)) {
            console.log(`\n  🎬 Source: ${sourceName}`);
            for (const charName of characters) {
                await insertCharacter(charName, sourceName, tag);
            }
        }
    }

    const res = await pool.query(`SELECT tag, COUNT(*) as cnt FROM characters WHERE tag IN ('Game', 'Movie & Tv', 'Kpop') GROUP BY tag ORDER BY cnt DESC`);
    console.log("\n=== TAG COUNTS IN DB ===");
    res.rows.forEach(r => console.log(`  ${r.tag}: ${r.cnt}`));

    console.log("\n🎉 Seeding Complete!");
    process.exit(0);
}

main();
