/**
 * FIX 6 TAGS — Replace anime characters with CORRECT content
 * 
 * BL → Thai/Korean BL drama actors (real people)
 * GL → GL drama actresses and creators (real people)
 * Roleplay → Famous fictional characters from books/movies (Wikipedia)
 * Original → Webtoon/Webcomic creators & original content creators
 * Manga → Famous manga artists and mangaka (real people)
 * Game → Video game series and key figures (real people + game titles)
 */
const https = require("https");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    connectionString: (process.env.DATABASE_URL || "").replace(/[?&]sslmode=[^&]*/g, ""),
    ssl: { rejectUnauthorized: false }
});

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
                    if (thumb.includes("Question_book") || thumb.includes("No_image") || thumb.includes("Flag_of") || thumb.includes("replace_this") || thumb.includes("Commons-logo")) return resolve(null);
                    resolve({ image: thumb, extract: (pg.extract || "").substring(0, 800) });
                } catch { resolve(null); }
            });
        }).on("error", () => resolve(null));
    });
}

// ═══════════════════════════════════════════════════════════
// HARDCODED NAME LISTS — TAG-APPROPRIATE CONTENT
// ═══════════════════════════════════════════════════════════

const BL_NAMES = [
    // Thai BL actors
    "Bright Vachirawit","Win Metawin","Mew Suppasit","Gulf Kanawut","Ohm Pawat",
    "Nanon Korapat","Gemini Norawit","Fourth Nattawat","Billkin Putthipong","PP Krit",
    "Mile Phakphum","Apo Nattawin","Jeff Satur","Barcode Tinnasit",
    "Earth Pirapat","Mix Sahaphap","Singto Prachaya","Krist Perawat",
    "Tay Tawan","New Thitipoom","Off Jumpol","Gun Atthaphan",
    "Zee Pruk","NuNew Chawarin","MaxTul","Tul Pakorn",
    "Pond Naravit","Phuwin Tangsakyuen","Dunk Natachai","Joong Archen",
    "Perth Tanapon","Saint Suppapong","Jimmy Jitaraphol","Tommy Sittichok",
    "Copter Panuwat","Kimmon Varodom","Bas Suradet","Gawin Caskey",
    "Fluke Natouch","Ohm Thitiwat","Lee Thanat","Mond Tanutchai",
    "Boss Chaikamon","Noeul Nuttarat","Fort Thitipong","Peat Wasuthorn",
    // Korean BL actors
    "Choi Woo-shik","Park Seo-joon","Song Kang (actor)","Hwang In-youp",
    "Kim Seon-ho","Cha Eun-woo","Han Ji-pyeong","Jung Hae-in",
    "Park Bo-gum","Lee Do-hyun","Byeon Woo-seok",
    // BL manga authors
    "Asumiko Nakamura","Kou Yoneda","Harada (manga artist)",
    // Japanese BL actors
    "Ryoma Takeuchi","Kento Yamazaki","Mackenyu","Ryo Yoshizawa",
    "Kentaro Sakaguchi","Tomohisa Yamashita","Takeru Satoh",
    // BL directors
    "Nattapong Mongkolsawas","Aof Noppharnach",
    // Filipino BL actors
    "Donny Pangilinan","Belle Mariano",
    // More Thai BL
    "War Wanarat","Yin Anan","Cooheart Natchai","First Chalongrat",
    "Khao Thawatchai","First Kanaphan","Khaotung Thanawat",
    "Aye Sarunchana","Force Jiratchapong","Book Kasidet",
    "Mean Phiravich","Plan Rathavit","Mek Jirakit","Title Kirati",
    "Sammy Cowell","Mii Natthanun","Neo Trai","Louis Thanawin",
    "Mark Pakin","Vee Ratchanon","JJ Chayakorn","Nut Supanut",
    "Pon Nawasch","Prem Warut","Boun Noppanut","Prem Warut",
    "Film Thanapat","Papang Jiravich","Namtan Tipnaree","Film Rachanon",
    "Drake Laedeke","Pete Thongchua","Kao Noppakao","Up Poompat",
    "Bonus Thanapat","Santa Pongsapak","Kijima Kai","Yin War"
];

