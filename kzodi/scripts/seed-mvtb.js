/**
 * SEED MOVIES, TV, BOOKS — No Wikipedia needed
 * Uses hardcoded character data + AniList avatars directly
 * 
 * Run: node scripts/seed-mvtb.js
 */
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    connectionString: (process.env.DATABASE_URL || "").replace(/[?&]sslmode=[^&]*/g, ""),
    ssl: { rejectUnauthorized: false }
});

async function getAvatars(count = 300) {
    console.log("[AniList] Getting avatars...");
    let images = [];
    for (let page = 1; page <= 15 && images.length < count; page++) {
        try {
            const query = `query($p:Int,$pp:Int){Page(page:$p,perPage:$pp){characters(sort:FAVOURITES_DESC){image{large}}}}`;
            const res = await fetch("https://graphql.anilist.co", {
                method: "POST", headers: {"Content-Type":"application/json"},
                body: JSON.stringify({ query, variables: { p: page, pp: 25 } })
            });
            const data = await res.json();
            for (const c of (data?.data?.Page?.characters || [])) {
                if (c.image?.large && !c.image.large.includes("default")) images.push(c.image.large);
            }
            await new Promise(r => setTimeout(r, 800));
        } catch { break; }
    }
    console.log(`  Got ${images.length} avatars`);
    return images;
}

