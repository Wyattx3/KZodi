/**
 * SEED MOVIES, TV, BOOKS — using Wikipedia for fictional characters
 * Many fictional character pages DON'T have thumbnails.
 * Strategy: Try Wikipedia first, if no image use a placeholder from AniList random chars.
 * 
 * Run: node scripts/seed-fiction-tags.js
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
        https.get(url, { headers: { "User-Agent": "KZodiBot/1.0" } }, (res) => {
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
                    // Accept images even if no thumbnail - we'll use fallback
                    const badImages = ["Question_book","No_image","Flag_of","Commons-logo","replace_this","Ambox","Text_document","Wiki_letter","Wiktionary","Disambig","Edit-clear"];
                    if (thumb && badImages.some(b => thumb.includes(b))) return resolve({ extract: (pg.extract||"").substring(0,600), image: null });
                    resolve({ image: thumb || null, extract: (pg.extract || "").substring(0, 600) });
                } catch { resolve(null); }
            });
        }).on("error", () => resolve(null));
    });
}

// Pre-fetch a pool of fallback avatar images from AniList
async function getAnilistAvatars(count = 200) {
    console.log("[AniList] Getting fallback avatars...");
    let images = [];
    for (let page = 1; page <= 10 && images.length < count; page++) {
        try {
            const query = `query($page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){characters(sort:FAVOURITES_DESC){id image{large}}}}`;
            const res = await fetch("https://graphql.anilist.co", {
                method: "POST", headers: {"Content-Type":"application/json"},
                body: JSON.stringify({ query, variables: { page, perPage: 25 } })
            });
            const data = await res.json();
            for (const c of (data?.data?.Page?.characters || [])) {
                if (c.image?.large && !c.image.large.includes("default.jpg")) images.push(c.image.large);
            }
            await new Promise(r => setTimeout(r, 800));
        } catch { break; }
    }
    console.log(`  Got ${images.length} fallback avatars`);
    return images;
}

// ═══════════════ CHARACTER LISTS ═══════════════
const MOVIE_CHARS = [
    // Star Wars
    "Darth Vader","Luke Skywalker","Princess Leia","Han Solo","Yoda","Obi-Wan Kenobi",
    "Anakin Skywalker","Padmé Amidala","Chewbacca","Kylo Ren","Rey (Star Wars)",
    // Harry Potter
    "Harry Potter (character)","Hermione Granger","Ron Weasley","Albus Dumbledore",
    "Lord Voldemort","Severus Snape","Draco Malfoy","Sirius Black",
    // Marvel
    "Iron Man","Captain America","Thor (Marvel Cinematic Universe)","Hulk",
    "Spider-Man","Black Widow (Marvel Cinematic Universe)","Thanos",
    "Black Panther (Marvel Cinematic Universe)","Doctor Strange","Scarlet Witch",
    "Loki (Marvel Cinematic Universe)","Groot (Marvel Cinematic Universe)",
    // DC
    "Batman","Superman","Wonder Woman","Joker (character)","Catwoman","Aquaman",
    // LOTR
    "Gandalf","Aragorn","Frodo Baggins","Legolas","Gollum","Sauron","Bilbo Baggins",
    // Disney/Pixar
    "Elsa (Frozen)","Simba","Buzz Lightyear","Woody (Toy Story)","WALL-E (character)",
    "Mulan (Disney character)","Moana (character)","Rapunzel","Cinderella",
    // Classics
    "Indiana Jones (character)","Jack Sparrow","James Bond","Forrest Gump",
    "Rocky Balboa","John Wick","The Terminator (character)","Rambo (character)",
    "Ellen Ripley","Neo (The Matrix)","Morpheus (The Matrix)","Trinity (The Matrix)",
    "Tyler Durden","Tony Montana","Vito Corleone","Michael Corleone",
    "Hannibal Lecter","Norman Bates","Jason Voorhees","Freddy Krueger",
    // Animated
    "Shrek (character)","Lightning McQueen","Nemo (Finding Nemo)",
    "Jack Skellington","Totoro",
    // Action
    "Wolverine (character)","Deadpool (character)","Magneto (Marvel Comics)",
    "Godzilla","King Kong","E.T. the Extra-Terrestrial",
    "RoboCop","Optimus Prime","Bumblebee (Transformers)","Megatron",
    "Maximus (Gladiator)","Spartacus","William Wallace",
    "Caesar (Planet of the Apes)","Mad Max",
    "Dorothy Gale","Mary Poppins","Willy Wonka",
    "Ethan Hunt","Jason Bourne (character)","Lara Croft"
];

const TV_CHARS = [
    // Breaking Bad
    "Walter White","Jesse Pinkman","Saul Goodman","Gustavo Fring","Mike Ehrmantraut",
    "Hank Schrader","Skyler White","Kim Wexler",
    // GoT
    "Jon Snow (character)","Daenerys Targaryen","Tyrion Lannister","Cersei Lannister",
    "Arya Stark","Sansa Stark","Jaime Lannister","Bran Stark","Brienne of Tarth",
    // Friends
    "Rachel Green","Ross Geller","Chandler Bing","Monica Geller","Joey Tribbiani","Phoebe Buffay",
    // The Office
    "Michael Scott","Dwight Schrute","Jim Halpert",
    // Stranger Things
    "Eleven (Stranger Things)","Dustin Henderson","Steve Harrington",
    // Cartoons
    "Homer Simpson","Bart Simpson","Lisa Simpson","SpongeBob SquarePants","Patrick Star",
    "Squidward Tentacles","Eric Cartman","Stan Marsh","Peter Griffin","Stewie Griffin",
    "Rick Sanchez","Morty Smith",
    // Drama
    "Sherlock Holmes","Dexter Morgan","Thomas Shelby","Ragnar Lothbrok",
    "Tony Soprano","Don Draper","Geralt of Rivia",
    // Supernatural/Fantasy
    "Buffy Summers","Elena Gilbert","Damon Salvatore","Klaus Mikaelson",
    "Dean Winchester","Sam Winchester","Castiel (Supernatural)",
    // Comedy
    "Sheldon Cooper","Ted Mosby","Barney Stinson",
    // Star Wars TV
    "Grogu","The Mandalorian (character)","Ahsoka Tano",
    // Modern
    "Homelander","Billy Butcher (The Boys)","Rue Bennett",
    "Beth Harmon (The Queen's Gambit)","Villanelle (Killing Eve)",
    "Wednesday Addams","Loki (Marvel Cinematic Universe)","Wanda Maximoff",
    "Lucifer Morningstar (TV series)","Rick Grimes","Daryl Dixon",
    // Squid Game
    "Seong Gi-hun",
    // Arcane
    "Jinx (Arcane)","Vi (Arcane)",
    // Misc
    "Carrie Bradshaw","Olivia Pope","Walter White","Joel Miller"
];

const BOOK_CHARS = [
    "Sherlock Holmes","John Watson","James Moriarty","Irene Adler",
    "Harry Potter (character)","Hermione Granger","Ron Weasley","Albus Dumbledore",
    "Gandalf","Frodo Baggins","Aragorn","Legolas","Samwise Gamgee","Bilbo Baggins","Gollum",
    "Elizabeth Bennet","Mr. Darcy","Jane Eyre","Heathcliff (Wuthering Heights)",
    "Jay Gatsby","Atticus Finch","Scout Finch",
    "Huckleberry Finn","Tom Sawyer","Oliver Twist",
    "Jean Valjean","Edmond Dantès","Quasimodo","D'Artagnan",
    "Don Quixote","Robinson Crusoe",
    "Romeo","Juliet","Hamlet","Macbeth (character)","Othello",
    "Anna Karenina","Raskolnikov",
    "Dracula (novel character)","Frankenstein's monster",
    "Captain Ahab","Hester Prynne",
    "Alice (Alice's Adventures in Wonderland)","Mad Hatter",
    "Peter Pan (character)","Tinker Bell","Captain Hook",
    "Dorothy Gale","Pinocchio","Snow White","Cinderella","Rapunzel",
    "Winnie-the-Pooh","Paddington Bear","Mary Poppins",
    "Katniss Everdeen","Percy Jackson (character)",
    "Geralt of Rivia","Jon Snow (character)","Daenerys Targaryen","Tyrion Lannister",
    "Odysseus","Achilles","King Arthur","Robin Hood","Merlin","Lancelot",
    "Conan the Barbarian","Rincewind","Death (Discworld)",
    "Paul Atreides","Ender Wiggin",
    "Aslan","Lucy Pevensie",
    "Mowgli","Long John Silver","Ebenezer Scrooge",
    "Dorian Gray","Phantom of the Opera (character)",
    "Lisbeth Salander","Hannibal Lecter",
    "Little Prince","Pippi Longstocking","Matilda (Roald Dahl)"
];

async function seedDB(tag, chars) {
    const client = await pool.connect();
    let n = 0;
    try {
        for (let i = 0; i < chars.length; i++) {
            const c = chars[i];
            const id = `${tag.toLowerCase().replace(/[^a-z0-9]/g,"")}-w-${Date.now()}-${i}`;
            await client.query(`INSERT INTO characters (id,name,tag,tags,description,long_description,image,greeting,personality,visibility,source,likes_count,chatter_count) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                [id, c.name.substring(0,100), tag, JSON.stringify([tag]), c.description, c.longDescription||"", c.image, c.greeting, c.personality||"iconic, memorable", "public", (c.source||tag).substring(0,100), Math.floor(Math.random()*2000+100), Math.floor(Math.random()*5000+200)]);
            n++;
        }
        console.log(`  ✅ Inserted ${n} for [${tag}]`);
    } catch(e) { console.error(`  ❌`,e.message); }
    finally { client.release(); }
}

async function main() {
    console.log("=== SEED MOVIES, TV, BOOKS with CHARACTER images ===\n");

    // Get fallback avatars from AniList
    const fallbackImages = await getAnilistAvatars(200);

    const tagData = { "Movies": MOVIE_CHARS, "TV": TV_CHARS, "Books": BOOK_CHARS };

    for (const [tag, names] of Object.entries(tagData)) {
        console.log(`\n[${tag}] Checking ${names.length} characters...`);
        let results = [];
        let imgIdx = 0;

        for (const name of names) {
            if (results.length >= 100) break;
            const w = await wikiGet(name);
            if (w) {
                const dn = name.replace(/\s*\(.*?\)\s*$/,"");
                const image = w.image || fallbackImages[imgIdx++ % fallbackImages.length];
                results.push({
                    name: dn, description: `${dn} — ${tag} character`,
                    longDescription: w.extract, image,
                    greeting: `Hey! I'm ${dn}. Want to talk?`,
                    personality: "iconic, memorable, beloved", source: tag
                });
                if (results.length % 20 === 0) console.log(`  ${results.length}/100...`);
            }
            if (results.length % 3 === 0) await new Promise(r=>setTimeout(r,100));
        }
        console.log(`  Got ${results.length} characters for "${tag}"`);
        if (results.length > 0) await seedDB(tag, results);
    }

    // Final
    const countRes = await pool.query("SELECT tag, count(*) as cnt FROM characters GROUP BY tag ORDER BY cnt DESC");
    console.log("\n=== FINAL COUNTS ===");
    let total = 0;
    countRes.rows.forEach(r => { console.log(`  ${r.tag}: ${r.cnt}`); total += parseInt(r.cnt); });
    console.log(`\nTOTAL: ${total}`);
    process.exit(0);
}

main();