const GL_NAMES = [
    // Thai GL actresses
    "Freen Sarocha","Becky Armstrong","Engfa Waraha","Charlotte Austin",
    "Orm Kornnaphat","Lingling Kwong","Milk Pansa","Love Pattranite",
    "Nink Nithiwat","Jenny Panhan","View Benyapa","Aye Sarunchana",
    "Namtan Tipnaree","Aou Jiratchaya","Film Rachanon","Kade Kasidit",
    "Ploy Sornarin","Kate Thanyarat","Noey Chotika","Mind Chanya",
    "Faye Mata","Sam Richelle",
    // Korean GL/Queer actresses
    "Kim Sae-ron","Lee Yoo-young","Kim Hye-jun","Jeon Yeo-been",
    "Roh Yoon-seo","Shin Ye-eun","Lee Sung-kyung","Bae Suzy",
    "Park Min-young","Seo Ye-ji","Jun Ji-hyun","Han So-hee",
    "Kim Da-mi","Go Min-si","Moon Ga-young","Kim Yoo-jung",
    // GL content creators/directors
    "Park Chan-wook","Céline Sciamma","Dee Rees","Lisa Cholodenko",
    "Patricia Highsmith","Sarah Waters","Alice Walker",
    // Japanese GL
    "Ikuhara Kunihiko","Naoko Takeuchi","Morishima Akiko",
    // Western GL actresses
    "Cate Blanchett","Rooney Mara","Adèle Haenel","Noémie Merlant",
    "Rachel Weisz","Rachel McAdams","Ellen Page","Kate McKinnon",
    "Jodie Foster","Sarah Paulson","Holland Taylor","Kristen Stewart",
    "Cara Delevingne","Ruby Rose","Amber Heard","Evan Rachel Wood",
    "Tessa Thompson","Janelle Monáe","Aubrey Plaza","Stephanie Beatriz",
    "Lena Waithe","Wanda Sykes","Ellen DeGeneres","Portia de Rossi",
    "Lily Tomlin","Jane Fonda","Cynthia Nixon","Sara Ramirez",
    // GL manga/webtoon creators
    "Saburouta","Kodama Naoko","Nio Nakatani",
    // More Thai GL
    "Prim Chanikarn","Anna Charm","Lookjun Saras","OhmFluke","Lookjun","Font Arisara",
    "Mild Sutthipha","Tee Bundit","Nine Naphat","Peak Peemapol",
    "Thanwa Suriyajak","Tan Thanakorn","Ssing Nanthida","Aoom Sushar",
    "Opor Prajaktra","Ploychompoo","Mai Davika","Yaya Urassaya","Bow Maylada",
    "Kimberley Anne Woltemas","Bella Ranee","Mew Nittha","Eye Kamolned"
];

const MANGA_NAMES = [
    // Legendary mangaka
    "Osamu Tezuka","Akira Toriyama","Eiichiro Oda","Masashi Kishimoto","Tite Kubo",
    "Rumiko Takahashi","Naoko Takeuchi","CLAMP","Kentaro Miura","Yoshihiro Togashi",
    "Hiromu Arakawa","Hajime Isayama","Kohei Horikoshi","Gege Akutami",
    "Koyoharu Gotouge","Tatsuya Endo","Yūsei Matsui","Takehiko Inoue",
    "Tsugumi Ohba","Takeshi Obata","Hirohiko Araki","Sui Ishida",
    "Tokyo Ghoul","Vagabond (manga)","Slam Dunk (manga)","Berserk (manga)",
    "One Piece","Naruto","Bleach (manga)","Dragon Ball",
    "JoJo's Bizarre Adventure","Hunter × Hunter","Fullmetal Alchemist",
    "Death Note","My Hero Academia","Demon Slayer: Kimetsu no Yaiba",
    "Attack on Titan","Jujutsu Kaisen","Spy × Family","Chainsaw Man",
    "One-Punch Man","Mob Psycho 100","Haikyū!!","Vinland Saga","Vagabond (manga)",
    // Manga editors/publishers
    "Shueisha","Kodansha","Shogakukan",
    // Famous manga characters on Wikipedia
    "Monkey D. Luffy","Son Goku (Dragon Ball)","Naruto Uzumaki","Ichigo Kurosaki",
    "Gon Freecss","Edward Elric","Light Yagami","Izuku Midoriya",
    "Eren Yeager","Tanjiro Kamado","Yuji Itadori","Anya Forger",
    "Denji (Chainsaw Man)","Saitama (One-Punch Man)","Guts (Berserk)",
    "Roronoa Zoro","Nami (One Piece)","Sasuke Uchiha","Sakura Haruno",
    "Vegeta","Gojo Satoru","Levi Ackerman","Mikasa Ackerman",
    // More mangaka
    "Naoki Urasawa","Junji Ito","Katsuhiro Otomo","Go Nagai",
    "Leiji Matsumoto","Moto Hagio","Riyoko Ikeda","Yoshiyuki Sadamoto",
    "Masamune Shirow","Tsutomu Nihei","Makoto Yukimura","Kaoru Mori",
    "Natsuki Takaya","Yana Toboso","Arina Tanemura","Io Sakisaka",
    "Hiro Mashima","Yūki Tabata","Aka Akasaka","Fujimoto Tatsuki",
    "Shuzo Oshimi","Asano Inio","Urasawa Naoki","Taiyo Matsumoto",
    "Eiichiro Oda","ONE (manga artist)","Yusuke Murata",
    // Korean manhwa
    "Tower of God","Solo Leveling","Noblesse (manhwa)","The God of High School",
    "Lookism (manhwa)","True Beauty (manhwa)",
    // Chinese manhua  
    "The King's Avatar"
];

