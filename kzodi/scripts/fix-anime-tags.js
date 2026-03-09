/**
 * FIX NON-ANIME TAGS
 * Delete generic anime chars from Game/VTuber/BL/GL/Roleplay/Original
 * Re-seed with properly filtered AniList characters using genre/tag filters
 * 
 * Run: node scripts/fix-anime-tags.js
 */
const { Pool } = require("pg");
require("dotenv").config();

const DATABASE_URL = (process.env.DATABASE_URL || "").replace(/[?&]sslmode=[^&]*/g, "");
const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

// AniList query with genre/tag filter
const ANILIST_QUERY_GENRE = `
query($page: Int, $perPage: Int, $genre: String) {
    Page(page: $page, perPage: $perPage) {
        media(sort: POPULARITY_DESC, genre: $genre, type: ANIME) {
            title { english romaji }
            characters(sort: FAVOURITES_DESC, perPage: 6) {
                nodes {
                    id
                    name { full }
                    image { large }
                    description
                }
            }
        }
    }
}`;

const ANILIST_QUERY_TAG = `
query($page: Int, $perPage: Int, $tag: String) {
    Page(page: $page, perPage: $perPage) {
        media(sort: POPULARITY_DESC, tag: $tag, type: ANIME) {
            title { english romaji }
            characters(sort: FAVOURITES_DESC, perPage: 6) {
                nodes {
                    id
                    name { full }
                    image { large }
                    description
                }
            }
        }
    }
}`;

function cleanDesc(d) { return d ? d.replace(/__+/g, '').replace(/~!.*?!~/gs, '').replace(/[\\\*_~`]/g, '').trim().substring(0, 500) : ""; }

async function fetchAnilistWithFilter(tag, filterType, filterValue, count = 100) {
    console.log(`\n[AniList] Fetching ${count} chars for "${tag}" (${filterType}="${filterValue}")...`);
    let results = [];
    let seen = new Set();
    
    for (let page = 1; page <= 10 && results.length < count; page++) {
        try {
            const query = filterType === "genre" ? ANILIST_QUERY_GENRE : ANILIST_QUERY_TAG;
            const variables = { page, perPage: 25 };
            if (filterType === "genre") variables.genre = filterValue;
            else variables.tag = filterValue;
            
            const res = await fetch("https://graphql.anilist.co", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query, variables })
            });
            const data = await res.json();
            const medias = data?.data?.Page?.media || [];
            if (medias.length === 0) break;

            for (const media of medias) {
                if (results.length >= count) break;
                const src = media.title?.english || media.title?.romaji || tag;
                const chars = media.characters?.nodes || [];
                for (const c of chars) {
                    if (results.length >= count) break;
                    if (!c.image?.large || c.image.large.includes("default.jpg")) continue;
                    if (seen.has(c.name.full)) continue;
                    seen.add(c.name.full);
                    results.push({
                        name: c.name.full,
                        description: `${c.name.full} from ${src}`,
                        longDescription: cleanDesc(c.description),
                        image: c.image.large,
                        greeting: `Hey! I'm ${c.name.full} from ${src}. Nice to meet you!`,
                        personality: "charming, unique, iconic",
                        source: src
                    });
                }
            }
            await new Promise(r => setTimeout(r, 800));
        } catch (e) {
            console.error("AniList error:", e.message);
            break;
        }
    }
    console.log(`  Got ${results.length} characters for "${tag}"`);
    return results;
}

