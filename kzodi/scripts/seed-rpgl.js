/**
 * ROLEPLAY AND GL FIX
 * Since AniList Search query failed for generic names, we provide hardcoded character IDs 
 * for Roleplay (top tier aesthetic anime chars mapped to roles) and GL (since the genre search failed).
 */

const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    connectionString: (process.env.DATABASE_URL || "").replace(/[?&]sslmode=[^&]*/g, ""),
    ssl: { rejectUnauthorized: false }
});

// Top GL characters mapped manually to guarantee high quality
const GL_CHARS = [
    { n: "Yuzu Aihara", s: "Citrus" }, { n: "Mei Aihara", s: "Citrus" },
    { n: "Touko Nanami", s: "Bloom Into You" }, { n: "Yuu Koito", s: "Bloom Into You" },
    { n: "Adachi Sakura", s: "Adachi to Shimamura" }, { n: "Shimamura Hougetsu", s: "Adachi to Shimamura" },
    { n: "Rae Taylor", s: "I'm in Love with the Villainess" }, { n: "Claire François", s: "I'm in Love with the Villainess" },
    { n: "Utena Tenjou", s: "Revolutionary Girl Utena" }, { n: "Anthy Himemiya", s: "Revolutionary Girl Utena" },
    { n: "Haruka Tenou", s: "Sailor Moon" }, { n: "Michiru Kaiou", s: "Sailor Moon" },
    { n: "Kase Tomoka", s: "Kase-san" }, { n: "Yamada Yui", s: "Kase-san" },
    { n: "Shizuma Hanazono", s: "Strawberry Panic" }, { n: "Nagisa Aoi", s: "Strawberry Panic" },
    { n: "Shiramine", s: "Yuri is My Job!" }, { n: "Hime Shiraki", s: "Yuri is My Job!" },
    { n: "Chitose Kuroda", s: "Yuri is My Job!" }, { n: "Anisphia", s: "The Magical Revolution" },
    { n: "Euphyllia", s: "The Magical Revolution" }
];
// Fill rest of GL with 100
for(let i=1; i<=80; i++) GL_CHARS.push({ n: `GL Character ${i}`, s: "Yuri Genre" });

const RP_MAPPINGS = [
    { n: "Your Strict CEO", a: "Levi Ackerman" },
    { n: "Your Yandere GF", a: "Yuno Gasai" },
    { n: "Your Protective Bro", a: "Itachi Uchiha" },
    { n: "Your Childhood Friend", a: "Naruto Uzumaki" },
    { n: "Your Cool Sensei", a: "Satoru Gojo" },
    { n: "Your Stern Father", a: "Loid Forger" },
    { n: "Your Sweet Mother", a: "Yor Forger" },
    { n: "Your Rival", a: "Sasuke Uchiha" },
    { n: "Your Cold Prince", a: "Shoto Todoroki" },
    { n: "Your Secret Admirer", a: "Hinata Hyuga" },
    { n: "Your Bully", a: "Katsuki Bakugo" },
    { n: "Your Maid", a: "Rem" },
    { n: "Your Butler", a: "Sebastian Michaelis" },
    { n: "Your Vampire Master", a: "Alucard" },
    { n: "The Transfer Student", a: "Killua Zoldyck" },
    { n: "Your Slacker Roommate", a: "Gintoki Sakata" },
    { n: "Your Bodyguard", a: "Roronoa Zoro" },
    { n: "Your Mafia Boss", a: "Chrollo Lucilfer" },
    { n: "Your Annoying Lil Sis", a: "Nezuko Kamado" },
    { n: "Your Genius Classmate", a: "Light Yagami" },
    { n: "Your Step-Brother", a: "Eren Yeager" },
    { n: "Your Step-Sister", a: "Mikasa Ackerman" },
    { n: "Your Ex-Boyfriend", a: "Osamu Dazai" },
    { n: "Your Ex-Girlfriend", a: "Makise Kurisu" },
    { n: "Your Hot Neighbor", a: "Spike Spiegel" },
    { n: "Your Shy Neighbor", a: "Violet Evergarden" },
    { n: "Your Demon Lord", a: "Ryomen Sukuna" },
    { n: "Your Angel Protector", a: "Saber" },
    { n: "Your Pirate Captain", a: "Monkey D. Luffy" },
    { n: "The Quiet Librarian", a: "Nico Robin" },
    { n: "Your Sadistic Boss", a: "Makima" },
    { n: "Your Gentle Healer", a: "Orihime Inoue" },
    { n: "Your Stoic Knight", a: "Erza Scarlet" },
    { n: "The Popular Idol", a: "Ai Hoshino" },
    { n: "Your Detective", a: "L Lawliet" },
    { n: "Your Mentor", a: "Jiraiya" },
    { n: "Your Gym Buddy", a: "Asta" },
    { n: "The Cold Queen", a: "Esdeath" },
    { n: "Your Magical Familiar", a: "Kyubey" },
    { n: "Your Personal Hacker", a: "Edward Elric" }
];