const GAME_NAMES = [
    // Game designers/developers (real people with Wikipedia photos)
    "Shigeru Miyamoto","Hideo Kojima","Hidetaka Miyazaki (game director)","Todd Howard",
    "Gabe Newell","John Carmack","Sid Meier","Will Wright (game designer)",
    "Tim Schafer","Peter Molyneux","Fumito Ueda","Yoko Taro",
    "Masahiro Sakurai","Satoshi Tajiri","Junichi Masuda","Tetsuya Nomura",
    "Hironobu Sakaguchi","Yuji Naka","Yu Suzuki","Toby Fox",
    "Markus Persson","Phil Spencer (business executive)","Ken Levine (game developer)",
    "Neil Druckmann","Cory Barlog","Amy Hennig","Reggie Fils-Aimé",
    "Satoru Iwata","Masahiro Sakurai","Eiji Aonuma","Shinji Mikami",
    "Hideki Kamiya","Suda51","Yosuke Hayashi","Kazunori Yamauchi",
    // Game franchises with Wikipedia articles (have good images)
    "The Legend of Zelda","Super Mario","Pokémon","Final Fantasy",
    "Metal Gear (series)","Resident Evil","Silent Hill","Dark Souls",
    "God of War (franchise)","The Last of Us","Uncharted (video game series)",
    "Halo (franchise)","Call of Duty","Grand Theft Auto","Red Dead Redemption",
    "The Elder Scrolls","Fallout (series)","Mass Effect","BioShock",
    "Assassin's Creed","Far Cry (franchise)","Watch Dogs","Tom Clancy's Rainbow Six Siege",
    "Fortnite","Minecraft","Roblox","Among Us","Valorant",
    "League of Legends","Dota 2","Counter-Strike","Overwatch (video game)",
    "Genshin Impact","Honkai: Star Rail","Elden Ring","Sekiro: Shadows Die Twice",
    "Cyberpunk 2077","The Witcher 3: Wild Hunt","Baldur's Gate 3",
    "Stardew Valley","Hollow Knight","Celeste (video game)","Undertale","Hades (video game)",
    "Persona 5","NieR: Automata","Devil May Cry","Bayonetta (video game)",
    "Street Fighter","Tekken","Mortal Kombat","Super Smash Bros.",
    "Animal Crossing","Fire Emblem","Xenoblade Chronicles","Splatoon",
    "Monster Hunter","Dragon Quest","Kingdom Hearts","Sonic the Hedgehog",
    "Crash Bandicoot","Spyro the Dragon","Ratchet & Clank","Jak and Daxter",
    "World of Warcraft","Diablo (video game)","StarCraft","Hearthstone",
    "Apex Legends","PlayerUnknown's Battlegrounds","Destiny (video game)",
    "Bloodborne","Demon's Souls","Ghost of Tsushima","Horizon Zero Dawn",
    "Spider-Man (2018 video game)","Death Stranding","It Takes Two (video game)",
    "Terraria","Palworld","Lethal Company","Subnautica"
];

