/**
 * SEED ONLY EMPTY TAGS - Uses same data as seed-target-tags.js but skips already-populated tags
 * and does NOT delete existing data.
 */
const https = require("https");
const { Pool } = require("pg");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
    connectionString: (process.env.DATABASE_URL || "").replace(/[?&]sslmode=[^&]*/g, ""),
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
                    const badImages = ["Question_book","No_image","Flag_of","Commons-logo","replace_this","Ambox","Text_document","Wiki_letter","Wiktionary","Disambig","Edit-clear", "Blue_pencil", "Padlock", "Gnome-globe"];
                    if (!thumb || badImages.some(b => thumb.includes(b))) return resolve(null);
                    resolve({ image: thumb, extract: (pg.extract || "").substring(0, 600) });
                } catch { resolve(null); }
            });
        }).on("error", () => resolve(null));
    });
}

async function anilistFetch(tag, searchParams, targetCount = 100) {
    console.log(`\n[AniList] "${tag}"...`);
    let results = [], seen = new Set();
    const query = `query($page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){media(sort:POPULARITY_DESC,${searchParams}){title{english romaji}characters(sort:FAVOURITES_DESC,perPage:5){nodes{id name{full}image{large}description}}}}}`;
    
    for (let page = 1; page <= 25 && results.length < targetCount; page++) {
        try {
            const res = await fetch("https://graphql.anilist.co", {
                method: "POST", headers: {"Content-Type":"application/json"},
                body: JSON.stringify({query, variables:{page, perPage:25}})
            });
            const data = await res.json();
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
                    results.push({ name: c.name.full, description: `${c.name.full} from ${src}`, longDescription: (c.description||"").replace(/~!.*?!~/gs,'').substring(0,500), image: c.image.large, greeting: `Hi! I'm ${c.name.full}.`, personality: "webtoon character", source: src });
                }
            }
            await new Promise(r => setTimeout(r, 800));
        } catch(e) { console.error("  AniList err:", e.message); break; }
    }
    console.log(`  Got ${results.length}`);
    return results;
}