// ═══════════════ MOVIE CHARACTERS ═══════════════
const MOVIES = [
    { name: "Darth Vader", desc: "The fearsome Sith Lord and father of Luke Skywalker" },
    { name: "Luke Skywalker", desc: "The legendary Jedi Knight who brought balance to the Force" },
    { name: "Princess Leia", desc: "Bold rebel leader and princess of Alderaan" },
    { name: "Han Solo", desc: "The charming smuggler with a heart of gold" },
    { name: "Yoda", desc: "The ancient and wise Jedi Grand Master" },
    { name: "Obi-Wan Kenobi", desc: "The noble Jedi Master and mentor" },
    { name: "Anakin Skywalker", desc: "The Chosen One who fell to the dark side" },
    { name: "Kylo Ren", desc: "Conflicted warrior torn between light and dark" },
    { name: "Rey", desc: "A scavenger who discovers she's strong with the Force" },
    { name: "Harry Potter", desc: "The Boy Who Lived, wizard and Chosen One" },
    { name: "Hermione Granger", desc: "The brilliant witch, brightest of her age" },
    { name: "Ron Weasley", desc: "Loyal friend and youngest Weasley brother" },
    { name: "Dumbledore", desc: "The wise headmaster of Hogwarts School" },
    { name: "Voldemort", desc: "The dark lord who sought immortality and power" },
    { name: "Severus Snape", desc: "The misunderstood Potions Master with a hidden heart" },
    { name: "Draco Malfoy", desc: "The Slytherin rival with a complicated legacy" },
    { name: "Tony Stark", desc: "Genius billionaire who became Iron Man" },
    { name: "Steve Rogers", desc: "The first Avenger, Captain America" },
    { name: "Thor Odinson", desc: "The God of Thunder from Asgard" },
    { name: "Black Widow", desc: "Master spy and founding Avenger Natasha Romanoff" },
    { name: "Spider-Man", desc: "Friendly neighborhood web-slinger Peter Parker" },
    { name: "Thanos", desc: "The Mad Titan who sought the Infinity Stones" },
    { name: "Black Panther", desc: "King T'Challa, protector of Wakanda" },
    { name: "Doctor Strange", desc: "The Sorcerer Supreme protecting reality" },
    { name: "Scarlet Witch", desc: "Wanda Maximoff, the most powerful Avenger" },
    { name: "Loki", desc: "The God of Mischief, trickster prince of Asgard" },
    { name: "Groot", desc: "A living tree creature and Guardian of the Galaxy" },
    { name: "Batman", desc: "The Dark Knight, Gotham's vigilante protector" },
    { name: "Superman", desc: "The Man of Steel, last son of Krypton" },
    { name: "Wonder Woman", desc: "Amazon warrior princess Diana of Themyscira" },
    { name: "The Joker", desc: "Batman's chaotic arch-nemesis, agent of chaos" },
    { name: "Catwoman", desc: "The alluring cat burglar Selina Kyle" },
    { name: "Aquaman", desc: "King of Atlantis, Arthur Curry" },
    { name: "Gandalf", desc: "The wise wizard who guides the Fellowship" },
    { name: "Aragorn", desc: "The heir of Isildur, King of Gondor" },
    { name: "Frodo Baggins", desc: "The hobbit who carried the One Ring to Mount Doom" },
    { name: "Legolas", desc: "The elf prince and deadly archer of the Fellowship" },
    { name: "Gollum", desc: "The tragic creature consumed by the One Ring" },
    { name: "Elsa", desc: "The Snow Queen of Arendelle with ice powers" },
    { name: "Simba", desc: "The young lion destined to be King of Pride Rock" },
    { name: "Buzz Lightyear", desc: "Space Ranger toy who learns what it means to be a friend" },
    { name: "Woody", desc: "Loyal cowboy toy and leader of Andy's room" },
    { name: "WALL-E", desc: "The last robot on Earth who found love" },
    { name: "Mulan", desc: "Brave warrior who disguised herself to save her father" },
    { name: "Moana", desc: "The fearless voyager chosen to save her island" },
    { name: "Rapunzel", desc: "The lost princess with magical golden hair" },
    { name: "Jack Sparrow", desc: "The eccentric and cunning pirate captain" },
    { name: "Indiana Jones", desc: "The adventurous archaeologist and professor" },
    { name: "James Bond", desc: "The suave British secret agent 007" },
    { name: "Forrest Gump", desc: "A simple man who witnessed extraordinary history" },
    { name: "Rocky Balboa", desc: "The underdog boxer with a heart of steel" },
    { name: "John Wick", desc: "The legendary hitman seeking vengeance" },
    { name: "The Terminator", desc: "A cybernetic killing machine from the future" },
    { name: "Ellen Ripley", desc: "The tough survivor of the Xenomorph attacks" },
    { name: "Neo", desc: "The One who freed humanity from the Matrix" },
    { name: "Morpheus", desc: "The captain who found The One in the Matrix" },
    { name: "Tyler Durden", desc: "The anarchist alter ego from Fight Club" },
    { name: "Vito Corleone", desc: "The Godfather, head of the Corleone crime family" },
    { name: "Michael Corleone", desc: "The reluctant heir who became the Godfather" },
    { name: "Hannibal Lecter", desc: "The brilliant and terrifying cannibalistic psychiatrist" },
    { name: "Shrek", desc: "The lovable ogre who just wants his swamp back" },
    { name: "Jack Skellington", desc: "The Pumpkin King of Halloween Town" },
    { name: "Wolverine", desc: "The ferocious X-Man with adamantium claws" },
    { name: "Deadpool", desc: "The Merc with a Mouth who breaks the fourth wall" },
    { name: "Godzilla", desc: "The King of Monsters, ancient atomic beast" },
    { name: "King Kong", desc: "The colossal ape who fell in love" },
    { name: "E.T.", desc: "The gentle alien who just wanted to phone home" },
    { name: "Optimus Prime", desc: "The noble leader of the Autobots" },
    { name: "Maximus", desc: "The gladiator who defied an emperor" },
    { name: "Dorothy Gale", desc: "The Kansas girl who followed the Yellow Brick Road" },
    { name: "Mary Poppins", desc: "The practically perfect magical nanny" },
    { name: "Willy Wonka", desc: "The eccentric candy maker and chocolatier" },
    { name: "Jason Bourne", desc: "The amnesiac super spy seeking his identity" },
    { name: "Lara Croft", desc: "The fearless tomb raider and archaeologist" },
    { name: "Mad Max", desc: "The road warrior surviving in the wasteland" },
    { name: "Katniss Everdeen", desc: "The Girl on Fire, symbol of rebellion" },
    { name: "Nemo", desc: "The adventurous little clownfish lost in the ocean" },
    { name: "Lightning McQueen", desc: "The hotshot race car who learned what matters" },
    { name: "Totoro", desc: "The gentle forest spirit friend of children" },
    { name: "Mufasa", desc: "The wise and powerful Lion King" },
    { name: "Scar (Lion King)", desc: "The treacherous lion who betrayed his brother" },
    { name: "Cinderella", desc: "The kind servant girl who became a princess" },
    { name: "Belle (Disney)", desc: "The bookish beauty who loved the Beast" },
    { name: "Ariel (Disney)", desc: "The curious mermaid who longed for the human world" },
    { name: "Pocahontas (Disney)", desc: "The brave daughter of a Powhatan chief" },
    { name: "Aladdin", desc: "The street-smart diamond in the rough" },
    { name: "Genie (Disney)", desc: "The all-powerful and hilarious genie of the lamp" },
    { name: "Maleficent", desc: "The powerful dark fairy wronged by a king" },
    { name: "Cruella de Vil", desc: "The fashion-obsessed fur-loving villain" },
    { name: "Caesar (Apes)", desc: "The intelligent ape leader who fought for freedom" },
    { name: "Pennywise", desc: "The terrifying dancing clown from Derry" },
    { name: "The Grinch", desc: "The grumpy creature who stole Christmas" },
    { name: "Baby Yoda", desc: "The adorable Force-sensitive child Grogu" },
    { name: "Po (Kung Fu Panda)", desc: "The unlikely panda who became Dragon Warrior" },
    { name: "Hiccup", desc: "The Viking who befriended a dragon" },
    { name: "Miguel Rivera", desc: "The boy who journeyed to the Land of the Dead" },
    { name: "Elastigirl", desc: "The incredible stretchy superhero mom" },
    { name: "Remy (Ratatouille)", desc: "The rat with dreams of being a French chef" },
    { name: "Joy (Inside Out)", desc: "The optimistic emotion guiding Riley's mind" },
    { name: "Dory", desc: "The forgetful but lovable blue tang fish" }
];