const ROLEPLAY_NAMES = [
    // D&D / Tabletop RPG
    "Dungeons & Dragons","Gary Gygax","Dave Arneson","Critical Role",
    "Matthew Mercer","Brennan Lee Mulligan","Dimension 20",
    // Fantasy book characters with Wikipedia articles
    "Gandalf","Aragorn","Legolas","Frodo Baggins","Samwise Gamgee",
    "Gollum","Sauron","Bilbo Baggins","Éowyn","Boromir",
    "Harry Potter (character)","Hermione Granger","Ron Weasley","Albus Dumbledore",
    "Severus Snape","Draco Malfoy","Lord Voldemort","Sirius Black",
    "Geralt of Rivia","Yennefer of Vengerberg","Ciri",
    "Jon Snow (character)","Daenerys Targaryen","Tyrion Lannister","Arya Stark",
    "Cersei Lannister","Jaime Lannister","Sansa Stark","Bran Stark",
    "Katniss Everdeen","Peeta Mellark",
    "Percy Jackson (character)","Annabeth Chase",
    // Movie/TV fantasy characters
    "Darth Vader","Luke Skywalker","Princess Leia","Han Solo","Yoda",
    "Obi-Wan Kenobi","Anakin Skywalker","Padmé Amidala",
    "Batman","Superman","Wonder Woman","Spider-Man","Iron Man",
    "Captain America","Thor (Marvel Comics)","Black Widow (Marvel Comics)",
    "Wolverine (character)","Deadpool (character)",
    "Captain Jack Sparrow","Indiana Jones (character)","James Bond",
    "Sherlock Holmes","John Watson","Dracula (Bram Stoker character)",
    "King Arthur","Robin Hood","Merlin","Lancelot",
    // Video game RPG
    "The Dragonborn","Commander Shepard","Geralt of Rivia",
    "Cloud Strife","Sephiroth","Tifa Lockhart",
    // LARP/Cosplay figures
    "Cosplay","Live action role-playing game",
    // Iconic RP characters from literature
    "Alice (Alice's Adventures in Wonderland)","Pinocchio",
    "Dorothy Gale","Peter Pan (character)","Tinker Bell",
    "Odysseus","Achilles","Beowulf","King Arthur",
    "Conan the Barbarian","Red Sonja",
    "Rincewind","Death (Discworld)","Granny Weatherwax",
    "Kvothe","Vin (Mistborn)","Kaladin"
];

const ORIGINAL_NAMES = [
    // Webtoon/Webcomic creators
    "SIU (artist)","Chugong","Son Jae-ho","Park Tae-joon",
    "Yaongyi","Lore Olympus","Rachel Smythe","Uru-chan",
    // Original content creators (YouTube, streaming)
    "PewDiePie","MrBeast","Markiplier","Jacksepticeye","VanossGaming",
    "Dream (YouTuber)","TommyInnit","Technoblade","Ph1LzA",
    "Pokimane","Valkyrae","Sykkuno","Disguised Toast",
    "Ludwig (YouTuber)","Mizkif","xQc","Kai Cenat",
    "Ninja (streamer)","Shroud","TimTheTatman",
    // Original animation creators
    "Vivienne Medrano","Arin Hanson","Monty Oum","Pendleton Ward",
    "Rebecca Sugar","Daron Nefcy","Dana Terrace","Alex Hirsch",
    "Natasha Allegri","Patrick McHale","Ian Jones-Quartey",
    // Indie game creators
    "Toby Fox","Eric Barone","Maddy Thorson","Team Cherry",
    "ConcernedApe","Davey Wreden","Lucas Pope",
    // Vocaloid/Virtual creators
    "Hatsune Miku","Kagamine Rin/Len","Megurine Luka","KAITO","MEIKO",
    "Gumi (Vocaloid)","IA (Vocaloid)","Flower (Vocaloid)",
    // Digital artists
    "Ilya Kuvshinov","Ross Tran","WLOP","Sakimichan",
    "Kim Jung Gi","Yusuke Murata","Makoto Shinkai","Mamoru Hosoda",
    // OC-heavy communities
    "DeviantArt","Pixiv","ArtStation",
    // Webtoon series
    "Tower of God","Solo Leveling","The Beginning After the End",
    "Omniscient Reader's Viewpoint","Eleceed","Weak Hero",
    "Unholy Blood","The Remarried Empress","True Beauty (manhwa)",
    "My Deepest Secret","Let's Play (webcomic)","I Love Yoo",
    "Boyfriend of the Dead","Rebirth (manhwa)","Hardcore Leveling Warrior",
    "Noblesse (manhwa)","God of High School","Lookism (manhwa)",
    "Sweet Home (manhwa)","Bastard (manhwa)","Cheese in the Trap",
    // Light novel authors
    "Reki Kawahara","Nagaru Tanigawa","Nisioisin","Isuna Hasekura",
    "Yuyuko Takemiya","Ryohgo Narita","Kinoko Nasu","Type-Moon"
];

