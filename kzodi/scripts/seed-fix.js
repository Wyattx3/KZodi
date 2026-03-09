/**
 * DEFINITIVE SEEDER FOR GAME, BL, GL, ROLEPLAY
 * 
 * Fixes:
 * - GAME: Uses AniList specifically filtered by 'source: VIDEO_GAME' to get ACTUAL game characters (not live action actors).
 * - BL: Uses AniList specifically filtered by 'tag: "Boys' Love"' but removes the KR restriction to get the best/most iconic BL characters globally.
 * - GL: Uses AniList specifically filtered by 'tag: "Yuri"' to get iconic GL characters.
 * - ROLEPLAY: Abandons "randomuser.me" (messy real people). Uses Pinterest/Unsplash style curated high-aesthetic anime/stylized character art, OR we just use a highly curated list of AniList characters with fitting visual aesthetics. To guarantee it works flawlessly without failing URLs, we'll map Roleplay concepts to visually striking AniList characters.
 */

const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    connectionString: (process.env.DATABASE_URL || "").replace(/[?&]sslmode=[^&]*/g, ""),
    ssl: { rejectUnauthorized: false }
});

// Helper to fetch from AniList
async function fetchAniList(tag, queryParams, targetCount = 100) {
    console.log(`\n[AniList] Fetching "${tag}" with params: ${queryParams}`);
    let results = [];
    let seen = new Set();
    const query = `
        query($page:Int,$perPage:Int){
            Page(page:$page,perPage:$perPage){
                characters(sort:FAVOURITES_DESC,${queryParams}){
                    id name{full} image{large} description
                    media(sort:POPULARITY_DESC,perPage:1){nodes{title{english romaji}}}
                }
            }
        }`;
    
    // We fetch character directly rather than media->characters for better sorting by popularity
    for (let page = 1; page <= 8 && results.length < targetCount; page++) {
        try {
            const res = await fetch("https://graphql.anilist.co", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query, variables: { page, perPage: 50 } })
            });
            const data = await res.json();
            const chars = data?.data?.Page?.characters || [];
            if (!chars.length) break;

            for (const c of chars) {
                if (results.length >= targetCount) break;
                if (!c.image?.large || c.image.large.includes("default.jpg") || seen.has(c.name.full)) continue;
                
                const src = c.media?.nodes?.[0]?.title?.english || c.media?.nodes?.[0]?.title?.romaji || tag;
                
                seen.add(c.name.full);
                results.push({
                    name: c.name.full,
                    description: `${c.name.full} from ${src}`,
                    longDescription: (c.description || "").replace(/~!.*?!~/gs, '').substring(0, 500),
                    image: c.image.large,
                    greeting: `Hello, I'm ${c.name.full}.`,
                    personality: "authentic",
                    source: src
                });
            }
            await new Promise(r => setTimeout(r, 800)); // Rate limit
        } catch (e) {
            console.error("AniList Error:", e.message);
            break;
        }
    }
    console.log(`  -> Got ${results.length} characters for ${tag}`);
    return results;
}

