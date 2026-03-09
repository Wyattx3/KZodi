/**
 * COMPREHENSIVE CHARACTER SEEDER
 * Seeds 100 characters per tag using:
 * - AniList GraphQL for anime-type tags (different page offsets)
 * - Hardcoded name lists + Wikipedia photo verification for real-world tags
 *
 * Run: node scripts/seed-all-tags.js
 */
const { Pool } = require("pg");
require("dotenv").config();

const DATABASE_URL = (process.env.DATABASE_URL || "").replace(/[?&]sslmode=[^&]*/g, "");
const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

// ═══════════════════════════════════════════════════════════════
// ANILIST GRAPHQL
// ═══════════════════════════════════════════════════════════════
const ANILIST_QUERY = `
query($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
        characters(sort: FAVOURITES_DESC) {
            id
            name { full }
            image { large }
            description
            media(sort: POPULARITY_DESC, perPage: 1) {
                nodes { title { english romaji } }
            }
        }
    }
}`;

function cleanDesc(d) { return d ? d.replace(/__+/g,'').replace(/~!.*?!~/gs,'').replace(/[\\\*_~`]/g,'').trim().substring(0,500) : ""; }

const ANIME_TAGS = {
    "Anime":    { startPage: 1 },
    "Manga":    { startPage: 3 },
    "Game":     { startPage: 5 },
    "VTuber":   { startPage: 7 },
    "BL":       { startPage: 9 },
    "GL":       { startPage: 11 },
    "Roleplay": { startPage: 13 },
    "Original": { startPage: 15 },
};

async function fetchAnilistTag(tag, startPage, count = 100) {
    console.log(`\n[AniList] Fetching ${count} chars for "${tag}" starting page ${startPage}...`);
    let results = [];
    let page = startPage;
    let seen = new Set();
    while (results.length < count) {
        try {
            const res = await fetch("https://graphql.anilist.co", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: ANILIST_QUERY, variables: { page, perPage: 50 } })
            });
            const data = await res.json();
            const chars = data?.data?.Page?.characters || [];
            if (chars.length === 0) break;
            for (const c of chars) {
                if (results.length >= count) break;
                if (!c.image?.large || c.image.large.includes("default.jpg")) continue;
                if (seen.has(c.name.full)) continue;
                seen.add(c.name.full);
                const src = c.media?.nodes?.[0]?.title?.english || c.media?.nodes?.[0]?.title?.romaji || "Anime";
                results.push({
                    name: c.name.full,
                    description: `${c.name.full} from ${src}`,
                    longDescription: cleanDesc(c.description),
                    image: c.image.large,
                    greeting: `Hey! I'm ${c.name.full} from ${src}. Nice to meet you!`,
                    personality: "charming, unique, iconic",
                    source: src
                });
            }
            page++;
            await new Promise(r => setTimeout(r, 800));
        } catch(e) {
            console.error("AniList error:", e.message);
            break;
        }
    }
    console.log(`  Got ${results.length} characters for "${tag}"`);
    return results;
}

