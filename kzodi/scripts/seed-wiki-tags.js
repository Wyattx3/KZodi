/**
 * SEED REAL-WORLD TAGS
 * Uses Node.js https module (not fetch) to query Wikipedia for photos.
 * Hardcoded name lists — no LLM, no AniList.
 * 
 * Run: node scripts/seed-wiki-tags.js
 */
const https = require("https");
const { Pool } = require("pg");
require("dotenv").config();

const DATABASE_URL = (process.env.DATABASE_URL || "").replace(/[?&]sslmode=[^&]*/g, "");
const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

// ── Wikipedia photo fetcher using https module ──
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
                    if (thumb.includes("Question_book") || thumb.includes("No_image") || thumb.includes("Flag_of") || thumb.includes("replace_this")) return resolve(null);
                    resolve({ image: thumb, extract: (pg.extract || "").substring(0, 800) });
                } catch {
                    resolve(null);
                }
            });
        }).on("error", () => resolve(null));
    });
}

// ── HARDCODED NAME LISTS ──
const TAGS = {
    "K-pop": [
        "Kim Taehyung","Jimin","Jungkook","RM (rapper)","Suga (rapper)","J-Hope","Jin (singer)",
        "Lisa (rapper)","Jennie (singer)","Rosé (singer)","Jisoo (singer)",
        "Nayeon","Jihyo","Momo (singer)","Sana (singer)","Mina (singer)","Dahyun","Chaeyoung","Tzuyu",
        "Baekhyun","Chanyeol","Kai (singer)","D.O. (singer)","Sehun","Suho (singer)",
        "Karina (singer)","Winter (singer)","Giselle (singer)","Ningning",
        "Yeji (singer)","Lia (singer)","Ryujin","Chaeryeong","Yuna (singer, born 2003)",
        "Bang Chan","Lee Know","Changbin","Hyunjin (singer)","Han (singer)","Felix (singer)","Seungmin (singer)","I.N (singer)",
        "S.Coups","Jeonghan","Joshua (singer)","Jun (singer)","Hoshi (singer)","Wonwoo","Woozi","DK (singer)","Mingyu (singer)","The8","Seungkwan","Vernon (singer)","Dino (singer)",
        "Irene (singer)","Seulgi","Wendy (singer)","Joy (singer)","Yeri (singer)",
        "Taeyeon","Tiffany Young","Yoona","Sooyoung (singer)","Hyoyeon",
        "IU (singer)","Sunmi","HyunA","Chungha","Hwasa",
        "G-Dragon","Taeyang (singer)","T.O.P (rapper)","CL (singer)",
        "Zico (rapper)","Jay Park","Rain (entertainer)","PSY",
        "Jeon Somi","Wonyoung","Yujin (singer, born 2003)","Sakura Miyawaki","Kim Chaewon (singer, born 2000)",
        "Kazuha (singer)","Huh Yunjin","Hong Eunchae",
        "Taeyong","Mark Lee (singer)","Jaehyun (singer)","Doyoung","Jungwoo (singer)","Haechan",
        "Moonbyul","Solar (singer)","Wheein",
        "Heechul","Leeteuk","Yesung","Donghae","Eunhyuk",
        "Minho (singer)","Taemin","Key (singer)","Onew",
        "Jackson Wang","Mark Tuan","BamBam (singer)","Yugyeom",
        "Sunghoon (singer)","Jake (singer)","Heeseung","Jay (singer, born 2002)","Jungwon","Ni-ki","Sunoo",
        "Miyeon","Minnie (singer)","Soyeon (singer, born 1998)","Yuqi","Shuhua",
        "Yeonjun","Soobin (singer)","Beomgyu","Taehyun (singer)","Hueningkai",
        "Eric Nam","Dean (South Korean singer)","Crush (singer)","Heize","Lee Hi",
        "BoA"
    ],
    "History": [
        "Julius Caesar","Alexander the Great","Cleopatra","Napoleon Bonaparte","Genghis Khan",
        "Queen Victoria","Abraham Lincoln","George Washington","Winston Churchill","Nelson Mandela",
        "Mahatma Gandhi","Martin Luther King Jr.","John F. Kennedy","Franklin D. Roosevelt","Theodore Roosevelt",
        "Queen Elizabeth II","Catherine the Great","Peter the Great","Charlemagne","Attila",
        "Sun Tzu","Qin Shi Huang","Mao Zedong","Tokugawa Ieyasu",
        "Oda Nobunaga","Toyotomi Hideyoshi","Akbar","Ashoka",
        "Suleiman the Magnificent","Saladin","Richard I of England","William the Conqueror",
        "Henry VIII","Elizabeth I","Mary, Queen of Scots","Louis XIV","Marie Antoinette",
        "Otto von Bismarck","Frederick the Great","Charles V, Holy Roman Emperor",
        "Ivan the Terrible","Vladimir Lenin","Joseph Stalin",
        "Fidel Castro","Che Guevara","Simón Bolívar","Thomas Jefferson","Benjamin Franklin",
        "Ulysses S. Grant","Dwight D. Eisenhower","Harry S. Truman",
        "Ronald Reagan","Margaret Thatcher","Charles de Gaulle",
        "Jawaharlal Nehru","Indira Gandhi","Aung San Suu Kyi","Ho Chi Minh",
        "Gamal Abdel Nasser","Haile Selassie","Kwame Nkrumah",
        "King Sejong the Great","Yi Sun-sin","Empress Wu Zetian","Kangxi Emperor",
        "Cyrus the Great","Darius the Great","Tutankhamun","Ramesses II",
        "Hannibal Barca","Augustus","Marcus Aurelius","Constantine the Great",
        "Justinian I","Mehmed the Conqueror","Sitting Bull",
        "Pocahontas","Harriet Tubman","Frederick Douglass",
        "Joan of Arc","Florence Nightingale","Emmeline Pankhurst","Rosa Parks",
        "Nefertiti","Hatshepsut","Boudicca",
        "Tamerlane","Babur","Thutmose III","Leonidas I",
        "Xerxes I","Philip II of Spain","Andrew Jackson",
        "Robert E. Lee","Robespierre","Sojourner Truth","Clara Barton",
        "Sacagawea","Geronimo","Shaka Zulu","Jomo Kenyatta",
        "Seondeok of Silla","Zenobia"
    ],
    "Celebrity": [
        "Leonardo DiCaprio","Brad Pitt","Angelina Jolie","Tom Hanks","Meryl Streep",
        "Robert Downey Jr.","Scarlett Johansson","Chris Hemsworth","Dwayne Johnson","Ryan Reynolds",
        "Will Smith","Johnny Depp","Tom Cruise","Keanu Reeves","Morgan Freeman",
        "Beyoncé","Taylor Swift","Rihanna","Lady Gaga","Ariana Grande",
        "Billie Eilish","Drake (musician)","Kanye West","Ed Sheeran","Justin Bieber",
        "Selena Gomez","Zendaya","Timothée Chalamet","Florence Pugh","Ana de Armas",
        "Jennifer Lawrence","Emma Stone","Margot Robbie","Gal Gadot","Chris Evans",
        "Chris Pratt","Tom Holland","Robert Pattinson","Pedro Pascal",
        "Elon Musk","Jeff Bezos","Mark Zuckerberg","Bill Gates","Oprah Winfrey",
        "Kim Kardashian","Kylie Jenner","David Beckham","Cristiano Ronaldo",
        "Lionel Messi","LeBron James","Serena Williams","Michael Jordan",
        "Stephen Curry","Neymar","Roger Federer","Usain Bolt","Muhammad Ali",
        "Marilyn Monroe","Elvis Presley","Michael Jackson","Madonna (entertainer)","Whitney Houston",
        "Freddie Mercury","David Bowie","Prince (musician)","Aretha Franklin",
        "Tupac Shakur","The Notorious B.I.G.","Eminem","Snoop Dogg",
        "Adele","Dua Lipa","Harry Styles","Olivia Rodrigo",
        "Cardi B","Nicki Minaj","Post Malone","The Weeknd",
        "Shakira","Jennifer Lopez","Miley Cyrus","Katy Perry","Bruno Mars",
        "Kendrick Lamar","J. Cole",
        "Michelle Obama","Malala Yousafzai","Greta Thunberg","Emma Watson","Natalie Portman",
        "Halle Berry","Sandra Bullock","Julia Roberts","Nicole Kidman","Cate Blanchett",
        "Joaquin Phoenix","Christian Bale","Matt Damon","Ben Affleck","Oscar Isaac",
        "Doja Cat","SZA","Bad Bunny","Rosalía","Ice Spice",
        "Megan Thee Stallion","Lil Nas X","Travis Scott"
    ],
    "Movies": [
        "Harrison Ford","Steven Spielberg","Martin Scorsese","Quentin Tarantino","Christopher Nolan",
        "Alfred Hitchcock","Stanley Kubrick","James Cameron","Ridley Scott","Francis Ford Coppola",
        "Clint Eastwood","Al Pacino","Robert De Niro","Jack Nicholson","Marlon Brando",
        "Audrey Hepburn","Grace Kelly","Humphrey Bogart","Cary Grant","James Dean",
        "Bruce Lee","Jackie Chan","Jet Li","Michelle Yeoh","Donnie Yen",
        "Arnold Schwarzenegger","Sylvester Stallone","Bruce Willis","Jean-Claude Van Damme","Chuck Norris",
        "Samuel L. Jackson","Denzel Washington","Jamie Foxx","Forest Whitaker",
        "Kate Winslet","Charlize Theron",
        "Heath Ledger","Jake Gyllenhaal","Ryan Gosling","Jared Leto",
        "Hayao Miyazaki","Akira Kurosawa","Bong Joon-ho","Park Chan-wook","Wong Kar-wai",
        "Guillermo del Toro","Alfonso Cuarón","Denis Villeneuve","David Fincher","Wes Anderson",
        "Tim Burton","David Lynch","Kathryn Bigelow","Sofia Coppola",
        "Greta Gerwig","Jordan Peele","Chloé Zhao",
        "Viola Davis","Lupita Nyong'o","Saoirse Ronan","Tilda Swinton","Glenn Close",
        "Anthony Hopkins","Ian McKellen","Patrick Stewart","Michael Caine","Gary Oldman",
        "Daniel Day-Lewis","Sean Connery","Dustin Hoffman","Robin Williams",
        "Jim Carrey","Eddie Murphy","Adam Sandler",
        "Toshiro Mifune","Zhang Ziyi","Gong Li","Tony Leung Chiu-wai","Chow Yun-fat",
        "Shah Rukh Khan","Amitabh Bachchan","Aamir Khan","Priyanka Chopra","Deepika Padukone",
        "Mads Mikkelsen","Austin Butler","Anya Taylor-Joy","Sydney Sweeney",
        "Jason Momoa","Henry Cavill","Daniel Craig","Idris Elba","Tom Hardy",
        "Rachel McAdams","Anne Hathaway","Reese Witherspoon","Drew Barrymore","Cameron Diaz",
        "Amy Adams","Gene Hackman","Robert Eggers","Ari Aster","Terrence Malick"
    ],
    "TV": [
        "Bryan Cranston","Aaron Paul","Kit Harington","Emilia Clarke","Peter Dinklage",
        "Millie Bobby Brown","Winona Ryder","David Harbour","Jenna Ortega",
        "Henry Cavill","Jennifer Aniston","Courteney Cox","Lisa Kudrow",
        "Steve Carell","John Krasinski","Rainn Wilson","Mindy Kaling",
        "Jon Hamm","Elisabeth Moss","January Jones",
        "Ian Somerhalder","Nina Dobrev","Paul Wesley",
        "Sarah Michelle Gellar","David Boreanaz","Alyson Hannigan",
        "Jensen Ackles","Jared Padalecki","Misha Collins",
        "Benedict Cumberbatch","Martin Freeman","Andrew Scott (actor)",
        "Hugh Laurie","Robert Sean Leonard",
        "Evan Peters","Sarah Paulson","Jessica Lange","Angela Bassett","Kathy Bates",
        "Bob Odenkirk","Rhea Seehorn","Jonathan Banks","Giancarlo Esposito",
        "Pedro Pascal","Bella Ramsey","Nick Offerman",
        "Aubrey Plaza","Amy Poehler","Rashida Jones","Aziz Ansari",
        "Donald Glover","Alison Brie","Ken Jeong",
        "Zendaya","Hunter Schafer",
        "Jason Sudeikis","Brett Goldstein","Hannah Waddingham","Juno Temple",
        "Oscar Isaac","Ethan Hawke","Kaley Cuoco",
        "Jim Parsons","Johnny Galecki","Simon Helberg","Kunal Nayyar",
        "Kerry Washington","Tony Goldwyn",
        "Claire Danes","Damian Lewis","Mandy Patinkin",
        "Norman Reedus","Andrew Lincoln","Melissa McBride","Lauren Cohan","Danai Gurira",
        "Tatiana Maslany","Christina Hendricks",
        "Sophie Turner","Maisie Williams","Nikolaj Coster-Waldau","Lena Headey",
        "Idris Elba","Gillian Anderson","David Duchovny",
        "Michael B. Jordan","Chadwick Boseman",
        "Viola Davis","Kerry Washington","Sandra Oh",
        "Penn Badgley","Elizabeth Debicki","Matt Smith (actor)",
        "Pedro Alonso","Álvaro Morte","Úrsula Corberó",
        "Diego Luna","Ewan McGregor","Rosario Dawson",
        "Timothy Olyphant","Walton Goggins","Ella Purnell",
        "Ke Huy Quan","Stephanie Hsu","Jamie Lee Curtis"
    ],
    "Books": [
        "William Shakespeare","Jane Austen","Charles Dickens","Mark Twain","Leo Tolstoy",
        "Fyodor Dostoevsky","Ernest Hemingway","F. Scott Fitzgerald","Virginia Woolf","James Joyce",
        "Oscar Wilde","Edgar Allan Poe","Emily Dickinson","Walt Whitman","Robert Frost",
        "George Orwell","Aldous Huxley","Ray Bradbury","Isaac Asimov","Arthur C. Clarke",
        "J. R. R. Tolkien","C. S. Lewis","George R. R. Martin","J. K. Rowling","Stephen King",
        "Agatha Christie","Arthur Conan Doyle","Dan Brown","John Grisham","Michael Crichton",
        "Haruki Murakami","Gabriel García Márquez","Paulo Coelho","Umberto Eco",
        "Franz Kafka","Albert Camus","Jean-Paul Sartre","Simone de Beauvoir",
        "Homer","Virgil","Dante Alighieri","Miguel de Cervantes","Victor Hugo",
        "Alexandre Dumas","Gustave Flaubert","Marcel Proust","Antoine de Saint-Exupéry",
        "Hermann Hesse","Thomas Mann","Milan Kundera","Aleksandr Solzhenitsyn",
        "Chinua Achebe","Wole Soyinka","Toni Morrison","Maya Angelou","Langston Hughes",
        "Ralph Waldo Emerson","Henry David Thoreau","Herman Melville","Nathaniel Hawthorne","Louisa May Alcott",
        "Charlotte Brontë","Emily Brontë","Mary Shelley","Bram Stoker","H. G. Wells",
        "Jules Verne","Robert Louis Stevenson","Rudyard Kipling","Joseph Conrad",
        "Jorge Luis Borges","Octavio Paz","Pablo Neruda","Isabel Allende","Mario Vargas Llosa",
        "Margaret Atwood","Ursula K. Le Guin","Octavia E. Butler","Philip K. Dick","Kurt Vonnegut",
        "Alice Walker","James Baldwin",
        "Neil Gaiman","Terry Pratchett","Brandon Sanderson","Patrick Rothfuss",
        "Kazuo Ishiguro","Salman Rushdie","Arundhati Roy","Chimamanda Ngozi Adichie","Khaled Hosseini",
        "Roald Dahl","Dr. Seuss","Lewis Carroll","Beatrix Potter","Hans Christian Andersen",
        "Aesop","Ovid","Rumi",
        "Omar Khayyám","Kahlil Gibran","Rabindranath Tagore","Natsume Sōseki","Lu Xun",
        "Italo Calvino","Robin Hobb","Zora Neale Hurston","Richard Wright"
    ],
    "Mythology": [
        "Zeus","Poseidon","Hades","Athena","Apollo","Artemis","Ares","Aphrodite","Hermes","Dionysus",
        "Hera","Hephaestus","Demeter","Persephone","Heracles","Achilles","Odysseus","Perseus","Theseus",
        "Medusa","Helen of Troy","Hector","Cassandra","Aeneas","Prometheus","Pandora (mythology)",
        "Odin","Thor","Loki","Freya","Frigg","Tyr","Baldur","Heimdallr","Fenrir",
        "Valkyrie","Ragnarök",
        "Ra","Osiris","Isis","Horus","Anubis","Thoth","Bastet","Sekhmet","Hathor","Sobek",
        "Set (deity)","Nephthys","Amun","Ptah",
        "Amaterasu","Susanoo","Tsukuyomi","Izanagi","Izanami","Raijin","Fūjin",
        "Vishnu","Shiva","Brahma","Ganesha","Hanuman","Krishna","Rama","Lakshmi","Durga","Kali",
        "Saraswati","Indra","Parvati",
        "Quetzalcoatl","Tezcatlipoca","Huitzilopochtli","Tlaloc",
        "Cú Chulainn","Lugh","Morrigan",
        "Gilgamesh","Enkidu","Inanna","Marduk","Tiamat",
        "Sun Wukong","Guanyin","Nezha","Chang'e",
        "Anansi","Maui (mythology)","Pele (deity)",
        "Orpheus","Daedalus","Icarus","Narcissus",
        "Atlas (mythology)","Cronus","Gaia","Eros",
        "Pan (god)","Thanatos","Hypnos","Nemesis",
        "Medea","Paris (mythology)","Priam","Sigurd","Ymir",
        "Jade Emperor","Tangaroa","Agni","Kartikeya",
        "Dagda","Brigid (goddess)","Inari Ōkami","Hachiman","Kaguya-hime",
        "Nyx","Uranus (mythology)"
    ],
    "Philosophy": [
        "Socrates","Plato","Aristotle","Confucius","Laozi",
        "Sun Tzu","Zhuangzi","Mencius","Epictetus",
        "Marcus Aurelius","Seneca the Younger","Diogenes","Epicurus","Heraclitus",
        "Parmenides","Pythagoras","Thales of Miletus","Democritus",
        "Thomas Aquinas","Augustine of Hippo","Anselm of Canterbury","William of Ockham",
        "Niccolò Machiavelli","Thomas Hobbes","John Locke",
        "René Descartes","Baruch Spinoza","Gottfried Wilhelm Leibniz","Blaise Pascal","Montesquieu",
        "Voltaire","Jean-Jacques Rousseau","David Hume","Adam Smith","Immanuel Kant",
        "Georg Wilhelm Friedrich Hegel","Arthur Schopenhauer","Søren Kierkegaard","Friedrich Nietzsche","Karl Marx",
        "John Stuart Mill","Jeremy Bentham","Ralph Waldo Emerson","Henry David Thoreau","William James",
        "John Dewey","Bertrand Russell","Ludwig Wittgenstein",
        "Martin Heidegger","Jean-Paul Sartre","Simone de Beauvoir","Albert Camus",
        "Michel Foucault","Jacques Derrida","Hannah Arendt","Simone Weil",
        "Noam Chomsky","Slavoj Žižek","Judith Butler","Cornel West","Martha Nussbaum",
        "Peter Singer","Daniel Dennett",
        "Karl Popper","Thomas Kuhn","Jürgen Habermas","Max Weber",
        "Theodor W. Adorno","Herbert Marcuse","Walter Benjamin",
        "Antonio Gramsci","Roland Barthes","Umberto Eco",
        "Emmanuel Levinas","Maurice Merleau-Ponty","Henri Bergson","Pierre Bourdieu",
        "Frantz Fanon","Edward Said",
        "Alasdair MacIntyre","John Rawls","Robert Nozick","Michael Sandel","Amartya Sen",
        "Ibn Sina","Al-Farabi","Ibn Rushd","Al-Ghazali","Ibn Khaldun",
        "Charles Sanders Peirce","Hilary Putnam","W. V. O. Quine","Saul Kripke",
        "Georg Lukács","Ernst Bloch","Paul Ricœur","Gaston Bachelard",
        "Gayatri Chakravorty Spivak","Kwame Anthony Appiah","Edmund Husserl","Gottlob Frege",
        "Paul Feyerabend","Louis Althusser","Gilles Deleuze","Thomas More","Francis Bacon"
    ]
};