// ═══════════════ TV CHARACTERS ═══════════════  
const TV = [
    { name: "Walter White", desc: "Chemistry teacher turned drug kingpin Heisenberg" },
    { name: "Jesse Pinkman", desc: "Walter White's troubled but good-hearted partner" },
    { name: "Saul Goodman", desc: "The colorful criminal lawyer who'll fix your problems" },
    { name: "Gustavo Fring", desc: "The polite yet ruthless drug lord hiding in plain sight" },
    { name: "Mike Ehrmantraut", desc: "The no-nonsense fixer and enforcer" },
    { name: "Jon Snow", desc: "The brooding bastard who became King in the North" },
    { name: "Daenerys Targaryen", desc: "The Mother of Dragons and breaker of chains" },
    { name: "Tyrion Lannister", desc: "The witty and clever dwarf of House Lannister" },
    { name: "Cersei Lannister", desc: "The ruthless and cunning Queen of Westeros" },
    { name: "Arya Stark", desc: "The fierce young warrior seeking vengeance" },
    { name: "Sansa Stark", desc: "The Lady of Winterfell who survived everything" },
    { name: "Jaime Lannister", desc: "The Kingslayer seeking redemption" },
    { name: "Brienne of Tarth", desc: "The honorable lady knight of Westeros" },
    { name: "The Hound", desc: "The brutal warrior with a hidden soft side" },
    { name: "Eleven", desc: "The telekinetic girl who escaped from Hawkins Lab" },
    { name: "Steve Harrington", desc: "The hair-perfect babysitter turned hero" },
    { name: "Rachel Green", desc: "The fashionable waitress-turned-career woman" },
    { name: "Ross Geller", desc: "The lovable dinosaur-obsessed paleontologist" },
    { name: "Chandler Bing", desc: "The sarcastic king of quips and one-liners" },
    { name: "Monica Geller", desc: "The competitive and organized chef" },
    { name: "Joey Tribbiani", desc: "The lovable actor who loves food" },
    { name: "Phoebe Buffay", desc: "The quirky and free-spirited masseuse" },
    { name: "Michael Scott", desc: "The world's best boss (self-proclaimed)" },
    { name: "Dwight Schrute", desc: "The intense beet farmer and assistant (to the) regional manager" },
    { name: "Jim Halpert", desc: "The charming prankster of Dunder Mifflin" },
    { name: "Sheldon Cooper", desc: "The brilliant but socially awkward physicist" },
    { name: "Homer Simpson", desc: "The lovable oaf of Springfield" },
    { name: "Bart Simpson", desc: "The rebellious troublemaker of Springfield" },
    { name: "SpongeBob SquarePants", desc: "The eternally optimistic fry cook of Bikini Bottom" },
    { name: "Patrick Star", desc: "The lovable and clueless starfish" },
    { name: "Squidward Tentacles", desc: "The grumpy artistic neighbor" },
    { name: "Eric Cartman", desc: "The manipulative and outrageous troublemaker" },
    { name: "Rick Sanchez", desc: "The genius alcoholic scientist who travels dimensions" },
    { name: "Morty Smith", desc: "Rick's anxious but brave grandson" },
    { name: "Sherlock Holmes (BBC)", desc: "The high-functioning sociopath detective" },
    { name: "Dexter Morgan", desc: "The blood spatter analyst with a dark secret" },
    { name: "Thomas Shelby", desc: "The cunning leader of the Peaky Blinders" },
    { name: "Ragnar Lothbrok", desc: "The legendary Norse Viking king" },
    { name: "Tony Soprano", desc: "The New Jersey mob boss in therapy" },
    { name: "Don Draper", desc: "The suave yet troubled advertising genius" },
    { name: "Geralt of Rivia", desc: "The stoic monster hunter known as the White Wolf" },
    { name: "Buffy Summers", desc: "The Chosen One, slayer of vampires" },
    { name: "Damon Salvatore", desc: "The charismatic and dangerous vampire" },
    { name: "Klaus Mikaelson", desc: "The original hybrid vampire-werewolf" },
    { name: "Dean Winchester", desc: "The monster-hunting brother with a classic car" },
    { name: "Sam Winchester", desc: "The sensitive yet powerful monster hunter" },
    { name: "Castiel", desc: "The angel who chose humanity over Heaven" },
    { name: "Ted Mosby", desc: "The hopeless romantic architect" },
    { name: "Barney Stinson", desc: "The legendary suit-up bro" },
    { name: "Grogu", desc: "The adorable Force-sensitive child" },
    { name: "The Mandalorian", desc: "The lone bounty hunter traveling with a child" },
    { name: "Ahsoka Tano", desc: "The former Jedi padawan turned rebel warrior" },
    { name: "Homelander", desc: "The terrifyingly powerful and narcissistic superhero" },
    { name: "Billy Butcher", desc: "The foul-mouthed vigilante hunting corrupt heroes" },
    { name: "Wednesday Addams", desc: "The dark and deadpan misfit of Nevermore Academy" },
    { name: "Wanda Maximoff", desc: "The grief-stricken witch remaking reality" },
    { name: "Lucifer Morningstar", desc: "The Devil running a nightclub in LA" },
    { name: "Rick Grimes", desc: "The sheriff surviving the zombie apocalypse" },
    { name: "Daryl Dixon", desc: "The crossbow-wielding lone wolf survivor" },
    { name: "Beth Harmon", desc: "The chess prodigy with a troubled past" },
    { name: "Rue Bennett", desc: "The struggling teen navigating addiction and love" },
    { name: "Jinx (Arcane)", desc: "The chaotic and broken-hearted rebel from Zaun" },
    { name: "Vi (Arcane)", desc: "The street-tough fighter of Zaun" },
    { name: "Kim Wexler", desc: "The brilliant lawyer drawn to the edge" },
    { name: "Hank Schrader", desc: "The DEA agent hunting Heisenberg" },
    { name: "Skyler White", desc: "Walter White's wife caught in his web of lies" },
    { name: "Peter Griffin", desc: "The bumbling patriarch of the Griffin family" },
    { name: "Stewie Griffin", desc: "The evil genius baby with an English accent" },
    { name: "BoJack Horseman", desc: "The washed-up actor horse dealing with depression" },
    { name: "Carrie Bradshaw", desc: "The iconic NYC columnist navigating love" },
    { name: "Elena Gilbert", desc: "The compassionate girl caught between two vampires" },
    { name: "Villanelle", desc: "The stylish and psychopathic assassin" },
    { name: "Fleabag", desc: "The sharp-witted woman breaking the fourth wall" },
    { name: "Gi-hun", desc: "The desperate player 456 in the deadly games" },
    { name: "Joel Miller", desc: "The hardened survivor protecting Ellie" },
    { name: "Ellie (TLOU)", desc: "The brave and immune girl in a zombie world" },
    { name: "Olivia Pope", desc: "The Washington fixer who handles everything" },
    { name: "Norman Bates", desc: "The shy motel owner with a dark secret" },
    { name: "Negan", desc: "The charismatic bat-swinging leader" },
    { name: "Mr. Robot", desc: "The mysterious figure guiding a hacker revolution" },
    { name: "Elliot Alderson", desc: "The socially anxious hacker trying to change the world" },
    { name: "Tyrion (pre-GoT)", desc: "The clever Hand of the Queen" },
    { name: "Baby Yoda (Grogu)", desc: "The cutest being in the galaxy" },
    { name: "Narcos: Pablo Escobar", desc: "The infamous drug lord of Medellín" },
    { name: "Light Yagami (Netflix)", desc: "The genius student who found the Death Note" },
    { name: "Picard", desc: "The wise and diplomatic Starfleet captain" },
    { name: "Spock", desc: "The logical half-Vulcan science officer" },
    { name: "Dalek", desc: "The exterminating terror of the Doctor's universe" },
    { name: "The Doctor (Who)", desc: "The time-traveling alien with a blue box" },
    { name: "Eleven (Stranger)", desc: "The girl with psychic powers from the Upside Down" },
    { name: "Dustin Henderson", desc: "The lovable nerdy kid from Hawkins" },
    { name: "Robin Scherbatsky", desc: "The no-nonsense journalist and Ted's love interest" },
    { name: "Leonard Hofstadter", desc: "The physicist trying to be normal" },
    { name: "April Ludgate", desc: "The deadpan government employee from Pawnee" },
    { name: "Ron Swanson", desc: "The libertarian parks director who hates government" },
    { name: "Leslie Knope", desc: "The enthusiastic government official who loves waffles" },
    { name: "Jake Peralta", desc: "The immature but talented detective" },
    { name: "Rosa Diaz", desc: "The tough and secretive detective" },
    { name: "Ragnar (Vikings)", desc: "The legendary Norse farmer turned king" },
    { name: "Lagertha", desc: "The fierce shieldmaiden and queen" }
];