// For Roleplay, we need "Your Boss", "Your Dad" etc.
// Instead of messy real people, we map these to visually fitting Top Anime Characters
// User wants aesthetic, clean characters, like other c.ai clones.
const ROLEPLAY_MAPPINGS = [
    { n: "Your Strict CEO", q: 'search:"Levi"' },
    { n: "Your Yandere Girlfriend", q: 'search:"Yuno Gasai"' },
    { n: "Your Overprotective Brother", q: 'search:"Itachi Uchiha"' },
    { n: "Your Childhood Best Friend", q: 'search:"Naruto Uzumaki"' },
    { n: "Your Cool Sensei", q: 'search:"Gojo Satoru"' },
    { n: "Your Stern Father", q: 'search:"Loid Forger"' },
    { n: "Your Sweet Mother", q: 'search:"Yor Forger"' },
    { n: "Your Rival", q: 'search:"Sasuke Uchiha"' },
    { n: "Your Cold Prince", q: 'search:"Todoroki"' },
    { n: "Your Secret Admirer", q: 'search:"Hinata Hyuga"' },
    { n: "Your Bully", q: 'search:"Katsuki Bakugo"' },
    { n: "Your Maid", q: 'search:"Rem"' },
    { n: "Your Butler", q: 'search:"Sebastian Michaelis"' },
    { n: "Your Vampire Master", q: 'search:"Alucard"' },
    { n: "The Transfer Student", q: 'search:"Killua"' },
    { n: "Your Slacker Roommate", q: 'search:"Gintoki"' },
    { n: "Your Bodyguard", q: 'search:"Zoro"' },
    { n: "Your Mafia Boss", q: 'search:"Chrollo"' },
    { n: "Your Annoying Little Sister", q: 'search:"Nezuko"' },
    { n: "Your Genius Classmate", q: 'search:"Light Yagami"' },
    { n: "Your Step-Brother", q: 'search:"Eren Yeager"' },
    { n: "Your Step-Sister", q: 'search:"Mikasa Ackerman"' },
    { n: "Your Ex-Boyfriend", q: 'search:"Dazai"' },
    { n: "Your Ex-Girlfriend", q: 'search:"Makise Kurisu"' },
    { n: "Your Hot Neighbor", q: 'search:"Spike Spiegel"' },
    { n: "Your Shy Neighbor", q: 'search:"Violet Evergarden"' },
    { n: "Your Demon Lord", q: 'search:"Sukuna"' },
    { n: "Your Angel Protector", q: 'search:"Saber"' },
    { n: "Your Pirate Captain", q: 'search:"Luffy"' },
    { n: "The Quiet Librarian", q: 'search:"Robin"' }
];

async function seedRoleplay(targetCount = 100) {
    console.log(`\n[Roleplay] Fetching mapped aesthetic characters...`);
    let results = [];
    
    // 1. Fetch the manual mapped ones (top 30)
    for (const mapping of ROLEPLAY_MAPPINGS) {
        try {
            const query = `query{Character(${mapping.q}){name{full} image{large}}}`;
            const res = await fetch("https://graphql.anilist.co", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query })
            });
            const data = await res.json();
            const char = data?.data?.Character;
            if (char && char.image?.large) {
                results.push({
                    name: mapping.n,
                    description: `Roleplay: ${mapping.n}`,
                    longDescription: `You are roleplaying as ${mapping.n}.`,
                    image: char.image.large,
                    greeting: `*walks up to you* Hey...`,
                    personality: "roleplay",
                    source: "Roleplay"
                });
            }
            await new Promise(r => setTimeout(r, 400));
        } catch (e) {}
    }

    // 2. Fill the rest with visually striking anime characters mapped to generic roleplay concepts
    const concepts = ["Your Doctor", "Your Lawyer", "Your Uber Driver", "Your Barista", "Your Personal Trainer", "The Café Owner", "Your Tutor", "Your Detective", "Your Chef", "Your Co-worker", "Your Manager", "The Popular Girl", "The Popular Guy", "The Quiet Student", "The Delinquent", "The Class President", "Your Senpai", "Your Kouhai", "Your Guild Master", "Your Healer", "Your Tank", "Your Assassin", "Your Knight", "Your Queen", "Your King", "Your Princess", "The Witch", "The Wizard", "The Dragon", "Your Familiar", "Your Guardian", "Your Mentor", "The Bartender", "The Bouncer", "The Hacker", "The Mechanic", "Your Pilot", "Your Captain", "The Rockstar", "The Idol", "Your Biggest Fan", "Your Stalker", "The Ghost", "Your Soulmate", "Your Destined Enemy", "The Time Traveler", "The Alien", "Your AI Assistant", "The Cyborg", "Your Clone", "The Goddess", "The God", "Your Priest", "Your Priestess", "The Mercenary", "The Bounty Hunter", "Your Landlord", "Your Landlady", "The Delivery Driver", "Your Therapist", "The Artist", "The Musician", "The Author", "The Poet", "The Photographer", "The Filmmaker", "The Streamer", "The Pro Gamer", "The CEO's Son", "The CEO's Daughter", "Your Sugar Daddy", "Your Sugar Mommy", "The Sugar Baby"];
    
    const query = `query{Page(page:7,perPage:${targetCount - results.length}){characters(sort:FAVOURITES_DESC){id name{full} image{large}}}}`;
    try {
        const res = await fetch("https://graphql.anilist.co", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query })
        });
        const data = await res.json();
        const chars = data?.data?.Page?.characters || [];
        
        let conceptIdx = 0;
        for (const c of chars) {
            if (results.length >= targetCount) break;
            if (!c.image?.large || c.image.large.includes("default.jpg")) continue;
            
            const concept = concepts[conceptIdx % concepts.length];
            conceptIdx++;
            
            results.push({
                name: concept,
                description: `Roleplay: ${concept}`,
                longDescription: `You are roleplaying as ${concept}.`,
                image: c.image.large,
                greeting: `Hey... It's me.`,
                personality: "roleplay",
                source: "Roleplay"
            });
        }
    } catch (e) {}
    
    console.log(`  -> Got ${results.length} characters for Roleplay`);
    return results;
}

