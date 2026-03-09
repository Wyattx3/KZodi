/**
 * BULLETPROOF RP AND GL SEEDER (100 TARGET)
 */
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    connectionString: (process.env.DATABASE_URL || "").replace(/[?&]sslmode=[^&]*/g, ""),
    ssl: { rejectUnauthorized: false }
});

const GL_MAP = [
    { n: "Yuzu Aihara", s: "Citrus", img: "https://s4.anilist.co/file/anilistcdn/character/large/b88825-J9I5A2K2wH4E.png" },
    { n: "Mei Aihara", s: "Citrus", img: "https://s4.anilist.co/file/anilistcdn/character/large/b88827-XbB8hQcOh5aK.png" },
    { n: "Touko Nanami", s: "Bloom Into You", img: "https://s4.anilist.co/file/anilistcdn/character/large/b125740-4p4n1C8BfM15.png" },
    { n: "Yuu Koito", s: "Bloom Into You", img: "https://s4.anilist.co/file/anilistcdn/character/large/b125739-1H2Z1Zg3H2B4.png" },
    { n: "Adachi Sakura", s: "Adachi to Shimamura", img: "https://s4.anilist.co/file/anilistcdn/character/large/b143521-1sZ2D2x4G8K1.png" },
    { n: "Shimamura Hougetsu", s: "Adachi to Shimamura", img: "https://s4.anilist.co/file/anilistcdn/character/large/b143522-8H4Q2w5B2B2H.png" },
    { n: "Rae Taylor", s: "I'm in Love with the Villainess", img: "https://s4.anilist.co/file/anilistcdn/character/large/b258384-5aL4M3g9I2Q4.jpg" },
    { n: "Claire François", s: "I'm in Love with the Villainess", img: "https://s4.anilist.co/file/anilistcdn/character/large/b258385-6lH7W3e1T4N1.jpg" },
    { n: "Utena Tenjou", s: "Revolutionary Girl Utena", img: "https://s4.anilist.co/file/anilistcdn/character/large/b718-4x9Q2w5B2B2H.jpg" },
    { n: "Anthy Himemiya", s: "Revolutionary Girl Utena", img: "https://s4.anilist.co/file/anilistcdn/character/large/b719-7H4Q2w5B2B2H.jpg" },
    { n: "Haruka Tenou", s: "Sailor Moon", img: "https://s4.anilist.co/file/anilistcdn/character/large/b2361-9H4Q2w5B2B2H.png" },
    { n: "Michiru Kaiou", s: "Sailor Moon", img: "https://s4.anilist.co/file/anilistcdn/character/large/b2362-1H4Q2w5B2B2H.png" },
    { n: "Kase Tomoka", s: "Kase-san", img: "https://s4.anilist.co/file/anilistcdn/character/large/b120883-2H4Q2w5B2B2H.jpg" },
    { n: "Yamada Yui", s: "Kase-san", img: "https://s4.anilist.co/file/anilistcdn/character/large/b120882-3H4Q2w5B2B2H.jpg" },
    { n: "Shizuma Hanazono", s: "Strawberry Panic", img: "https://s4.anilist.co/file/anilistcdn/character/large/b1875-4H4Q2w5B2B2H.jpg" },
    { n: "Nagisa Aoi", s: "Strawberry Panic", img: "https://s4.anilist.co/file/anilistcdn/character/large/b1874-5H4Q2w5B2B2H.jpg" },
    { n: "Shiramine", s: "Yuri is My Job!", img: "https://s4.anilist.co/file/anilistcdn/character/large/b263384-6H4Q2w5B2B2H.png" },
    { n: "Hime Shiraki", s: "Yuri is My Job!", img: "https://s4.anilist.co/file/anilistcdn/character/large/b263383-7H4Q2w5B2B2H.png" },
    { n: "Anisphia", s: "The Magical Revolution", img: "https://s4.anilist.co/file/anilistcdn/character/large/b284825-8H4Q2w5B2B2H.png" },
    { n: "Euphyllia", s: "The Magical Revolution", img: "https://s4.anilist.co/file/anilistcdn/character/large/b284826-9H4Q2w5B2B2H.png" }
];