// VTuber names - hardcoded since AniList doesn't have good VTuber filtering
const https = require("https");
function wikiGet(name) {
    return new Promise((resolve) => {
        const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages|extracts&exintro&explaintext&exchars=300&titles=${encodeURIComponent(name)}&format=json&pithumbsize=500&origin=*`;
        https.get(url, { headers: { "User-Agent": "KZodiBot/1.0 (kzodi@app.com)" } }, (res) => {
            let data = "";
            res.on("data", (c) => (data += c));
            res.on("end", () => {
                try {
                    const j = JSON.parse(data);
                    const pages = j.query?.pages;
                    if (!pages) return resolve(null);
                    const pid = Object.keys(pages)[0];
                    if (pid === "-1") return resolve(null);
                    const pg = pages[pid];
                    const thumb = pg.thumbnail?.source;
                    if (!thumb) return resolve(null);
                    if (thumb.includes("Question_book") || thumb.includes("No_image") || thumb.includes("Flag_of")) return resolve(null);
                    resolve({ image: thumb, extract: (pg.extract || "").substring(0, 800) });
                } catch { resolve(null); }
            });
        }).on("error", () => resolve(null));
    });
}

const VTUBER_NAMES = [
    "Gawr Gura","Mori Calliope","Takanashi Kiara","Ninomayo Ina'nis","Watson Amelia",
    "Shirakami Fubuki","Natsuiro Matsuri","Tokoyami Towa","Usada Pekora","Shiranui Flare",
    "Houshou Marine","Shirogane Noel","Uruha Rushia","Tsunomaki Watame","Tokoyami Towa",
    "Himemori Luna","Kiryu Coco","Amane Kanata","Hoshimachi Suisei","Sakura Miko",
    "Minato Aqua","Oozora Subaru","Murasaki Shion","Nakiri Ayame","Yozora Mel",
    "Aki Rosenthal","Akai Haato","Roboco-san","Airani Iofifteen","Moona Hoshinova",
    "Kureiji Ollie","Anya Melfissa","Pavolia Reine",
    "Ouro Kronii","Ceres Fauna","Nanashi Mumei","Hakos Baelz","Tsukumo Sana",
    "Kobo Kanaeru","Vestia Zeta","Kaela Kovalskia",
    "Shiori Novella","Koseki Bijou","Nerissa Ravencroft","Fuwawa Abyssgard","Mococo Abyssgard",
    "Kizuna AI","Kaguya Luna","Mirai Akari","Dennou Shoujo Siro","Nekomasu",
    "Nijisanji","Tsukino Mito","Higuchi Kaede","Shizuka Rin","Elu (VTuber)",
    "Honma Himawari","Sasaki Saku","Ange Katrina","Lize Helesta","Inui Toko",
    "Kanae (VTuber)","Kuzuha (VTuber)","Fuwa Minato","Shellin Burgundy",
    "Vox Akuma","Mysta Rias","Luca Kaneshiro","Shu Yamino","Ike Eveland",
    "Elira Pendora","Pomu Rainpuff","Finana Ryugu","Rosemi Lovelock","Petra Gurin",
    "Selen Tatsuki","Nina Kosaka","Millie Parfait","Enna Alouette","Reimu Endou",
    "Ironmouse","Nyanners","Veibae","Silvervale","Zentreya","Apricot (VShojo)",
    "Henya the Genius","Geega","Haruka Karibu","Mouse (VTuber)","Projekt Melody",
    "Shoto (VTuber)","Bao (VTuber)","Anny (VTuber)","Vienna (VTuber)",
    "Miko (VTuber)","Filian","Camila","Buffpup","Saruei",
    "Inugami Korone","Nekomata Okayu","Ookami Mio","Shirakami Fubuki",
    "Akai Haato","Tokino Sora","AZKi","Yuzuki Choco","Akirose","Mel (Hololive)",
    "Laplus Darknesss","Takane Lui","Kazama Iroha","Sakamata Chloe","風真いろは",
    "Elizabeth Rose Bloodflame","Raora Panthera","Gigi Murin","Cecilia Immergreen"
];

const GAME_CHARACTERS = [
    "Link (The Legend of Zelda)","Mario","Luigi","Princess Zelda","Ganondorf",
    "Samus Aran","Kirby (character)","Pikachu","Mewtwo","Charizard",
    "Cloud Strife","Tifa Lockhart","Aerith Gainsborough","Sephiroth","Squall Leonhart",
    "Solid Snake","Lara Croft","Master Chief (Halo)","Kratos (God of War)","Nathan Drake (Uncharted)",
    "Geralt of Rivia","Yennefer of Vengerberg","Ciri","Triss Merigold",
    "Ellie (The Last of Us)","Joel (The Last of Us)","Arthur Morgan","John Marston",
    "Aloy (Horizon Zero Dawn)","Ezio Auditore da Firenze","Altaïr Ibn-LaʼAhad",
    "Dante (Devil May Cry)","Vergil (Devil May Cry)","Bayonetta (character)",
    "Sonic the Hedgehog (character)","Miles 'Tails' Prower","Knuckles the Echidna","Shadow the Hedgehog",
    "Pac-Man","Donkey Kong (character)","Bowser","Princess Peach","Yoshi",
    "Mega Man (character)","Ryu (Street Fighter)","Chun-Li","Akuma (Street Fighter)",
    "Kazuya Mishima","Jin Kazama","Heihachi Mishima","Yoshimitsu",
    "Tracer (Overwatch)","Mercy (Overwatch)","Genji (Overwatch)","Widowmaker (Overwatch)",
    "Jinx (League of Legends)","Ahri (League of Legends)","Yasuo (League of Legends)","Lux (League of Legends)",
    "2B (Nier: Automata)","A2 (Nier: Automata)","9S","Kainé",
    "Alyx Vance","Gordon Freeman","GLaDOS","Chell (Portal)",
    "Steve (Minecraft)","Alex (Minecraft)","Creeper (Minecraft)",
    "Sans (Undertale)","Toriel","Papyrus (Undertale)",
    "Jill Valentine","Leon S. Kennedy","Chris Redfield","Ada Wong","Claire Redfield",
    "Noctis Lucis Caelum","Lightning (Final Fantasy)","Tidus","Yuna (Final Fantasy)",
    "Joker (Persona 5)","Makoto Niijima","Ann Takamaki","Futaba Sakura","Ryuji Sakamoto",
    "Byleth","Edelgard","Dimitri (Fire Emblem)","Claude von Riegan",
    "Sora (Kingdom Hearts)","Riku (Kingdom Hearts)","Kairi (Kingdom Hearts)",
    "Crash Bandicoot (character)","Spyro (character)","Rayman",
    "Doom Slayer","Isaac Clarke","Commander Shepard","Garrus Vakarian","Liara T'Soni",
    "Scorpion (Mortal Kombat)","Sub-Zero (Mortal Kombat)",
    "Kratos (God of War)","Atreus (God of War)","Freya (God of War)",
    "V (Cyberpunk 2077)","Johnny Silverhand","Senua",
    "Genshin Impact","Hu Tao (Genshin Impact)","Raiden Shogun","Zhongli (Genshin Impact)"
    
];

const ROLEPLAY_CHARACTERS = [
    "Drizzt Do'Urden","Elminster","Minsc (Baldur's Gate)","Bruenor Battlehammer",
    "Gandalf","Aragorn","Legolas","Gimli (Middle-earth)","Frodo Baggins","Samwise Gamgee",
    "Jon Snow (character)","Daenerys Targaryen","Tyrion Lannister","Arya Stark","Cersei Lannister",
    "Geralt of Rivia","Yennefer of Vengerberg","Ciri","Dandelion (The Witcher)",
    "Harry Potter (character)","Hermione Granger","Ron Weasley","Albus Dumbledore","Severus Snape",
    "Katniss Everdeen","Peeta Mellark","Haymitch Abernathy",
    "Percy Jackson (character)","Annabeth Chase",
    "Kvothe","Vin (Mistborn)","Kaladin","Shallan Davar","Dalinar Kholin",
    "Rand al'Thor","Mat Cauthon","Perrin Aybara","Egwene al'Vere","Nynaeve al'Meara",
    "Eragon (character)","Saphira","Murtagh (character)",
    "Conan the Barbarian","Red Sonja","Solomon Kane",
    "Elric of Melniboné","Fafhrd","Gray Mouser",
    "Thomas Covenant","Rincewind","Tiffany Aching","Granny Weatherwax","Death (Discworld)",
    "Sherlock Holmes","John Watson","James Moriarty","Irene Adler","Mycroft Holmes",
    "Dracula (Bram Stoker)","Van Helsing","Frankenstein's monster",
    "Robin Hood","King Arthur","Merlin","Morgan le Fay","Lancelot","Guinevere",
    "Odysseus","Achilles","Hector","Helen of Troy","Perseus",
    "Beowulf","Sigurd","Brynhildr",
    "Alice (Alice's Adventures in Wonderland)","Mad Hatter","Queen of Hearts (Alice's Adventures in Wonderland)",
    "Captain Hook","Peter Pan (character)","Tinker Bell",
    "Dorothy Gale","Wicked Witch of the West","Glinda",
    "Pinocchio (character)","Rapunzel","Sleeping Beauty","Snow White","Cinderella",
    "Batman","Superman","Wonder Woman","Spider-Man","Wolverine (character)",
    "Darth Vader","Luke Skywalker","Princess Leia","Han Solo","Yoda",
    "Captain Jack Sparrow","Indiana Jones (character)","James Bond (character)"
];

async function seedToDB(tag, characters) {
    const client = await pool.connect();
    try {
        let count = 0;
        for (let i = 0; i < characters.length; i++) {
            const c = characters[i];
            const id = `${tag.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Date.now()}-${i}`;
            await client.query(`INSERT INTO characters (id, name, tag, tags, description, long_description, image, greeting, personality, visibility, source, likes_count, chatter_count) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                [id, c.name.substring(0, 100), tag, JSON.stringify([tag]), c.description || `${c.name} — ${tag}`, c.longDescription || "", c.image, c.greeting || `Hey! I'm ${c.name}. Nice to meet you!`, c.personality || "iconic, famous", "public", (c.source || tag).substring(0, 100), Math.floor(Math.random() * 2000 + 100), Math.floor(Math.random() * 5000 + 200)]);
            count++;
        }
        console.log(`  ✅ Inserted ${count} chars for [${tag}]`);
    } catch (e) {
        console.error(`  ❌ DB error for ${tag}:`, e.message);
    } finally {
        client.release();
    }
}

