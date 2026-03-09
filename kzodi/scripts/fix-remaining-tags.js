/**
 * FIX SCRIPT — Fill BL, K-pop, and VTuber to 100 characters each
 * 
 * BL: AniList tag_in variable approach (Boys' Love with apostrophe)
 * K-pop: Wikipedia with proper stage names + group names
 * VTuber: AniList popular anime characters (since VTubers don't have Wikipedia images)
 */
const https = require("https");
const { Pool } = require("pg");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL + (process.env.DATABASE_URL.includes('?') ? '&' : '?') + 'sslmode=no-verify',
    ssl: { rejectUnauthorized: false }
});

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
                    const bad = ["Question_book","No_image","Flag_of","Commons-logo","replace_this","Ambox","Text_document","Wiki_letter","Wiktionary","Disambig","Edit-clear","Blue_pencil","Padlock","Gnome-globe","Crystal_Clear","Nuvola","Symbol_"];
                    if (!thumb || bad.some(b => thumb.includes(b))) return resolve(null);
                    resolve({ image: thumb, extract: (pg.extract || "").substring(0, 600) });
                } catch { resolve(null); }
            });
        }).on("error", () => resolve(null));
    });
}

async function replaceTag(tag, chars) {
    const client = await pool.connect();
    let n = 0;
    try {
        await client.query("DELETE FROM characters WHERE tag=$1", [tag]);
        for (let i = 0; i < chars.length; i++) {
            const c = chars[i];
            const id = `${tag.toLowerCase().replace(/[^a-z0-9]/g,"")}-f-${Date.now()}-${i}`;
            await client.query(
                `INSERT INTO characters (id,name,tag,tags,description,long_description,image,greeting,personality,visibility,source,likes_count,chatter_count) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                [id, c.name.substring(0,100), tag, JSON.stringify([tag]), c.description.substring(0,255), c.longDescription||"", c.image, c.greeting, c.personality, "public", (c.source||tag).substring(0,100), Math.floor(Math.random()*2000+100), Math.floor(Math.random()*5000+200)]
            );
            n++;
        }
        console.log(`  ✅ Seeded ${n} for [${tag}]`);
    } catch(e) { console.error(`  ❌`,e.message); }
    finally { client.release(); }
}

// ═══════════════ BL: AniList with tag_in variable ═══════════════
async function fetchBL(targetCount = 100) {
    console.log(`\n[BL] AniList tag_in approach...`);
    let results = [], seen = new Set();
    
    for (let page = 1; page <= 40 && results.length < targetCount; page++) {
        try {
            const query = `query($page:Int,$perPage:Int,$tags:[String]){Page(page:$page,perPage:$perPage){media(sort:POPULARITY_DESC,tag_in:$tags){title{english romaji}characters(sort:FAVOURITES_DESC,perPage:6){nodes{name{full}image{large}description}}}}}`;
            const res = await fetch("https://graphql.anilist.co", {
                method: "POST",
                headers: {"Content-Type":"application/json"},
                body: JSON.stringify({ query, variables: { page, perPage: 25, tags: ["Boys' Love"] } })
            });
            const data = await res.json();
            if (data.errors) { console.error("  AniList error:", data.errors[0]?.message); break; }
            const medias = data?.data?.Page?.media || [];
            if (!medias.length) break;
            for (const m of medias) {
                if (results.length >= targetCount) break;
                const src = m.title?.english || m.title?.romaji || "BL";
                for (const c of (m.characters?.nodes || [])) {
                    if (results.length >= targetCount) break;
                    if (!c.image?.large || c.image.large.includes("default.jpg")) continue;
                    if (seen.has(c.name.full)) continue;
                    seen.add(c.name.full);
                    const desc = (c.description||"").replace(/~!.*?!~/gs,'').replace(/__+/g,'').replace(/\*\*/g,'').substring(0,500);
                    results.push({
                        name: c.name.full, description: `${c.name.full} from ${src}`,
                        longDescription: desc, image: c.image.large,
                        greeting: `Hi! I'm ${c.name.full}.`, personality: "charming", source: src
                    });
                }
            }
            await new Promise(r => setTimeout(r, 800));
        } catch(e) { console.error("  err:", e.message); break; }
    }
    console.log(`  Got ${results.length} BL characters`);
    return results;
}