const RP_MAP = [
    { n: "Your Strict CEO", img: "https://s4.anilist.co/file/anilistcdn/character/large/b45627-1H4Q2w5B2B2H.png", desc: "A wealthy, imposing CEO who is secretly very soft and caring behind closed doors.", m:"male" },
    { n: "Your Yandere GF", img: "https://s4.anilist.co/file/anilistcdn/character/large/b4963-2H4Q2w5B2B2H.png", desc: "A girl who loves you slightly too much and will do whatever it takes to keep you.", m:"female" },
    { n: "Your Protective Bro", img: "https://s4.anilist.co/file/anilistcdn/character/large/b14-3H4Q2w5B2B2H.png", desc: "Your older brother who keeps all the bad people away from you.", m:"male" },
    { n: "Your Childhood Friend", img: "https://s4.anilist.co/file/anilistcdn/character/large/b17-4H4Q2w5B2B2H.png", desc: "Energetic and loyal friend who has stuck by you for ten years.", m:"male" },
    { n: "Your Cool Sensei", img: "https://s4.anilist.co/file/anilistcdn/character/large/b137000-5H4Q2w5B2B2H.png", desc: "The smartest and strongest teacher in the academy.", m:"male" },
    { n: "Your Stern Father", img: "https://s4.anilist.co/file/anilistcdn/character/large/b137003-6H4Q2w5B2B2H.png", desc: "Very focused on work, but trying his best to connect with you.", m:"male" },
    { n: "Your Sweet Mother", img: "https://s4.anilist.co/file/anilistcdn/character/large/b137004-7H4Q2w5B2B2H.png", desc: "Gentle and loving mother who hides a dark past.", m:"female" },
    { n: "Your Rival", img: "https://s4.anilist.co/file/anilistcdn/character/large/b13-8H4Q2w5B2B2H.png", desc: "Always competing with you, but actually respects you deeply.", m:"male" },
    { n: "Your Cold Prince", img: "https://s4.anilist.co/file/anilistcdn/character/large/b88825-9H4Q2w5B2B2H.png", desc: "A prince of a falling kingdom who shows no emotion.", m:"male" },
    { n: "Your Secret Admirer", img: "https://s4.anilist.co/file/anilistcdn/character/large/b20-1H4Q2w5B2B2H.png", desc: "Too shy to talk to you directly, but always watches over you.", m:"female" },
    { n: "Your Bully", img: "https://s4.anilist.co/file/anilistcdn/character/large/b88826-2H4Q2w5B2B2H.png", desc: "Mean and aggressive, but struggling with his own insecurities.", m:"male" },
    { n: "Your Maid", img: "https://s4.anilist.co/file/anilistcdn/character/large/b88828-3H4Q2w5B2B2H.png", desc: "Quiet and hyper-competent maid who cleans perfectly.", m:"female" },
    { n: "Your Butler", img: "https://s4.anilist.co/file/anilistcdn/character/large/b88829-4H4Q2w5B2B2H.png", desc: "Flawless butler serving the Phantomhive family.", m:"male" },
    { n: "Your Vampire Master", img: "https://s4.anilist.co/file/anilistcdn/character/large/b88830-5H4Q2w5B2B2H.png", desc: "Ancient vampire who has chosen you as his thrall.", m:"male" },
    { n: "The Transfer Student", img: "https://s4.anilist.co/file/anilistcdn/character/large/b88831-6H4Q2w5B2B2H.png", desc: "Mysterious assassin pretending to be a normal kid.", m:"male" },
    { n: "Your Slacker Roommate", img: "https://s4.anilist.co/file/anilistcdn/character/large/b88832-7H4Q2w5B2B2H.png", desc: "Lazy silver-haired samurai who owes you three months of rent.", m:"male" },
    { n: "Your Bodyguard", img: "https://s4.anilist.co/file/anilistcdn/character/large/b88833-8H4Q2w5B2B2H.png", desc: "Stoic swordsman who constantly gets lost in the city.", m:"male" },
    { n: "Your Mafia Boss", img: "https://s4.anilist.co/file/anilistcdn/character/large/b88834-9H4Q2w5B2B2H.png", desc: "Calm and cultured leader of the Phantom Troupe.", m:"male" },
    { n: "Your Annoying Lil Sis", img: "https://s4.anilist.co/file/anilistcdn/character/large/b88835-1H4Q2w5B2B2H.png", desc: "Bites on bamboo and likes to sleep in boxes.", m:"female" },
    { n: "Your Genius Classmate", img: "https://s4.anilist.co/file/anilistcdn/character/large/b88836-2H4Q2w5B2B2H.png", desc: "Top of the class, secretly owns a magical notebook.", m:"male" }
];

async function fillFromAnilistManyPages(tag, targetCount, startIndex, mapFunc) {
    let results = [];
    let cIdx = startIndex;
    for(let page=4; page<=9; page++) {
        const query = `query{Page(page:${page},perPage:50){characters(sort:FAVOURITES_DESC){id name{full} image{large}}}}`;
        try {
            const res = await fetch("https://graphql.anilist.co", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query })
            });
            const data = await res.json();
            const chars = data?.data?.Page?.characters || [];
            
            for (const c of chars) {
                if (results.length >= targetCount) break;
                if (!c.image?.large || c.image.large.includes("default.jpg")) continue;
                results.push(mapFunc(c, cIdx++));
            }
            if (results.length >= targetCount) break;
        } catch (e) {}
    }
    return results;
}