// ═══════════════════════════════════════════════════════════════
// WIKIPEDIA PHOTO VERIFICATION
// ═══════════════════════════════════════════════════════════════
async function getWikiPhoto(name) {
    try {
        const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages|extracts&exintro&explaintext&exchars=300&titles=${encodeURIComponent(name)}&format=json&pithumbsize=500`;
        const res = await fetch(url);
        const data = await res.json();
        const pages = data.query?.pages;
        if (!pages) return null;
        const pid = Object.keys(pages)[0];
        if (pid === "-1") return null;
        const pg = pages[pid];
        if (!pg.thumbnail?.source) return null;
        // Reject known placeholder images
        if (pg.thumbnail.source.includes("Question_book") || pg.thumbnail.source.includes("No_image") || pg.thumbnail.source.includes("Flag_of")) return null;
        return { image: pg.thumbnail.source, extract: pg.extract || "" };
    } catch { return null; }
}

async function fetchWikiTag(tag, names, count = 100) {
    console.log(`\n[Wikipedia] Fetching ${count} chars for "${tag}" from ${names.length} candidates...`);
    let results = [];
    for (const name of names) {
        if (results.length >= count) break;
        const w = await getWikiPhoto(name);
        if (w) {
            results.push({
                name, description: `${name} — ${tag}`,
                longDescription: w.extract.substring(0, 800),
                image: w.image,
                greeting: `Hello! I'm ${name}. Let's talk!`,
                personality: "famous, iconic, legendary",
                source: tag
            });
            if (results.length % 20 === 0) console.log(`  ${results.length}/${count}...`);
        }
        // Small delay to be polite to Wikipedia
        if (results.length % 5 === 0) await new Promise(r => setTimeout(r, 200));
    }
    console.log(`  Got ${results.length} characters for "${tag}"`);
    return results;
}

// ═══════════════════════════════════════════════════════════════
// HARDCODED NAME LISTS (120+ per category for buffer)
// ═══════════════════════════════════════════════════════════════

const KPOP_NAMES = [
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
    "Moonbyul","Solar (singer)","Wheein","Hwasa",
    "Heechul","Leeteuk","Yesung","Donghae","Eunhyuk",
    "Minho (singer)","Taemin","Key (singer)","Onew",
    "Jackson Wang","Mark Tuan","BamBam (singer)","Yugyeom",
    "Sunghoon (singer)","Jake (singer)","Heeseung","Jay (singer, born 2002)","Jungwon","Ni-ki","Sunoo",
    "Miyeon","Minnie (singer)","Soyeon (singer, born 1998)","Yuqi","Shuhua",
    "Yeonjun","Soobin (singer)","Beomgyu","Taehyun (singer)","Hueningkai",
    "Eric Nam","Dean (South Korean singer)","Crush (singer)","Heize","Lee Hi",
    "Dara (singer)","Minzy","BoA","Rain (entertainer)","Psy"
];

const HISTORY_NAMES = [
    "Julius Caesar","Alexander the Great","Cleopatra","Napoleon Bonaparte","Genghis Khan",
    "Queen Victoria","Abraham Lincoln","George Washington","Winston Churchill","Nelson Mandela",
    "Mahatma Gandhi","Martin Luther King Jr.","John F. Kennedy","Franklin D. Roosevelt","Theodore Roosevelt",
    "Queen Elizabeth II","Catherine the Great","Peter the Great","Charlemagne","Attila",
    "Sun Tzu","Qin Shi Huang","Mao Zedong","Deng Xiaoping","Tokugawa Ieyasu",
    "Oda Nobunaga","Toyotomi Hideyoshi","Meiji (emperor)","Hirohito","Akbar",
    "Ashoka","Suleiman the Magnificent","Saladin","Richard I of England","William the Conqueror",
    "Henry VIII","Elizabeth I","Mary, Queen of Scots","Louis XIV","Marie Antoinette",
    "Robespierre","Otto von Bismarck","Frederick the Great","Charles V, Holy Roman Emperor","Philip II of Spain",
    "Ivan the Terrible","Tsar Nicholas II","Vladimir Lenin","Joseph Stalin","Leon Trotsky",
    "Fidel Castro","Che Guevara","Simón Bolívar","Thomas Jefferson","Benjamin Franklin",
    "Andrew Jackson","Ulysses S. Grant","Robert E. Lee","Dwight D. Eisenhower","Harry S. Truman",
    "Ronald Reagan","Margaret Thatcher","Charles de Gaulle","Benito Mussolini","Adolf Hitler",
    "Hirohito","Jawaharlal Nehru","Indira Gandhi","Aung San Suu Kyi","Ho Chi Minh",
    "Pol Pot","Gamal Abdel Nasser","Haile Selassie","Kwame Nkrumah","Jomo Kenyatta",
    "King Sejong the Great","Yi Sun-sin","Seondeok of Silla","Empress Wu Zetian","Kangxi Emperor",
    "Cyrus the Great","Darius the Great","Xerxes I","Tutankhamun","Ramesses II",
    "Hannibal Barca","Scipio Africanus","Augustus","Marcus Aurelius","Constantine the Great",
    "Justinian I","Mehmed the Conqueror","Shaka Zulu","Sitting Bull","Geronimo",
    "Pocahontas","Sacagawea","Harriet Tubman","Frederick Douglass","Sojourner Truth",
    "Joan of Arc","Florence Nightingale","Clara Barton","Emmeline Pankhurst","Rosa Parks",
    "Cleopatra VII","Nefertiti","Hatshepsut","Boudicca","Zenobia",
    "Tamerlane","Babur","Akhenaten","Thutmose III","Leonidas I"
];

const CELEBRITY_NAMES = [
    "Leonardo DiCaprio","Brad Pitt","Angelina Jolie","Tom Hanks","Meryl Streep",
    "Robert Downey Jr.","Scarlett Johansson","Chris Hemsworth","Dwayne Johnson","Ryan Reynolds",
    "Will Smith","Johnny Depp","Tom Cruise","Keanu Reeves","Morgan Freeman",
    "Beyoncé","Taylor Swift","Rihanna","Lady Gaga","Ariana Grande",
    "Billie Eilish","Drake (musician)","Kanye West","Ed Sheeran","Justin Bieber",
    "Selena Gomez","Zendaya","Timothée Chalamet","Florence Pugh","Ana de Armas",
    "Jennifer Lawrence","Emma Stone","Margot Robbie","Gal Gadot","Chris Evans",
    "Chris Pratt","Tom Holland","Chadwick Boseman","Robert Pattinson","Pedro Pascal",
    "Elon Musk","Jeff Bezos","Mark Zuckerberg","Bill Gates","Oprah Winfrey",
    "Ellen DeGeneres","Kim Kardashian","Kylie Jenner","David Beckham","Cristiano Ronaldo",
    "Lionel Messi","LeBron James","Serena Williams","Michael Jordan","Kobe Bryant",
    "Stephen Curry","Neymar","Roger Federer","Usain Bolt","Muhammad Ali",
    "Marilyn Monroe","Elvis Presley","Michael Jackson","Madonna (entertainer)","Whitney Houston",
    "Freddie Mercury","David Bowie","Prince (musician)","Aretha Franklin","Amy Winehouse",
    "Kurt Cobain","Tupac Shakur","The Notorious B.I.G.","Eminem","Snoop Dogg",
    "Adele","Sam Smith (singer)","Dua Lipa","Harry Styles","Olivia Rodrigo",
    "Cardi B","Nicki Minaj","Travis Scott","Post Malone","The Weeknd",
    "Shakira","Jennifer Lopez","Miley Cyrus","Katy Perry","Bruno Mars",
    "Doja Cat","SZA","Tyler, the Creator","Kendrick Lamar","J. Cole",
    "Ice Spice","Megan Thee Stallion","Lil Nas X","Bad Bunny","Rosalía",
    "Michelle Obama","Malala Yousafzai","Greta Thunberg","Emma Watson","Natalie Portman",
    "Halle Berry","Sandra Bullock","Julia Roberts","Nicole Kidman","Cate Blanchett",
    "Joaquin Phoenix","Christian Bale","Matt Damon","Ben Affleck","Oscar Isaac"
];

const MOVIES_NAMES = [
    "Harrison Ford","Steven Spielberg","Martin Scorsese","Quentin Tarantino","Christopher Nolan",
    "Alfred Hitchcock","Stanley Kubrick","James Cameron","Ridley Scott","Francis Ford Coppola",
    "Clint Eastwood","Al Pacino","Robert De Niro","Jack Nicholson","Marlon Brando",
    "Audrey Hepburn","Grace Kelly","Humphrey Bogart","Cary Grant","James Dean",
    "Bruce Lee","Jackie Chan","Jet Li","Michelle Yeoh","Donnie Yen",
    "Arnold Schwarzenegger","Sylvester Stallone","Bruce Willis","Jean-Claude Van Damme","Chuck Norris",
    "Samuel L. Jackson","Denzel Washington","Will Smith","Jamie Foxx","Forest Whitaker",
    "Kate Winslet","Cate Blanchett","Natalie Portman","Charlize Theron","Halle Berry",
    "Heath Ledger","Jake Gyllenhaal","Ryan Gosling","Jared Leto","Joaquin Phoenix",
    "Hayao Miyazaki","Akira Kurosawa","Bong Joon-ho","Park Chan-wook","Wong Kar-wai",
    "Guillermo del Toro","Alfonso Cuarón","Denis Villeneuve","David Fincher","Wes Anderson",
    "Tim Burton","David Lynch","Terrence Malick","Kathryn Bigelow","Sofia Coppola",
    "Greta Gerwig","Jordan Peele","Ari Aster","Robert Eggers","Chloé Zhao",
    "Sandra Bullock","Julia Roberts","Meryl Streep","Nicole Kidman","Amy Adams",
    "Viola Davis","Lupita Nyong'o","Saoirse Ronan","Tilda Swinton","Glenn Close",
    "Anthony Hopkins","Ian McKellen","Patrick Stewart","Michael Caine","Gary Oldman",
    "Daniel Day-Lewis","Sean Connery","Gene Hackman","Dustin Hoffman","Robin Williams",
    "Jim Carrey","Eddie Murphy","Adam Sandler","Ben Stiller","Seth Rogen",
    "Toshiro Mifune","Zhang Ziyi","Gong Li","Tony Leung Chiu-wai","Chow Yun-fat",
    "Shah Rukh Khan","Amitabh Bachchan","Aamir Khan","Priyanka Chopra","Deepika Padukone",
    "Mads Mikkelsen","Oscar Isaac","Austin Butler","Anya Taylor-Joy","Sydney Sweeney",
    "Jason Momoa","Henry Cavill","Daniel Craig","Idris Elba","Tom Hardy",
    "Rachel McAdams","Anne Hathaway","Reese Witherspoon","Drew Barrymore","Cameron Diaz"
];

const TV_NAMES = [
    "Bryan Cranston","Aaron Paul","Kit Harington","Emilia Clarke","Peter Dinklage",
    "Millie Bobby Brown","Winona Ryder","David Harbour","Jenna Ortega","Christina Ricci",
    "Henry Cavill","Jennifer Aniston","Courteney Cox","Lisa Kudrow","Matthew Perry",
    "Steve Carell","John Krasinski","Rainn Wilson","Mindy Kaling","Ed Helms",
    "Jon Hamm","Elisabeth Moss","January Jones","Christina Hendricks","Vincent Kartheiser",
    "Ian Somerhalder","Nina Dobrev","Paul Wesley","Candice King","Joseph Morgan (actor)",
    "Sarah Michelle Gellar","David Boreanaz","Alyson Hannigan","James Marsters","Anthony Head",
    "Jensen Ackles","Jared Padalecki","Misha Collins","Mark Sheppard","Jim Beaver",
    "Benedict Cumberbatch","Martin Freeman","Andrew Scott (actor)","Mark Gatiss","Rupert Graves",
    "Hugh Laurie","Robert Sean Leonard","Lisa Edelstein","Olivia Wilde","Omar Epps",
    "Evan Peters","Sarah Paulson","Jessica Lange","Angela Bassett","Kathy Bates",
    "Bob Odenkirk","Rhea Seehorn","Jonathan Banks","Giancarlo Esposito","Michael Mando",
    "Pedro Pascal","Bella Ramsey","Merle Dandridge","Anna Torv","Nick Offerman",
    "Aubrey Plaza","Chris Pratt","Amy Poehler","Rashida Jones","Aziz Ansari",
    "Donald Glover","Danny Pudi","Alison Brie","Gillian Jacobs","Ken Jeong",
    "Tatiana Maslany","Jordan Gavaris","Kristian Bruun","Ari Millen","Maria Doyle Kennedy",
    "Zendaya","Tom Holland","Jacob Batalon","Tony Revolori","Hunter Schafer",
    "Jason Sudeikis","Brett Goldstein","Hannah Waddingham","Juno Temple","Phil Dunster",
    "Oscar Isaac","Ethan Hawke","May Calamawy","F. Murray Abraham","Kaley Cuoco",
    "Jim Parsons","Kaley Cuoco","Johnny Galecki","Simon Helberg","Kunal Nayyar",
    "Kerry Washington","Tony Goldwyn","Bellamy Young","Jeff Perry","Guillermo Díaz",
    "Claire Danes","Damian Lewis","Mandy Patinkin","Rupert Friend","F. Murray Abraham",
    "Norman Reedus","Andrew Lincoln","Melissa McBride","Lauren Cohan","Danai Gurira"
];

const BOOKS_NAMES = [
    "William Shakespeare","Jane Austen","Charles Dickens","Mark Twain","Leo Tolstoy",
    "Fyodor Dostoevsky","Ernest Hemingway","F. Scott Fitzgerald","Virginia Woolf","James Joyce",
    "Oscar Wilde","Edgar Allan Poe","Emily Dickinson","Walt Whitman","Robert Frost",
    "George Orwell","Aldous Huxley","Ray Bradbury","Isaac Asimov","Arthur C. Clarke",
    "J. R. R. Tolkien","C. S. Lewis","George R. R. Martin","J. K. Rowling","Stephen King",
    "Agatha Christie","Arthur Conan Doyle","Dan Brown","John Grisham","Michael Crichton",
    "Haruki Murakami","Gabriel García Márquez","Paulo Coelho","Umberto Eco","Italo Calvino",
    "Franz Kafka","Albert Camus","Jean-Paul Sartre","Simone de Beauvoir","Michel Foucault",
    "Homer","Virgil","Dante Alighieri","Miguel de Cervantes","Victor Hugo",
    "Alexandre Dumas","Gustave Flaubert","Émile Zola","Marcel Proust","Antoine de Saint-Exupéry",
    "Hermann Hesse","Thomas Mann","Günter Grass","Milan Kundera","Aleksandr Solzhenitsyn",
    "Chinua Achebe","Wole Soyinka","Toni Morrison","Maya Angelou","Langston Hughes",
    "Ralph Waldo Emerson","Henry David Thoreau","Herman Melville","Nathaniel Hawthorne","Louisa May Alcott",
    "Charlotte Brontë","Emily Brontë","Mary Shelley","Bram Stoker","H. G. Wells",
    "Jules Verne","Alexandre Dumas","Robert Louis Stevenson","Rudyard Kipling","Joseph Conrad",
    "Jorge Luis Borges","Octavio Paz","Pablo Neruda","Isabel Allende","Mario Vargas Llosa",
    "Margaret Atwood","Ursula K. Le Guin","Octavia E. Butler","Philip K. Dick","Kurt Vonnegut",
    "Toni Morrison","Alice Walker","Zora Neale Hurston","James Baldwin","Richard Wright",
    "Neil Gaiman","Terry Pratchett","Brandon Sanderson","Patrick Rothfuss","Robin Hobb",
    "Kazuo Ishiguro","Salman Rushdie","Arundhati Roy","Chimamanda Ngozi Adichie","Khaled Hosseini",
    "Roald Dahl","Dr. Seuss","Lewis Carroll","Beatrix Potter","Hans Christian Andersen",
    "Brothers Grimm","Aesop","Ovid","Sappho","Rumi",
    "Omar Khayyám","Kahlil Gibran","Rabindranath Tagore","Lu Xun","Natsume Sōseki"
];

const MYTHOLOGY_NAMES = [
    "Zeus","Poseidon","Hades","Athena","Apollo","Artemis","Ares","Aphrodite","Hermes","Dionysus",
    "Hera","Hephaestus","Demeter","Persephone","Heracles","Achilles","Odysseus","Perseus","Theseus","Jason (mythology)",
    "Medusa","Medea","Helen of Troy","Paris (mythology)","Hector","Priam","Cassandra","Aeneas","Prometheus","Pandora",
    "Odin","Thor","Loki","Freya","Frigg","Tyr","Baldur","Heimdallr","Fenrir","Jörmungandr",
    "Valkyrie","Sigurd","Ragnarök","Ymir","Brynhildr",
    "Ra","Osiris","Isis","Horus","Anubis","Thoth","Bastet","Sekhmet","Hathor","Sobek",
    "Set (deity)","Nephthys","Amun","Ptah","Nut (goddess)",
    "Amaterasu","Susanoo","Tsukuyomi","Izanagi","Izanami","Inari Ōkami","Raijin","Fūjin","Hachiman","Kaguya-hime",
    "Vishnu","Shiva","Brahma","Ganesha","Hanuman","Krishna","Rama","Lakshmi","Durga","Kali",
    "Saraswati","Indra","Agni","Parvati","Kartikeya",
    "Quetzalcoatl","Tezcatlipoca","Huitzilopochtli","Tlaloc","Xipe Totec",
    "Cú Chulainn","Lugh","Brigid (goddess)","Morrigan","Dagda",
    "Gilgamesh","Enkidu","Inanna","Marduk","Tiamat",
    "Jade Emperor","Sun Wukong","Guanyin","Nezha","Chang'e",
    "Anansi","Maui (mythology)","Tangaroa","Pele (deity)",
    "Orpheus","Daedalus","Icarus","Narcissus","Echo (mythology)",
    "Atlas (mythology)","Cronus","Gaia","Uranus (mythology)","Eros",
    "Pan (god)","Nyx","Thanatos","Hypnos","Nemesis"
];

const PHILOSOPHY_NAMES = [
    "Socrates","Plato","Aristotle","Confucius","Laozi",
    "Sun Tzu","Buddha","Zhuangzi","Mencius","Epictetus",
    "Marcus Aurelius","Seneca the Younger","Diogenes","Epicurus","Heraclitus",
    "Parmenides","Pythagoras","Thales of Miletus","Anaximander","Democritus",
    "Thomas Aquinas","Augustine of Hippo","Boethius","Anselm of Canterbury","William of Ockham",
    "Niccolò Machiavelli","Thomas More","Francis Bacon","Thomas Hobbes","John Locke",
    "René Descartes","Baruch Spinoza","Gottfried Wilhelm Leibniz","Blaise Pascal","Montesquieu",
    "Voltaire","Jean-Jacques Rousseau","David Hume","Adam Smith","Immanuel Kant",
    "Georg Wilhelm Friedrich Hegel","Arthur Schopenhauer","Søren Kierkegaard","Friedrich Nietzsche","Karl Marx",
    "John Stuart Mill","Jeremy Bentham","Ralph Waldo Emerson","Henry David Thoreau","William James",
    "Charles Sanders Peirce","John Dewey","Bertrand Russell","Ludwig Wittgenstein","Gottlob Frege",
    "Edmund Husserl","Martin Heidegger","Jean-Paul Sartre","Simone de Beauvoir","Albert Camus",
    "Michel Foucault","Jacques Derrida","Gilles Deleuze","Hannah Arendt","Simone Weil",
    "Noam Chomsky","Slavoj Žižek","Judith Butler","Cornel West","Martha Nussbaum",
    "Peter Singer","Daniel Dennett","Saul Kripke","Hilary Putnam","W. V. O. Quine",
    "Karl Popper","Thomas Kuhn","Paul Feyerabend","Jürgen Habermas","Max Weber",
    "Theodor W. Adorno","Herbert Marcuse","Walter Benjamin","Ernst Bloch","Georg Lukács",
    "Antonio Gramsci","Louis Althusser","Roland Barthes","Umberto Eco","Paul Ricœur",
    "Emmanuel Levinas","Maurice Merleau-Ponty","Gaston Bachelard","Henri Bergson","Pierre Bourdieu",
    "Frantz Fanon","Edward Said","Gayatri Chakravorty Spivak","Kwame Anthony Appiah","Charles Taylor (philosopher)",
    "Alasdair MacIntyre","John Rawls","Robert Nozick","Michael Sandel","Amartya Sen",
    "Ibn Sina","Al-Farabi","Ibn Rushd","Al-Ghazali","Ibn Khaldun"
];

// ═══════════════════════════════════════════════════════════════
// DB INSERT
// ═══════════════════════════════════════════════════════════════
async function seedToDB(tag, characters) {
    const client = await pool.connect();
    try {
        let inserted = 0;
        for (let i = 0; i < characters.length; i++) {
            const c = characters[i];
            const id = `${tag.toLowerCase().replace(/[^a-z0-9]/g,'')}-${Date.now()}-${i}`;
            await client.query(`
                INSERT INTO characters (id, name, tag, tags, description, long_description, image, greeting, personality, visibility, source, likes_count, chatter_count)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
            `, [id, c.name.substring(0,100), tag, JSON.stringify([tag]), c.description, c.longDescription||"", c.image, c.greeting, c.personality||"famous, iconic", "public", (c.source||tag).substring(0,100), Math.floor(Math.random()*2000+100), Math.floor(Math.random()*5000+200)]);
            inserted++;
        }
        console.log(`  ✅ Inserted ${inserted} characters for [${tag}]`);
    } catch(e) {
        console.error(`  ❌ DB error for ${tag}:`, e.message);
    } finally {
        client.release();
    }
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
async function main() {
    console.log("=== COMPREHENSIVE CHARACTER SEEDER ===\n");
    let total = 0;

    // 1. Anime-type tags via AniList
    for (const [tag, cfg] of Object.entries(ANIME_TAGS)) {
        const chars = await fetchAnilistTag(tag, cfg.startPage, 100);
        if (chars.length > 0) {
            await seedToDB(tag, chars);
            total += chars.length;
        }
    }

    // 2. Real-world tags via hardcoded names + Wikipedia
    const WIKI_TAGS = {
        "K-pop": KPOP_NAMES,
        "History": HISTORY_NAMES,
        "Celebrity": CELEBRITY_NAMES,
        "Movies": MOVIES_NAMES,
        "TV": TV_NAMES,
        "Books": BOOKS_NAMES,
        "Mythology": MYTHOLOGY_NAMES,
        "Philosophy": PHILOSOPHY_NAMES,
    };

    for (const [tag, names] of Object.entries(WIKI_TAGS)) {
        const chars = await fetchWikiTag(tag, names, 100);
        if (chars.length > 0) {
            await seedToDB(tag, chars);
            total += chars.length;
        }
    }

    console.log(`\n=== DONE! Seeded ${total} total characters across all tags ===`);
    process.exit(0);
}

main();
