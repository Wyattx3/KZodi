/**
 * PROPER SEEDER - NO ANIME FALLBACKS
 * 
 * 1. Roleplay: Uses randomuser.me for 100 real human portraits
 * 2. Movies, TV, Books, Game: Uses Wikipedia, strictly requires a real Wikipedia thumbnail.
 * 3. BL, GL, Manga, Original: Uses AniList but strictly Korean/Chinese Webtoons (Manhwa/Manhua).
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
        const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages|extracts&exintro&explaintext&exchars=400&titles=${encodeURIComponent(name)}&format=json&pithumbsize=500&origin=*`;
        https.get(url, { headers: { "User-Agent": "KZodiBot/2.0" } }, (res) => {
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
                    const badImages = ["Question_book","No_image","Flag_of","Commons-logo","replace_this","Ambox","Text_document","Wiki_letter","Wiktionary","Disambig","Edit-clear"];
                    // MUST have a thumbnail, and it cannot be a generic placeholder
                    if (!thumb || badImages.some(b => thumb.includes(b))) return resolve(null);
                    resolve({ image: thumb, extract: (pg.extract || "").substring(0, 600) });
                } catch { resolve(null); }
            });
        }).on("error", () => resolve(null));
    });
}

async function anilistManhwaFetch(tag, searchParams, targetCount = 100) {
    console.log(`\n[AniList MANHWA] "${tag}"...`);
    let results = [], seen = new Set();
    // Fetch specifically KR/CN manga (Manhwa/Manhua) which have a distinct webtoon art style
    const query = `query($page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){media(sort:POPULARITY_DESC,${searchParams}){title{english romaji}characters(sort:FAVOURITES_DESC,perPage:5){nodes{id name{full}image{large}description}}}}}`;
    
    for (let page = 1; page <= 15 && results.length < targetCount; page++) {
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
                const src = m.title?.english || m.title?.romaji;
                for (const c of (m.characters?.nodes || [])) {
                    if (results.length >= targetCount) break;
                    if (!c.image?.large || c.image.large.includes("default.jpg")) continue;
                    if (seen.has(c.name.full)) continue;
                    seen.add(c.name.full);
                    results.push({ name: c.name.full, description: `${c.name.full} from the Webtoon ${src}`, longDescription: (c.description||"").replace(/~!.*?!~/gs,'').substring(0,500), image: c.image.large, greeting: `Hi! I'm ${c.name.full}.`, personality: "webtoon character", source: src || tag });
                }
            }
            await new Promise(r => setTimeout(r, 800));
        } catch(e) { console.error("  AniList err:", e.message); break; }
    }
    console.log(`  Got ${results.length}`);
    return results;
}

// ═══════════════ MASSIVE CHARACTER MASS-LISTS ═══════════════
const MOVIE_CHARS = [
    // We provide 300+ to ensure we hit 100 real images
    "Darth Vader", "Luke Skywalker", "Princess Leia", "Han Solo", "Yoda", "Obi-Wan Kenobi", "Kylo Ren", "Rey (Star Wars)", "Chewbacca", "Boba Fett", "Jabba the Hutt", "C-3PO", "R2-D2", "Palpatine", "Padmé Amidala", "Mace Windu", "Qui-Gon Jinn",
    "Harry Potter (character)", "Hermione Granger", "Ron Weasley", "Lord Voldemort", "Albus Dumbledore", "Severus Snape", "Draco Malfoy", "Sirius Black", "Rubeus Hagrid", "Bellatrix Lestrange", "Neville Longbottom", "Luna Lovegood", "Minerva McGonagall", "Gellert Grindelwald", "Newt Scamander",
    "Tony Stark (Marvel Cinematic Universe)", "Steve Rogers (Marvel Cinematic Universe)", "Thor (Marvel Cinematic Universe)", "Bruce Banner (Marvel Cinematic Universe)", "Natasha Romanoff (Marvel Cinematic Universe)", "Clint Barton (Marvel Cinematic Universe)", "Peter Parker (Marvel Cinematic Universe)", "Wanda Maximoff (Marvel Cinematic Universe)", "Vision (Marvel Cinematic Universe)", "Stephen Strange (Marvel Cinematic Universe)", "T'Challa (Marvel Cinematic Universe)", "Carol Danvers (Marvel Cinematic Universe)", "Scott Lang (Marvel Cinematic Universe)", "Bucky Barnes (Marvel Cinematic Universe)", "Sam Wilson (Marvel Cinematic Universe)", "Loki (Marvel Cinematic Universe)", "Thanos (Marvel Cinematic Universe)", "Nick Fury (Marvel Cinematic Universe)", "Groot (Marvel Cinematic Universe)", "Rocket (Marvel Cinematic Universe)", "Peter Quill (Marvel Cinematic Universe)", "Gamora (Marvel Cinematic Universe)", "Drax (Marvel Cinematic Universe)",
    "Bruce Wayne (DC Extended Universe)", "Clark Kent (DC Extended Universe)", "Diana Prince (DC Extended Universe)", "Arthur Curry (DC Extended Universe)", "Barry Allen (DC Extended Universe)", "Victor Stone (DC Extended Universe)", "Harley Quinn (DC Extended Universe)", "Joker (character)",
    "Indiana Jones (character)", "James Bond", "Ethan Hunt", "John Wick", "Jason Bourne (character)", "Jack Sparrow", "Neo (The Matrix)", "Trinity (The Matrix)", "Morpheus (The Matrix)", "Agent Smith", "John Rambo", "Rocky Balboa", "Terminator (character)", "Sarah Connor (Terminator)", "Ellen Ripley", "Furiosa", "Mad Max (character)", "Katniss Everdeen", "Peeta Mellark", "Gale Hawthorne", "Effie Trinket", "Haymitch Abernathy", "President Snow", "Lara Croft", "Beatrix Kiddo", "Django Freeman", "Dominic Toretto", "Brian O'Conner", "Lethal Weapon", "John McClane",
    "Gandalf", "Aragorn", "Frodo Baggins", "Legolas", "Gollum", "Sauron", "Bilbo Baggins", "Samwise Gamgee", "Gimli (Middle-earth)", "Boromir", "Galadriel", "Elrond", "Saruman", "Thorin Oakenshield", "Smaug",
    "Vito Corleone", "Michael Corleone", "Tony Montana", "Hannibal Lecter", "Norman Bates", "Jason Voorhees", "Freddy Krueger", "Michael Myers (Halloween)", "Leatherface", "Pennywise (character)", "Ghostface (identity)", "Chucky (character)", "Pinhead (Hellraiser)", "Jigsaw (Saw character)",
    "Woody (Toy Story)", "Buzz Lightyear", "Shrek (character)", "Donkey (Shrek)", "Fiona (Shrek)", "Puss in Boots (Shrek)", "Simba", "Mufasa", "Scar (The Lion King)", "Timon and Pumbaa", "Elsa (Frozen)", "Anna (Frozen)", "Olaf (Frozen)", "Moana (character)", "Maui (Moana)", "Mulan (Disney character)", "Aladdin (Disney character)", "Genie (Disney)", "Jasmine (Disney character)", "Jafar (Disney)", "Ariel (The Little Mermaid)", "Ursula (The Little Mermaid)", "Belle (Beauty and the Beast)", "Beast (Beauty and the Beast)", "Gaston (Beauty and the Beast)", "Snow White (Disney character)", "Evil Queen (Disney)", "Cinderella (Disney character)", "Maleficent", "Cruella de Vil", "Mary Poppins", "Willy Wonka", "Grinch", "WALL-E (character)", "EVE (WALL-E)", "Lightning McQueen", "Mater (Cars)", "Nemo (Finding Nemo)", "Dory", "Marlin (Finding Nemo)", "Sully (Monsters, Inc.)", "Mike Wazowski", "Mr. Incredible", "Elastigirl", "Frozone", "Syndrome (The Incredibles)", "Edna Mode", "Remy (Ratatouille)", "Carl Fredricksen", "Joy (Inside Out)", "Sadness (Inside Out)", "Anger (Inside Out)", "Bing Bong (Inside Out)", "Miguel Rivera", "Hector (Coco)", "Hiccup (How to Train Your Dragon)", "Toothless (How to Train Your Dragon)", "Po (Kung Fu Panda)", "Master Shifu", "Tai Lung", "Gru", "Minions", "Megamind",
    "Forrest Gump (character)", "Tyler Durden", "The Dude", "Travis Bickle", "Patrick Bateman", "Jules Winnfield", "Vincent Vega", "Mia Wallace", "Anton Chigurh", "Daniel Plainview", "Charles Foster Kane", "Rick Blaine", "Ilsa Lund", "Dorothy Gale", "Wicked Witch of the West", "Scarecrow (The Wizard of Oz)", "Tin Woodman", "Cowardly Lion", "Maximus Decimus Meridius", "William Wallace (Braveheart)", "Spartacus", "King Arthur", "Robin Hood", "Zorro", "Tarzan", "Dracula (Bram Stoker character)", "Frankenstein's monster", "Godzilla", "King Kong"
];

const TV_CHARS = [
    // Real people / actors from TV (since fictional character pages often lack images, we target famous TV actors/roles)
    "Mr. Bean (character)", "Walter White (Breaking Bad)", "Jesse Pinkman", "Saul Goodman", "Gustavo Fring", "Mike Ehrmantraut", "Hank Schrader", "Skyler White", "Kim Wexler", "Chuck McGill", "Lalo Salamanca", "Ignacio Varga",
    "Jon Snow (character)", "Daenerys Targaryen", "Tyrion Lannister", "Cersei Lannister", "Arya Stark", "Sansa Stark", "Jaime Lannister", "Bran Stark", "Brienne of Tarth", "The Hound (character)", "Joffrey Baratheon", "Ramsay Bolton", "Petyr Baelish", "Varys", "Melisandre", "Margaery Tyrell", "Olenna Tyrell", "Tywin Lannister",
    "Michael Scott (The Office)", "Dwight Schrute", "Jim Halpert", "Pam Beesly", "Ryan Howard (The Office)", "Andy Bernard", "Stanley Hudson", "Kevin Malone (The Office)", "Angela Martin", "Phyllis Vance", "Kelly Kapoor", "Toby Flenderson", "Creed Bratton", "Darryl Philbin", "Holly Flax", "Jan Levinson",
    "Rachel Green", "Ross Geller", "Chandler Bing", "Monica Geller", "Joey Tribbiani", "Phoebe Buffay", "Gunther (Friends)", "Janice Hosenstein", "Richard Burke (Friends)", "Mike Hannigan",
    "Sheldon Cooper", "Leonard Hofstadter", "Penny (The Big Bang Theory)", "Howard Wolowitz", "Raj Koothrappali", "Bernadette Rostenkowski", "Amy Farrah Fowler", "Stuart Bloom",
    "Homer Simpson", "Bart Simpson", "Lisa Simpson", "Marge Simpson", "Maggie Simpson", "Ned Flanders", "Mr. Burns", "Waylon Smithers", "Seymour Skinner", "Edna Krabappel", "Krusty the Clown", "Apu Nahasapeemapetilon", "Moe Szyslak", "Chief Wiggum", "Ralph Wiggum",
    "SpongeBob SquarePants (character)", "Patrick Star", "Squidward Tentacles", "Mr. Krabs", "Plankton and Karen", "Sandy Cheeks", "Gary the Snail", "Mrs. Puff", "Pearl Krabs",
    "Peter Griffin", "Stewie Griffin", "Brian Griffin (Family Guy)", "Lois Griffin", "Chris Griffin", "Meg Griffin", "Glenn Quagmire", "Cleveland Brown", "Joe Swanson",
    "Eric Cartman", "Stan Marsh", "Kyle Broflovski", "Kenny McCormick", "Butters Stotch", "Randy Marsh", "Mr. Garrison", "Chef (South Park)", "Towelie",
    "Rick Sanchez", "Morty Smith", "Summer Smith", "Beth Smith", "Jerry Smith", "Mr. Poopybutthole", "Birdperson", "Squanchy",
    "Bojack Horseman (character)", "Princess Carolyn", "Diane Nguyen", "Mr. Peanutbutter", "Todd Chavez",
    "Sherlock Holmes (Sherlock TV series)", "John Watson (Sherlock)", "Jim Moriarty (Sherlock)", "Mycroft Holmes (Sherlock)", "Irene Adler (Sherlock)",
    "Dexter Morgan", "Debra Morgan", "Harry Morgan (Dexter)", "Rita Bennett", "Vince Masuka", "Angel Batista", "James Doakes", "Maria LaGuerta",
    "Tony Soprano", "Carmela Soprano", "Christopher Moltisanti", "Paulie Gualtieri", "Silvio Dante", "Big Pussy Bonpensiero", "Junior Soprano", "Dr. Melfi",
    "Don Draper", "Peggy Olson", "Pete Campbell", "Roger Sterling", "Joan Holloway", "Betty Draper", "Ken Cosgrove", "Harry Crane", "Bert Cooper", "Megan Draper",
    "Thomas Shelby (Peaky Blinders)", "Arthur Shelby", "Polly Gray", "John Shelby", "Ada Shelby", "Grace Shelby", "Alfie Solomons", "Michael Gray",
    "Ragnar Lothbrok", "Lagertha", "Bjorn Ironside", "Ivar the Boneless", "Floki (Vikings)", "Rollo (Vikings)", "Athelstan (Vikings)",
    "Geralt of Rivia (The Witcher TV series)", "Yennefer of Vengerberg (The Witcher TV series)", "Ciri (The Witcher TV series)", "Jaskier (The Witcher TV series)",
    "Rick Grimes", "Daryl Dixon", "Michonne", "Carol Peletier", "Maggie Greene", "Glenn Rhee", "Negan", "Carl Grimes", "Morgan Jones (The Walking Dead)", "Ezekiel (The Walking Dead)", "Rosita Espinosa", "Eugene Porter", "Gabriel Stokes (The Walking Dead)", "Aaron (The Walking Dead)", "Paul 'Jesus' Monroe", "Sasha Williams (The Walking Dead)", "Abraham Ford", "Tara Chambler", "Rosita Espinosa",
    "Eleven (Stranger Things)", "Dustin Henderson", "Steve Harrington", "Jim Hopper (Stranger Things)", "Joyce Byers", "Mike Wheeler (Stranger Things)", "Will Byers", "Lucas Sinclair", "Nancy Wheeler", "Jonathan Byers", "Max Mayfield", "Billy Hargrove", "Robin Buckley",
    "Buffy Summers", "Willow Rosenberg", "Xander Harris", "Rupert Giles", "Angel (Buffy the Vampire Slayer)", "Spike (Buffy the Vampire Slayer)", "Cordelia Chase", "Anya Jenkins", "Tara Maclay", "Faith (Buffy the Vampire Slayer)", "Dawn Summers",
    "Sam Winchester", "Dean Winchester", "Castiel (Supernatural)", "Crowley (Supernatural)", "Bobby Singer", "Lucifer (Supernatural)", "Jack Kline", "Mary Winchester", "John Winchester",
    "Elena Gilbert", "Damon Salvatore", "Stefan Salvatore", "Caroline Forbes", "Bonnie Bennett", "Matt Donovan", "Alaric Saltzman", "Jeremy Gilbert", "Tyler Lockwood", "Klaus Mikaelson", "Elijah Mikaelson", "Rebekah Mikaelson",
    "Ted Mosby", "Barney Stinson", "Robin Scherbatsky", "Marshall Eriksen", "Lily Aldrin",
    "Grogu", "The Mandalorian (character)", "Moff Gideon", "Greef Karga", "Cara Dune", "Kuiil", "IG-11", "Ahsoka Tano", "Bo-Katan Kryze", "Boba Fett", "Fennec Shand",
    "Homelander", "Billy Butcher", "Hughie Campbell", "Starlight (The Boys)", "Queen Maeve (The Boys)", "A-Train (The Boys)", "The Deep (The Boys)", "Black Noir", "Stormfront (The Boys)", "Soldier Boy (The Boys)",
    "Lucifer Morningstar (Lucifer TV series)", "Chloe Decker", "Amenadiel", "Mazikeen", "Dan Espinoza", "Ella Lopez", "Linda Martin", "Trixie Espinoza",
    "Villanelle (Killing Eve)", "Eve Polastri", "Carolyn Martens", "Konstantin Vasiliev",
    "Fleabag (character)", "The Priest (Fleabag)",
    "Seong Gi-hun", "Cho Sang-woo", "Kang Sae-byeok", "Oh Il-nam", "Jang Deok-su", "Abdul Ali", "Hwang Jun-ho", "Hwang In-ho",
    "Jinx (League of Legends)", "Vi (League of Legends)", "Caitlyn (League of Legends)", "Jayce (League of Legends)", "Viktor (League of Legends)", "Ekko (League of Legends)", "Heimerdinger", "Silco (Arcane)", "Vander (Arcane)",
    "Olivia Pope", "Fitzgerald Grant", "Mellie Grant", "Cyrus Beene", "Abby Whelan", "Huck (Scandal)", "Quinn Perkins", "Jake Ballard", "Rowan Pope",
    "Annalise Keating", "Wes Gibbins", "Connor Walsh", "Michaela Pratt", "Asher Millstone", "Laurel Castillo", "Frank Delfino", "Bonnie Winterbottom", "Nate Lahey", "Oliver Hampton",
    "Carrie Bradshaw", "Samantha Jones (Sex and the City)", "Charlotte York Goldenblatt", "Miranda Hobbes", "Mr. Big (Sex and the City)", "Aidan Shaw",
    "Joel Miller (The Last of Us)", "Ellie (The Last of Us)", "Tommy (The Last of Us)", "Tess (The Last of Us)", "Bill (The Last of Us)", "Frank (The Last of Us)",
    "Wednesday Addams", "Gomez Addams", "Morticia Addams", "Pugsley Addams", "Uncle Fester", "Lurch (The Addams Family)", "Thing (The Addams Family)", "Cousin Itt",
    "Wanda Maximoff", "Vision (Marvel Cinematic Universe)", "Agatha Harkness", "Monica Rambeau", "Darcy Lewis", "Jimmy Woo",
    "Loki (Marvel Cinematic Universe)", "Mobius M. Mobius", "Sylvie (Marvel Cinematic Universe)", "Ravonna Renslayer", "Hunter B-15", "Miss Minutes",
    "Doctor Who (character)", "The First Doctor", "The Second Doctor", "The Third Doctor", "The Fourth Doctor", "The Fifth Doctor", "The Sixth Doctor", "The Seventh Doctor", "The Eighth Doctor", "The Ninth Doctor", "The Tenth Doctor", "The Eleventh Doctor", "The Twelfth Doctor", "The Thirteenth Doctor", "Rose Tyler", "Martha Jones", "Donna Noble", "Amy Pond", "Rory Williams", "Clara Oswald", "Bill Potts", "River Song", "Captain Jack Harkness", "The Master (Doctor Who)", "Dalek", "Cyberman", "Weeping Angel",
    "Fox Mulder", "Dana Scully", "Walter Skinner", "Cigarette Smoking Man", "The Lone Gunmen",
    "Jack Bauer", "Chloe O'Brian", "David Palmer (24)", "Tony Almeida", "Michelle Dessler",
    "James Gandolfini", "Bryan Cranston", "Steve Carell"
];

const GAME_CHARS = [
    "Mario", "Luigi", "Princess Peach", "Bowser", "Toad (Nintendo)", "Yoshi", "Wario", "Waluigi", "Donkey Kong (character)", "Diddy Kong", "Rosalina (Mario)", "Bowser Jr.", "Boo (Mario)", "King Boo",
    "Link (The Legend of Zelda)", "Princess Zelda", "Ganon", "Impa", "Midna", "Epona (The Legend of Zelda)", "Tingle",
    "Pikachu", "Charizard", "Mewtwo", "Pichu", "Jigglypuff", "Lucario", "Greninja", "Meowth", "Ash Ketchum", "Misty (Pokémon)", "Brock (Pokémon)", "Jessie (Pokémon)", "James (Pokémon)", "Giovanni (Pokémon)", "Professor Oak",
    "Samus Aran", "Ridley", "Dark Samus",
    "Kirby (character)", "King Dedede", "Meta Knight", "Bandana Waddle Dee",
    "Fox McCloud", "Falco Lombardi", "Peppy Hare", "Slippy Toad", "Wolf O'Donnell",
    "Captain Falcon",
    "Ness (EarthBound)", "Lucas (Mother 3)",
    "Marth (Fire Emblem)", "Roy (Fire Emblem)", "Ike (Fire Emblem)", "Lucina (Fire Emblem)", "Robin (Fire Emblem)", "Chrom", "Corrin", "Byleth (Fire Emblem)", "Edelgard von Hresvelg", "Dimitri Alexandre Blaiddyd", "Claude von Riegan",
    "Pit (Kid Icarus)", "Palutena", "Dark Pit",
    "Wario", "Waluigi",
    "Olimar (Pikmin)", "Villager (Animal Crossing)", "Isabelle (Animal Crossing)", "Tom Nook", "K.K. Slider", "Mr. Resetti",
    "Wii Fit Trainer", "Little Mac", "Mii", "Shulk", "Pyra (Xenoblade Chronicles)", "Mythra (Xenoblade Chronicles)", "Rex (Xenoblade Chronicles)", "Fiora (Xenoblade Chronicles)", "Elma (Xenoblade Chronicles)", "KOS-MOS",
    "Pac-Man (character)", "Ms. Pac-Man",
    "Mega Man (character)", "Zero (Mega Man)", "Roll (Mega Man)", "Proto Man", "Bass (Mega Man)", "Dr. Wily", "Dr. Light",
    "Ryu (Street Fighter)", "Ken Masters", "Chun-Li", "Guile", "Dhalsim", "Zangief", "Blanka", "E. Honda", "Balrog (Street Fighter)", "Vega (Street Fighter)", "Sagat (Street Fighter)", "M. Bison", "Akuma (Street Fighter)", "Cammy", "Juri (Street Fighter)",
    "Cloud Strife", "Sephiroth", "Tifa Lockhart", "Aerith Gainsborough", "Barret Wallace", "Red XIII", "Yuffie Kisaragi", "Vincent Valentine", "Cid Highwind", "Zack Fair", "Squall Leonhart", "Rinoa Heartilly", "Zidane Tribal", "Garnet Til Alexandros XVII", "Vivi Ornitier", "Tidus", "Yuna (Final Fantasy)", "Auron", "Rikku", "Lightning (Final Fantasy)", "Noctis Lucis Caelum", "Ignis Scientia", "Gladiolus Amicitia", "Prompto Argentum", "Clive Rosfield",
    "Solid Snake", "Big Boss", "Revolver Ocelot", "Liquid Snake", "Solidus Snake", "Raiden (Metal Gear)", "Meryl Silverburgh", "Otacon", "Sniper Wolf", "Psycho Mantis", "Vulcan Raven", "The Boss (Metal Gear)",
    "Sonic the Hedgehog (character)", "Miles 'Tails' Prower", "Knuckles the Echidna", "Amy Rose", "Doctor Eggman", "Shadow the Hedgehog", "Rouge the Bat", "Silver the Hedgehog", "Blaze the Cat", "Cream the Rabbit",
    "Simon Belmont", "Richter Belmont", "Alucard (Castlevania)", "Dracula (Castlevania)", "Trevor Belmont", "Sypha Belnades", "Grant Danasty",
    "Bayonetta (character)", "Jeanne (Bayonetta)",
    "Joker (Persona)", "Ryuji Sakamoto", "Ann Takamaki", "Morgana (Persona)", "Yusuke Kitagawa", "Makoto Niijima", "Futaba Sakura", "Haru Okumura", "Goro Akechi", "Kasumi Yoshizawa", "Yu Narukami", "Yosuke Hanamura", "Chie Satonaka", "Yukiko Amagi", "Kanji Tatsumi", "Rise Kujikawa", "Naoto Shirogane",
    "Hero (Dragon Quest)", "Slime (Dragon Quest)", "Terry (Dragon Quest)", "Bianca Whitaker", "Nera Briscoletti",
    "Banjo and Kazooie", "Gruntilda", "Conker the Squirrel",
    "Terry Bogard", "Mai Shiranui", "Geese Howard", "Kyo Kusanagi", "Iori Yagami",
    "Kazuya Mishima", "Heihachi Mishima", "Jin Kazama", "Nina Williams", "Paul Phoenix", "Marshall Law", "King (Tekken)", "Yoshimitsu", "Bryan Fury", "Hwoarang", "Xiaoyu",
    "Scorpion (Mortal Kombat)", "Sub-Zero (Mortal Kombat)", "Raiden (Mortal Kombat)", "Liu Kang", "Johnny Cage", "Sonya Blade", "Kano (Mortal Kombat)", "Shang Tsung", "Shao Kahn", "Kitana", "Mileena", "Goro (Mortal Kombat)",
    "Master Chief (Halo)", "Cortana", "Arbiter (Halo)", "Marcus Fenix", "Lara Croft", "Nathan Drake (character)", "Chloe Frazer", "Sully (Uncharted)", "Joel (The Last of Us)", "Ellie (The Last of Us)", "Kratos (God of War)", "Atreus", "Aloy",
    "Doomguy", "Duke Nukem", "Gordon Freeman", "Alyx Vance", "G-Man (Half-Life)", "Chell (Portal)", "GLaDOS", "Wheatley (Portal)",
    "Tracer (Overwatch)", "Winston (Overwatch)", "Widowmaker", "Reaper (Overwatch)", "Mercy (Overwatch)", "Genji (Overwatch)", "Hanzo (Overwatch)", "D.Va", "Mei (Overwatch)", "Zarya", "Sombra (Overwatch)", "Doomfist",
    "Geralt of Rivia", "Yennefer of Vengerberg", "Ciri", "Triss Merigold", "Vesemir",
    "Commander Shepard", "Garrus Vakarian", "Liara T'Soni", "Tali'Zorah", "Urdnot Wrex", "Illusive Man",
    "Dovahkiin", "Arthur Morgan", "John Marston (character)", "Dutch van der Linde",
    "Ezio Auditore da Firenze", "Altaïr Ibn-La'Ahad", "Connor Kenway", "Edward Kenway", "Arno Dorian", "Jacob Frye", "Evie Frye", "Bayek", "Kassandra (Assassin's Creed)", "Eivor", "Basim Ibn Ishaq",
    "Sora (Kingdom Hearts)", "Riku (Kingdom Hearts)", "Kairi (Kingdom Hearts)", "Roxas (Kingdom Hearts)", "Aqua (Kingdom Hearts)", "Ventus (Kingdom Hearts)", "Terra (Kingdom Hearts)", "Xehanort",
    "Steve (Minecraft)", "Alex (Minecraft)", "Creeper (Minecraft)", "Enderman", "Ender Dragon"
];

const BOOK_CHARS = [
    "Sherlock Holmes", "Dr. Watson", "Professor Moriarty", "Irene Adler",
    "Elizabeth Bennet", "Mr. Darcy", "Jane Bennet", "Charles Bingley", "George Wickham", "Lady Catherine de Bourgh", "Mr. Collins",
    "Jane Eyre", "Edward Rochester",
    "Heathcliff", "Catherine Earnshaw",
    "Jay Gatsby", "Nick Carraway", "Daisy Buchanan", "Tom Buchanan",
    "Atticus Finch", "Scout Finch", "Jem Finch", "Boo Radley", "Tom Robinson",
    "Huckleberry Finn", "Tom Sawyer", "Jim (Huckleberry Finn)", "Widow Douglas",
    "Oliver Twist", "Fagin", "Artful Dodger", "Bill Sikes", "Nancy (Oliver Twist)", "Mr. Bumble",
    "Ebenezer Scrooge", "Bob Cratchit", "Tiny Tim (A Christmas Carol)", "Jacob Marley",
    "David Copperfield (character)", "Uriah Heep", "Mr. Micawber", "Miss Havisham", "Philip Pirrip",
    "Jean Valjean", "Inspector Javert", "Fantine", "Cosette", "Marius Pontmercy", "Éponine", "Thénardiers",
    "Edmond Dantès", "Fernand Mondego", "Mercédès", "Abbé Faria", "Monsieur Morrel", "Danglars", "Gérard de Villefort",
    "D'Artagnan", "Athos", "Porthos", "Aramis", "Milady de Winter", "Cardinal Richelieu",
    "Don Quixote", "Sancho Panza", "Dulcinea del Toboso",
    "Robinson Crusoe", "Friday (Robinson Crusoe)",
    "Gulliver", "Captain Ahab", "Ishmael (Moby-Dick)", "Hester Prynne", "Arthur Dimmesdale",
    "Romeo", "Juliet", "Hamlet", "Macbeth (character)", "Othello", "Iago", "King Lear", "Prospero (The Tempest)", "Shylock", "Portia (The Merchant of Venice)", "Puck (A Midsummer Night's Dream)",
    "Anna Karenina", "Count Vronsky", "Konstantin Levin", "Raskolnikov", "Sonya Marmeladova", "Prince Myshkin", "Alyosha Karamazov", "Ivan Karamazov", "Dmitri Karamazov",
    "Dracula", "Abraham Van Helsing", "Jonathan Harker", "Mina Harker", "Lucy Westenra", "Renfield",
    "Frankenstein's monster", "Victor Frankenstein",
    "Dr. Jekyll", "Mr. Hyde",
    "Alice (Alice's Adventures in Wonderland)", "Mad Hatter", "White Rabbit", "Cheshire Cat", "Queen of Hearts", "Caterpillar (Alice's Adventures in Wonderland)", "Tweedledum and Tweedledee",
    "Peter Pan (character)", "Tinker Bell", "Captain Hook", "Wendy Darling",
    "Dorothy Gale", "Scarecrow (The Wizard of Oz)", "Tin Woodman", "Cowardly Lion", "Wicked Witch of the West", "Glinda",
    "Pinocchio", "Geppetto", "Jiminy Cricket",
    "Winnie-the-Pooh", "Piglet (Winnie-the-Pooh)", "Tigger", "Eeyore", "Rabbit (Winnie-the-Pooh)", "Christopher Robin",
    "Mary Poppins", "Bert (Mary Poppins)",
    "Katniss Everdeen", "Peeta Mellark", "Gale Hawthorne", "Haymitch Abernathy", "Effie Trinket", "President Snow", "Rue (The Hunger Games)", "Finnick Odair",
    "Percy Jackson (character)", "Annabeth Chase", "Grover Underwood", "Luke Castellan", "Tyson (Percy Jackson)", "Nico di Angelo", "Thalia Grace",
    "Geralt of Rivia", "Yennefer of Vengerberg", "Ciri", "Triss Merigold", "Dandelion",
    "Odysseus", "Achilles", "Hector", "Agamemnon", "Aeneas",
    "Beowulf", "Grendel",
    "King Arthur", "Merlin", "Lancelot", "Guinevere", "Gawain", "Morgan le Fay", "Mordred", "Galahad",
    "Robin Hood", "Little John", "Friar Tuck", "Will Scarlet", "Sheriff of Nottingham", "Maid Marian",
    "Conan the Barbarian", "Red Sonja",
    "Paul Atreides", "Lady Jessica", "Duke Leto Atreides", "Baron Vladimir Harkonnen", "Chani", "Duncan Idaho", "Gurney Halleck", "Stilgar", "Alia Atreides",
    "Ender Wiggin", "Valentine Wiggin", "Peter Wiggin", "Petra Arkanian", "Bean (Ender's Game)", "Mazer Rackham",
    "Aslan", "Lucy Pevensie", "Edmund Pevensie", "Peter Pevensie", "Susan Pevensie", "White Witch", "Mr. Tumnus", "Prince Caspian", "Reepicheep",
    "Mowgli", "Baloo", "Bagheera", "Shere Khan", "Kaa",
    "Long John Silver", "Jim Hawkins", "Captain Flint",
    "Dorian Gray", "Lord Henry Wotton", "Basil Hallward",
    "Phantom of the Opera", "Christine Daaé", "Raoul, Vicomte de Chagny",
    "Lisbeth Salander", "Mikael Blomkvist",
    "Hannibal Lecter", "Clarice Starling", "Will Graham",
    "Little Prince", "Pippi Longstocking", "Matilda Wormwood", "Miss Honey", "Miss Trunchbull", "Willy Wonka", "Charlie Bucket", "James Trotter", "Giant Peach", "BFG", "Sophie (The BFG)", "Grand High Witch",
    "Jo March", "Meg March", "Beth March", "Amy March", "Theodore 'Laurie' Laurence",
    "Holden Caulfield", "Phoebe Caulfield",
    "Tris Prior", "Four (Divergent)",
    "Kvothe", "Denna", "Auri", "Elodin", "Ambrose Jakis", "Bast (Kingkiller Chronicle)",
    "Kaladin Stormblessed", "Shallan Davar", "Dalinar Kholin", "Adolin Kholin", "Navani Kholin", "Sylphrena", "Pattern (Stormlight Archive)", "Szeth-son-son-Vallano", "Taravangian", "Hoid",
    "Rand al'Thor", "Mat Cauthon", "Perrin Aybara", "Egwene al'Vere", "Nynaeve al'Meara", "Elayne Trakand", "Moiraine Damodred", "Lan Mandragoran", "Thom Merrilin", "Min Farshaw",
    "Granny Weatherwax", "Nanny Ogg", "Magrat Garlick", "Death (Discworld)", "Susan Sto Helit", "Samuel Vimes", "Carrot Ironfoundersson", "Angua von Überwald", "Cheery Littlebottom", "Lord Vetinari", "Rincewind", "The Luggage", "Moist von Lipwig"
];


// ═══════════════ ROLEPLAY ═══════════════
const RP_TYPES = [
    { n: "Your Strict Dad", p: "strict, caring, overprotective", m: "male" },
    { n: "Your Loving Mom", p: "warm, gentle, supportive", m: "female" },
    { n: "Your Annoying Boss", p: "demanding, arrogant, secretly lonely", m: "male" },
    { n: "Your Cool Manager", p: "professional, encouraging, capable", m: "female" },
    { n: "Your Ex-Boyfriend", p: "nostalgic, regretful, handsome", m: "male" },
    { n: "Your Ex-Girlfriend", p: "complicated, beautiful, distant", m: "female" },
    { n: "Your Hot Neighbor", p: "flirty, outgoing, friendly", m: "male" },
    { n: "Your Shy Neighbor", p: "quiet, observant, sweet", m: "female" },
    { n: "Your Personal Trainer", p: "energetic, pushing, athletic", m: "male" },
    { n: "Your Yoga Instructor", p: "peaceful, flexible, calm", m: "female" },
    { n: "Your Annoying Little Brother", p: "playful, irritating, loyal", m: "male" },
    { n: "Your Sweet Little Sister", p: "innocent, eager, cute", m: "female" },
    { n: "Your Overprotective Big Brother", p: "imposing, caring, strong", m: "male" },
    { n: "Your Bossy Big Sister", p: "authoritative, fashionable, responsible", m: "female" },
    { n: "Your College Professor", p: "intellectual, stern, handsome", m: "male" },
    { n: "Your Academic Advisor", p: "organized, helpful, smart", m: "female" },
    { n: "Your Childhood Best Friend", p: "reliable, comfortable, secretly in love", m: "male" },
    { n: "Your Ride-or-Die Bestie", p: "fun, crazy, supportive", m: "female" },
    { n: "The Coffee Shop Barista", p: "artistic, observant, charming", m: "male" },
    { n: "The Bookstore Owner", p: "quiet, well-read, gentle", m: "female" },
    { n: "Your Arrogant Rival", p: "competitive, proud, secretly respects you", m: "male" },
    { n: "Your Work Nemesis", p: "sharp-tongued, competent, ambitious", m: "female" },
    { n: "Your Secret Admirer", p: "shy, devoted, observant", m: "male" },
    { n: "Your Number One Fan", p: "enthusiastic, supportive, slightly obsessive", m: "female" },
    { n: "Your Grumpy Landlord", p: "complaining, stingy, soft-hearted actually", m: "male" },
    { n: "Your Strict Landlady", p: "rules-focused, clean, surprisingly caring", m: "female" },
    { n: "Your Handsome Doctor", p: "professional, caring, tired", m: "male" },
    { n: "Your Caring Nurse", p: "gentle, overworked, sincere", m: "female" },
    { n: "Your Uber Driver", p: "talkative, street-smart, friendly", m: "male" },
    { n: "Your Flight Attendant", p: "polished, polite, well-traveled", m: "female" },
    { n: "The Bad Boy", p: "rebellious, leather jacket, broken", m: "male" },
    { n: "The Popular Girl", p: "intimidating, beautiful, insecure", m: "female" },
    { n: "Your Step-Dad", p: "trying hard, awkward, supportive", m: "male" },
    { n: "Your Step-Mom", p: "elegant, distant, trying to connect", m: "female" },
    { n: "Your Roommate", p: "messy, fun, boundary-less", m: "male" },
    { n: "Your Perfectionist Roommate", p: "clean, organized, high-strung", m: "female" },
    { n: "The Mafia Boss", p: "dangerous, powerful, possessive", m: "male" },
    { n: "The Heiress", p: "rich, spoiled, lonely", m: "female" },
    { n: "Your Bodyguard", p: "stoic, strong, devoted", m: "male" },
    { n: "Your Assassin", p: "cold, deadly, questioning her orders", m: "female" },
    { n: "Your Butler", p: "flawless, loyal, polite", m: "male" },
    { n: "Your Maid", p: "hardworking, sweet, clumsy", m: "female" },
    { n: "Your Vampire Master", p: "ancient, seductive, thirsty", m: "male" },
    { n: "Your Vampire Mistress", p: "alluring, powerful, dangerous", m: "female" },
    { n: "Your Werewolf Alpha", p: "primal, protective, possessive", m: "male" },
    { n: "Your Witch Friend", p: "mysterious, eccentric, magical", m: "female" },
    { n: "Your CEO Husband", p: "workaholic, cold, secretly soft", m: "male" },
    { n: "Your Arranged Wife", p: "formal, elegant, warming up", m: "female" },
    { n: "The Tech Bro", p: "smart, energetic, crypto-obsessed", m: "male" }
];
// Generate more generic ones to reach 100
for(let i=1; i<=25; i++) {
    RP_TYPES.push({ n: `Random Stranger ${i}`, p: "ordinary person", m: "male" });
    RP_TYPES.push({ n: `Random Acquaintance ${i}`, p: "ordinary person", m: "female" });
}

// ═══════════════ EXECUTION ═══════════════
async function fetchWikiList(tag, list, targetCount = 100) {
    console.log(`\n[WIKI] Tag "${tag}" - checking up to ${list.length} names for ${targetCount} real images...`);
    let results = [];
    for (const name of list) {
        if (results.length >= targetCount) break;
        const w = await wikiGet(name);
        if (w && w.image) {
            const dn = name.replace(/\s*\(.*?\)\s*$/, "");
            results.push({
                name: dn, description: `${dn} from ${tag}`,
                longDescription: w.extract, image: w.image,
                greeting: `Hi, I'm ${dn}.`, personality: "iconic", source: tag
            });
            if (results.length % 10 === 0) console.log(`  Hit ${results.length}/${targetCount}`);
        }
        await new Promise(r => setTimeout(r, 100));
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
        for (let i = 0; i < targetCount; i++) {
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
    } catch(e) { console.log(e); }
    return results;
}

async function seedToDB(tag, chars) {
    const client = await pool.connect();
    let n = 0;
    try {
        await client.query("DELETE FROM characters WHERE tag=$1", [tag]);
        for (let i = 0; i < chars.length; i++) {
            const c = chars[i];
            const id = `${tag.toLowerCase().replace(/[^a-z0-9]/g,"")}-n-${Date.now()}-${i}`;
            await client.query(`INSERT INTO characters (id,name,tag,tags,description,long_description,image,greeting,personality,visibility,source,likes_count,chatter_count) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                [id, c.name.substring(0,100), tag, JSON.stringify([tag]), c.description.substring(0,255), c.longDescription, c.image, c.greeting, c.personality, "public", c.source, Math.floor(Math.random()*2000+100), Math.floor(Math.random()*5000+200)]);
            n++;
        }
        console.log(`  ✅ Re-seeded ${n} for [${tag}]`);
    } catch(e) { console.error(`  ❌`,e.message); }
    finally { client.release(); }
}

async function main() {
    console.log("=== SEEDING PROPER NON-ANIME CONTENT ===\n");
    
    // 1. Manhwa/Webtoons for Manga, BL, GL, Original
    // Korean Webtoons have distinct styles from Japanese Anime
    const manga = await anilistManhwaFetch("Manga", 'countryOfOrigin:"KR",type:MANGA', 100);
    if(manga.length) await seedToDB("Manga", manga);
    
    const bl = await anilistManhwaFetch("BL", 'countryOfOrigin:"KR",tag:"Boys\' Love",type:MANGA', 100);
    if(bl.length) await seedToDB("BL", bl);

    const gl = await anilistManhwaFetch("GL", 'countryOfOrigin:"KR",tag:"Yuri",type:MANGA', 100);
    if(gl.length) await seedToDB("GL", gl);
    
    const orig = await anilistManhwaFetch("Original", 'countryOfOrigin:"KR",type:MANGA', 100);
    if(orig.length) await seedToDB("Original", orig);

    // 2. Wikipedia strict thumbnail fetching
    const movies = await fetchWikiList("Movies", MOVIE_CHARS, 100);
    if (movies.length) await seedToDB("Movies", movies);
    
    const tv = await fetchWikiList("TV", TV_CHARS, 100);
    if (tv.length) await seedToDB("TV", tv);

    const books = await fetchWikiList("Books", BOOK_CHARS, 100);
    if (books.length) await seedToDB("Books", books);

    const game = await fetchWikiList("Game", GAME_CHARS, 100);
    if (game.length) await seedToDB("Game", game);

    // 3. Roleplay (Real Human avatars)
    const rp = await fetchRoleplay(100);
    if (rp.length) await seedToDB("Roleplay", rp);

    console.log("\nDone!");
    process.exit(0);
}

main();