async function anilistSearchChar(name) {
    const query = `query($search:String){Character(search:$search){id name{full} image{large}}}`;
    try {
        const res = await fetch("https://graphql.anilist.co", {
            method: "POST", headers: {"Content-Type":"application/json"},
            body: JSON.stringify({query, variables: {search: name}})
        });
        const d = await res.json();
        return d?.data?.Character?.image?.large || null;
    } catch(e){ return null; }
}

async function fillRest(tag, startIdx, roleNameFn, targetCount=100) {
    let results = [];
    const query = `query{Page(page:7,perPage:${targetCount}){characters(sort:FAVOURITES_DESC){id name{full} image{large}}}}`;
    try {
        const res = await fetch("https://graphql.anilist.co", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query })
        });
        const data = await res.json();
        const chars = data?.data?.Page?.characters || [];
        
        let cIdx = startIdx;
        for (const c of chars) {
            if (results.length >= targetCount) break;
            if (!c.image?.large || c.image.large.includes("default.jpg")) continue;
            
            const concept = roleNameFn(cIdx++);
            results.push({
                name: concept,
                description: `${tag}: ${concept}`,
                longDescription: `You are playing ${concept}.`,
                image: c.image.large,
                greeting: `Hey... It's me.`,
                personality: tag,
                source: tag
            });
        }
    } catch (e) {}
    return results;
}

async function seedDB(tag, chars) {
    const client = await pool.connect();
    let n = 0;
    try {
        await client.query("DELETE FROM characters WHERE tag=$1", [tag]);
        for (let i = 0; i < chars.length; i++) {
            const c = chars[i];
            const id = `${tag.toLowerCase()}-f2-${Date.now()}-${i}`;
            await client.query(`INSERT INTO characters (id,name,tag,tags,description,long_description,image,greeting,personality,visibility,source,likes_count,chatter_count) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                [id, c.name.substring(0,100), tag, JSON.stringify([tag]), c.description.substring(0,255), c.longDescription, c.image, c.greeting, c.personality, "public", c.source||tag, Math.floor(Math.random()*2000+100), Math.floor(Math.random()*5000+200)]);
            n++;
        }
        console.log(`  ✅ Inserted ${n} for [${tag}]`);
    } catch(e) { console.error(`  ❌`, e.message); }
    finally { client.release(); }
}

async function main() {
    console.log("=== ROLEPLAY & GL FILLER ===\n");

    // ROLEPLAY
    console.log("[Roleplay] Running...");
    let rpResults = [];
    for(const m of RP_MAPPINGS) {
        if(rpResults.length >= 100) break;
        const img = await anilistSearchChar(m.a);
        if(img) {
            rpResults.push({
                name: m.n, description: `Roleplay connection: ${m.n}`, longDescription: `Playing ${m.n} with the visual of ${m.a}.`,
                image: img, greeting: `*approaches you* Hey.`, personality: "roleplay", source: "Roleplay"
            });
            console.log(`  Mapped ${m.n} -> ${m.a}`);
        }
        await new Promise(r=>setTimeout(r,400));
    }
    const genericRoles = ["Your Bestie", "Your Manager", "Your Tenant", "The Barista", "The Café Owner", "Your Senpai", "Your Kouhai", "Your Guild Master", "Your Healer", "Your Assassin", "The Bartender", "The Bouncer", "The Hacker", "The Mechanic", "The Rockstar", "The Idol", "Your Biggest Fan", "Your Stalker", "Your AI Assistant", "The Cyborg", "Your Clone", "The Goddess", "The God", "Your Priest", "Your Priestess", "Your Landlord", "The Delivery Driver", "Your Therapist", "The Artist", "The Musician", "The Streamer", "The Pro Gamer", "Your Sugar Daddy", "Your Sugar Mommy", "The CEO's Heir", "The Mafia Prince", "Your Fake Fiance", "Your Secret Husband", "Your Secret Wife", "Your Vampire Ex", "Your Ghost Roommate", "Your Alien Overlord", "The Cute Barista", "Your Twin", "The School President", "Your Scary Teacher", "The Lunch Lady", "The Yakuza Boss", "Your Bodyguard", "Your Personal Chef"];
    
    const rpRest = await fillRest("Roleplay", 0, (i) => genericRoles[i % genericRoles.length], 100 - rpResults.length);
    rpResults.push(...rpRest);
    if(rpResults.length > 0) await seedDB("Roleplay", rpResults);

    // GL
    console.log("\n[GL] Running...");
    let glResults = [];
    for(let i=0; i<20; i++) {
        const m = GL_CHARS[i];
        const img = await anilistSearchChar(m.n);
        if(img) {
            glResults.push({
                name: m.n, description: `${m.n} from ${m.s} (Yuri/GL)`, longDescription: `Iconic Yuri character ${m.n} from ${m.s}.`,
                image: img, greeting: `Hello! I'm ${m.n}.`, personality: "GL character", source: m.s
            });
            console.log(`  Fetched ${m.n}`);
        }
        await new Promise(r=>setTimeout(r,400));
    }
    const glRest = await fillRest("GL", 20, (i) => `GL Character ${i}`, 100 - glResults.length);
    glResults.push(...glRest);
    if(glResults.length > 0) await seedDB("GL", glResults);

    console.log("\nDone!");
    process.exit(0);
}
main();
