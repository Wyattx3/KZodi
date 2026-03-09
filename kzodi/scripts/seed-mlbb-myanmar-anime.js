/**
 * SEED: Mobile Legends characters (Game), Myanmar Heroes (History), 5000 Anime (AniList)
 * Run: node scripts/seed-mlbb-myanmar-anime.js
 */
const https = require("https");
const { Pool } = require("pg");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
    connectionString: (process.env.DATABASE_URL || "").replace(/[?&]sslmode=[^&]*/g, ""),
    ssl: { rejectUnauthorized: false }
});

// ═══════════════ MOBILE LEGENDS: BANG BANG - ALL HEROES ═══════════════
const MLBB_HEROES = [
    // Tank
    "Tigreal","Akai","Franco","Minotaur","Lolita","Gatotkaca","Grock","Hylos","Uranus","Belerick","Khufra","Baxia","Atlas","Barats","Edith","Fredrinn","Chip","Cici",
    // Fighter
    "Balmond","Alucard","Zilong","Freya","Alpha","Ruby","Roger","Argus","Jawhead","Martis","Aldous","Minsitthar","Badang","Guinevere","X.Borg","Dyrroth","Masha","Silvanna","Yu Zhong","Khaleed","Paquito","Phoveus","Aulus","Yin","Julian","Arlott","Cici","Joy","Zhuxin",
    // Assassin
    "Saber","Karina","Fanny","Natalia","Hayabusa","Lancelot","Helcurt","Hanzo","Gusion","Ling","Benedetta","Mathilda","Aamon","Nolan","Harley","Kadita","Selena",
    // Mage
    "Eudora","Alice","Nana","Kagura","Vexana","Aurora","Pharsa","Odette","Zhask","Valir","Lunox","Harith","Esmeralda","Cecilion","Luo Yi","Yve","Valentina","Xavier","Novaria","Lylia","Vale","Chang'e","Cyclops",
    // Marksman
    "Layla","Miya","Bruno","Clint","Moskov","Karrie","Irithel","Lesley","Hanabi","Claude","Granger","Wanwan","Popol and Kupa","Brody","Beatrix","Melissa","Natan","Ixia","Kimmy",
    // Support
    "Rafaela","Estes","Angela","Diggie","Floryn","Mathilda","Johnson","Kaja","Faramis","Carmilla","Lolita","Minotaur",
    // Extra popular ones
    "Gloo","Terizla","Thamuz","Hilda","Sun","Chou","Lapu-Lapu","Leomord","Bane","Yi Sun-shin","Moskov"
];

