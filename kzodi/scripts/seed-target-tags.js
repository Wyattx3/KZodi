/**
 * PROPER SEEDER - HIGH QUALITY CHARACTERS FOR ALL NON-ANIME/SPECIAL TAGS
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
                    const badImages = ["Question_book","No_image","Flag_of","Commons-logo","replace_this","Ambox","Text_document","Wiki_letter","Wiktionary","Disambig","Edit-clear", "Blue_pencil", "Padlock", "Gnome-globe"];
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

const MOVIE_CHARS = ["Darth Vader", "Luke Skywalker", "Princess Leia", "Han Solo", "Yoda", "Obi-Wan Kenobi", "Kylo Ren", "Rey", "Chewbacca", "Boba Fett", "Jabba the Hutt", "C-3PO", "R2-D2", "Palpatine", "Padmé Amidala", "Mace Windu", "Qui-Gon Jinn", "Harry Potter", "Hermione Granger", "Ron Weasley", "Lord Voldemort", "Albus Dumbledore", "Severus Snape", "Draco Malfoy", "Sirius Black", "Rubeus Hagrid", "Bellatrix Lestrange", "Neville Longbottom", "Luna Lovegood", "Minerva McGonagall", "Gellert Grindelwald", "Newt Scamander", "Tony Stark", "Steve Rogers", "Thor", "Bruce Banner", "Natasha Romanoff", "Clint Barton", "Peter Parker", "Wanda Maximoff", "Vision", "Stephen Strange", "T'Challa", "Carol Danvers", "Scott Lang", "Bucky Barnes", "Sam Wilson", "Loki", "Thanos", "Nick Fury", "Groot", "Rocket", "Peter Quill", "Gamora", "Drax", "Bruce Wayne", "Clark Kent", "Diana Prince", "Arthur Curry", "Barry Allen", "Victor Stone", "Harley Quinn", "Joker", "Indiana Jones", "James Bond", "Ethan Hunt", "John Wick", "Jason Bourne", "Jack Sparrow", "Neo", "Trinity", "Morpheus", "Agent Smith", "John Rambo", "Rocky Balboa", "Terminator", "Sarah Connor", "Ellen Ripley", "Furiosa", "Mad Max", "Katniss Everdeen", "Peeta Mellark", "Gale Hawthorne", "Effie Trinket", "Haymitch Abernathy", "President Snow", "Lara Croft", "Beatrix Kiddo", "Django Freeman", "Dominic Toretto", "Brian O'Conner", "Lethal Weapon", "John McClane", "Gandalf", "Aragorn", "Frodo Baggins", "Legolas", "Gollum", "Sauron", "Bilbo Baggins", "Samwise Gamgee", "Gimli", "Boromir", "Galadriel", "Elrond", "Saruman", "Thorin Oakenshield", "Smaug", "Vito Corleone", "Michael Corleone", "Tony Montana", "Hannibal Lecter", "Norman Bates", "Jason Voorhees", "Freddy Krueger", "Michael Myers", "Leatherface", "Pennywise", "Ghostface", "Chucky", "Pinhead", "Jigsaw", "Woody", "Buzz Lightyear", "Shrek", "Donkey", "Fiona", "Puss in Boots", "Simba", "Mufasa", "Scar", "Elsa", "Anna", "Olaf", "Moana", "Maui", "Mulan", "Aladdin", "Genie", "Jasmine", "Jafar", "Ariel", "Ursula", "Belle", "Beast", "Gaston", "Snow White", "Evil Queen", "Cinderella", "Maleficent", "Cruella de Vil", "Mary Poppins", "Willy Wonka", "Grinch", "WALL-E", "EVE", "Lightning McQueen", "Mater", "Nemo", "Dory", "Marlin", "Sully", "Mike Wazowski", "Mr. Incredible", "Elastigirl", "Frozone", "Syndrome", "Edna Mode", "Remy", "Carl Fredricksen", "Joy", "Sadness", "Anger", "Bing Bong", "Miguel Rivera", "Hector", "Hiccup", "Toothless", "Po", "Master Shifu", "Tai Lung", "Gru", "Minions", "Megamind", "Forrest Gump", "Tyler Durden", "The Dude", "Travis Bickle", "Patrick Bateman", "Jules Winnfield", "Vincent Vega", "Mia Wallace", "Anton Chigurh", "Daniel Plainview", "Charles Foster Kane", "Rick Blaine", "Ilsa Lund", "Dorothy Gale", "Wicked Witch of the West", "Scarecrow", "Tin Woodman", "Cowardly Lion", "Maximus Decimus Meridius", "William Wallace", "Spartacus", "King Arthur", "Robin Hood", "Zorro", "Tarzan", "Dracula", "Frankenstein's monster", "Godzilla", "King Kong"];
const TV_CHARS = ["Mr. Bean", "Walter White", "Jesse Pinkman", "Saul Goodman", "Gustavo Fring", "Mike Ehrmantraut", "Hank Schrader", "Skyler White", "Kim Wexler", "Chuck McGill", "Lalo Salamanca", "Ignacio Varga", "Jon Snow", "Daenerys Targaryen", "Tyrion Lannister", "Cersei Lannister", "Arya Stark", "Sansa Stark", "Jaime Lannister", "Bran Stark", "Brienne of Tarth", "The Hound", "Joffrey Baratheon", "Ramsay Bolton", "Petyr Baelish", "Varys", "Melisandre", "Margaery Tyrell", "Olenna Tyrell", "Tywin Lannister", "Michael Scott", "Dwight Schrute", "Jim Halpert", "Pam Beesly", "Ryan Howard", "Andy Bernard", "Stanley Hudson", "Kevin Malone", "Angela Martin", "Phyllis Vance", "Kelly Kapoor", "Toby Flenderson", "Creed Bratton", "Darryl Philbin", "Holly Flax", "Jan Levinson", "Rachel Green", "Ross Geller", "Chandler Bing", "Monica Geller", "Joey Tribbiani", "Phoebe Buffay", "Gunther", "Janice Hosenstein", "Richard Burke", "Mike Hannigan", "Sheldon Cooper", "Leonard Hofstadter", "Penny", "Howard Wolowitz", "Raj Koothrappali", "Bernadette Rostenkowski", "Amy Farrah Fowler", "Stuart Bloom", "Homer Simpson", "Bart Simpson", "Lisa Simpson", "Marge Simpson", "Maggie Simpson", "Ned Flanders", "Mr. Burns", "Waylon Smithers", "Seymour Skinner", "Edna Krabappel", "Krusty the Clown", "Apu Nahasapeemapetilon", "Moe Szyslak", "Chief Wiggum", "Ralph Wiggum", "SpongeBob SquarePants", "Patrick Star", "Squidward Tentacles", "Mr. Krabs", "Plankton and Karen", "Sandy Cheeks", "Gary the Snail", "Mrs. Puff", "Pearl Krabs", "Peter Griffin", "Stewie Griffin", "Brian Griffin", "Lois Griffin", "Chris Griffin", "Meg Griffin", "Glenn Quagmire", "Cleveland Brown", "Joe Swanson", "Eric Cartman", "Stan Marsh", "Kyle Broflovski", "Kenny McCormick", "Butters Stotch", "Randy Marsh", "Mr. Garrison", "Chef", "Towelie", "Rick Sanchez", "Morty Smith", "Summer Smith", "Beth Smith", "Jerry Smith", "Mr. Poopybutthole", "Birdperson", "Squanchy", "Bojack Horseman", "Princess Carolyn", "Diane Nguyen", "Mr. Peanutbutter", "Todd Chavez", "Sherlock Holmes", "John Watson", "Jim Moriarty", "Mycroft Holmes", "Irene Adler", "Dexter Morgan", "Debra Morgan", "Harry Morgan", "Rita Bennett", "Vince Masuka", "Angel Batista", "James Doakes", "Maria LaGuerta", "Tony Soprano", "Carmela Soprano", "Christopher Moltisanti", "Paulie Gualtieri", "Silvio Dante", "Big Pussy Bonpensiero", "Junior Soprano", "Dr. Melfi", "Don Draper", "Peggy Olson", "Pete Campbell", "Roger Sterling", "Joan Holloway", "Betty Draper", "Ken Cosgrove", "Harry Crane", "Bert Cooper", "Megan Draper", "Thomas Shelby", "Arthur Shelby", "Polly Gray", "John Shelby", "Ada Shelby", "Grace Shelby", "Alfie Solomons", "Michael Gray", "Ragnar Lothbrok", "Lagertha", "Bjorn Ironside", "Ivar the Boneless", "Floki", "Rollo", "Athelstan", "Geralt of Rivia", "Yennefer of Vengerberg", "Ciri", "Jaskier", "Rick Grimes", "Daryl Dixon", "Michonne", "Carol Peletier", "Maggie Greene", "Glenn Rhee", "Negan", "Carl Grimes", "Morgan Jones", "Ezekiel", "Rosita Espinosa", "Eugene Porter", "Gabriel Stokes", "Aaron", "Paul 'Jesus' Monroe", "Sasha Williams", "Abraham Ford", "Tara Chambler", "Eleven", "Dustin Henderson", "Steve Harrington", "Jim Hopper", "Joyce Byers", "Mike Wheeler", "Will Byers", "Lucas Sinclair", "Nancy Wheeler", "Jonathan Byers", "Max Mayfield", "Billy Hargrove", "Robin Buckley", "Buffy Summers", "Willow Rosenberg", "Xander Harris", "Rupert Giles", "Angel", "Spike", "Cordelia Chase", "Anya Jenkins", "Tara Maclay", "Faith", "Dawn Summers", "Sam Winchester", "Dean Winchester", "Castiel", "Crowley", "Bobby Singer", "Lucifer", "Jack Kline", "Mary Winchester", "John Winchester", "Elena Gilbert", "Damon Salvatore", "Stefan Salvatore", "Caroline Forbes", "Bonnie Bennett", "Matt Donovan", "Alaric Saltzman", "Jeremy Gilbert", "Tyler Lockwood", "Klaus Mikaelson", "Elijah Mikaelson", "Rebekah Mikaelson", "Ted Mosby", "Barney Stinson", "Robin Scherbatsky", "Marshall Eriksen", "Lily Aldrin", "Grogu", "The Mandalorian", "Moff Gideon", "Greef Karga", "Cara Dune", "Kuiil", "IG-11", "Ahsoka Tano", "Bo-Katan Kryze", "Boba Fett", "Fennec Shand", "Homelander", "Billy Butcher", "Hughie Campbell", "Starlight", "Queen Maeve", "A-Train", "The Deep", "Black Noir", "Stormfront", "Soldier Boy", "Lucifer Morningstar", "Chloe Decker", "Amenadiel", "Mazikeen", "Dan Espinoza", "Ella Lopez", "Linda Martin", "Trixie Espinoza", "Villanelle", "Eve Polastri", "Carolyn Martens", "Konstantin Vasiliev", "Fleabag", "The Priest", "Seong Gi-hun", "Cho Sang-woo", "Kang Sae-byeok", "Oh Il-nam", "Jang Deok-su", "Abdul Ali", "Hwang Jun-ho", "Hwang In-ho", "Jinx", "Vi", "Caitlyn", "Jayce", "Viktor", "Ekko", "Heimerdinger", "Silco", "Vander", "Olivia Pope", "Fitzgerald Grant", "Mellie Grant", "Cyrus Beene", "Abby Whelan", "Huck", "Quinn Perkins", "Jake Ballard", "Rowan Pope", "Annalise Keating", "Wes Gibbins", "Connor Walsh", "Michaela Pratt", "Asher Millstone", "Laurel Castillo", "Frank Delfino", "Bonnie Winterbottom", "Nate Lahey", "Oliver Hampton", "Carrie Bradshaw", "Samantha Jones", "Charlotte York Goldenblatt", "Miranda Hobbes", "Mr. Big", "Aidan Shaw", "Joel Miller", "Ellie", "Tommy", "Tess", "Bill", "Frank", "Wednesday Addams", "Gomez Addams", "Morticia Addams", "Pugsley Addams", "Uncle Fester", "Lurch", "Thing", "Cousin Itt", "Wanda Maximoff", "Vision", "Agatha Harkness", "Monica Rambeau", "Darcy Lewis", "Jimmy Woo", "Loki", "Mobius M. Mobius", "Sylvie", "Ravonna Renslayer", "Hunter B-15", "Miss Minutes", "Doctor Who", "Rose Tyler", "Martha Jones", "Donna Noble", "Amy Pond", "Rory Williams", "Clara Oswald", "Bill Potts", "River Song", "Captain Jack Harkness", "The Master", "Dalek", "Cyberman", "Weeping Angel", "Fox Mulder", "Dana Scully", "Walter Skinner", "Cigarette Smoking Man", "The Lone Gunmen", "Jack Bauer", "Chloe O'Brian", "David Palmer", "Tony Almeida", "Michelle Dessler", "James Gandolfini", "Bryan Cranston", "Steve Carell"];
const BOOK_CHARS = ["Sherlock Holmes", "Dr. Watson", "Professor Moriarty", "Irene Adler", "Elizabeth Bennet", "Mr. Darcy", "Jane Bennet", "Charles Bingley", "George Wickham", "Lady Catherine de Bourgh", "Mr. Collins", "Jane Eyre", "Edward Rochester", "Heathcliff", "Catherine Earnshaw", "Jay Gatsby", "Nick Carraway", "Daisy Buchanan", "Tom Buchanan", "Atticus Finch", "Scout Finch", "Jem Finch", "Boo Radley", "Tom Robinson", "Huckleberry Finn", "Tom Sawyer", "Jim", "Widow Douglas", "Oliver Twist", "Fagin", "Artful Dodger", "Bill Sikes", "Nancy", "Mr. Bumble", "Ebenezer Scrooge", "Bob Cratchit", "Tiny Tim", "Jacob Marley", "David Copperfield", "Uriah Heep", "Mr. Micawber", "Miss Havisham", "Philip Pirrip", "Jean Valjean", "Inspector Javert", "Fantine", "Cosette", "Marius Pontmercy", "Éponine", "Thénardiers", "Edmond Dantès", "Fernand Mondego", "Mercédès", "Abbé Faria", "Monsieur Morrel", "Danglars", "Gérard de Villefort", "D'Artagnan", "Athos", "Porthos", "Aramis", "Milady de Winter", "Cardinal Richelieu", "Don Quixote", "Sancho Panza", "Dulcinea del Toboso", "Robinson Crusoe", "Friday", "Gulliver", "Captain Ahab", "Ishmael", "Hester Prynne", "Arthur Dimmesdale", "Romeo", "Juliet", "Hamlet", "Macbeth", "Othello", "Iago", "King Lear", "Prospero", "Shylock", "Portia", "Puck", "Anna Karenina", "Count Vronsky", "Konstantin Levin", "Raskolnikov", "Sonya Marmeladova", "Prince Myshkin", "Alyosha Karamazov", "Ivan Karamazov", "Dmitri Karamazov", "Dracula", "Abraham Van Helsing", "Jonathan Harker", "Mina Harker", "Lucy Westenra", "Renfield", "Frankenstein's monster", "Victor Frankenstein", "Dr. Jekyll", "Mr. Hyde", "Alice", "Mad Hatter", "White Rabbit", "Cheshire Cat", "Queen of Hearts", "Caterpillar", "Tweedledum and Tweedledee", "Peter Pan", "Tinker Bell", "Captain Hook", "Wendy Darling", "Dorothy Gale", "Scarecrow", "Tin Woodman", "Cowardly Lion", "Wicked Witch of the West", "Glinda", "Pinocchio", "Geppetto", "Jiminy Cricket", "Winnie-the-Pooh", "Piglet", "Tigger", "Eeyore", "Rabbit", "Christopher Robin", "Mary Poppins", "Bert", "Katniss Everdeen", "Peeta Mellark", "Gale Hawthorne", "Haymitch Abernathy", "Effie Trinket", "President Snow", "Rue", "Finnick Odair", "Percy Jackson", "Annabeth Chase", "Grover Underwood", "Luke Castellan", "Tyson", "Nico di Angelo", "Thalia Grace", "Geralt of Rivia", "Yennefer of Vengerberg", "Ciri", "Triss Merigold", "Dandelion", "Odysseus", "Achilles", "Hector", "Agamemnon", "Aeneas", "Beowulf", "Grendel", "King Arthur", "Merlin", "Lancelot", "Guinevere", "Gawain", "Morgan le Fay", "Mordred", "Galahad", "Robin Hood", "Little John", "Friar Tuck", "Will Scarlet", "Sheriff of Nottingham", "Maid Marian", "Conan the Barbarian", "Red Sonja", "Paul Atreides", "Lady Jessica", "Duke Leto Atreides", "Baron Vladimir Harkonnen", "Chani", "Duncan Idaho", "Gurney Halleck", "Stilgar", "Alia Atreides", "Ender Wiggin", "Valentine Wiggin", "Peter Wiggin", "Petra Arkanian", "Bean", "Mazer Rackham", "Aslan", "Lucy Pevensie", "Edmund Pevensie", "Peter Pevensie", "Susan Pevensie", "White Witch", "Mr. Tumnus", "Prince Caspian", "Reepicheep", "Mowgli", "Baloo", "Bagheera", "Shere Khan", "Kaa", "Long John Silver", "Jim Hawkins", "Captain Flint", "Dorian Gray", "Lord Henry Wotton", "Basil Hallward", "Phantom of the Opera", "Christine Daaé", "Raoul, Vicomte de Chagny", "Lisbeth Salander", "Mikael Blomkvist", "Hannibal Lecter", "Clarice Starling", "Will Graham", "Little Prince", "Pippi Longstocking", "Matilda Wormwood", "Miss Honey", "Miss Trunchbull", "Willy Wonka", "Charlie Bucket", "James Trotter", "Giant Peach", "BFG", "Sophie", "Grand High Witch", "Jo March", "Meg March", "Beth March", "Amy March", "Theodore 'Laurie' Laurence", "Holden Caulfield", "Phoebe Caulfield", "Tris Prior", "Four", "Kvothe", "Denna", "Auri", "Elodin", "Ambrose Jakis", "Bast", "Kaladin Stormblessed", "Shallan Davar", "Dalinar Kholin", "Adolin Kholin", "Navani Kholin", "Sylphrena", "Pattern", "Szeth-son-son-Vallano", "Taravangian", "Hoid", "Rand al'Thor", "Mat Cauthon", "Perrin Aybara", "Egwene al'Vere", "Nynaeve al'Meara", "Elayne Trakand", "Moiraine Damodred", "Lan Mandragoran", "Thom Merrilin", "Min Farshaw", "Granny Weatherwax", "Nanny Ogg", "Magrat Garlick", "Death", "Susan Sto Helit", "Samuel Vimes", "Carrot Ironfoundersson", "Angua von Überwald", "Cheery Littlebottom", "Lord Vetinari", "Rincewind", "The Luggage", "Moist von Lipwig"];
const GAME_CHARS = ["Mario", "Luigi", "Princess Peach", "Bowser", "Toad", "Yoshi", "Wario", "Waluigi", "Donkey Kong", "Diddy Kong", "Rosalina", "Bowser Jr.", "Boo", "King Boo", "Link", "Princess Zelda", "Ganon", "Impa", "Midna", "Epona", "Tingle", "Pikachu", "Charizard", "Mewtwo", "Pichu", "Jigglypuff", "Lucario", "Greninja", "Meowth", "Ash Ketchum", "Misty", "Brock", "Jessie", "James", "Giovanni", "Professor Oak", "Samus Aran", "Ridley", "Dark Samus", "Kirby", "King Dedede", "Meta Knight", "Bandana Waddle Dee", "Fox McCloud", "Falco Lombardi", "Peppy Hare", "Slippy Toad", "Wolf O'Donnell", "Captain Falcon", "Ness", "Lucas", "Marth", "Roy", "Ike", "Lucina", "Robin", "Chrom", "Corrin", "Byleth", "Edelgard von Hresvelg", "Dimitri Alexandre Blaiddyd", "Claude von Riegan", "Pit", "Palutena", "Dark Pit", "Olimar", "Villager", "Isabelle", "Tom Nook", "K.K. Slider", "Mr. Resetti", "Wii Fit Trainer", "Little Mac", "Mii", "Shulk", "Pyra", "Mythra", "Rex", "Fiora", "Elma", "KOS-MOS", "Pac-Man", "Ms. Pac-Man", "Mega Man", "Zero", "Roll", "Proto Man", "Bass", "Dr. Wily", "Dr. Light", "Ryu", "Ken Masters", "Chun-Li", "Guile", "Dhalsim", "Zangief", "Blanka", "E. Honda", "Balrog", "Vega", "Sagat", "M. Bison", "Akuma", "Cammy", "Juri", "Cloud Strife", "Sephiroth", "Tifa Lockhart", "Aerith Gainsborough", "Barret Wallace", "Red XIII", "Yuffie Kisaragi", "Vincent Valentine", "Cid Highwind", "Zack Fair", "Squall Leonhart", "Rinoa Heartilly", "Zidane Tribal", "Garnet Til Alexandros XVII", "Vivi Ornitier", "Tidus", "Yuna", "Auron", "Rikku", "Lightning", "Noctis Lucis Caelum", "Ignis Scientia", "Gladiolus Amicitia", "Prompto Argentum", "Clive Rosfield", "Solid Snake", "Big Boss", "Revolver Ocelot", "Liquid Snake", "Solidus Snake", "Raiden", "Meryl Silverburgh", "Otacon", "Sniper Wolf", "Psycho Mantis", "Vulcan Raven", "The Boss", "Sonic the Hedgehog", "Miles 'Tails' Prower", "Knuckles the Echidna", "Amy Rose", "Doctor Eggman", "Shadow the Hedgehog", "Rouge the Bat", "Silver the Hedgehog", "Blaze the Cat", "Cream the Rabbit", "Simon Belmont", "Richter Belmont", "Alucard", "Dracula", "Trevor Belmont", "Sypha Belnades", "Grant Danasty", "Bayonetta", "Jeanne", "Joker", "Ryuji Sakamoto", "Ann Takamaki", "Morgana", "Yusuke Kitagawa", "Makoto Niijima", "Futaba Sakura", "Haru Okumura", "Goro Akechi", "Kasumi Yoshizawa", "Yu Narukami", "Yosuke Hanamura", "Chie Satonaka", "Yukiko Amagi", "Kanji Tatsumi", "Rise Kujikawa", "Naoto Shirogane", "Hero", "Slime", "Terry", "Bianca Whitaker", "Nera Briscoletti", "Banjo and Kazooie", "Gruntilda", "Conker the Squirrel", "Terry Bogard", "Mai Shiranui", "Geese Howard", "Kyo Kusanagi", "Iori Yagami", "Kazuya Mishima", "Heihachi Mishima", "Jin Kazama", "Nina Williams", "Paul Phoenix", "Marshall Law", "King", "Yoshimitsu", "Bryan Fury", "Hwoarang", "Xiaoyu", "Scorpion", "Sub-Zero", "Raiden", "Liu Kang", "Johnny Cage", "Sonya Blade", "Kano", "Shang Tsung", "Shao Kahn", "Kitana", "Mileena", "Goro", "Master Chief", "Cortana", "Arbiter", "Marcus Fenix", "Lara Croft", "Nathan Drake", "Chloe Frazer", "Sully", "Joel", "Ellie", "Kratos", "Atreus", "Aloy", "Doomguy", "Duke Nukem", "Gordon Freeman", "Alyx Vance", "G-Man", "Chell", "GLaDOS", "Wheatley", "Tracer", "Winston", "Widowmaker", "Reaper", "Mercy", "Genji", "Hanzo", "D.Va", "Mei", "Zarya", "Sombra", "Doomfist", "Geralt of Rivia", "Yennefer of Vengerberg", "Ciri", "Triss Merigold", "Vesemir", "Commander Shepard", "Garrus Vakarian", "Liara T'Soni", "Tali'Zorah", "Urdnot Wrex", "Illusive Man", "Dovahkiin", "Arthur Morgan", "John Marston", "Dutch van der Linde", "Ezio Auditore da Firenze", "Altaïr Ibn-La'Ahad", "Connor Kenway", "Edward Kenway", "Arno Dorian", "Jacob Frye", "Evie Frye", "Bayek", "Kassandra", "Eivor", "Basim Ibn Ishaq", "Sora", "Riku", "Kairi", "Roxas", "Aqua", "Ventus", "Terra", "Xehanort", "Steve", "Alex", "Creeper", "Enderman", "Ender Dragon"];
const KPOP_CHARS = ["BTS RM", "BTS Jin", "BTS Suga", "BTS J-Hope", "BTS Jimin", "BTS V", "BTS Jungkook", "Blackpink Jisoo", "Blackpink Jennie", "Blackpink Rosé", "Blackpink Lisa", "Twice Nayeon", "Twice Jeongyeon", "Twice Momo", "Twice Sana", "Twice Jihyo", "Twice Mina", "Twice Dahyun", "Twice Chaeyoung", "Twice Tzuyu", "EXO Suho", "EXO Xiumin", "EXO Lay", "EXO Baekhyun", "EXO Chen", "EXO Chanyeol", "EXO D.O.", "EXO Kai", "EXO Sehun", "Red Velvet Irene", "Red Velvet Seulgi", "Red Velvet Wendy", "Red Velvet Joy", "Red Velvet Yeri", "Seventeen S.Coups", "Seventeen Jeonghan", "Seventeen Joshua", "Seventeen Jun", "Seventeen Hoshi", "Seventeen Wonwoo", "Seventeen Woozi", "Seventeen The8", "Seventeen Mingyu", "Seventeen DK", "Seventeen Seungkwan", "Seventeen Vernon", "Seventeen Dino", "Stray Kids Bang Chan", "Stray Kids Lee Know", "Stray Kids Changbin", "Stray Kids Hyunjin", "Stray Kids Han", "Stray Kids Felix", "Stray Kids Seungmin", "Stray Kids I.N", "NCT Taeyong", "NCT Taeil", "NCT Johnny", "NCT Yuta", "NCT Doyoung", "NCT Ten", "NCT Jaehyun", "NCT Winwin", "NCT Mark", "NCT Renjun", "NCT Jeno", "NCT Haechan", "NCT Jaemin", "NCT Chenle", "NCT Jisung", "ITZY Yeji", "ITZY Lia", "ITZY Ryujin", "ITZY Chaeryeong", "ITZY Yuna", "TXT Yeonjun", "TXT Soobin", "TXT Beomgyu", "TXT Taehyun", "TXT Hueningkai", "Aespa Karina", "Aespa Giselle", "Aespa Winter", "Aespa Ningning", "IVE Yujin", "IVE Gaeul", "IVE Rei", "IVE Wonyoung", "IVE Liz", "IVE Leeseo", "Enhypen Jungwon", "Enhypen Heeseung", "Enhypen Jay", "Enhypen Jake", "Enhypen Sunghoon", "Enhypen Sunoo", "Enhypen Ni-ki", "NewJeans Minji", "NewJeans Hanni", "NewJeans Danielle", "NewJeans Haerin", "NewJeans Hyein", "Le Sserafim Sakura", "Le Sserafim Kim Chaewon", "Le Sserafim Huh Yunjin", "Le Sserafim Kazuha", "Le Sserafim Hong Eunchae", "BIGBANG G-Dragon", "BIGBANG Taeyang", "BIGBANG Daesung", "Girls' Generation Taeyeon", "Girls' Generation Sunny", "Girls' Generation Tiffany", "Girls' Generation Hyoyeon", "Girls' Generation Yuri", "Girls' Generation Sooyoung", "Girls' Generation Yoona", "Girls' Generation Seohyun", "SHINee Onew", "SHINee Key", "SHINee Minho", "SHINee Taemin", "IU (singer)"];
const VTUBER_CHARS = ["Gawr Gura", "Mori Calliope", "Watson Amelia", "Takanashi Kiara", "Ninomae Ina'nis", "IRyS", "Ceres Fauna", "Ouro Kronii", "Nanashi Mumei", "Hakos Baelz", "Shiori Novella", "Koseki Bijou", "Nerissa Ravencroft", "Fuwawa Abyssgard", "Mococo Abyssgard", "Shirakami Fubuki", "Tokino Sora", "Hoshimachi Suisei", "Usada Pekora", "Houshou Marine", "Minato Aqua", "Inugami Korone", "Nekomata Okayu", "Shirogane Noel", "Shiranui Flare", "Amane Kanata", "Tsunomaki Watame", "Tokoyami Towa", "Sakura Miko", "Oozora Subaru", "Natsuiro Matsuri", "Aki Rosenthal", "Yozora Mel", "Robocosan", "AZKi", "Nakiri Ayame", "Yuzuki Choco", "Murasaki Shion", "Uruha Rushia", "Kiryu Coco", "Yukihana Lamy", "Momosuzu Nene", "Shishiro Botan", "Omaru Polka", "La+ Darknesss", "Takane Lui", "Hakui Koyori", "Sakamata Chloe", "Kazama Iroha", "Kizuna AI", "Kaguya Luna", "Mirai Akari", "Siro (VTuber)", "Nekomiya Hinata", "Ironmouse", "Nyanners", "Veibae", "Silvervale", "Zentreya", "Project Melody", "Apricot (VTuber)", "Kson", "Vshojo", "Nijisanji En", "Vox Akuma", "Mysta Rias", "Luca Kaneshiro", "Ike Eveland", "Shu Yamino", "Elira Pendora", "Pomu Rainpuff", "Finana Ryugu", "Selen Tatsuki", "Rosemi Lovelock", "Petra Gurin", "Enna Alouette", "Millie Parfait", "Reimu Endou", "Nina Kosaka", "Mika Melatika", "Oliver Evans", "Kanae (VTuber)", "Kuzuha (VTuber)", "Hyakumantenbara Salome", "Tsukino Mito", "Higuchi Kaede", "Shizuka Rin", "Honma Himawari", "Sasaki Saku", "Shiina Yuika", "Kuzuha", "Kanae", "Kenmochi Toya", "Fushimi Gaku", "Kagami Hayato", "Fuwa Minato", "Shellin Burgundy", "Mayuzumi Kai", "Gwelu Os Gar", "Shirayuki Tomoe", "Naraka (VTuber)", "Mashiro (VTuber)", "Melissa Kinrenka", "Ibrahim (VTuber)", "Amamiya Kokoro", "Ratna Petit", "Eli Conifer", "Lize Helesta", "Ange Katrina", "Ars Almal", "Aiba Ui", "Debidebi Debiru"];
const HISTORY_CHARS = ["Alexander the Great", "Julius Caesar", "Cleopatra", "Augustus", "Nero", "Marcus Aurelius", "Constantine the Great", "Genghis Khan", "Kublai Khan", "Charlemagne", "Joan of Arc", "William the Conqueror", "Richard the Lionheart", "Saladin", "Marco Polo", "Christopher Columbus", "Ferdinand Magellan", "Vasco da Gama", "Hernán Cortés", "Francisco Pizarro", "Montezuma II", "Atahualpa", "Leonardo da Vinci", "Michelangelo", "Raphael", "Donatello", "Galileo Galilei", "Nicolaus Copernicus", "Johannes Kepler", "Isaac Newton", "Queen Elizabeth I", "King Henry VIII", "Mary, Queen of Scots", "William Shakespeare", "George Washington", "Thomas Jefferson", "Benjamin Franklin", "Alexander Hamilton", "John Adams", "James Madison", "Abraham Lincoln", "Ulysses S. Grant", "Robert E. Lee", "Thomas Edison", "Nikola Tesla", "Albert Einstein", "Marie Curie", "Charles Darwin", "Sigmund Freud", "Karl Marx", "Vladimir Lenin", "Joseph Stalin", "Winston Churchill", "Franklin D. Roosevelt", "Adolf Hitler", "Benito Mussolini", "Hideki Tojo", "Harry S. Truman", "Dwight D. Eisenhower", "John F. Kennedy", "Richard Nixon", "Ronald Reagan", "Mikhail Gorbachev", "Nelson Mandela", "Mahatma Gandhi", "Jawaharlal Nehru", "Martin Luther King Jr.", "Malcolm X", "Rosa Parks", "Muhammad Ali", "Queen Victoria", "Napoleon Bonaparte", "Louis XIV", "Marie Antoinette", "Catherine the Great", "Peter the Great", "Ivan the Terrible", "Otto von Bismarck", "Simon Bolivar", "Jose de San Martin", "George S. Patton", "Douglas MacArthur", "Erwin Rommel", "Bernard Montgomery", "Sun Tzu", "Confucius", "Laozi", "Qin Shi Huang", "Wu Zetian", "Zhuge Liang", "Cao Cao", "Liu Bei", "Guan Yu", "Zhang Fei", "Lu Bu", "Diaochan", "Oda Nobunaga", "Toyotomi Hideyoshi", "Tokugawa Ieyasu", "Miyamoto Musashi", "Hattori Hanzo", "Sakamoto Ryoma", "Saigo Takamori", "Florence Nightingale", "Clara Barton", "Susan B. Anthony", "Elizabeth Cady Stanton", "Harriet Tubman", "Sojourner Truth", "Amelia Earhart", "Wright brothers", "Henry Ford", "Alexander Graham Bell"];
const MYTHOLOGY_CHARS = ["Zeus", "Hera", "Poseidon", "Demeter", "Ares", "Athena", "Apollo", "Artemis", "Hephaestus", "Aphrodite", "Hermes", "Dionysus", "Hades", "Persephone", "Hestia", "Heracles", "Perseus", "Theseus", "Bellerophon", "Orpheus", "Achilles", "Hector", "Odysseus", "Aeneas", "Jason", "Medusa", "Minotaur", "Cerberus", "Chimera", "Hydra", "Pegasus", "Griffin", "Centaur", "Satyr", "Nymph", "Siren", "Harpy", "Gorgon", "Cyclops", "Titan", "Cronus", "Rhea", "Atlas", "Prometheus", "Epimetheus", "Pandora", "Odin", "Thor", "Loki", "Frigg", "Freyja", "Freyr", "Tyr", "Heimdallr", "Baldr", "Hodr", "Vidar", "Vili and Ve", "Njord", "Skadi", "Idunn", "Bragi", "Hel", "Fenrir", "Jormungandr", "Sleipnir", "Valkyrie", "Norns", "Yggdrasil", "Frost giant", "Fire giant", "Light elf", "Dark elf", "Dwarf", "Ra", "Osiris", "Isis", "Horus", "Seth", "Nephthys", "Anubis", "Thoth", "Ptah", "Hathor", "Sekhmet", "Bastet", "Sobek", "Amun", "Mut", "Khonsu", "Nut", "Geb", "Shu", "Tefnut", "Apophis", "Sphinx", "Phoenix", "Gilgamesh", "Enkidu", "Ishtar", "Marduk", "Tiamat", "Enlil", "Anu", "Ea", "Amaterasu", "Susanoo-no-Mikoto", "Tsukuyomi-no-Mikoto", "Izanagi", "Izanami", "Raijin", "Fujin", "Inari Okami", "Hachiman", "Tenjin", "Kitsune", "Tanuki", "Tengu", "Kappa", "Oni", "Yuki-onna", "Brahma", "Vishnu", "Shiva", "Saraswati", "Lakshmi", "Parvati", "Ganesha", "Kartikeya", "Hanuman", "Rama", "Krishna", "Durga", "Kali", "Indra", "Agni", "Surya", "Varuna", "Yama"];
const PHILOSOPHY_CHARS = ["Socrates", "Plato", "Aristotle", "Pythagoras", "Heraclitus", "Parmenides", "Zeno of Elea", "Empedocles", "Anaxagoras", "Democritus", "Protagoras", "Gorgias", "Diogenes", "Epicurus", "Zeno of Citium", "Epictetus", "Marcus Aurelius", "Seneca the Younger", "Cicero", "Lucretius", "Plotinus", "Augustine of Hippo", "Boethius", "Avicenna", "Averroes", "Maimonides", "Thomas Aquinas", "Duns Scotus", "William of Ockham", "Niccolò Machiavelli", "Thomas More", "Francis Bacon", "Thomas Hobbes", "René Descartes", "Baruch Spinoza", "Gottfried Wilhelm Leibniz", "John Locke", "George Berkeley", "David Hume", "Immanuel Kant", "Johann Gottlieb Fichte", "Friedrich Wilhelm Joseph Schelling", "Georg Wilhelm Friedrich Hegel", "Arthur Schopenhauer", "Søren Kierkegaard", "Karl Marx", "Friedrich Engels", "John Stuart Mill", "Charles Sanders Peirce", "William James", "John Dewey", "Friedrich Nietzsche", "Edmund Husserl", "Henri Bergson", "Bertrand Russell", "G. E. Moore", "Ludwig Wittgenstein", "Martin Heidegger", "Jean-Paul Sartre", "Simone de Beauvoir", "Albert Camus", "Maurice Merleau-Ponty", "Karl Popper", "Thomas Kuhn", "Willard Van Orman Quine", "John Rawls", "Michel Foucault", "Jacques Derrida", "Gilles Deleuze", "Jean-François Lyotard", "Jean Baudrillard", "Jürgen Habermas", "Hannah Arendt", "Theodor W. Adorno", "Max Horkheimer", "Walter Benjamin", "Herbert Marcuse", "Erich Fromm", "Roland Barthes", "Jacques Lacan", "Louis Althusser", "Alain Badiou", "Slavoj Žižek", "Judith Butler", "Peter Singer", "Martha Nussbaum", "Laozi", "Confucius", "Zhuangzi", "Mozi", "Mencius", "Xunzi", "Han Feizi", "Sun Tzu", "Siddhartha Gautama", "Nagarjuna", "Vasubandhu", "Dignaga", "Dharmakirti", "Zhiyi", "Fazang", "Dogen", "Hakuin Ekaku", "Kukai", "Shinran", "Nichiren", "Bankei Yotaku", "Morihei Ueshiba"];
const CELEB_CHARS = ["Tom Cruise", "Brad Pitt", "Leonardo DiCaprio", "Johnny Depp", "Will Smith", "Dwayne Johnson", "Chris Hemsworth", "Chris Evans (actor)", "Robert Downey Jr.", "Scarlett Johansson", "Angelina Jolie", "Jennifer Lawrence", "Emma Watson", "Natalie Portman", "Anne Hathaway", "Meryl Streep", "Tom Hanks", "Denzel Washington", "Morgan Freeman", "Samuel L. Jackson", "Harrison Ford", "Al Pacino", "Robert De Niro", "Jack Nicholson", "Clint Eastwood", "Arnold Schwarzenegger", "Sylvester Stallone", "Keanu Reeves", "Matt Damon", "Ben Affleck", "George Clooney", "Hugh Jackman", "Ryan Reynolds", "Ryan Gosling", "Christian Bale", "Matthew McConaughey", "Joaquin Phoenix", "Taylor Swift", "Beyoncé", "Rihanna", "Adele", "Lady Gaga", "Katy Perry", "Ariana Grande", "Selena Gomez", "Justin Bieber", "Ed Sheeran", "Bruno Mars", "The Weeknd", "Drake (musician)", "Eminem", "Kanye West", "Jay-Z", "Snoop Dogg", "Tupac Shakur", "The Notorious B.I.G.", "Michael Jackson", "Prince (musician)", "Madonna", "Whitney Houston", "Mariah Carey", "Celine Dion", "Elton John", "Paul McCartney", "John Lennon", "Mick Jagger", "Freddie Mercury", "David Bowie", "Elvis Presley", "Frank Sinatra", "Bob Dylan", "Bruce Springsteen", "Johnny Cash", "Stevie Wonder", "James Brown", "Aretha Franklin", "Ray Charles", "Marvin Gaye", "Bob Marley", "Jimi Hendrix", "Eric Clapton", "Jimmy Page", "Kurt Cobain", "Axl Rose", "Slash (musician)", "Steven Tyler", "Jon Bon Jovi", "Bruce Dickinson", "Ozzy Osbourne", "James Hetfield", "Dave Grohl", "Anthony Kiedis", "Flea (musician)", "Bono", "Chris Martin", "Thom Yorke", "Liam Gallagher", "Noel Gallagher", "Billie Eilish", "Dua Lipa", "Harry Styles", "Post Malone", "Shakira", "Jennifer Lopez", "Miley Cyrus", "Zendaya", "Timothée Chalamet", "Tom Holland", "Margot Robbie", "Florence Pugh", "Pedro Pascal", "Jason Momoa", "Gal Gadot", "Chadwick Boseman", "Cillian Murphy", "Ana de Armas"];

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
for(let i=1; i<=51; i++) {
    RP_TYPES.push({ n: `Random Stranger ${i}`, p: "ordinary person", m: "male" });
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
                name: dn, description: `${dn} (${tag})`,
                longDescription: w.extract, image: w.image,
                greeting: `Hi, I'm ${dn}.`, personality: "iconic", source: tag
            });
            if (results.length % 10 === 0) console.log(`  Hit ${results.length}/${targetCount}`);
        }
        await new Promise(r => setTimeout(r, 800)); // anti-spam
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
            const tagsArr = tag === "Manga" || tag === "BL" || tag === "GL" || tag === "Original" ? [tag] : [tag];
            await client.query(`INSERT INTO characters (id,name,tag,tags,description,long_description,image,greeting,personality,visibility,source,likes_count,chatter_count) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                [id, c.name.substring(0,100), tag, JSON.stringify(tagsArr), c.description.substring(0,255), c.longDescription, c.image, c.greeting, c.personality, "public", c.source, Math.floor(Math.random()*2000+100), Math.floor(Math.random()*5000+200)]);
            n++;
        }
        console.log(`  ✅ Re-seeded ${n} for [${tag}]`);
    } catch(e) { console.error(`  ❌`,e.message); }
    finally { client.release(); }
}

async function main() {
    console.log("=== SEEDING HIGH-QUALITY CHARACTERS ===\n");
    
    // 1. Manhwa/Webtoons for Manga, BL, GL, Original
    const manga = await anilistManhwaFetch("Manga", 'countryOfOrigin:"KR",type:MANGA', 100);
    if(manga.length) await seedToDB("Manga", manga);
    
    const bl = await anilistManhwaFetch("BL", 'countryOfOrigin:"KR",tag:"Boys Love",type:MANGA', 100);
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

    const kpop = await fetchWikiList("K-pop", KPOP_CHARS, 100);
    if (kpop.length) await seedToDB("K-pop", kpop);

    const vtuber = await fetchWikiList("VTuber", VTUBER_CHARS, 100);
    if (vtuber.length) await seedToDB("VTuber", vtuber);

    const history = await fetchWikiList("History", HISTORY_CHARS, 100);
    if (history.length) await seedToDB("History", history);

    const myth = await fetchWikiList("Mythology", MYTHOLOGY_CHARS, 100);
    if (myth.length) await seedToDB("Mythology", myth);

    const philosophy = await fetchWikiList("Philosophy", PHILOSOPHY_CHARS, 100);
    if (philosophy.length) await seedToDB("Philosophy", philosophy);

    const celeb = await fetchWikiList("Celebrity", CELEB_CHARS, 100);
    if (celeb.length) await seedToDB("Celebrity", celeb);

    // 3. Roleplay (Real Human avatars)
    const rp = await fetchRoleplay(100);
    if (rp.length) await seedToDB("Roleplay", rp);

    console.log("\nDone!");
    process.exit(0);
}

main();