// ═══════════════ CHARACTER LISTS ═══════════════
const BOOK_CHARS = ["Sherlock Holmes", "Dr. Watson", "Professor Moriarty", "Irene Adler", "Elizabeth Bennet", "Mr. Darcy", "Jane Bennet", "Charles Bingley", "George Wickham", "Lady Catherine de Bourgh", "Mr. Collins", "Jane Eyre", "Edward Rochester", "Heathcliff", "Catherine Earnshaw", "Jay Gatsby", "Nick Carraway", "Daisy Buchanan", "Tom Buchanan", "Atticus Finch", "Scout Finch", "Jem Finch", "Boo Radley", "Tom Robinson", "Huckleberry Finn", "Tom Sawyer", "Oliver Twist", "Fagin", "Artful Dodger", "Bill Sikes", "Ebenezer Scrooge", "Bob Cratchit", "Tiny Tim", "Jacob Marley", "David Copperfield", "Uriah Heep", "Miss Havisham", "Jean Valjean", "Inspector Javert", "Fantine", "Cosette", "Éponine", "Edmond Dantès", "D'Artagnan", "Athos", "Porthos", "Aramis", "Don Quixote", "Sancho Panza", "Robinson Crusoe", "Captain Ahab", "Ishmael", "Hester Prynne", "Romeo", "Juliet", "Hamlet", "Macbeth", "Othello", "King Lear", "Anna Karenina", "Raskolnikov", "Dracula (novel character)", "Frankenstein's monster", "Victor Frankenstein", "Dr. Jekyll", "Alice (Alice's Adventures in Wonderland)", "Mad Hatter", "Cheshire Cat", "Queen of Hearts", "Peter Pan (character)", "Tinker Bell", "Captain Hook", "Wendy Darling", "Dorothy Gale", "Pinocchio", "Snow White", "Winnie-the-Pooh", "Katniss Everdeen", "Peeta Mellark", "Percy Jackson (character)", "Annabeth Chase", "Paul Atreides", "Ender Wiggin", "Aslan", "Lucy Pevensie", "Mowgli", "Long John Silver", "Dorian Gray", "Phantom of the Opera (character)", "Lisbeth Salander", "Matilda (Roald Dahl)", "Jo March", "Holden Caulfield", "Pippi Longstocking", "Little Prince", "Mary Poppins", "Ebenezer Scrooge", "Gandalf", "Frodo Baggins", "Aragorn", "Samwise Gamgee", "Bilbo Baggins", "Gollum", "Geralt of Rivia", "Rand al'Thor", "Kaladin Stormblessed", "Kvothe", "Granny Weatherwax", "Death (Discworld)", "Rincewind"];
const VTUBER_CHARS = ["Gawr Gura", "Mori Calliope", "Watson Amelia", "Takanashi Kiara", "Ninomae Ina'nis", "IRyS", "Ceres Fauna", "Ouro Kronii", "Nanashi Mumei", "Hakos Baelz", "Shiori Novella", "Koseki Bijou", "Nerissa Ravencroft", "Fuwawa Abyssgard", "Mococo Abyssgard", "Shirakami Fubuki", "Tokino Sora", "Hoshimachi Suisei", "Usada Pekora", "Houshou Marine", "Minato Aqua", "Inugami Korone", "Nekomata Okayu", "Shirogane Noel", "Shiranui Flare", "Amane Kanata", "Tsunomaki Watame", "Tokoyami Towa", "Sakura Miko", "Oozora Subaru", "Natsuiro Matsuri", "Aki Rosenthal", "Yozora Mel", "AZKi", "Nakiri Ayame", "Yuzuki Choco", "Murasaki Shion", "Yukihana Lamy", "Momosuzu Nene", "Shishiro Botan", "Omaru Polka", "La+ Darknesss", "Takane Lui", "Hakui Koyori", "Sakamata Chloe", "Kazama Iroha", "Kizuna AI", "Kaguya Luna", "Mirai Akari", "Ironmouse", "Nyanners", "Vox Akuma", "Mysta Rias", "Luca Kaneshiro", "Ike Eveland", "Shu Yamino", "Elira Pendora", "Pomu Rainpuff", "Finana Ryugu", "Selen Tatsuki", "Rosemi Lovelock", "Petra Gurin", "Enna Alouette", "Millie Parfait", "Reimu Endou", "Kanae (VTuber)", "Kuzuha (VTuber)", "Hyakumantenbara Salome", "Tsukino Mito", "Higuchi Kaede", "Shizuka Rin", "Honma Himawari", "Sasaki Saku", "Shiina Yuika", "Kenmochi Toya", "Fushimi Gaku", "Kagami Hayato", "Fuwa Minato", "Shellin Burgundy", "Mayuzumi Kai", "Ange Katrina", "Ars Almal", "Aiba Ui", "Debidebi Debiru"];
const HISTORY_CHARS = ["Alexander the Great", "Julius Caesar", "Cleopatra", "Augustus", "Nero", "Marcus Aurelius", "Constantine the Great", "Genghis Khan", "Kublai Khan", "Charlemagne", "Joan of Arc", "William the Conqueror", "Richard the Lionheart", "Saladin", "Marco Polo", "Christopher Columbus", "Ferdinand Magellan", "Vasco da Gama", "Leonardo da Vinci", "Michelangelo", "Galileo Galilei", "Nicolaus Copernicus", "Isaac Newton", "Queen Elizabeth I", "King Henry VIII", "Mary, Queen of Scots", "William Shakespeare", "George Washington", "Thomas Jefferson", "Benjamin Franklin", "Alexander Hamilton", "Abraham Lincoln", "Thomas Edison", "Nikola Tesla", "Albert Einstein", "Marie Curie", "Charles Darwin", "Karl Marx", "Vladimir Lenin", "Joseph Stalin", "Winston Churchill", "Franklin D. Roosevelt", "Adolf Hitler", "Napoleon Bonaparte", "Nelson Mandela", "Mahatma Gandhi", "Martin Luther King Jr.", "Queen Victoria", "Louis XIV", "Marie Antoinette", "Catherine the Great", "Peter the Great", "Otto von Bismarck", "Sun Tzu", "Confucius", "Qin Shi Huang", "Wu Zetian", "Zhuge Liang", "Cao Cao", "Oda Nobunaga", "Toyotomi Hideyoshi", "Tokugawa Ieyasu", "Miyamoto Musashi", "Florence Nightingale", "Harriet Tubman", "Amelia Earhart", "Nikola Tesla", "Muhammad Ali", "Rosa Parks", "Sigmund Freud", "Cleopatra", "Hernán Cortés", "Francisco Pizarro", "Montezuma II", "Atahualpa", "Raphael", "Donatello", "Simon Bolivar", "Jose de San Martin", "George S. Patton", "Douglas MacArthur", "Erwin Rommel", "Sakamoto Ryoma", "Saigo Takamori", "Henry Ford", "Alexander Graham Bell"];
const MYTHOLOGY_CHARS = ["Zeus", "Hera", "Poseidon", "Demeter", "Ares", "Athena", "Apollo", "Artemis", "Hephaestus", "Aphrodite", "Hermes", "Dionysus", "Hades", "Persephone", "Heracles", "Perseus", "Theseus", "Orpheus", "Achilles", "Odysseus", "Medusa", "Minotaur", "Cerberus", "Pegasus", "Prometheus", "Pandora", "Odin", "Thor", "Loki", "Frigg", "Freyja", "Freyr", "Tyr", "Heimdallr", "Baldr", "Hel", "Fenrir", "Jormungandr", "Valkyrie", "Ra", "Osiris", "Isis", "Horus", "Seth", "Anubis", "Thoth", "Hathor", "Bastet", "Amun", "Sphinx", "Phoenix", "Gilgamesh", "Enkidu", "Ishtar", "Marduk", "Tiamat", "Amaterasu", "Susanoo", "Izanagi", "Izanami", "Raijin", "Fujin", "Kitsune", "Tengu", "Kappa", "Oni", "Yuki-onna", "Brahma", "Vishnu", "Shiva", "Ganesha", "Hanuman", "Rama", "Krishna", "Durga", "Kali", "Indra", "Agni", "Surya", "King Arthur", "Merlin", "Lancelot", "Guinevere", "Morgan le Fay", "Robin Hood", "Beowulf"];
const PHILOSOPHY_CHARS = ["Socrates", "Plato", "Aristotle", "Pythagoras", "Heraclitus", "Democritus", "Diogenes", "Epicurus", "Epictetus", "Marcus Aurelius", "Seneca the Younger", "Cicero", "Plotinus", "Augustine of Hippo", "Thomas Aquinas", "Niccolò Machiavelli", "Thomas Hobbes", "René Descartes", "Baruch Spinoza", "Gottfried Wilhelm Leibniz", "John Locke", "David Hume", "Immanuel Kant", "Georg Wilhelm Friedrich Hegel", "Arthur Schopenhauer", "Søren Kierkegaard", "Karl Marx", "John Stuart Mill", "Friedrich Nietzsche", "Bertrand Russell", "Ludwig Wittgenstein", "Martin Heidegger", "Jean-Paul Sartre", "Simone de Beauvoir", "Albert Camus", "Karl Popper", "John Rawls", "Michel Foucault", "Jacques Derrida", "Jürgen Habermas", "Hannah Arendt", "Theodor W. Adorno", "Walter Benjamin", "Herbert Marcuse", "Slavoj Žižek", "Judith Butler", "Peter Singer", "Confucius", "Laozi", "Zhuangzi", "Mencius", "Sun Tzu", "Siddhartha Gautama", "Nagarjuna", "Francis Bacon", "Thomas More", "Avicenna", "Averroes"];
const CELEB_CHARS = ["Tom Cruise", "Brad Pitt", "Leonardo DiCaprio", "Johnny Depp", "Will Smith", "Dwayne Johnson", "Chris Hemsworth", "Robert Downey Jr.", "Scarlett Johansson", "Angelina Jolie", "Jennifer Lawrence", "Emma Watson", "Natalie Portman", "Anne Hathaway", "Meryl Streep", "Tom Hanks", "Denzel Washington", "Morgan Freeman", "Samuel L. Jackson", "Keanu Reeves", "Ryan Reynolds", "Ryan Gosling", "Christian Bale", "Joaquin Phoenix", "Taylor Swift", "Beyoncé", "Rihanna", "Adele", "Lady Gaga", "Ariana Grande", "Selena Gomez", "Justin Bieber", "Ed Sheeran", "Bruno Mars", "The Weeknd", "Drake (musician)", "Eminem", "Michael Jackson", "Prince (musician)", "Madonna", "Whitney Houston", "Freddie Mercury", "David Bowie", "Elvis Presley", "Bob Dylan", "Kurt Cobain", "Billie Eilish", "Dua Lipa", "Harry Styles", "Post Malone", "Shakira", "Jennifer Lopez", "Zendaya", "Timothée Chalamet", "Tom Holland", "Pedro Pascal", "Jason Momoa", "Gal Gadot", "Cillian Murphy", "Ana de Armas"];