// ═══════════════ BOOK CHARACTERS ═══════════════
const BOOKS = [
    { name: "Sherlock Holmes", desc: "The world's greatest consulting detective" },
    { name: "Dr. Watson", desc: "Holmes' loyal friend and biographer" },
    { name: "Professor Moriarty", desc: "The Napoleon of Crime, Holmes' arch-nemesis" },
    { name: "Harry Potter", desc: "The Boy Who Lived, wizard chosen one" },
    { name: "Hermione Granger", desc: "The brilliant witch and loyal friend" },
    { name: "Ron Weasley", desc: "The loyal and brave youngest Weasley" },
    { name: "Dumbledore", desc: "The wise and powerful headmaster" },
    { name: "Gandalf", desc: "The wandering wizard who guided the Fellowship" },
    { name: "Frodo Baggins", desc: "The brave hobbit who carried the Ring" },
    { name: "Aragorn", desc: "The ranger who became King of Gondor" },
    { name: "Legolas", desc: "The elven prince with unmatched archery" },
    { name: "Samwise Gamgee", desc: "The most loyal friend in all of Middle-earth" },
    { name: "Gollum", desc: "The tragic creature corrupted by the Ring" },
    { name: "Elizabeth Bennet", desc: "The witty and independent heroine of Pemberley" },
    { name: "Mr. Darcy", desc: "The proud gentleman who learned to love" },
    { name: "Jane Eyre", desc: "The strong-willed governess seeking independence" },
    { name: "Heathcliff", desc: "The tormented soul consumed by passion and revenge" },
    { name: "Jay Gatsby", desc: "The mysterious millionaire chasing a green light" },
    { name: "Atticus Finch", desc: "The moral compass of Maycomb, Alabama" },
    { name: "Scout Finch", desc: "The curious and fair-minded tomboy narrator" },
    { name: "Huckleberry Finn", desc: "The adventurous boy rafting down the Mississippi" },
    { name: "Tom Sawyer", desc: "The clever and mischievous American boy" },
    { name: "Oliver Twist", desc: "The orphan who asked for more" },
    { name: "Jean Valjean", desc: "The reformed convict seeking redemption" },
    { name: "Edmond Dantès", desc: "The Count of Monte Cristo seeking vengeance" },
    { name: "D'Artagnan", desc: "The hot-headed musketeer of King Louis" },
    { name: "Don Quixote", desc: "The idealistic knight tilting at windmills" },
    { name: "Robinson Crusoe", desc: "The shipwrecked castaway who survived" },
    { name: "Romeo", desc: "The passionate young lover of the Montagues" },
    { name: "Juliet", desc: "The star-crossed lover of the Capulets" },
    { name: "Hamlet", desc: "The Danish prince haunted by his father's ghost" },
    { name: "Macbeth", desc: "The ambitious Scottish king corrupted by prophecy" },
    { name: "Anna Karenina", desc: "The Russian aristocrat in a tragic love affair" },
    { name: "Raskolnikov", desc: "The tortured student who committed the perfect crime" },
    { name: "Dracula", desc: "The ancient vampire count of Transylvania" },
    { name: "Frankenstein's Monster", desc: "The tragically misunderstood creation" },
    { name: "Captain Ahab", desc: "The obsessed captain hunting the white whale" },
    { name: "Alice Wonderland", desc: "The curious girl who fell down the rabbit hole" },
    { name: "Peter Pan", desc: "The boy who never grew up" },
    { name: "Tinker Bell", desc: "The jealous but loyal fairy companion" },
    { name: "Captain Hook", desc: "The elegant pirate captain of Neverland" },
    { name: "Dorothy Gale", desc: "The Kansas girl following the Yellow Brick Road" },
    { name: "Pinocchio", desc: "The wooden puppet who wanted to be real" },
    { name: "Winnie-the-Pooh", desc: "The honey-loving bear of the Hundred Acre Wood" },
    { name: "Paddington Bear", desc: "The polite Peruvian bear in London" },
    { name: "Mary Poppins", desc: "The practically perfect magical nanny" },
    { name: "Katniss Everdeen", desc: "The Girl on Fire, leader of the rebellion" },
    { name: "Percy Jackson", desc: "The ADHD demigod son of Poseidon" },
    { name: "Geralt of Rivia", desc: "The mutant monster hunter seeking peace" },
    { name: "Odysseus", desc: "The cunning hero of the epic journey home" },
    { name: "Achilles", desc: "The greatest warrior of the Trojan War" },
    { name: "King Arthur", desc: "The legendary king who pulled the sword from the stone" },
    { name: "Robin Hood", desc: "The outlaw who stole from the rich and gave to the poor" },
    { name: "Merlin", desc: "The powerful wizard advisor to King Arthur" },
    { name: "Lancelot", desc: "The greatest knight of the Round Table" },
    { name: "Conan the Barbarian", desc: "The mighty Cimmerian warrior" },
    { name: "Paul Atreides", desc: "The messianic leader of the desert planet Dune" },
    { name: "Ender Wiggin", desc: "The child genius trained to save humanity" },
    { name: "Aslan", desc: "The great lion, creator of Narnia" },
    { name: "Mowgli", desc: "The boy raised by wolves in the jungle" },
    { name: "Long John Silver", desc: "The cunning one-legged pirate" },
    { name: "Ebenezer Scrooge", desc: "The miser visited by three Christmas ghosts" },
    { name: "Dorian Gray", desc: "The youth who hid his corruption in a portrait" },
    { name: "Phantom of the Opera", desc: "The masked musician haunting the Paris opera" },
    { name: "Lisbeth Salander", desc: "The brilliant and troubled hacker" },
    { name: "Hannibal Lecter", desc: "The cultured cannibalistic genius" },
    { name: "Little Prince", desc: "The boy from asteroid B 612 who loved a rose" },
    { name: "Pippi Longstocking", desc: "The strongest girl in the world who lives alone" },
    { name: "Matilda", desc: "The genius girl with telekinetic powers" },
    { name: "Jo March", desc: "The independent tomboy sister with a passion for writing" },
    { name: "Frodo", desc: "The brave ring-bearer of the Shire" },
    { name: "Holden Caulfield", desc: "The cynical teenager navigating post-war New York" },
    { name: "Severus Snape", desc: "The double agent Potions Master" },
    { name: "Sirius Black", desc: "The wrongly accused godfather and Marauder" },
    { name: "Bilbo Baggins", desc: "The unexpected adventurer who found the Ring" },
    { name: "Sauron", desc: "The Dark Lord seeking dominion over Middle-earth" },
    { name: "Tris Prior", desc: "The Divergent girl challenging the faction system" },
    { name: "Kvothe", desc: "The legendary name of the wind, musician and arcanist" },
    { name: "Kaladin Stormblessed", desc: "The broken soldier who became a Windrunner" },
    { name: "Tyrion Lannister", desc: "The drinking, knowing dwarf of Westeros" },
    { name: "Daenerys Targaryen", desc: "The Mother of Dragons, born of fire" },
    { name: "Jon Snow", desc: "The bastard who knew nothing but did everything" },
    { name: "Arya Stark", desc: "A girl has many names and deadly skills" },
    { name: "Rand al'Thor", desc: "The Dragon Reborn, destined to save or destroy the world" },
    { name: "Granny Weatherwax", desc: "The greatest witch on the Discworld" },
    { name: "Death (Discworld)", desc: "The skeleton who SPEAKS LIKE THIS and loves cats" },
    { name: "Anne Shirley", desc: "The imaginative red-haired orphan of Green Gables" },
    { name: "The Mad Hatter", desc: "The eccentric and whimsical tea party host" },
    { name: "White Rabbit", desc: "The perpetually late rabbit of Wonderland" },
    { name: "Snow White", desc: "The fairest princess who befriended seven dwarfs" },
    { name: "Rapunzel", desc: "The princess locked in a tower with magical hair" },
    { name: "Cinderella", desc: "The kind girl who lost a glass slipper at the ball" },
    { name: "Sleeping Beauty", desc: "The princess cursed to eternal slumber" },
    { name: "Dr. Jekyll & Mr. Hyde", desc: "The doctor with a monstrous alter ego" },
    { name: "Van Helsing", desc: "The vampire hunter tracking Count Dracula" },
    { name: "Captain Nemo", desc: "The enigmatic captain of the Nautilus submarine" },
    { name: "Mowgli", desc: "The man-cub raised by wolves in the jungle" },
    { name: "Beowulf", desc: "The legendary Geat hero who slew Grendel" },
    { name: "Ivan Drago", desc: "The imposing Russian boxer from Rocky IV" },
    { name: "Peeta Mellark", desc: "The baker's boy who loved Katniss" }
];

