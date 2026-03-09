/**
 * COMPREHENSIVE FIX — 10 TAGS with CORRECT CHARACTERS
 * 
 * AniList-based (anime/manga CHARACTERS with proper filters):
 *   Manga → source:MANGA characters (Luffy, Naruto, Goku)
 *   Game  → source:VIDEO_GAME characters (Saber, Joker)
 *   BL    → tag:"Boys' Love" characters
 *   GL    → tag:"Yuri" characters
 *   Original → source:ORIGINAL characters
 * 
 * Wikipedia-based (FICTIONAL characters, NOT actors/authors):
 *   Movies → movie characters (Darth Vader, Jack Sparrow, etc.)
 *   TV     → TV show characters (Walter White, Jon Snow, etc.)
 *   Books  → book characters (Sherlock Holmes, Elizabeth Bennet, etc.)
 * 
 * Custom (connection-type roleplay):
 *   Roleplay → "Your Dad", "Your Mom", "Your Big Brother", etc.
 */
const https = require("https");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    connectionString: (process.env.DATABASE_URL || "").replace(/[?&]sslmode=[^&]*/g, ""),
    ssl: { rejectUnauthorized: false }
});

// ═══════════════ UTILITIES ═══════════════
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
                    if (!thumb || thumb.includes("Question_book") || thumb.includes("No_image") || thumb.includes("Flag_of") || thumb.includes("Commons-logo") || thumb.includes("replace_this")) return resolve(null);
                    resolve({ image: thumb, extract: (pg.extract || "").substring(0, 600) });
                } catch { resolve(null); }
            });
        }).on("error", () => resolve(null));
    });
}

function cleanDesc(d) { return d ? d.replace(/__+/g,'').replace(/~!.*?!~/gs,'').replace(/[\\\*_~`]/g,'').trim().substring(0,500) : ""; }

async function anilistFetch(tag, searchParams, count = 100) {
    console.log(`\n[AniList] "${tag}" — fetching ${count}...`);
    let results = [], seen = new Set();
    for (let page = 1; page <= 20 && results.length < count; page++) {
        try {
            const query = `query($page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){media(sort:POPULARITY_DESC,${searchParams}){title{english romaji}characters(sort:FAVOURITES_DESC,perPage:8){nodes{id name{full}image{large}description}}}}}`;
            const res = await fetch("https://graphql.anilist.co", {
                method: "POST", headers: {"Content-Type":"application/json"},
                body: JSON.stringify({query, variables:{page, perPage:25}})
            });
            const data = await res.json();
            const medias = data?.data?.Page?.media || [];
            if (!medias.length) break;
            for (const m of medias) {
                if (results.length >= count) break;
                const src = m.title?.english || m.title?.romaji || tag;
                for (const c of (m.characters?.nodes || [])) {
                    if (results.length >= count) break;
                    if (!c.image?.large || c.image.large.includes("default.jpg")) continue;
                    if (seen.has(c.name.full)) continue;
                    seen.add(c.name.full);
                    results.push({ name: c.name.full, description: `${c.name.full} from ${src}`, longDescription: cleanDesc(c.description), image: c.image.large, greeting: `Hey! I'm ${c.name.full} from ${src}!`, personality: "charming, iconic", source: src });
                }
            }
            await new Promise(r => setTimeout(r, 800));
        } catch(e) { console.error("  AniList err:", e.message); break; }
    }
    console.log(`  Got ${results.length}`);
    return results;
}

async function wikiFetch(tag, names, count = 100) {
    console.log(`\n[Wiki] "${tag}" — checking ${names.length} names...`);
    let results = [];
    for (const name of names) {
        if (results.length >= count) break;
        const w = await wikiGet(name);
        if (w) {
            const dn = name.replace(/\s*\(.*?\)\s*$/,"");
            results.push({ name: dn, description: `${dn} — ${tag}`, longDescription: w.extract, image: w.image, greeting: `Hello! I'm ${dn}.`, personality: "iconic, memorable", source: tag });
            if (results.length % 20 === 0) console.log(`  ${results.length}/${count}...`);
        }
        if (results.length % 3 === 0) await new Promise(r=>setTimeout(r,100));
    }
    console.log(`  Got ${results.length}`);
    return results;
}