// Special BL/GL fetchers because AniList character filters for genre are tricky. 
// We must fetch MEDIA by genre, then extract top characters.
async function fetchByMediaGenre(tag, genre, targetCount = 100) {
    console.log(`\n[AniList MEDIA] Fetching "${tag}" via Genre "${genre}"...`);
    let results = [];
    let seen = new Set();
    const query = `
        query($page:Int,$perPage:Int){
            Page(page:$page,perPage:$perPage){
                media(sort:POPULARITY_DESC,genre_in:["${genre}"]){
                    title{english romaji}
                    characters(sort:FAVOURITES_DESC,perPage:4){
                        nodes{id name{full} image{large} description}
                    }
                }
            }
        }`;
        
    for (let page = 1; page <= 10 && results.length < targetCount; page++) {
        try {
            const res = await fetch("https://graphql.anilist.co", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query, variables: { page, perPage: 25 } })
            });
            const data = await res.json();
            const medias = data?.data?.Page?.media || [];
            if (!medias.length) break;

            for (const m of medias) {
                if (results.length >= targetCount) break;
                const src = m.title?.english || m.title?.romaji;
                
                for (const c of (m.characters?.nodes || [])) {
                    if (results.length >= targetCount) break;
                    if (!c.image?.large || c.image.large.includes("default.jpg") || seen.has(c.name.full)) continue;
                    
                    seen.add(c.name.full);
                    results.push({
                        name: c.name.full,
                        description: `${c.name.full} from ${src}`,
                        longDescription: (c.description || "").replace(/~!.*?!~/gs, '').substring(0, 500),
                        image: c.image.large,
                        greeting: `Hello, I'm ${c.name.full}.`,
                        personality: "authentic",
                        source: src
                    });
                }
            }
            await new Promise(r => setTimeout(r, 800)); // Rate limit
        } catch (e) {
            console.error("AniList Error:", e.message);
            break;
        }
    }
    console.log(`  -> Got ${results.length} characters for ${tag}`);
    return results;
}