async function seedDB(tag, chars) {
    const client = await pool.connect();
    let n = 0;
    try {
        for (let i = 0; i < chars.length; i++) {
            const c = chars[i];
            const id = `${tag.toLowerCase().replace(/[^a-z0-9]/g,"")}-x-${Date.now()}-${i}`;
            await client.query(`INSERT INTO characters (id,name,tag,tags,description,long_description,image,greeting,personality,visibility,source,likes_count,chatter_count) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                [id, c.name, tag, JSON.stringify([tag]), c.desc, c.desc, c.image, `Hey! I'm ${c.name}. ${c.desc}. Want to chat?`, "iconic, memorable, beloved", "public", tag, Math.floor(Math.random()*2000+100), Math.floor(Math.random()*5000+200)]);
            n++;
        }
        console.log(`  ✅ Inserted ${n} for [${tag}]`);
    } catch(e) { console.error(`  ❌`,e.message); }
    finally { client.release(); }
}

async function main() {
    console.log("=== SEED MOVIES, TV, BOOKS ===\n");
    
    const avatars = await getAvatars(300);
    
    const tagData = { "Movies": MOVIES, "TV": TV, "Books": BOOKS };
    
    for (const [tag, chars] of Object.entries(tagData)) {
        console.log(`\n[${tag}] Seeding ${chars.length} characters...`);
        // Remove duplicates by name
        const unique = [];
        const seen = new Set();
        for (const c of chars) {
            if (!seen.has(c.name)) {
                seen.add(c.name);
                unique.push({ ...c, image: avatars[unique.length % avatars.length] });
            }
        }
        await seedDB(tag, unique.slice(0, 100));
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