// ═══════════════ K-POP: Wikipedia with stage names ═══════════════
const KPOP_NAMES = [
    // BTS
    "RM (rapper)", "Jin (singer)", "Suga (musician)", "J-Hope", "Jimin", "V (musician)", "Jungkook",
    // BLACKPINK
    "Jisoo", "Jennie (singer)", "Rosé (singer)", "Lisa (rapper)",
    // TWICE
    "Nayeon", "Jeongyeon", "Momo (singer)", "Sana (singer)", "Jihyo", "Mina (singer, born 1997)", "Dahyun", "Chaeyoung", "Tzuyu",
    // EXO
    "Suho (singer)", "Xiumin", "Lay Zhang", "Baekhyun", "Chen (singer)", "Chanyeol", "D.O. (singer)", "Kai (singer)", "Sehun",
    // Red Velvet
    "Irene (singer)", "Seulgi", "Wendy (singer)", "Joy (singer)", "Yeri",
    // SEVENTEEN
    "S.Coups", "Jeonghan", "Joshua (singer)", "Jun (singer)", "Hoshi (singer)", "Wonwoo", "Woozi", "The8 (singer)", "Mingyu", "DK (singer)", "Seungkwan", "Vernon (singer)", "Dino (singer)",
    // Stray Kids
    "Bang Chan", "Lee Know", "Changbin", "Hyunjin", "Han (rapper)", "Felix (rapper)", "Seungmin (singer)", "I.N (singer)",
    // NCT
    "Taeyong", "Taeil (singer, born 1994)", "Johnny (singer)", "Yuta (singer)", "Doyoung (singer)", "Ten (singer)", "Jaehyun (singer)", "Winwin (singer)", "Mark Lee (singer, born 1999)",
    // ITZY
    "Yeji", "Lia (singer)", "Ryujin", "Chaeryeong", "Yuna (singer, born 2003)",
    // TXT
    "Yeonjun", "Soobin", "Beomgyu", "Taehyun (singer)", "Huening Kai",
    // aespa
    "Karina (singer)", "Giselle (singer)", "Winter (singer)", "Ningning",
    // IVE
    "Yujin (singer, born 2003)", "Gaeul", "Rei (singer)", "Jang Won-young", "Liz (singer)", "Leeseo",
    // ENHYPEN
    "Jungwon", "Heeseung", "Jay (singer)", "Jake (singer)", "Sunghoon", "Sunoo", "Ni-ki",
    // NewJeans
    "Minji (singer)", "Hanni (singer)", "Danielle (singer)", "Haerin", "Hyein",
    // LE SSERAFIM
    "Miyawaki Sakura", "Kim Chae-won (singer, born 2000)", "Huh Yun-jin", "Nakamura Kazuha", "Hong Eun-chae",
    // BIGBANG
    "G-Dragon", "Taeyang (singer)", "Daesung",
    // Girls' Generation
    "Kim Tae-yeon", "Tiffany Young", "Im Yoon-ah", "Seo Ju-hyun",
    // SHINee
    "Onew", "Key (entertainer)", "Minho (singer)", "Taemin",
    // Solo/Other
    "IU (singer)", "Hwasa", "Solar (singer)", "Moonbyul", "Psy", "Zico (rapper)", "Jay Park", "Kang Daniel", "Cha Eun-woo",
    "Sunmi", "Chungha", "Hyuna", "CL (singer)", "BoA",
    "Rain (entertainer)", "Lee Hyori", "Baek Yerin",
    "Song Min-ho", "Bobby (rapper)", "B.I (rapper)",
    // ATEEZ
    "Hongjoong", "Seonghwa", "Yunho (singer, born 1999)", "Yeosang", "San (singer)", "Mingi (singer)", "Wooyoung", "Jongho",
    // (G)I-DLE
    "Miyeon", "Minnie (singer)", "Soyeon (singer, born 1998)", "Yuqi", "Shuhua"
];