async function fetchGameCharacters(targetCount = 100) {
    console.log(`\n[AniList GAME] Fetching Game Characters...`);
    let results = [];
    let seen = new Set();
    // Video games adaptation filter
    const query = `
        query($page:Int,$perPage:Int){
            Page(page:$page,perPage:$perPage){
                media(sort:POPULARITY_DESC,source:VIDEO_GAME){
                    title{english romaji}
                    characters(sort:FAVOURITES_DESC,perPage:4){
                        nodes{id name{full} image{large} description}
                    }
                }
            }
        }`;
        
    for (let page = 1; page <= 10 && results.length < targetCount; page++) {
        try {
            const res = await fetch("https://graphql.anilist.co", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query, variables: { page, perPage: 25 } })
            });
            const data = await res.json();
            const medias = data?.data?.Page?.media || [];
            if (!medias.length) break;

            for (const m of medias) {
                if (results.length >= targetCount) break;
                const src = m.title?.english || m.title?.romaji;
                
                for (const c of (m.characters?.nodes || [])) {
                    if (results.length >= targetCount) break;
                    // Strict filtering
                    if (!c.image?.large || c.image.large.includes("default.jpg") || seen.has(c.name.full)) continue;
                    
                    seen.add(c.name.full);
                    results.push({
                        name: c.name.full,
                        description: `${c.name.full} from the game ${src}`,
                        longDescription: (c.description || "").replace(/~!.*?!~/gs, '').substring(0, 500),
                        image: c.image.large,
                        greeting: `I'm ${c.name.full}.`,
                        personality: "game character",
                        source: src
                    });
                }
            }
            await new Promise(r => setTimeout(r, 800)); // Rate limit
        } catch (e) {
            console.error("AniList Error:", e.message);
            break;
        }
    }
    console.log(`  -> Got ${results.length} Game characters`);
    return results;
}

async function seedDB(tag, chars) {
    const client = await pool.connect();
    let n = 0;
    try {
        // DELETE OLD STUFF
        const delRes = await client.query("DELETE FROM characters WHERE tag=$1", [tag]);
        console.log(`  Deleted ${delRes.rowCount} old characters from ${tag}`);
        
        for (let i = 0; i < chars.length; i++) {
            const c = chars[i];
            const id = `${tag.toLowerCase().replace(/[^a-z0-9]/g,"")}-fix-${Date.now()}-${i}`;
            await client.query(`INSERT INTO characters (id,name,tag,tags,description,long_description,image,greeting,personality,visibility,source,likes_count,chatter_count) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                [id, c.name.substring(0,100), tag, JSON.stringify([tag]), c.description.substring(0,255), c.longDescription, c.image, c.greeting, c.personality, "public", c.source||tag, Math.floor(Math.random()*2000+100), Math.floor(Math.random()*5000+200)]);
            n++;
        }
        console.log(`  ✅ Inserted ${n} for [${tag}]`);
    } catch(e) { console.error(`  ❌`, e.message); }
    finally { client.release(); }
}

async function main() {
    console.log("=== FINAL FIX SEEDER FOR GAME, BL, GL, ROLEPLAY ===\n");

    // 1. GAME -> AniList source:VIDEO_GAME (Real top-tier Game characters like Saber, Persona, Nier)
    const game = await fetchGameCharacters(100);
    if (game.length > 0) await seedDB("Game", game);

    // 2. BL -> AniList genre:"Boys' Love"
    const bl = await fetchByMediaGenre("BL", "Boys\\' Love", 100);
    if (bl.length > 0) await seedDB("BL", bl);

    // 3. GL -> AniList genre:"Yuri"
    const gl = await fetchByMediaGenre("GL", "Yuri", 100);
    if (gl.length > 0) await seedDB("GL", gl);

    // 4. Roleplay -> High Aesthetic Anime Mapping
    const roleplay = await seedRoleplay(100);
    if (roleplay.length > 0) await seedDB("Roleplay", roleplay);

    const res = await pool.query("SELECT tag, count(*) as cnt FROM characters GROUP BY tag ORDER BY cnt DESC");
    console.log("\n=== FINAL COUNTS ===");
    res.rows.forEach(r => console.log(`  ${r.tag}: ${r.cnt}`));
    
    process.exit(0);
}

main();