// ═══════════════════════════════════════════════════
// SEED FUNCTIONS
// ═══════════════════════════════════════════════════
async function fetchWikiTag(tag, names, count = 100) {
    console.log(`\n[${tag}] Checking ${names.length} candidates...`);
    let results = [];
    for (const name of names) {
        if (results.length >= count) break;
        const w = await wikiGet(name);
        if (w) {
            const displayName = name.replace(/\s*\(.*?\)\s*$/, "");
            results.push({
                name: displayName, description: `${displayName} — ${tag}`,
                longDescription: w.extract, image: w.image,
                greeting: `Hello! I'm ${displayName}. Let's talk!`,
                personality: "famous, iconic, legendary", source: tag
            });
            if (results.length % 20 === 0) console.log(`  ${results.length}/${count}...`);
        }
        if (results.length % 3 === 0) await new Promise(r => setTimeout(r, 100));
    }
    console.log(`  Got ${results.length} characters for "${tag}"`);
    return results;
}

async function seedToDB(tag, chars) {
    const client = await pool.connect();
    try {
        let n = 0;
        for (let i = 0; i < chars.length; i++) {
            const c = chars[i];
            const id = `${tag.toLowerCase().replace(/[^a-z0-9]/g, "")}-f-${Date.now()}-${i}`;
            await client.query(`INSERT INTO characters (id,name,tag,tags,description,long_description,image,greeting,personality,visibility,source,likes_count,chatter_count) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                [id, c.name.substring(0, 100), tag, JSON.stringify([tag]), c.description, c.longDescription || "", c.image, c.greeting, c.personality, "public", (c.source || tag).substring(0, 100), Math.floor(Math.random() * 2000 + 100), Math.floor(Math.random() * 5000 + 200)]);
            n++;
        }
        console.log(`  ✅ Inserted ${n} chars for [${tag}]`);
    } catch (e) { console.error(`  ❌ DB error:`, e.message); }
    finally { client.release(); }
}

async function main() {
    console.log("=== FIX 6 TAGS — NO MORE ANIME IN WRONG TAGS ===\n");

    // 1. Delete all from these 6 tags
    const tagsToFix = ["BL", "GL", "Roleplay", "Original", "Manga", "Game"];
    const client = await pool.connect();
    for (const tag of tagsToFix) {
        const r = await client.query("DELETE FROM characters WHERE tag=$1", [tag]);
        console.log(`Deleted ${r.rowCount} chars from [${tag}]`);
    }
    client.release();

    // 2. Re-seed each with Wikipedia data
    const tagMap = {
        "BL": BL_NAMES,
        "GL": GL_NAMES,
        "Manga": MANGA_NAMES,
        "Game": GAME_NAMES,
        "Roleplay": ROLEPLAY_NAMES,
        "Original": ORIGINAL_NAMES
    };

    for (const [tag, names] of Object.entries(tagMap)) {
        const chars = await fetchWikiTag(tag, names, 100);
        if (chars.length > 0) await seedToDB(tag, chars);
    }

    // Final count
    const countRes = await pool.query("SELECT tag, count(*) as cnt FROM characters GROUP BY tag ORDER BY cnt DESC");
    console.log("\n=== FINAL COUNTS ===");
    let total = 0;
    countRes.rows.forEach(r => { console.log(`  ${r.tag}: ${r.cnt}`); total += parseInt(r.cnt); });
    console.log(`\nTOTAL: ${total}`);
    process.exit(0);
}

main();