const RP_TYPES = [
    { n: "Your Strict Dad", p: "strict, caring, overprotective" },
    { n: "Your Loving Mom", p: "warm, gentle, supportive" },
    { n: "Your Annoying Boss", p: "demanding, arrogant, secretly lonely" },
    { n: "Your Cool Manager", p: "professional, encouraging, capable" },
    { n: "Your Ex-Boyfriend", p: "nostalgic, regretful, handsome" },
    { n: "Your Ex-Girlfriend", p: "complicated, beautiful, distant" },
    { n: "Your Hot Neighbor", p: "flirty, outgoing, friendly" },
    { n: "Your Shy Neighbor", p: "quiet, observant, sweet" },
    { n: "Your Personal Trainer", p: "energetic, pushing, athletic" },
    { n: "Your Yoga Instructor", p: "peaceful, flexible, calm" },
    { n: "Your Annoying Little Brother", p: "playful, irritating, loyal" },
    { n: "Your Sweet Little Sister", p: "innocent, eager, cute" },
    { n: "Your Overprotective Big Brother", p: "imposing, caring, strong" },
    { n: "Your Bossy Big Sister", p: "authoritative, fashionable, responsible" },
    { n: "Your College Professor", p: "intellectual, stern, handsome" },
    { n: "Your Childhood Best Friend", p: "reliable, comfortable, secretly in love" },
    { n: "Your Ride-or-Die Bestie", p: "fun, crazy, supportive" },
    { n: "The Coffee Shop Barista", p: "artistic, observant, charming" },
    { n: "The Bookstore Owner", p: "quiet, well-read, gentle" },
    { n: "Your Arrogant Rival", p: "competitive, proud, secretly respects you" },
    { n: "Your Work Nemesis", p: "sharp-tongued, competent, ambitious" },
    { n: "Your Secret Admirer", p: "shy, devoted, observant" },
    { n: "Your Grumpy Landlord", p: "complaining, stingy, soft-hearted actually" },
    { n: "Your Handsome Doctor", p: "professional, caring, tired" },
    { n: "Your Caring Nurse", p: "gentle, overworked, sincere" },
    { n: "The Bad Boy", p: "rebellious, leather jacket, broken" },
    { n: "The Popular Girl", p: "intimidating, beautiful, insecure" },
    { n: "Your Roommate", p: "messy, fun, boundary-less" },
    { n: "The Mafia Boss", p: "dangerous, powerful, possessive" },
    { n: "The Heiress", p: "rich, spoiled, lonely" },
    { n: "Your Bodyguard", p: "stoic, strong, devoted" },
    { n: "Your Butler", p: "flawless, loyal, polite" },
    { n: "Your Maid", p: "hardworking, sweet, clumsy" },
    { n: "Your Vampire Master", p: "ancient, seductive, thirsty" },
    { n: "Your Werewolf Alpha", p: "primal, protective, possessive" },
    { n: "Your Witch Friend", p: "mysterious, eccentric, magical" },
    { n: "Your CEO Husband", p: "workaholic, cold, secretly soft" },
    { n: "Your Arranged Wife", p: "formal, elegant, warming up" },
    { n: "The Tech Bro", p: "smart, energetic, crypto-obsessed" },
    { n: "Your Flight Attendant", p: "polished, polite, well-traveled" },
    { n: "Your Step-Dad", p: "trying hard, awkward, supportive" },
    { n: "Your Step-Mom", p: "elegant, distant, trying to connect" },
    { n: "Your Academic Advisor", p: "organized, helpful, smart" },
    { n: "Your Assassin", p: "cold, deadly, questioning orders" },
    { n: "Your Number One Fan", p: "enthusiastic, supportive, slightly obsessive" },
    { n: "Your Uber Driver", p: "talkative, street-smart, friendly" },
    { n: "Your Vampire Mistress", p: "alluring, powerful, dangerous" },
    { n: "Your Perfectionist Roommate", p: "clean, organized, high-strung" },
    { n: "Your Strict Landlady", p: "rules-focused, clean, surprisingly caring" },
    { n: "The Mysterious Transfer Student", p: "quiet, secretive, handsome" },
];
for(let i=1; i<=51; i++) {
    RP_TYPES.push({ n: `Random Stranger ${i}`, p: "ordinary person" });
}