// ═══════════════ MYANMAR HISTORICAL HEROES ═══════════════
const MYANMAR_HEROES = [
    { name: "Anawrahta", wiki: "Anawrahta", desc: "Founder of the Pagan Empire, first unifier of Myanmar" },
    { name: "Bayinnaung", wiki: "Bayinnaung", desc: "King of the Toungoo Empire, greatest conqueror in Myanmar history" },
    { name: "Alaungpaya", wiki: "Alaungpaya", desc: "Founder of the Konbaung dynasty and third unifier of Myanmar" },
    { name: "Tabinshwehti", wiki: "Tabinshwehti", desc: "King of the Toungoo dynasty who reunified Myanmar" },
    { name: "Kyansittha", wiki: "Kyansittha", desc: "Third king of the Pagan dynasty, warrior and patron of Buddhism" },
    { name: "Aung San", wiki: "Aung San", desc: "Father of Myanmar independence, national hero and revolutionary leader" },
    { name: "Bandoola", wiki: "Maha Bandula", desc: "Legendary Burmese general in the First Anglo-Burmese War" },
    { name: "Mindon Min", wiki: "Mindon Min", desc: "Penultimate king of Myanmar who reformed the Konbaung dynasty" },
    { name: "Thibaw Min", wiki: "Thibaw Min", desc: "Last king of Myanmar before British colonization" },
    { name: "Supayalat", wiki: "Supayalat", desc: "The last queen consort of Myanmar, wife of Thibaw Min" },
    { name: "Shin Maha Ratthasara", wiki: "Shin Maha Ratthasara", desc: "Legendary Burmese monk and scholar" },
    { name: "Naresuan", wiki: "Naresuan", desc: "Siamese king who defeated Myanmar forces and regained independence" },
    { name: "Shin Arahan", wiki: "Shin Arahan", desc: "Mon Buddhist monk who converted King Anawrahta to Theravada Buddhism" },
    { name: "Yazathingyan", wiki: "Yazathingyan", desc: "One of the Four Paladins of Pagan who defended the kingdom" },
    { name: "Thiha Thu", wiki: "Thiha Thu", desc: "Son of Kyansittha and one of the Four Paladins of Pagan" },
    { name: "Narathu", wiki: "Narathu", desc: "King of the Pagan dynasty known for building Dhammayangyi Temple" },
    { name: "Saw Mon Hla", wiki: "Saw Mon Hla", desc: "Queen of Hanthawaddy Pegu, legendary Mon queen" },
    { name: "Razadarit", wiki: "Razadarit", desc: "King of Hanthawaddy who united the Mon people against the Burmese" },
    { name: "Bo Aung Kyaw", wiki: "Bo Aung Kyaw", desc: "Student leader and martyr of Myanmar's independence movement" },
    { name: "Saya San", wiki: "Saya San", desc: "Leader of the Saya San Rebellion against British rule" },
    { name: "U Ottama", wiki: "U Ottama", desc: "Buddhist monk and political activist who inspired Myanmar independence" },
    { name: "Thakin Kodaw Hmaing", wiki: "Thakin Kodaw Hmaing", desc: "Myanmar literary figure and political activist" },
    { name: "Bo Ne Win", wiki: "Ne Win", desc: "Military leader and politician of Myanmar" },
    { name: "U Thant", wiki: "U Thant", desc: "Third Secretary-General of the United Nations, from Myanmar" },
    { name: "Hsinbyushin", wiki: "Hsinbyushin", desc: "King of the Konbaung dynasty who conquered Ayutthaya" },
    { name: "Bodawpaya", wiki: "Bodawpaya", desc: "King of the Konbaung dynasty who expanded Myanmar's borders" },
    { name: "Narathihapate", wiki: "Narathihapate", desc: "Last king of Pagan, defeated by the Mongol invasions" },
    { name: "Wareru", wiki: "Wareru", desc: "Founder of the Hanthawaddy Kingdom of the Mon people" },
    { name: "Shin Sawbu", wiki: "Shin Sawbu", desc: "One of the few reigning queens in Burmese history, queen of Hanthawaddy" },
    { name: "Dhammazedi", wiki: "Dhammazedi", desc: "King of Hanthawaddy and great reformer of Theravada Buddhism" },
];

