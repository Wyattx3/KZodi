/**
 * SUPPLEMENTAL SEEDER for Game, VTuber, Roleplay, Original
 * Uses AniList with specific genre/tag filters to get CORRECT characters
 * 
 * Game = Video Game genre on AniList (game adaptations)
 * VTuber = Virtual Youtuber tag on AniList
 * Roleplay = Isekai/Fantasy tags on AniList
 * Original = anime-original characters (non-adaptation)
 */
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    connectionString: (process.env.DATABASE_URL || "").replace(/[?&]sslmode=[^&]*/g, ""),
    ssl: { rejectUnauthorized: false }
});

function cleanDesc(d) { return d ? d.replace(/__+/g, '').replace(/~!.*?!~/gs, '').replace(/[\\\*_~`]/g, '').trim().substring(0, 500) : ""; }

// Generic AniList media search with character extraction
async function fetchMediaCharacters(tag, searchParams, targetCount = 100) {
    console.log(`\n[AniList] Fetching up to ${targetCount} chars for "${tag}"...`);
    let results = [];
    let seen = new Set();
    
    // Fetch existing chars for this tag to avoid re-inserting
    const existing = await pool.query("SELECT name FROM characters WHERE tag=$1", [tag]);
    existing.rows.forEach(r => seen.add(r.name));
    const needed = targetCount - existing.rows.length;
    if (needed <= 0) {
        console.log(`  Already has ${existing.rows.length} chars, skipping`);
        return [];
    }
    console.log(`  Need ${needed} more (have ${existing.rows.length})...`);
    
    for (let page = 1; page <= 20 && results.length < needed; page++) {
        try {
            const query = `query($page: Int, $perPage: Int) {
                Page(page: $page, perPage: $perPage) {
                    media(sort: POPULARITY_DESC, type: ANIME, ${searchParams}) {
                        title { english romaji }
                        characters(sort: FAVOURITES_DESC, perPage: 8) {
                            nodes { id name { full } image { large } description }
                        }
                    }
                }
            }`;
            
            const res = await fetch("https://graphql.anilist.co", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query, variables: { page, perPage: 25 } })
            });
            const data = await res.json();
            const medias = data?.data?.Page?.media || [];
            if (medias.length === 0) break;

            for (const media of medias) {
                if (results.length >= needed) break;
                const src = media.title?.english || media.title?.romaji || tag;
                for (const c of (media.characters?.nodes || [])) {
                    if (results.length >= needed) break;
                    if (!c.image?.large || c.image.large.includes("default.jpg")) continue;
                    if (seen.has(c.name.full)) continue;
                    seen.add(c.name.full);
                    results.push({
                        name: c.name.full,
                        description: `${c.name.full} from ${src}`,
                        longDescription: cleanDesc(c.description),
                        image: c.image.large,
                        greeting: `Hey! I'm ${c.name.full} from ${src}!`,
                        personality: "charming, unique, iconic",
                        source: src
                    });
                }
            }
            await new Promise(r => setTimeout(r, 800));
        } catch (e) {
            console.error("  AniList error:", e.message);
            break;
        }
    }
    console.log(`  Fetched ${results.length} new characters`);
    return results;
}

async function seedToDB(tag, chars) {
    const client = await pool.connect();
    try {
        let n = 0;
        for (let i = 0; i < chars.length; i++) {
            const c = chars[i];
            const id = `${tag.toLowerCase().replace(/[^a-z0-9]/g, "")}-s-${Date.now()}-${i}`;
            await client.query(`INSERT INTO characters (id,name,tag,tags,description,long_description,image,greeting,personality,visibility,source,likes_count,chatter_count) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                [id, c.name.substring(0, 100), tag, JSON.stringify([tag]), c.description, c.longDescription || "", c.image, c.greeting, c.personality, "public", (c.source || tag).substring(0, 100), Math.floor(Math.random() * 2000 + 100), Math.floor(Math.random() * 5000 + 200)]);
            n++;
        }
        console.log(`  ✅ Inserted ${n} chars for [${tag}]`);
    } catch (e) { console.error(`  ❌ DB error:`, e.message); }
    finally { client.release(); }
}

async function main() {
    console.log("=== SUPPLEMENT SEEDER FOR LOW-COUNT TAGS ===\n");

    // Game: AniList source=VIDEO_GAME (game adaptations)
    const gameChars = await fetchMediaCharacters("Game", 'source: VIDEO_GAME', 100);
    if (gameChars.length > 0) await seedToDB("Game", gameChars);

    // VTuber: AniList tag "Virtual Youtuber" or search for VTuber anime
    const vtuberChars = await fetchMediaCharacters("VTuber", 'tag: "Virtual Youtuber"', 100);
    if (vtuberChars.length > 0) await seedToDB("VTuber", vtuberChars);
    // If still low, try "Vtuber" tag
    const vtuberChars2 = await fetchMediaCharacters("VTuber", 'search: "VTuber"', 100);
    if (vtuberChars2.length > 0) await seedToDB("VTuber", vtuberChars2);
    // Also search Hololive
    const vtuberChars3 = await fetchMediaCharacters("VTuber", 'search: "Hololive"', 100);
    if (vtuberChars3.length > 0) await seedToDB("VTuber", vtuberChars3);

    // Roleplay: Isekai tag + Fantasy genre
    const rpChars = await fetchMediaCharacters("Roleplay", 'tag: "Isekai"', 100);
    if (rpChars.length > 0) await seedToDB("Roleplay", rpChars);
    // Additional fantasy
    const rpChars2 = await fetchMediaCharacters("Roleplay", 'genre: "Fantasy"', 100);
    if (rpChars2.length > 0) await seedToDB("Roleplay", rpChars2);

    // Original: anime-original (not adapted from manga/LN)
    const origChars = await fetchMediaCharacters("Original", 'source: ORIGINAL', 100);
    if (origChars.length > 0) await seedToDB("Original", origChars);

    // Final count
    const countRes = await pool.query("SELECT tag, count(*) as cnt FROM characters GROUP BY tag ORDER BY cnt DESC");
    console.log("\n=== FINAL COUNTS ===");
    let total = 0;
    countRes.rows.forEach(r => { console.log(`  ${r.tag}: ${r.cnt}`); total += parseInt(r.cnt); });
    console.log(`\nTOTAL: ${total}`);
    process.exit(0);
}

main();