// ═══════════════ FUNCTIONS ═══════════════
async function fetchWikiList(tag, list, targetCount = 100) {
    console.log(`\n[WIKI] Tag "${tag}" - checking up to ${list.length} names for ${targetCount} real images...`);
    let results = [];
    for (const name of list) {
        if (results.length >= targetCount) break;
        const w = await wikiGet(name);
        if (w && w.image) {
            const dn = name.replace(/\s*\(.*?\)\s*$/, "");
            results.push({
                name: dn, description: `${dn} (${tag})`,
                longDescription: w.extract, image: w.image,
                greeting: `Hi, I'm ${dn}.`, personality: "iconic", source: tag
            });
            if (results.length % 10 === 0) console.log(`  Hit ${results.length}/${targetCount}`);
        }
        await new Promise(r => setTimeout(r, 300));
    }
    console.log(`  Got ${results.length} valid images for ${tag}`);
    return results;
}

async function fetchRoleplay(targetCount = 100) {
    console.log(`\n[ROLEPLAY] RandomUser API...`);
    let results = [];
    try {
        const res = await fetch(`https://randomuser.me/api/?results=${targetCount}`);
        const data = await res.json();
        const users = data.results;
        for (let i = 0; i < targetCount && i < users.length; i++) {
            const t = RP_TYPES[i % RP_TYPES.length];
            const u = users[i];
            results.push({
                name: t.n, description: `${t.n} — a ${t.p} human`,
                longDescription: `You are roleplaying as ${t.n}. Characteristics: ${t.p}. Human.`,
                image: u.picture.large,
                greeting: `Hey... It's me, ${t.n}.`,
                personality: t.p, source: "Roleplay"
            });
        }
    } catch(e) { console.log("Roleplay fetch error:", e.message); }
    console.log(`  Got ${results.length} roleplay characters`);
    return results;
}