// ═══════════════ WIKI FETCH ═══════════════
function wikiGet(name) {
    return new Promise((resolve) => {
        const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages|extracts&exintro&explaintext&exchars=400&titles=${encodeURIComponent(name)}&format=json&pithumbsize=500&origin=*`;
        https.get(url, { headers: { "User-Agent": "KZodiBot/3.0 (contact: admin@kzodi.app)" } }, (res) => {
            let data = "";
            res.on("data", c => data += c);
            res.on("end", () => {
                try {
                    const j = JSON.parse(data);
                    const pages = j.query?.pages;
                    if (!pages) return resolve(null);
                    const pid = Object.keys(pages)[0];
                    if (pid === "-1") return resolve(null);
                    const pg = pages[pid];
                    const thumb = pg.thumbnail?.source;
                    const badImages = ["Question_book","No_image","Flag_of","Commons-logo","replace_this","Ambox","Text_document","Wiki_letter","Wiktionary","Disambig","Edit-clear","Blue_pencil","Padlock","Gnome-globe"];
                    if (!thumb || badImages.some(b => thumb.includes(b))) return resolve(null);
                    resolve({ image: thumb, extract: (pg.extract || "").substring(0, 600) });
                } catch { resolve(null); }
            });
        }).on("error", () => resolve(null));
    });
}

// ═══════════════ ANILIST MASS FETCH ═══════════════
async function fetchAnimeCharacters(targetCount = 5000) {
    console.log(`\n[AniList] Fetching ${targetCount} anime characters...`);
    let results = [], seen = new Set();
    
    // First get existing character names to avoid duplicates
    const existing = await pool.query("SELECT name FROM characters WHERE tag='Anime'");
    existing.rows.forEach(r => seen.add(r.name));
    console.log(`  Already have ${seen.size} anime characters, will skip those.`);
    
    const query = `query($page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){media(sort:POPULARITY_DESC,type:ANIME){title{english romaji}characters(sort:FAVOURITES_DESC,perPage:6){nodes{id name{full}image{large}description favourites}}}}}`; 
    
    for (let page = 1; page <= 500 && results.length < targetCount; page++) {
        try {
            const res = await fetch("https://graphql.anilist.co", {
                method: "POST", headers: {"Content-Type":"application/json"},
                body: JSON.stringify({query, variables:{page, perPage:25}})
            });
            const data = await res.json();
            
            if (data.errors) {
                console.error("  AniList error:", data.errors[0]?.message);
                // Rate limit - wait longer
                await new Promise(r => setTimeout(r, 3000));
                continue;
            }
            
            const medias = data?.data?.Page?.media || [];
            if (!medias.length) { console.log("  No more media found, stopping."); break; }
            
            for (const m of medias) {
                if (results.length >= targetCount) break;
                const src = m.title?.english || m.title?.romaji || "Anime";
                for (const c of (m.characters?.nodes || [])) {
                    if (results.length >= targetCount) break;
                    if (!c.image?.large || c.image.large.includes("default.jpg")) continue;
                    if (seen.has(c.name.full)) continue;
                    seen.add(c.name.full);
                    
                    let desc = (c.description || "").replace(/~!.*?!~/gs, '').replace(/<[^>]*>/g, '').substring(0, 500);
                    if (!desc) desc = `${c.name.full} from ${src}`;
                    
                    results.push({
                        name: c.name.full,
                        description: `${c.name.full} from ${src}`,
                        longDescription: desc,
                        image: c.image.large,
                        greeting: `Hi! I'm ${c.name.full} from ${src}.`,
                        personality: "anime character",
                        source: src
                    });
                }
            }
            
            if (results.length % 100 === 0 && results.length > 0) {
                console.log(`  Progress: ${results.length}/${targetCount} characters collected (page ${page})`);
            }
            
            // Rate limiting - AniList allows ~90 requests/minute
            await new Promise(r => setTimeout(r, 700));
            
        } catch(e) {
            console.error("  AniList fetch err:", e.message);
            await new Promise(r => setTimeout(r, 3000));
        }
    }
    
    console.log(`  Total collected: ${results.length} anime characters`);
    return results;
}

// ═══════════════ DB INSERT ═══════════════
async function addToDB(tag, chars, source) {
    const client = await pool.connect();
    let n = 0;
    try {
        for (let i = 0; i < chars.length; i++) {
            const c = chars[i];
            const id = `${tag.toLowerCase().replace(/[^a-z0-9]/g,"")}-${Date.now()}-${i}-${Math.random().toString(36).substring(2,6)}`;
            const tagsArr = source ? [tag, source] : [tag];
            await client.query(
                `INSERT INTO characters (id,name,tag,tags,description,long_description,image,greeting,personality,visibility,source,likes_count,chatter_count) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (id) DO NOTHING`,
                [id, c.name.substring(0,100), tag, JSON.stringify(tagsArr), (c.description||"").substring(0,255), c.longDescription||"", c.image, c.greeting||`Hi, I'm ${c.name}.`, c.personality||"iconic", "public", (c.source||source||tag).substring(0,100), Math.floor(Math.random()*2000+100), Math.floor(Math.random()*5000+200)]
            );
            n++;
            if (n % 500 === 0) console.log(`  DB insert progress: ${n}/${chars.length}`);
        }
        console.log(`  ✅ Inserted ${n} for [${tag}]${source ? ` (${source})` : ''}`);
    } catch(e) { console.error(`  ❌ ${tag}:`, e.message); }
    finally { client.release(); }
}