// ── DB Insert ──
async function seedTag(tag, characters) {
    const client = await pool.connect();
    try {
        let inserted = 0;
        for (let i = 0; i < characters.length; i++) {
            const c = characters[i];
            const id = `${tag.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Date.now()}-${i}`;
            await client.query(`
                INSERT INTO characters (id, name, tag, tags, description, long_description, image, greeting, personality, visibility, source, likes_count, chatter_count)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
            `, [id, c.name.substring(0, 100), tag, JSON.stringify([tag]), c.description, c.longDescription || "", c.image, c.greeting, c.personality || "famous, iconic", "public", tag, Math.floor(Math.random() * 2000 + 100), Math.floor(Math.random() * 5000 + 200)]);
            inserted++;
        }
        console.log(`  ✅ Inserted ${inserted} characters for [${tag}]`);
    } catch (e) {
        console.error(`  ❌ DB error for ${tag}:`, e.message);
    } finally {
        client.release();
    }
}

// ── Main ──
async function main() {
    console.log("=== REAL-WORLD TAG SEEDER (Wikipedia) ===\n");
    let total = 0;

    for (const [tag, names] of Object.entries(TAGS)) {
        console.log(`\n[${tag}] Checking ${names.length} candidates...`);
        const results = [];
        for (const name of names) {
            if (results.length >= 100) break;
            const w = await wikiGet(name);
            if (w) {
                // Clean the display name (remove Wikipedia disambiguation)
                const displayName = name.replace(/\s*\(.*?\)\s*$/, "");
                results.push({
                    name: displayName,
                    description: `${displayName} — ${tag}`,
                    longDescription: w.extract,
                    image: w.image,
                    greeting: `Hello! I'm ${displayName}. Let's talk!`,
                    personality: "famous, iconic, legendary"
                });
                if (results.length % 20 === 0) console.log(`  ${results.length}/100...`);
            }
            // Small delay every 3 requests
            if (results.length % 3 === 0) await new Promise(r => setTimeout(r, 100));
        }
        console.log(`  Got ${results.length} characters for "${tag}"`);
        if (results.length > 0) {
            await seedTag(tag, results);
            total += results.length;
        }
    }

    console.log(`\n=== DONE! Seeded ${total} real-world characters ===`);
    process.exit(0);
}

main();
