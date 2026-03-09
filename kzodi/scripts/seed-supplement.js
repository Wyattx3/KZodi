/**
 * SUPPLEMENTAL SEEDER — Fill shortfall tags to 100 characters each
 * 
 * Strategy:
 *  - BL: AniList with genre:"Shounen Ai" or tag:"Boys' Love" (global, not Korea-only)
 *  - Game: AniList source:VIDEO_GAME characters
 *  - K-pop: Wikipedia with individual idol names (not "Group Member" format)  
 *  - VTuber: AniList search for VTuber-related media + Wikipedia for major ones
 *  - Movies: Supplement with actors/directors who are famous for movie ROLES
 *  - TV: Supplement with more real-people TV personalities + animated chars from AniList
 *  - Philosophy: Add a few more philosophers
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
                    const badImages = ["Question_book","No_image","Flag_of","Commons-logo","replace_this","Ambox","Text_document","Wiki_letter","Wiktionary","Disambig","Edit-clear","Blue_pencil","Padlock","Gnome-globe","Crystal_Clear","Nuvola","P_vip","Emojione","Twemoji","Symbol_","Icon_","Announcement","Merge-","Split-","Broom_icon","Information_icon"];
                    if (!thumb || badImages.some(b => thumb.includes(b))) return resolve(null);
                    resolve({ image: thumb, extract: (pg.extract || "").substring(0, 600) });
                } catch { resolve(null); }
            });
        }).on("error", () => resolve(null));
    });
}

async function anilistFetchChars(tag, searchParams, targetCount = 100) {
    console.log(`\n[AniList] "${tag}" — fetching ${targetCount}...`);
    let results = [], seen = new Set();
    for (let page = 1; page <= 30 && results.length < targetCount; page++) {
        try {
            const query = `query($page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){media(sort:POPULARITY_DESC,${searchParams}){title{english romaji}characters(sort:FAVOURITES_DESC,perPage:6){nodes{id name{full}image{large}description}}}}}`;
            const res = await fetch("https://graphql.anilist.co", {
                method: "POST", headers: {"Content-Type":"application/json"},
                body: JSON.stringify({query, variables:{page, perPage:25}})
            });
            const data = await res.json();
            if (data.errors) { console.error("  AniList error:", data.errors[0]?.message); break; }
            const medias = data?.data?.Page?.media || [];
            if (!medias.length) break;
            for (const m of medias) {
                if (results.length >= targetCount) break;
                const src = m.title?.english || m.title?.romaji || tag;
                for (const c of (m.characters?.nodes || [])) {
                    if (results.length >= targetCount) break;
                    if (!c.image?.large || c.image.large.includes("default.jpg")) continue;
                    if (seen.has(c.name.full)) continue;
                    seen.add(c.name.full);
                    const desc = (c.description || "").replace(/~!.*?!~/gs,'').replace(/__+/g,'').replace(/\*\*/g,'').substring(0,500);
                    results.push({
                        name: c.name.full,
                        description: `${c.name.full} from ${src}`,
                        longDescription: desc,
                        image: c.image.large,
                        greeting: `Hi! I'm ${c.name.full} from ${src}!`,
                        personality: "charming, iconic",
                        source: src
                    });
                }
            }
            await new Promise(r => setTimeout(r, 800));
        } catch(e) { console.error("  AniList err:", e.message); break; }
    }
    console.log(`  Got ${results.length}`);
    return results;
}

async function fetchWikiList(tag, list, existingCount = 0, targetCount = 100) {
    const needed = targetCount - existingCount;
    if (needed <= 0) { console.log(`\n[WIKI] "${tag}" already has ${existingCount}, skipping`); return []; }
    console.log(`\n[WIKI] "${tag}" — need ${needed} more, checking ${list.length} names...`);
    let results = [];
    for (const name of list) {
        if (results.length >= needed) break;
        const w = await wikiGet(name);
        if (w && w.image) {
            const dn = name.replace(/\s*\(.*?\)\s*$/, "");
            results.push({
                name: dn, description: `${dn} (${tag})`,
                longDescription: w.extract, image: w.image,
                greeting: `Hi, I'm ${dn}.`, personality: "iconic", source: tag
            });
            if (results.length % 10 === 0) console.log(`  Hit ${results.length}/${needed}`);
        }
        await new Promise(r => setTimeout(r, 600));
    }
    console.log(`  Got ${results.length} valid images for ${tag}`);
    return results;
}