async function fetchWikiList(tag, names, count = 100) {
    console.log(`\n[Wiki] Fetching ${count} chars for "${tag}" from ${names.length} candidates...`);
    let results = [];
    for (const name of names) {
        if (results.length >= count) break;
        const w = await wikiGet(name);
        if (w) {
            const displayName = name.replace(/\s*\(.*?\)\s*$/, "");
            results.push({ name: displayName, description: `${displayName} — ${tag}`, longDescription: w.extract, image: w.image, greeting: `Hey! I'm ${displayName}!`, personality: "iconic, famous", source: tag });
            if (results.length % 20 === 0) console.log(`  ${results.length}/${count}...`);
        }
        if (results.length % 3 === 0) await new Promise(r => setTimeout(r, 100));
    }
    console.log(`  Got ${results.length} chars`);
    return results;
}

async function main() {
    console.log("=== FIX ANIME IN WRONG TAGS ===\n");

    // 1. Delete wrongly-tagged anime chars
    const tagsToFix = ["Game", "VTuber", "BL", "GL", "Roleplay", "Original"];
    const client = await pool.connect();
    for (const tag of tagsToFix) {
        const r = await client.query("DELETE FROM characters WHERE tag=$1", [tag]);
        console.log(`Deleted ${r.rowCount} chars from [${tag}]`);
    }
    client.release();

    // 2. Re-seed with correctly filtered content

    // Game — Wikipedia game characters
    const gameChars = await fetchWikiList("Game", GAME_CHARACTERS, 100);
    if (gameChars.length > 0) await seedToDB("Game", gameChars);

    // VTuber — Wikipedia VTuber names
    const vtuberChars = await fetchWikiList("VTuber", VTUBER_NAMES, 100);
    if (vtuberChars.length > 0) await seedToDB("VTuber", vtuberChars);

    // BL — AniList genre "Boys Love" / tag "Boys' Love"
    const blChars = await fetchAnilistWithFilter("BL", "tag", "Boys' Love", 100);
    if (blChars.length > 0) await seedToDB("BL", blChars);

    // GL — AniList tag "Yuri"  
    const glChars = await fetchAnilistWithFilter("GL", "tag", "Yuri", 100);
    if (glChars.length > 0) await seedToDB("GL", glChars);

    // Roleplay — Wikipedia fantasy characters
    const rpChars = await fetchWikiList("Roleplay", ROLEPLAY_CHARACTERS, 100);
    if (rpChars.length > 0) await seedToDB("Roleplay", rpChars);

    // Original — AniList tag "Original Work"
    const origChars = await fetchAnilistWithFilter("Original", "tag", "Original Work", 100);
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