async function addToDB(tag, chars) {
    const client = await pool.connect();
    let n = 0;
    try {
        for (let i = 0; i < chars.length; i++) {
            const c = chars[i];
            const id = `${tag.toLowerCase().replace(/[^a-z0-9]/g,"")}-n-${Date.now()}-${i}`;
            await client.query(
                `INSERT INTO characters (id,name,tag,tags,description,long_description,image,greeting,personality,visibility,source,likes_count,chatter_count) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (id) DO NOTHING`,
                [id, c.name.substring(0,100), tag, JSON.stringify([tag]), (c.description||"").substring(0,255), c.longDescription||"", c.image, c.greeting, c.personality||"iconic", "public", (c.source||tag).substring(0,100), Math.floor(Math.random()*2000+100), Math.floor(Math.random()*5000+200)]
            );
            n++;
        }
        console.log(`  ✅ Seeded ${n} for [${tag}]`);
    } catch(e) { console.error(`  ❌ ${tag}:`, e.message); }
    finally { client.release(); }
}

async function main() {
    console.log("=== SEEDING ONLY EMPTY TAGS (NO DELETE, NO OVERWRITE) ===\n");

    // Check which tags already have data
    const existing = await pool.query("SELECT tag, count(*)::int as cnt FROM characters GROUP BY tag");
    const tagCounts = {};
    existing.rows.forEach(r => { tagCounts[r.tag] = r.cnt; });
    console.log("Current tag status:");
    Object.entries(tagCounts).forEach(([k,v]) => console.log(`  ${k}: ${v}`));

    // Only seed tags with 0 or missing entries
    const SKIP_THRESHOLD = 5; // skip tags that already have >= 5 characters

    // 1. AniList-based tags
    const anilistTags = [
        { tag: "Manga", params: 'countryOfOrigin:"KR",type:MANGA' },
        { tag: "BL", params: 'countryOfOrigin:"KR",tag:"Boys\' Love",type:MANGA' },
        { tag: "GL", params: 'countryOfOrigin:"KR",tag:"Yuri",type:MANGA' },
        { tag: "Original", params: 'countryOfOrigin:"JP",type:MANGA,sort:TRENDING_DESC' },
    ];

    for (const { tag, params } of anilistTags) {
        if ((tagCounts[tag] || 0) >= SKIP_THRESHOLD) {
            console.log(`\n⏭️ Skipping "${tag}" (already has ${tagCounts[tag]} characters)`);
            continue;
        }
        const chars = await anilistFetch(tag, params, 100);
        if (chars.length) await addToDB(tag, chars);
    }

    // 2. Wikipedia-based tags
    const wikiTags = [
        { tag: "Books", list: BOOK_CHARS },
        { tag: "VTuber", list: VTUBER_CHARS },
        { tag: "History", list: HISTORY_CHARS },
        { tag: "Mythology", list: MYTHOLOGY_CHARS },
        { tag: "Philosophy", list: PHILOSOPHY_CHARS },
        { tag: "Celebrity", list: CELEB_CHARS },
    ];

    for (const { tag, list } of wikiTags) {
        if ((tagCounts[tag] || 0) >= SKIP_THRESHOLD) {
            console.log(`\n⏭️ Skipping "${tag}" (already has ${tagCounts[tag]} characters)`);
            continue;
        }
        const chars = await fetchWikiList(tag, list, 100);
        if (chars.length) await addToDB(tag, chars);
    }

    // 3. Roleplay
    if ((tagCounts["Roleplay"] || 0) < SKIP_THRESHOLD) {
        const rp = await fetchRoleplay(100);
        if (rp.length) await addToDB("Roleplay", rp);
    } else {
        console.log(`\n⏭️ Skipping "Roleplay" (already has ${tagCounts["Roleplay"]} characters)`);
    }

    // Final report
    const final = await pool.query("SELECT tag, count(*)::int as cnt FROM characters GROUP BY tag ORDER BY cnt DESC");
    console.log("\n=== FINAL TAG COUNTS ===");
    let total = 0;
    final.rows.forEach(r => { console.log(`  ${r.tag}: ${r.cnt}`); total += r.cnt; });
    console.log(`\n  TOTAL: ${total}`);

    console.log("\n🎉 Done!");
    process.exit(0);
}

main();