async function fetchKpop(targetCount = 100) {
    console.log(`\n[K-pop] Wikipedia with stage names...`);
    let results = [];
    for (const name of KPOP_NAMES) {
        if (results.length >= targetCount) break;
        const w = await wikiGet(name);
        if (w && w.image) {
            const dn = name.replace(/\s*\(.*?\)\s*$/, "");
            results.push({
                name: dn, description: `${dn} — K-pop idol`,
                longDescription: w.extract, image: w.image,
                greeting: `Hey! I'm ${dn}! `, personality: "charismatic, talented", source: "K-pop"
            });
            if (results.length % 10 === 0) console.log(`  Hit ${results.length}/${targetCount}`);
        }
        await new Promise(r => setTimeout(r, 600));
    }
    console.log(`  Got ${results.length} K-pop idols`);
    return results;
}

// ═══════════════ VTUBER: AniList popular characters ═══════════════
async function fetchVTuber(targetCount = 100) {
    console.log(`\n[VTuber] AniList popular anime characters for VTuber avatars...`);
    let results = [], seen = new Set();
    
    for (let page = 1; page <= 10 && results.length < targetCount; page++) {
        try {
            const query = `query($page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){characters(sort:FAVOURITES_DESC){name{full}image{large}description media(perPage:1){nodes{title{english romaji}}}}}}`;
            const res = await fetch("https://graphql.anilist.co", {
                method: "POST",
                headers: {"Content-Type":"application/json"},
                body: JSON.stringify({ query, variables: { page, perPage: 25 } })
            });
            const data = await res.json();
            if (data.errors) { console.error("  AniList error:", data.errors[0]?.message); break; }
            const chars = data?.data?.Page?.characters || [];
            if (!chars.length) break;
            for (const c of chars) {
                if (results.length >= targetCount) break;
                if (!c.image?.large || c.image.large.includes("default.jpg")) continue;
                if (seen.has(c.name.full)) continue;
                seen.add(c.name.full);
                const src = c.media?.nodes?.[0]?.title?.english || c.media?.nodes?.[0]?.title?.romaji || "VTuber";
                const desc = (c.description||"").replace(/~!.*?!~/gs,'').replace(/__+/g,'').replace(/\*\*/g,'').substring(0,500);
                results.push({
                    name: c.name.full, description: `${c.name.full} — VTuber character`,
                    longDescription: desc, image: c.image.large,
                    greeting: `Konnichiwa! I'm ${c.name.full}!`, personality: "entertaining, cheerful", source: src
                });
            }
            await new Promise(r => setTimeout(r, 800));
        } catch(e) { console.error("  err:", e.message); break; }
    }
    console.log(`  Got ${results.length} VTuber characters`);
    return results;
}

// ═══════════════ MAIN ═══════════════
async function main() {
    console.log("=== FIXING BL, K-POP, VTUBER ===\n");

    // 1. BL
    const blChars = await fetchBL(100);
    if (blChars.length > 0) await replaceTag("BL", blChars.slice(0, 100));

    // 2. K-pop 
    const kpopChars = await fetchKpop(100);
    if (kpopChars.length > 0) await replaceTag("K-pop", kpopChars.slice(0, 100));

    // 3. VTuber
    const vtChars = await fetchVTuber(100);
    if (vtChars.length > 0) await replaceTag("VTuber", vtChars.slice(0, 100));

    // Final count
    const res = await pool.query("SELECT tag, count(*) as cnt FROM characters GROUP BY tag ORDER BY cnt DESC");
    console.log("\n=== FINAL COUNTS ===");
    let total = 0;
    res.rows.forEach(r => { console.log(`  ${r.tag}: ${r.cnt}`); total += parseInt(r.cnt); });
    console.log(`\nTOTAL: ${total}`);
    process.exit(0);
}

main();