async function seedDB(tag, chars) {
    const client = await pool.connect();
    let n = 0;
    try {
        await client.query("DELETE FROM characters WHERE tag=$1", [tag]); 
        for (let i = 0; i < chars.length; i++) {
            const c = chars[i];
            const id = `${tag.toLowerCase()}-bulletproof-${Date.now()}-${i}`;
            await client.query(`INSERT INTO characters (id,name,tag,tags,description,long_description,image,greeting,personality,visibility,source,likes_count,chatter_count) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                [id, c.name.substring(0,100), tag, JSON.stringify([tag]), c.description.substring(0,255), c.longDescription, c.image, c.greeting, c.personality, "public", c.source||tag, Math.floor(Math.random()*2000+100), Math.floor(Math.random()*5000+200)]);
            n++;
        }
        console.log(`  ✅ Inserted ${n} for [${tag}]`);
    } catch(e) { console.error(`  ❌`, e.message); }
    finally { client.release(); }
}

async function main() {
    console.log("=== BULLETPROOF ROLEPLAY & GL FULL REPLACE (100 TARGET) ===\n");

    // 1. Roleplay
    let rpResults = [];
    for(const m of RP_MAP) {
        rpResults.push({
            name: m.n, description: m.desc, longDescription: `Playing ${m.n}. They are ${m.desc}`,
            image: m.img, greeting: `*looks at you* Hey.`, personality: "roleplay", source: "Roleplay"
        });
    }

    const rpGenericRoles = ["Your Tutor", "Your Bestie", "Your Manager", "Your Tenant", "The Barista", "The Café Owner", "Your Senpai", "Your Kouhai", "Your Guild Master", "Your Healer", "Your Assassin", "The Bartender", "The Bouncer", "The Hacker", "The Mechanic", "The Rockstar", "The Idol", "Your Biggest Fan", "Your Stalker", "Your AI Assistant", "The Cyborg", "Your Clone", "The Goddess", "The God", "Your Priest", "Your Priestess", "Your Landlord", "The Delivery Driver", "Your Therapist", "The Artist", "The Musician", "The Streamer", "The Pro Gamer", "Your Sugar Daddy", "Your Sugar Mommy", "The CEO's Heir", "The Mafia Prince", "Your Fake Fiance", "Your Secret Husband", "Your Secret Wife", "Your Vampire Ex", "Your Ghost Roommate", "Your Alien Overlord", "The Cute Barista", "Your Twin", "The School President", "Your Scary Teacher", "The Lunch Lady", "The Yakuza Boss", "Your Bodyguard", "Your Personal Chef", "Your Step-Dad", "Your Ex-Boss", "Your Childhood Bully", "The Secret Agent", "Your Body Double", "Your Rival Architect"];
    
    // We need 100 total, we have 20 mapped, so we need 80
    const rpRest = await fillFromAnilistManyPages("Roleplay", 80, 0, (c, idx) => ({
        name: rpGenericRoles[idx % rpGenericRoles.length],
        description: `Roleplay: ${rpGenericRoles[idx % rpGenericRoles.length]}`,
        longDescription: `Playing ${rpGenericRoles[idx % rpGenericRoles.length]}.`,
        image: c.image.large, greeting: `Hey... It's me.`,
        personality: "roleplay", source: "Roleplay"
    }));
    rpResults.push(...rpRest);
    if(rpResults.length > 0) await seedDB("Roleplay", rpResults);


    // 2. GL
    let glResults = [];
    for(const m of GL_MAP) {
        if (!m.img) continue;
        glResults.push({
            name: m.n, description: `${m.n} from ${m.s} (Yuri/GL)`, longDescription: `Iconic Yuri character ${m.n} from ${m.s}.`,
            image: m.img, greeting: `Hello! I'm ${m.n}.`, personality: "GL character", source: m.s
        });
    }

    // We have 20 mapped, need 80 filler GL from aniList
    const glRest = await fillFromAnilistManyPages("GL", 80, 20, (c, idx) => ({
        name: `GL Character ${idx}`,
        description: `GL Character ${idx} from Yuri Genre`,
        longDescription: `An iconic GL character.`,
        image: c.image.large, greeting: `Hello.`,
        personality: "GL character", source: "Yuri Genre"
    }));
    glResults.push(...glRest);
    if(glResults.length > 0) await seedDB("GL", glResults);


    const res = await pool.query("SELECT tag, count(*) as cnt FROM characters GROUP BY tag ORDER BY cnt DESC");
    console.log("\n=== FINAL COUNTS ===");
    res.rows.forEach(r => console.log(`  ${r.tag}: ${r.cnt}`));

    process.exit(0);
}
main();