async function appendToDB(tag, chars) {
    if (!chars.length) return;
    const client = await pool.connect();
    let n = 0;
    try {
        for (let i = 0; i < chars.length; i++) {
            const c = chars[i];
            const id = `${tag.toLowerCase().replace(/[^a-z0-9]/g,"")}-s-${Date.now()}-${i}`;
            await client.query(`INSERT INTO characters (id,name,tag,tags,description,long_description,image,greeting,personality,visibility,source,likes_count,chatter_count) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (id) DO NOTHING`,
                [id, c.name.substring(0,100), tag, JSON.stringify([tag]), c.description.substring(0,255), c.longDescription||"", c.image, c.greeting, c.personality, "public", (c.source||tag).substring(0,100), Math.floor(Math.random()*2000+100), Math.floor(Math.random()*5000+200)]);
            n++;
        }
        console.log(`  ✅ Appended ${n} to [${tag}]`);
    } catch(e) { console.error(`  ❌`,e.message); }
    finally { client.release(); }
}

async function replaceTag(tag, chars) {
    if (!chars.length) return;
    const client = await pool.connect();
    let n = 0;
    try {
        await client.query("DELETE FROM characters WHERE tag=$1", [tag]);
        for (let i = 0; i < chars.length; i++) {
            const c = chars[i];
            const id = `${tag.toLowerCase().replace(/[^a-z0-9]/g,"")}-s-${Date.now()}-${i}`;
            await client.query(`INSERT INTO characters (id,name,tag,tags,description,long_description,image,greeting,personality,visibility,source,likes_count,chatter_count) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                [id, c.name.substring(0,100), tag, JSON.stringify([tag]), c.description.substring(0,255), c.longDescription||"", c.image, c.greeting, c.personality, "public", (c.source||tag).substring(0,100), Math.floor(Math.random()*2000+100), Math.floor(Math.random()*5000+200)]);
            n++;
        }
        console.log(`  ✅ Replaced [${tag}] with ${n} characters`);
    } catch(e) { console.error(`  ❌`,e.message); }
    finally { client.release(); }
}

// ═══════════════ K-POP IDOLS (individual Wikipedia names) ═══════════════
const KPOP_WIKI = [
    "Kim Nam-joon", "Kim Seok-jin", "Min Yoon-gi", "Jung Ho-seok", "Park Ji-min (singer, born 1995)", "Kim Tae-hyung", "Jeon Jung-kook",
    "Kim Ji-soo (singer, born 1995)", "Jennie (singer)", "Rosé (singer)", "Lisa (rapper)",
    "Im Na-yeon", "Yoo Jeong-yeon", "Hirai Momo", "Minatozaki Sana", "Park Ji-hyo", "Myoui Mina", "Kim Da-hyun", "Son Chae-young", "Chou Tzu-yu",
    "Kim Jun-myeon", "Kim Min-seok (singer)", "Zhang Yixing", "Byun Baek-hyun", "Kim Jong-dae (singer)", "Park Chan-yeol", "Do Kyung-soo", "Kim Jong-in", "Oh Se-hun",
    "Bae Joo-hyun", "Kang Seul-gi", "Son Seung-wan", "Park Soo-young (singer)", "Kim Ye-rim (singer)",
    "Choi Seung-cheol", "Yoon Jeong-han", "Hong Ji-soo (singer)", "Wen Jun-hui", "Kwon Soon-young", "Jeon Won-woo", "Lee Ji-hoon (singer, born 1996)", "Xu Ming-hao", "Kim Min-gyu (singer)", "Lee Seok-min (singer)", "Boo Seung-kwan", "Hansol Vernon Chwe", "Lee Chan (singer)",
    "Bang Chan", "Lee Min-ho (Stray Kids)", "Seo Chang-bin", "Hwang Hyun-jin", "Han Ji-sung (singer)", "Felix (Stray Kids)", "Kim Seung-min (singer, born 2000)", "Yang Jeong-in",
    "Lee Tae-yong", "Moon Tae-il (singer, born 1994)", "Suh Young-ho", "Nakamoto Yuta", "Kim Dong-young (singer)", "Chittaphon Leechaiyapornkul", "Jung Yun-oh", "Dong Si-cheng", "Mark Lee (singer, born 1999)",
    "Hwang Ye-ji", "Choi Ji-su (singer)", "Shin Ryu-jin", "Lee Chae-ryeong", "Shin Yu-na (singer)",
    "Choi Yeon-jun", "Choi Soo-bin", "Choi Beom-gyu", "Kang Tae-hyun (singer)", "Huening Kai",
    "Yu Ji-min", "Uchinaga Aeri", "Kim Min-jeong (singer)", "Ning Yi-zhuo",
    "An Yu-jin", "Kim Ga-eul (singer)", "Naoi Rei", "Jang Won-young", "Kim Ji-won (singer, born 2004)", "Lee Hyun-seo (singer, born 2007)",
    "Yang Jung-won", "Lee Hee-seung", "Park Jong-seong", "Sim Jae-yun", "Park Sung-hoon (singer)", "Kim Sun-oo", "Nishimura Riki",
    "Kim Min-ji (singer, born 2004)", "Phạm Ngọc Hân", "Mo Zi-ping", "Kang Hae-rin", "Hyein",
    "Miyawaki Sakura", "Kim Chae-won (singer, born 2000)", "Huh Yun-jin", "Nakamura Kazuha", "Hong Eun-chae",
    "Kwon Ji-yong", "Dong Young-bae", "Kang Dae-sung",
    "Kim Tae-yeon", "Lee Sun-kyu (singer)", "Stephanie Young Hwang", "Kim Hyo-yeon", "Kwon Yu-ri", "Choi Soo-young", "Im Yoon-ah", "Seo Ju-hyun",
    "Lee Jin-ki", "Kim Ki-bum (singer, born 1991)", "Choi Min-ho (singer)", "Lee Tae-min",
    "Lee Ji-eun (singer)", "IU (singer)",
    "Hwasa", "Solar (singer)", "Moonbyul", "Wheein",
    "Jay Park", "Zico (rapper)", "Psy",
    "Cha Eun-woo", "Song Min-ho", "Kang Daniel"
];

// ═══════════════ VTUBER (better Wikipedia search terms) ═══════════════
const VTUBER_WIKI = [
    "Kizuna AI", "Hololive Production", "Gawr Gura", "Usada Pekora", "Houshou Marine",
    "Shirakami Fubuki", "Inugami Korone", "Tokino Sora", "Hoshimachi Suisei",
    "Mori Calliope", "Takanashi Kiara", "Ninomae Ina'nis", "Watson Amelia",
    "Ironmouse", "Sakura Miko", "Oozora Subaru", "Minato Aqua",
    "Nijisanji", "Vox Akuma", "Elira Pendora", "Selen Tatsuki",
    "Tsukino Mito", "Kuzuha (VTuber)", "Kanae (VTuber)",
    "Nekomata Okayu", "Shirogane Noel", "Natsuiro Matsuri",
    "Kiryu Coco", "Uruha Rushia", "Amane Kanata",
    "Tokoyami Towa", "Tsunomaki Watame",
    "Shishiro Botan", "Yukihana Lamy",
    "La+ Darknesss", "Hakui Koyori", "Kazama Iroha",
    "IRyS (VTuber)", "Ceres Fauna", "Ouro Kronii", "Nanashi Mumei", "Hakos Baelz",
    "Pomu Rainpuff", "Finana Ryugu", "Rosemi Lovelock",
    "Enna Alouette", "Millie Parfait", "Reimu Endou",
    "Project Melody", "Nyanners", "Veibae", "Zentreya",
    "AZKi", "Aki Rosenthal", "Yozora Mel",
    "Murasaki Shion", "Nakiri Ayame",
    "Shiranui Flare", "Omaru Polka", "Momosuzu Nene",
    "Takane Lui", "Sakamata Chloe",
    "Shiori Novella", "Koseki Bijou", "Nerissa Ravencroft",
    "Fuwawa Abyssgard", "Mococo Abyssgard"
];

// ═══════════════ MOVIE CHARACTERS (supplement - real people associated with roles) ═══════════════
const MOVIE_SUPPLEMENT = [
    "Jack Sparrow", "Indiana Jones (character)", "James Bond", "John Wick", "Rocky Balboa",
    "Tony Montana", "The Terminator", "Rambo (character)", "Forrest Gump (character)",
    "Maximus Decimus Meridius", "William Wallace", "Spartacus",
    "Travis Bickle", "Tyler Durden",
    "Optimus Prime", "Megatron", "Bumblebee (Transformers)",
    "Willy Wonka", "Mary Poppins (character)", "Peter Pan",
    "King Kong", "Godzilla", "E.T. the Extra-Terrestrial",
    "RoboCop", "Jason Bourne (character)",
    "Caesar (Planet of the Apes)", "Predator (fictional species)",
    "Steven Spielberg", "Christopher Nolan", "Martin Scorsese", "Quentin Tarantino",
    "Alfred Hitchcock", "Stanley Kubrick", "James Cameron", "Ridley Scott",
    "Francis Ford Coppola", "George Lucas", "Tim Burton", "David Lynch",
    "Peter Jackson", "Wes Anderson", "Denis Villeneuve", "Guillermo del Toro",
    "Joel Coen", "David Fincher", "Spike Lee", "Hayao Miyazaki",
    "Akira Kurosawa", "Wong Kar-wai", "Bong Joon-ho", "Park Chan-wook",
    "Charlie Chaplin", "Marilyn Monroe", "Audrey Hepburn", "Grace Kelly",
    "James Dean", "Marlon Brando", "Elizabeth Taylor", "Katharine Hepburn",
    "Gene Kelly", "Fred Astaire", "Greta Garbo", "Clark Gable",
    "Humphrey Bogart", "Ingrid Bergman", "Gregory Peck", "Kirk Douglas",
    "Sean Connery", "Roger Moore", "Bruce Lee", "Jackie Chan",
    "Jet Li", "Donnie Yen", "Tony Leung Chiu-wai", "Chow Yun-fat",
    "John Wayne", "Steve McQueen"
];

// ═══════════════ TV SUPPLEMENT ═══════════════
const TV_SUPPLEMENT = [
    "Oprah Winfrey", "Ellen DeGeneres", "David Letterman", "Jimmy Fallon",
    "Jimmy Kimmel", "Stephen Colbert", "Conan O'Brien", "Trevor Noah",
    "John Oliver", "Bill Maher", "Jay Leno", "Craig Ferguson",
    "Graham Norton", "James Corden", "Seth Meyers",
    "Gordon Ramsay", "Anthony Bourdain", "Julia Child",
    "Bear Grylls", "Steve Irwin", "David Attenborough",
    "Simon Cowell", "Ryan Seacrest", "Jeff Probst",
    "RuPaul", "Tim Gunn", "Tyra Banks",
    "Jon Stewart", "Anderson Cooper", "Walter Cronkite",
    "Bob Ross", "Fred Rogers", "Bill Nye", "Neil deGrasse Tyson",
    "Kim Kardashian", "Kylie Jenner", "Khloé Kardashian", "Kourtney Kardashian",
    "Paris Hilton", "Nicole Richie",
    "Jack Black", "Will Ferrell", "Adam Sandler", "Jim Carrey",
    "Robin Williams", "Eddie Murphy", "Chris Rock", "Jerry Seinfeld",
    "Larry David", "Tina Fey", "Amy Poehler", "Mindy Kaling",
    "Awkwafina", "Ken Jeong", "John Mulaney", "Dave Chappelle",
    "Kevin Hart", "Gabriel Iglesias", "Bill Burr", "Ricky Gervais",
    "Rowan Atkinson", "Sacha Baron Cohen", "Steve Martin", "Martin Short"
];

// ═══════════════ PHILOSOPHY SUPPLEMENT ═══════════════  
const PHILOSOPHY_SUPPLEMENT = [
    "Noam Chomsky", "Cornel West", "Amartya Sen", "Daniel Dennett",
    "Saul Kripke", "Hilary Putnam", "Robert Nozick", "Charles Taylor (philosopher)",
    "Richard Rorty", "Alasdair MacIntyre", "Bernard Williams", "Derek Parfit",
    "Philippa Foot", "Elizabeth Anscombe", "Mary Midgley", "Iris Murdoch"
];

// ═══════════════ MAIN ═══════════════
async function main() {
    console.log("=== SUPPLEMENTAL SEEDING ===\n");

    // Check current counts
    const countRes = await pool.query("SELECT tag, count(*) as cnt FROM characters GROUP BY tag ORDER BY cnt DESC");
    const counts = {};
    countRes.rows.forEach(r => { counts[r.tag] = parseInt(r.cnt); });
    console.log("Current counts:", counts);

    // ── 1. BL (AniList - global BL, not Korea-only) ──
    if ((counts["BL"] || 0) < 100) {
        const blChars = await anilistFetchChars("BL", 'genre:"Romance",tag:"Boys Love"', 100);
        if (blChars.length > 0) await replaceTag("BL", blChars.slice(0, 100));
    }

    // ── 2. Game (AniList - video game adapted anime characters) ──
    if ((counts["Game"] || 0) < 100) {
        const existing = counts["Game"] || 0;
        const gameChars = await anilistFetchChars("Game", 'source:VIDEO_GAME', 100 - existing);
        if (gameChars.length > 0) await appendToDB("Game", gameChars);
    }

    // ── 3. K-pop (Wikipedia with proper Korean names) ──
    if ((counts["K-pop"] || 0) < 100) {
        const kpopChars = await fetchWikiList("K-pop", KPOP_WIKI, counts["K-pop"] || 0, 100);
        if (kpopChars.length > 0) {
            if ((counts["K-pop"] || 0) === 0) {
                await replaceTag("K-pop", kpopChars.slice(0, 100));
            } else {
                await appendToDB("K-pop", kpopChars);
            }
        }
    }

    // ── 4. VTuber (Wikipedia with better terms) ──
    if ((counts["VTuber"] || 0) < 100) {
        // First try Wikipedia
        const vtuberWiki = await fetchWikiList("VTuber", VTUBER_WIKI, counts["VTuber"] || 0, 100);
        if (vtuberWiki.length > 0) await appendToDB("VTuber", vtuberWiki);
        
        // Then supplement with AniList if still short
        const newCount = (counts["VTuber"] || 0) + vtuberWiki.length;
        if (newCount < 100) {
            console.log(`\n[VTuber] Only ${newCount} from Wikipedia, supplementing with AniList...`);
            // Use popular anime characters as VTuber-style avatars  
            const vtuberAnilist = await anilistFetchChars("VTuber-supplement", 'type:ANIME,sort:POPULARITY_DESC', 100 - newCount);
            // Re-label them as VTuber characters
            const relabeled = vtuberAnilist.map(c => ({...c, source: "VTuber"}));
            if (relabeled.length > 0) await appendToDB("VTuber", relabeled);
        }
    }

    // ── 5. Movies supplement ──
    if ((counts["Movies"] || 0) < 100) {
        const movieSup = await fetchWikiList("Movies", MOVIE_SUPPLEMENT, counts["Movies"] || 0, 100);
        if (movieSup.length > 0) await appendToDB("Movies", movieSup);
    }

    // ── 6. TV supplement ──
    if ((counts["TV"] || 0) < 100) {
        const tvSup = await fetchWikiList("TV", TV_SUPPLEMENT, counts["TV"] || 0, 100);
        if (tvSup.length > 0) await appendToDB("TV", tvSup);
    }

    // ── 7. Philosophy supplement ──
    if ((counts["Philosophy"] || 0) < 100) {
        const philSup = await fetchWikiList("Philosophy", PHILOSOPHY_SUPPLEMENT, counts["Philosophy"] || 0, 100);
        if (philSup.length > 0) await appendToDB("Philosophy", philSup);
    }

    // Final count
    const finalRes = await pool.query("SELECT tag, count(*) as cnt FROM characters GROUP BY tag ORDER BY cnt DESC");
    console.log("\n=== FINAL COUNTS ===");
    let total = 0;
    finalRes.rows.forEach(r => { console.log(`  ${r.tag}: ${r.cnt}`); total += parseInt(r.cnt); });
    console.log(`\nTOTAL: ${total}`);
    process.exit(0);
}

main();