// ═══════════════ MAIN ═══════════════
async function main() {
    console.log("=== SEEDING: MLBB + MYANMAR HEROES + 5000 ANIME ===\n");

    // ─── 1. MOBILE LEGENDS ───
    console.log("\n==============================");
    console.log("🎮 MOBILE LEGENDS: BANG BANG");
    console.log("==============================");
    
    // Deduplicate the MLBB list
    const uniqueMLBB = [...new Set(MLBB_HEROES)];
    console.log(`  Total unique MLBB heroes: ${uniqueMLBB.length}`);
    
    let mlbbResults = [];
    for (const hero of uniqueMLBB) {
        const wikiName = `${hero} (Mobile Legends: Bang Bang)`;
        let w = await wikiGet(wikiName);
        if (!w) w = await wikiGet(`${hero} Mobile Legends`);
        if (!w) w = await wikiGet(hero);
        
        if (w && w.image) {
            mlbbResults.push({
                name: hero,
                description: `${hero} — Mobile Legends: Bang Bang hero`,
                longDescription: w.extract,
                image: w.image,
                greeting: `I'm ${hero} from Mobile Legends!`,
                personality: "MLBB hero",
                source: "Mobile Legends"
            });
        } else {
            // Use Tavily for MLBB chars without wiki images
            try {
                const query = `${hero} Mobile Legends Bang Bang hero official splash art`;
                const res = await fetch('https://api.tavily.com/search', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`
                    },
                    body: JSON.stringify({ query, search_depth: "basic", include_images: true, max_results: 3 })
                });
                const data = await res.json();
                if (data.images && data.images.length > 0) {
                    let img = data.images.find(i => i.match(/\.(png|jpg|jpeg|webp)/i));
                    if (!img) img = data.images[0];
                    if (img && !img.includes("ui-avatars")) {
                        mlbbResults.push({
                            name: hero,
                            description: `${hero} — Mobile Legends: Bang Bang hero`,
                            longDescription: `${hero} is a playable hero in Mobile Legends: Bang Bang.`,
                            image: img,
                            greeting: `I'm ${hero} from Mobile Legends!`,
                            personality: "MLBB hero",
                            source: "Mobile Legends"
                        });
                    }
                }
            } catch(e) { /* skip */ }
        }
        
        if (mlbbResults.length % 10 === 0 && mlbbResults.length > 0) {
            console.log(`  MLBB progress: ${mlbbResults.length} heroes with images`);
        }
        await new Promise(r => setTimeout(r, 300));
    }
    
    console.log(`  Got ${mlbbResults.length} MLBB heroes with valid images`);
    if (mlbbResults.length) await addToDB("Game", mlbbResults, "Mobile Legends");

    // ─── 2. MYANMAR HEROES ───
    console.log("\n==============================");
    console.log("🇲🇲 MYANMAR HISTORICAL HEROES");
    console.log("==============================");
    
    let myanmarResults = [];
    for (const hero of MYANMAR_HEROES) {
        const w = await wikiGet(hero.wiki);
        if (w && w.image) {
            myanmarResults.push({
                name: hero.name,
                description: hero.desc,
                longDescription: w.extract,
                image: w.image,
                greeting: `I am ${hero.name}, ${hero.desc}.`,
                personality: "historical Myanmar figure",
                source: "Myanmar History"
            });
        }
        await new Promise(r => setTimeout(r, 300));
    }
    
    console.log(`  Got ${myanmarResults.length} Myanmar heroes with valid images`);
    if (myanmarResults.length) await addToDB("History", myanmarResults, "Myanmar History");

    // ─── 3. 5000 ANIME CHARACTERS ───
    console.log("\n==============================");
    console.log("🎌 5000 ANIME CHARACTERS");
    console.log("==============================");
    
    const animeChars = await fetchAnimeCharacters(5000);
    if (animeChars.length) {
        // Insert in batches of 500
        for (let i = 0; i < animeChars.length; i += 500) {
            const batch = animeChars.slice(i, i + 500);
            console.log(`  Inserting batch ${Math.floor(i/500)+1}/${Math.ceil(animeChars.length/500)} (${batch.length} chars)...`);
            await addToDB("Anime", batch);
        }
    }

    // ─── FINAL REPORT ───
    const final = await pool.query("SELECT tag, count(*)::int as cnt FROM characters GROUP BY tag ORDER BY cnt DESC");
    console.log("\n=== FINAL TAG COUNTS ===");
    let total = 0;
    final.rows.forEach(r => { console.log(`  ${r.tag}: ${r.cnt}`); total += r.cnt; });
    console.log(`\n  TOTAL: ${total}`);

    console.log("\n🎉 All done!");
    process.exit(0);
}

main();