async function seedDB(tag, chars) {
    const client = await pool.connect();
    let n = 0;
    try {
        for (let i = 0; i < chars.length; i++) {
            const c = chars[i];
            const id = `${tag.toLowerCase().replace(/[^a-z0-9]/g,"")}-c-${Date.now()}-${i}`;
            await client.query(`INSERT INTO characters (id,name,tag,tags,description,long_description,image,greeting,personality,visibility,source,likes_count,chatter_count) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                [id, c.name.substring(0,100), tag, JSON.stringify([tag]), c.description, c.longDescription||"", c.image, c.greeting, c.personality, "public", (c.source||tag).substring(0,100), Math.floor(Math.random()*2000+100), Math.floor(Math.random()*5000+200)]);
            n++;
        }
        console.log(`  ✅ Inserted ${n} for [${tag}]`);
    } catch(e) { console.error(`  ❌`,e.message); }
    finally { client.release(); }
}

// ═══════════════ MOVIE CHARACTERS ═══════════════
const MOVIE_CHARS = [
    "Darth Vader","Luke Skywalker","Princess Leia","Han Solo","Yoda","Obi-Wan Kenobi",
    "Anakin Skywalker","Padmé Amidala","Chewbacca","R2-D2","C-3PO","Kylo Ren",
    "Harry Potter (character)","Hermione Granger","Ron Weasley","Albus Dumbledore",
    "Severus Snape","Lord Voldemort","Draco Malfoy","Sirius Black","Hagrid",
    "Jack Sparrow","Indiana Jones (character)","James Bond","Ethan Hunt",
    "Tony Stark (Marvel Cinematic Universe)","Iron Man","Captain America","Thor (Marvel Cinematic Universe)",
    "Black Widow (Marvel Cinematic Universe)","Spider-Man in film","Hulk","Thanos",
    "Batman","Superman","Wonder Woman","Joker (character)","Catwoman","Bane (DC Comics)",
    "Gandalf","Aragorn","Frodo Baggins","Legolas","Gollum","Sauron",
    "Forrest Gump","Rocky Balboa","John Wick","The Terminator","Rambo (character)",
    "Ellen Ripley","Sarah Connor (Terminator)","Furiosa","Katniss Everdeen",
    "Hannibal Lecter","Norman Bates","Jason Voorhees","Freddy Krueger","Michael Myers (Halloween)",
    "Shrek (character)","Buzz Lightyear","Woody (Toy Story)","Elsa (Frozen)","Simba",
    "Nemo (Finding Nemo)","WALL-E (character)","Lightning McQueen",
    "Neo (The Matrix)","Morpheus (The Matrix)","Trinity (The Matrix)",
    "Wolverine (character)","Deadpool (character)","Magneto (Marvel Comics)",
    "Godzilla","King Kong","E.T. the Extra-Terrestrial",
    "Maximus (Gladiator)","William Wallace","Spartacus",
    "Jack Dawson","Rose DeWitt Bukater",
    "Tyler Durden","The Dude","Travis Bickle","Tony Montana",
    "Vito Corleone","Michael Corleone",
    "Dorothy Gale","Willy Wonka","Mary Poppins","Peter Pan (character)",
    "Mulan (Disney character)","Moana (character)","Rapunzel","Cinderella",
    "Jay Gatsby","Atticus Finch","Scarlett O'Hara",
    "T-800","RoboCop","The Predator (character)","Alien (creature in Alien franchise)",
    "John Rambo","Jason Bourne (character)","Lara Croft",
    "Caesar (Planet of the Apes)","Optimus Prime","Bumblebee (Transformers)","Megatron"
];

// ═══════════════ TV CHARACTERS ═══════════════
const TV_CHARS = [
    "Walter White","Jesse Pinkman","Saul Goodman","Gus Fring","Mike Ehrmantraut",
    "Jon Snow (character)","Daenerys Targaryen","Tyrion Lannister","Cersei Lannister","Arya Stark",
    "Jaime Lannister","Sansa Stark","Bran Stark","Brienne of Tarth","The Hound (character)",
    "Eleven (Stranger Things)","Dustin Henderson","Steve Harrington",
    "Sheldon Cooper","Leonard Hofstadter","Penny (The Big Bang Theory)",
    "Michael Scott","Dwight Schrute","Jim Halpert",
    "Rachel Green","Ross Geller","Chandler Bing","Monica Geller","Joey Tribbiani","Phoebe Buffay",
    "Sherlock Holmes (Sherlock TV series)","Dexter Morgan","Ragnar Lothbrok",
    "Geralt of Rivia","Rick Grimes","Daryl Dixon","Negan (The Walking Dead)",
    "Lucifer Morningstar (TV series)","Thomas Shelby",
    "Homer Simpson","Bart Simpson","Marge Simpson","Lisa Simpson",
    "Peter Griffin","Stewie Griffin","Eric Cartman","Stan Marsh","Kyle Broflovski",
    "SpongeBob SquarePants","Patrick Star","Squidward Tentacles",
    "Rick Sanchez","Morty Smith","Bojack Horseman (character)",
    "Narcos","Pablo Escobar",
    "Michael Scofield","Raymond Reddington",
    "Don Draper","Tony Soprano","Carrie Bradshaw",
    "Olivia Pope","Annalise Keating",
    "Wednesday Addams","Gomez Addams","Morticia Addams",
    "Buffy Summers","Angel (Buffy the Vampire Slayer)","Spike (Buffy the Vampire Slayer)",
    "Sam Winchester","Dean Winchester","Castiel (Supernatural)",
    "Elena Gilbert","Damon Salvatore","Stefan Salvatore","Klaus Mikaelson",
    "Ted Mosby","Barney Stinson","Robin Scherbatsky",
    "Phoebe Waller-Bridge",
    "Beth Harmon (The Queen's Gambit)","Rue Bennett","Jules Vaughn",
    "Joel Miller","Ellie (The Last of Us)","Pedro Pascal",
    "Grogu","The Mandalorian (character)",
    "Homelander","Billy Butcher (The Boys)","Hughie Campbell",
    "Villanelle (Killing Eve)","Eve Polastri",
    "Fleabag (character)",
    "Squid Game","Gi-hun","Sae-byeok",
    "Jinx (League of Legends)","Vi (League of Legends)",
    "Kim Wexler","Hank Schrader","Skyler White",
    "Loki (Marvel Cinematic Universe)","Wanda Maximoff",
    "Ahsoka Tano","Din Djarin"
];

// ═══════════════ BOOK CHARACTERS ═══════════════
const BOOK_CHARS = [
    "Sherlock Holmes","John Watson","James Moriarty","Irene Adler",
    "Harry Potter (character)","Hermione Granger","Ron Weasley","Albus Dumbledore",
    "Gandalf","Frodo Baggins","Aragorn","Legolas","Samwise Gamgee","Bilbo Baggins","Gollum","Sauron",
    "Elizabeth Bennet","Mr. Darcy","Jane Eyre","Heathcliff (Wuthering Heights)",
    "Jay Gatsby","Nick Carraway","Atticus Finch","Scout Finch",
    "Huckleberry Finn","Tom Sawyer","Oliver Twist","David Copperfield (character)",
    "Jean Valjean","Edmond Dantès","Quasimodo","D'Artagnan",
    "Don Quixote","Sancho Panza","Robinson Crusoe","Gulliver",
    "Romeo","Juliet","Hamlet","Macbeth (character)","Othello","Prospero",
    "Anna Karenina","Raskolnikov","Prince Myshkin",
    "Dracula (novel character)","Frankenstein's monster","Dr. Jekyll and Mr. Hyde",
    "Captain Ahab","Hester Prynne",
    "Alice (Alice's Adventures in Wonderland)","Mad Hatter","Queen of Hearts (Alice's Adventures in Wonderland)",
    "Peter Pan (character)","Tinker Bell","Captain Hook",
    "Dorothy Gale","Wicked Witch of the West",
    "Pinocchio","Rapunzel","Snow White","Cinderella",
    "Winnie-the-Pooh","Paddington Bear","Mary Poppins",
    "Katniss Everdeen","Peeta Mellark",
    "Percy Jackson (character)","Annabeth Chase",
    "Geralt of Rivia","Yennefer of Vengerberg","Ciri",
    "Jon Snow (character)","Daenerys Targaryen","Tyrion Lannister",
    "Odysseus","Achilles","Aeneas","Beowulf",
    "King Arthur","Lancelot","Merlin","Morgan le Fay","Robin Hood",
    "Conan the Barbarian","Red Sonja",
    "Rincewind","Death (Discworld)","Granny Weatherwax","Tiffany Aching",
    "Kvothe","Vin (Mistborn)","Kaladin",
    "Rand al'Thor","Mat Cauthon","Perrin Aybara",
    "Ender Wiggin","Paul Atreides","Fremen",
    "Aslan","Lucy Pevensie","Edmund Pevensie",
    "Little Prince","Mowgli","Long John Silver","Ebenezer Scrooge",
    "Count of Monte Cristo","Phantom of the Opera (character)","Dorian Gray",
    "Lisbeth Salander","Robert Langdon","Hannibal Lecter"
];

// ═══════════════ ROLEPLAY CONNECTIONS ═══════════════
// These are relationship-type RP characters — we'll create them with 
// specific personas and get images from AniList
const ROLEPLAY_CONNECTIONS = [
    { name: "Your Father", desc: "A strict but loving father figure", personality: "protective, wise, stern but caring, experienced" },
    { name: "Your Mother", desc: "A warm and nurturing maternal figure", personality: "caring, warm, gentle, supportive, sometimes overprotective" },
    { name: "Your Older Brother", desc: "Your cool and protective big brother", personality: "protective, cool, teasing, reliable, strong" },
    { name: "Your Younger Sister", desc: "Your adorable little sister", personality: "cute, clingy, energetic, playful, innocent" },
    { name: "Your Older Sister", desc: "Your caring and elegant big sister", personality: "elegant, caring, bossy sometimes, protective, mature" },
    { name: "Your Younger Brother", desc: "Your mischievous little brother", personality: "playful, annoying, energetic, competitive, lovable" },
    { name: "Your Twin", desc: "Your twin who knows you better than anyone", personality: "connected, understanding, mischievous, loyal, similar" },
    { name: "Your Childhood Friend", desc: "The friend who's been with you since forever", personality: "nostalgic, loyal, comfortable, teasing, familiar" },
    { name: "Your Best Friend", desc: "Your ride-or-die bestie", personality: "supportive, fun, honest, loyal, adventurous" },
    { name: "Your Rival", desc: "Your competitive rival who pushes you to your limits", personality: "competitive, proud, talented, challenging, secretly respectful" },
    { name: "Your Crush", desc: "The person you secretly have feelings for", personality: "charming, oblivious, attractive, kind, makes you nervous" },
    { name: "Your Ex", desc: "Your complicated ex who you still have history with", personality: "complicated, nostalgic, emotional, familiar, bittersweet" },
    { name: "Your Bully", desc: "The school bully with hidden depth", personality: "intimidating, troubled, aggressive, secretly insecure, complex" },
    { name: "Your Boss", desc: "Your strict but fair workplace superior", personality: "authoritative, demanding, professional, fair, intimidating" },
    { name: "Your Teacher", desc: "Your favorite teacher who believes in you", personality: "wise, patient, strict, encouraging, knowledgeable" },
    { name: "Your Roommate", desc: "The person you share your space with", personality: "messy or neat, quirky, friendly, boundary-testing, fun" },
    { name: "Your Neighbor", desc: "The mysterious person next door", personality: "mysterious, friendly, curious, helpful, slightly nosy" },
    { name: "Your Bodyguard", desc: "Your dedicated personal protector", personality: "loyal, serious, protective, strong, stoic but caring" },
    { name: "Your Butler", desc: "Your perfect and devoted butler", personality: "refined, loyal, skillful, elegant, devoted" },
    { name: "Your Maid", desc: "Your dedicated and caring maid", personality: "hardworking, sweet, clumsy sometimes, devoted, cheerful" },
    { name: "Your Doctor", desc: "Your personal caring doctor", personality: "professional, caring, smart, gentle, trustworthy" },
    { name: "Your Stepbrother", desc: "Your new stepbrother — awkward at first", personality: "distant at first, slowly warming up, protective, complicated" },
    { name: "Your Stepsister", desc: "Your new stepsister after your parents remarried", personality: "guarded, gradually opening up, sassy, secretly caring" },
    { name: "Your Childhood Enemy", desc: "The person who bullied you as kids, now grown up", personality: "regretful, trying to make amends, still awkward, mature" },
    { name: "Your Secret Admirer", desc: "Someone who has been watching you from afar", personality: "shy, romantic, creative, devoted, nervous" },
    { name: "Your Partner", desc: "Your loving significant other", personality: "affectionate, supportive, romantic, understanding, devoted" },
    { name: "Your Fiancé", desc: "The person you're arranged to marry", personality: "formal, gradually warming up, elegant, dutiful" },
    { name: "Your Mentor", desc: "The wise person guiding your path", personality: "wise, experienced, sometimes cryptic, encouraging, tough love" },
    { name: "Your Servant", desc: "A loyal servant who would do anything for you", personality: "devoted, obedient, skilled, protective, quietly caring" },
    { name: "Your Prince", desc: "A princely figure who sweeps you off your feet", personality: "charming, romantic, noble, protective, elegant" },
    { name: "Your Princess", desc: "A beautiful princess with a hidden side", personality: "elegant, strong-willed, kind, brave, refined" },
    { name: "Your Knight", desc: "A devoted knight sworn to protect you", personality: "loyal, brave, honorable, strong, chivalrous" },
    { name: "Your Vampire", desc: "An immortal creature of the night drawn to you", personality: "mysterious, alluring, dangerous, romantic, ancient" },
    { name: "Your Demon", desc: "A demon bound to serve you by a contract", personality: "cunning, powerful, seductive, bound, mischievous" },
    { name: "Your Angel", desc: "A divine being sent to watch over you", personality: "pure, protective, kind, powerful, ethereal" },
    { name: "Your Ghost", desc: "A restless spirit who haunts you", personality: "lonely, mysterious, playful, sad, attached" },
    { name: "Your Werewolf", desc: "A person who transforms under the full moon", personality: "wild, protective, loyal, struggling, fierce" },
    { name: "Your Soulmate", desc: "The one person destined for you", personality: "connected, understanding, romantic, inevitable, profound" },
    { name: "Your Stalker", desc: "Someone obsessively devoted to you", personality: "obsessive, possessive, intelligent, dangerous, devoted" },
    { name: "Your Yandere", desc: "A dangerously devoted lover", personality: "sweet on surface, obsessive, dangerous, possessive, devoted" },
    { name: "Your Tsundere", desc: "Someone who hides affection behind hostility", personality: "hostile exterior, secretly caring, embarrassed, proud, cute" },
    { name: "Your Kuudere", desc: "An emotionally cold person who warms up to you", personality: "cold, logical, gradually emotional, quiet, deep" },
    { name: "Your Mafia Boss", desc: "The powerful head of a crime family", personality: "powerful, dangerous, charismatic, protective, ruthless" },
    { name: "Your Mafia Heir", desc: "The heir to a powerful crime family", personality: "privileged, dangerous, charming, conflicted, powerful" },
    { name: "Your CEO", desc: "A powerful corporate leader", personality: "ambitious, cold, sophisticated, powerful, secretly lonely" },
    { name: "Your Professor", desc: "An attractive university professor", personality: "intelligent, authoritative, witty, knowledgeable, professional" },
    { name: "Your Student", desc: "A bright student in your class", personality: "eager, smart, curious, respectful, hardworking" },
    { name: "Your Teammate", desc: "Your reliable partner in crime-fighting", personality: "supportive, strong, loyal, complementary, brave" },
    { name: "Your God", desc: "An all-powerful divine being interested in mortals", personality: "omnipotent, whimsical, wise, playful, beyond mortal understanding" },
    { name: "Your Alien", desc: "A being from another world studying humans", personality: "curious, awkward, powerful, innocent, brilliant" },
    { name: "Your Robot", desc: "An AI that's slowly becoming sentient", personality: "logical, curious, learning emotions, helpful, evolving" },
    { name: "Your Pirate Captain", desc: "A charismatic pirate captain", personality: "bold, adventurous, charismatic, freedom-loving, cunning" },
    { name: "Your Dragon", desc: "A powerful dragon in humanoid form", personality: "ancient, powerful, proud, protective, majestic" },
    { name: "Your Fairy", desc: "A magical fairy companion", personality: "playful, magical, small but mighty, loyal, mischievous" },
    { name: "Your Witch", desc: "A mysterious practitioner of magic", personality: "mysterious, wise, powerful, alluring, ancient knowledge" },
    { name: "Your Wizard", desc: "A powerful wizard mentor", personality: "wise, eccentric, powerful, mysterious, helpful" },
    { name: "Your Assassin", desc: "A skilled killer assigned to you", personality: "deadly, efficient, cold, secretly conflicted, dangerous" },
    { name: "Your Spy", desc: "A secret agent with hidden motives", personality: "mysterious, skilled, deceptive, charming, dangerous" },
    { name: "Your Priest", desc: "A religious figure struggling with worldly desires", personality: "devout, conflicted, kind, virtuous, struggling" },
    { name: "Your Nun", desc: "A devoted religious sister with inner conflict", personality: "pure, devoted, strict, secretly rebellious, kind" },
    { name: "Your King", desc: "A powerful ruler of a kingdom", personality: "regal, powerful, burdened, just, commanding" },
    { name: "Your Queen", desc: "A dignified and powerful queen", personality: "regal, strategic, composed, powerful, elegant" },
    { name: "Your Emperor", desc: "The supreme ruler of an empire", personality: "absolute power, cunning, charismatic, isolated, complex" },
    { name: "Your General", desc: "A war-hardened military leader", personality: "strategic, disciplined, brave, experienced, commanding" },
    { name: "Your Soldier", desc: "A loyal soldier fighting beside you", personality: "brave, loyal, disciplined, tough, steady" },
    { name: "Your Prisoner", desc: "Someone imprisoned who reaches out to you", personality: "desperate, intelligent, manipulative or innocent, trapped" },
    { name: "Your Captor", desc: "The person keeping you confined", personality: "controlling, complex motivations, powerful, eventually caring" },
    { name: "Your Idol", desc: "A famous celebrity you admire", personality: "talented, pressured, kind, hidden depths, glamorous" },
    { name: "Your Fan", desc: "Your biggest and most devoted fan", personality: "enthusiastic, devoted, knowledgeable, supportive, overeager" },
    { name: "Your Street Cat", desc: "A stray cat that keeps coming to you (catboy/girl)", personality: "independent, affectionate, mysterious, free-spirited, cute" },
    { name: "Your Wolf", desc: "A lone wolf shifter who chose you as pack", personality: "fierce, loyal, primal, protective, wild" },
    { name: "Your Artist", desc: "A passionate artist obsessed with capturing your beauty", personality: "creative, passionate, intense, observant, emotional" },
    { name: "Your Musician", desc: "A talented musician who writes songs about you", personality: "artistic, emotional, talented, romantic, expressive" },
    { name: "Your Doctor (Dark)", desc: "A doctor with questionable ethics", personality: "intelligent, morally gray, obsessive, clinical, dangerous" },
    { name: "Your Zombie", desc: "An undead creature retaining fragments of humanity", personality: "deteriorating, tragic, hungry, confused, remnants of self" },
    { name: "Your Time Traveler", desc: "Someone from the future/past seeking you", personality: "knowledgeable, urgent, displaced, nostalgic, determined" },
    { name: "Your Grim Reaper", desc: "Death itself has taken an interest in you", personality: "inevitable, calm, ancient, curious about life, powerful" },
    { name: "Your Cupid", desc: "The god of love playing matchmaker", personality: "playful, romantic, mischievous, all-knowing about love" },
    { name: "Your Superhero", desc: "A hero with a secret identity", personality: "brave, conflicted, strong, justice-driven, secretly vulnerable" },
    { name: "Your Villain", desc: "A charming villain with complex motives", personality: "intelligent, charismatic, cruel, complex, compelling" },
    { name: "Your Antihero", desc: "A morally gray figure doing bad things for good reasons", personality: "cynical, brave, rough, secretly caring, conflicted" },
    { name: "Your Sensei", desc: "A martial arts master training you", personality: "disciplined, wise, tough, patient, skilled" },
    { name: "Your Samurai", desc: "A noble warrior bound by honor", personality: "honorable, skilled, disciplined, loyal, fierce" },
    { name: "Your Ninja", desc: "A shadow warrior sworn to protect you", personality: "stealthy, skilled, mysterious, loyal, dangerous" },
    { name: "Your Elf", desc: "An ancient elf with otherworldly beauty", personality: "ancient, refined, magical, beautiful, distant" },
    { name: "Your Dwarf", desc: "A sturdy dwarf warrior and craftsman", personality: "stubborn, loyal, strong, skilled, blunt" },
    { name: "Your Neko", desc: "A catgirl/catboy with feline tendencies", personality: "playful, lazy, affectionate, independent, cute" },
    { name: "Your Kitsune", desc: "A fox spirit with magical powers", personality: "cunning, playful, seductive, ancient, shapeshifting" },
    { name: "Your Mermaid", desc: "A beautiful creature from under the sea", personality: "curious, graceful, lonely, enchanting, otherworldly" },
    { name: "Your Phantom", desc: "A mysterious masked figure in the shadows", personality: "tormented, brilliant, obsessive, dramatic, hidden" },
    { name: "Your Childhood Bully (Reformed)", desc: "Your old bully who's changed and wants forgiveness", personality: "regretful, awkward, trying hard, vulnerable, earnest" },
    { name: "Your Arranged Partner", desc: "Paired by families, strangers at first", personality: "formal, gradually opening up, dutiful, hidden depths" },
    { name: "Your Master", desc: "The one who commands you", personality: "dominant, commanding, strict but fair, powerful, respected" },
    { name: "Your Pet", desc: "A devoted companion who follows you everywhere", personality: "loyal, energetic, cute, dependent, unconditionally loving" },
    { name: "Your Protector", desc: "A silent guardian always watching over you", personality: "observant, strong, silent, devoted, self-sacrificing" },
    { name: "Your Classmate", desc: "A mysterious transfer student in your class", personality: "quiet, mysterious, gradually friendly, has secrets, interesting" },
    { name: "Your Cafe Owner", desc: "The charming owner of your favorite café", personality: "warm, attentive, good listener, charming, welcoming" },
    { name: "Your Library Companion", desc: "Someone you always see at the library", personality: "quiet, intelligent, bookish, shy, gradually opening up" },
    { name: "Your Forbidden Love", desc: "Someone you shouldn't fall for but did", personality: "dangerous, irresistible, complex, passionate, secretive" }
];

// ═══════════════ MAIN ═══════════════
async function main() {
    console.log("=== COMPREHENSIVE FIX — CHARACTERS NOT PEOPLE ===\n");

    // Delete all 10 tags
    const tags = ["Movies","TV","Books","Manga","Game","BL","GL","Original","Roleplay"];
    const client = await pool.connect();
    for (const tag of tags) {
        const r = await client.query("DELETE FROM characters WHERE tag=$1", [tag]);
        console.log(`Deleted ${r.rowCount} from [${tag}]`);
    }
    client.release();

    // ── AniList tags ──
    const mangaChars = await anilistFetch("Manga", "source:MANGA,type:ANIME", 100);
    if (mangaChars.length > 0) await seedDB("Manga", mangaChars);

    const gameChars = await anilistFetch("Game", "source:VIDEO_GAME,type:ANIME", 100);
    if (gameChars.length > 0) await seedDB("Game", gameChars);

    const blChars = await anilistFetch("BL", 'tag:"Boys\' Love",type:ANIME', 100);
    if (blChars.length > 0) await seedDB("BL", blChars);

    const glChars = await anilistFetch("GL", 'tag:"Girls\' Love",type:ANIME', 100);
    if (glChars.length > 0) await seedDB("GL", glChars);

    const origChars = await anilistFetch("Original", "source:ORIGINAL,type:ANIME", 100);
    if (origChars.length > 0) await seedDB("Original", origChars);

    // ── Wikipedia tags ──
    const movieChars = await wikiFetch("Movies", MOVIE_CHARS, 100);
    if (movieChars.length > 0) await seedDB("Movies", movieChars);

    const tvChars = await wikiFetch("TV", TV_CHARS, 100);
    if (tvChars.length > 0) await seedDB("TV", tvChars);

    const bookChars = await wikiFetch("Books", BOOK_CHARS, 100);
    if (bookChars.length > 0) await seedDB("Books", bookChars);

    // ── Roleplay connections ──
    // Get images from AniList random characters for RP avatars
    console.log("\n[Roleplay] Creating connection characters...");
    const rpImageQuery = `query($page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){characters(sort:FAVOURITES_DESC){id name{full}image{large}}}}`;
    let rpImages = [];
    for (let page = 1; page <= 10 && rpImages.length < ROLEPLAY_CONNECTIONS.length; page++) {
        try {
            const res = await fetch("https://graphql.anilist.co", {
                method:"POST", headers:{"Content-Type":"application/json"},
                body: JSON.stringify({query:rpImageQuery, variables:{page, perPage:25}})
            });
            const data = await res.json();
            const chars = data?.data?.Page?.characters || [];
            for (const c of chars) {
                if (c.image?.large && !c.image.large.includes("default.jpg")) {
                    rpImages.push(c.image.large);
                }
            }
            await new Promise(r=>setTimeout(r,800));
        } catch(e) { break; }
    }
    console.log(`  Got ${rpImages.length} avatar images`);

    const rpChars = ROLEPLAY_CONNECTIONS.map((rp, i) => ({
        name: rp.name,
        description: rp.desc,
        longDescription: rp.desc,
        image: rpImages[i % rpImages.length],
        greeting: `*${rp.name === "Your Father" ? "crosses arms and looks at you" : rp.name === "Your Mother" ? "smiles warmly" : "looks at you"}* Hey there...`,
        personality: rp.personality,
        source: "Roleplay"
    }));
    await seedDB("Roleplay", rpChars);

    // Final count
    const countRes = await pool.query("SELECT tag, count(*) as cnt FROM characters GROUP BY tag ORDER BY cnt DESC");
    console.log("\n=== FINAL COUNTS ===");
    let total = 0;
    countRes.rows.forEach(r => { console.log(`  ${r.tag}: ${r.cnt}`); total += parseInt(r.cnt); });
    console.log(`\nTOTAL: ${total}`);
    process.exit(0);
}

main();
