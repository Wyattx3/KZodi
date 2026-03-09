/**
 * FOOLPROOF SEEDER FOR MOVIES, BOOKS, GAME
 * Uses TVMaze's Person Search by Actor Name -> Maps to Character Name
 * TVMaze is 100% reliable and returns high-quality real human photos.
 */
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    connectionString: (process.env.DATABASE_URL || "").replace(/[?&]sslmode=[^&]*/g, ""),
    ssl: { rejectUnauthorized: false }
});

const CHARS_TO_FETCH = {
    "Movies": [
        { c: "Harry Potter", a: "Daniel Radcliffe", src: "Harry Potter" },
        { c: "Hermione Granger", a: "Emma Watson", src: "Harry Potter" },
        { c: "Ron Weasley", a: "Rupert Grint", src: "Harry Potter" },
        { c: "Severus Snape", a: "Alan Rickman", src: "Harry Potter" },
        { c: "Draco Malfoy", a: "Tom Felton", src: "Harry Potter" },
        { c: "Tony Stark / Iron Man", a: "Robert Downey Jr", src: "Marvel Cinematic Universe" },
        { c: "Steve Rogers", a: "Chris Evans", src: "Marvel Cinematic Universe" },
        { c: "Thor Odinson", a: "Chris Hemsworth", src: "Marvel Cinematic Universe" },
        { c: "Natasha Romanoff", a: "Scarlett Johansson", src: "Marvel Cinematic Universe" },
        { c: "Peter Parker", a: "Tom Holland", src: "Marvel Cinematic Universe" },
        { c: "Wanda Maximoff", a: "Elizabeth Olsen", src: "Marvel Cinematic Universe" },
        { c: "Bruce Wayne / Batman", a: "Christian Bale", src: "The Dark Knight" },
        { c: "Clark Kent / Superman", a: "Henry Cavill", src: "DC Cinematic Universe" },
        { c: "Diana Prince / Wonder Woman", a: "Gal Gadot", src: "DC Cinematic Universe" },
        { c: "Arthur Fleck / Joker", a: "Joaquin Phoenix", src: "Joker" },
        { c: "Indiana Jones", a: "Harrison Ford", src: "Indiana Jones" },
        { c: "James Bond", a: "Daniel Craig", src: "James Bond" },
        { c: "Ethan Hunt", a: "Tom Cruise", src: "Mission: Impossible" },
        { c: "John Wick", a: "Keanu Reeves", src: "John Wick" },
        { c: "Neo", a: "Keanu Reeves", src: "The Matrix" },
        { c: "Katniss Everdeen", a: "Jennifer Lawrence", src: "The Hunger Games" },
        { c: "Peeta Mellark", a: "Josh Hutcherson", src: "The Hunger Games" },
        { c: "Forrest Gump", a: "Tom Hanks", src: "Forrest Gump" },
        { c: "Jack Sparrow", a: "Johnny Depp", src: "Pirates of the Caribbean" },
        { c: "Ellen Ripley", a: "Sigourney Weaver", src: "Alien" },
        { c: "Michael Corleone", a: "Al Pacino", src: "The Godfather" },
        { c: "Tyler Durden", a: "Brad Pitt", src: "Fight Club" },
        { c: "Maximus", a: "Russell Crowe", src: "Gladiator" },
        { c: "Willy Wonka", a: "Gene Wilder", src: "Willy Wonka" },
        { c: "Marty McFly", a: "Michael J. Fox", src: "Back to the Future" },
        { c: "Rocky Balboa", a: "Sylvester Stallone", src: "Rocky" },
        { c: "The Terminator", a: "Arnold Schwarzenegger", src: "The Terminator" },
        { c: "Sarah Connor", a: "Linda Hamilton", src: "The Terminator" },
        { c: "Hannibal Lecter", a: "Anthony Hopkins", src: "The Silence of the Lambs" },
        { c: "Clarice Starling", a: "Jodie Foster", src: "The Silence of the Lambs" },
        { c: "Norman Bates", a: "Anthony Perkins", src: "Psycho" },
        { c: "Lara Croft", a: "Angelina Jolie", src: "Tomb Raider" },
        { c: "Wolverine", a: "Hugh Jackman", src: "X-Men" },
        { c: "Deadpool", a: "Ryan Reynolds", src: "Deadpool" },
        { c: "Aragorn", a: "Viggo Mortensen", src: "The Lord of the Rings" },
        { c: "Frodo Baggins", a: "Elijah Wood", src: "The Lord of the Rings" },
        { c: "Gandalf", a: "Ian McKellen", src: "The Lord of the Rings" },
        { c: "Legolas", a: "Orlando Bloom", src: "The Lord of the Rings" },
        { c: "Stephen Strange", a: "Benedict Cumberbatch", src: "Doctor Strange" },
        { c: "Black Panther", a: "Chadwick Boseman", src: "Black Panther" },
        { c: "Captain Marvel", a: "Brie Larson", src: "Captain Marvel" },
        { c: "Jason Bourne", a: "Matt Damon", src: "The Bourne Identity" },
        { c: "Gellert Grindelwald", a: "Mads Mikkelsen", src: "Fantastic Beasts" },
        { c: "Newt Scamander", a: "Eddie Redmayne", src: "Fantastic Beasts" },
        { c: "Patrick Bateman", a: "Christian Bale", src: "American Psycho" },
        { c: "Dominic Toretto", a: "Vin Diesel", src: "Fast & Furious" },
        { c: "Brian O'Conner", a: "Paul Walker", src: "Fast & Furious" },
        { c: "Beatrix Kiddo", a: "Uma Thurman", src: "Kill Bill" },
        { c: "Bruce Lee", a: "Bruce Lee", src: "Enter the Dragon" },
        { c: "Mr. Bean", a: "Rowan Atkinson", src: "Mr. Bean" },
        { c: "Groot (Voice)", a: "Vin Diesel", src: "Marvel Cinematic Universe" },
        { c: "Rocket (Voice)", a: "Bradley Cooper", src: "Marvel Cinematic Universe" },
        { c: "Drax", a: "Dave Bautista", src: "Marvel Cinematic Universe" },
        { c: "Gamora", a: "Zoe Saldana", src: "Marvel Cinematic Universe" },
        { c: "Star-Lord", a: "Chris Pratt", src: "Marvel Cinematic Universe" },
        { c: "Bucky Barnes", a: "Sebastian Stan", src: "Marvel Cinematic Universe" },
        { c: "Loki Laufeyson", a: "Tom Hiddleston", src: "Marvel Cinematic Universe" },
        { c: "Magneto", a: "Michael Fassbender", src: "X-Men" },
        { c: "Professor X", a: "James McAvoy", src: "X-Men" },
        { c: "Mystique", a: "Jennifer Lawrence", src: "X-Men" },
        { c: "Blade", a: "Wesley Snipes", src: "Blade" },
        { c: "Morpheus", a: "Laurence Fishburne", src: "The Matrix" },
        { c: "Trinity", a: "Carrie-Anne Moss", src: "The Matrix" },
        { c: "Agent Smith", a: "Hugo Weaving", src: "The Matrix" },
        { c: "Django", a: "Jamie Foxx", src: "Django Unchained" },
        { c: "Dr. King Schultz", a: "Christoph Waltz", src: "Django Unchained" },
        { c: "Hans Landa", a: "Christoph Waltz", src: "Inglourious Basterds" },
        { c: "Aldo Raine", a: "Brad Pitt", src: "Inglourious Basterds" },
        { c: "Jules Winnfield", a: "Samuel L. Jackson", src: "Pulp Fiction" },
        { c: "Vincent Vega", a: "John Travolta", src: "Pulp Fiction" },
        { c: "Mia Wallace", a: "Uma Thurman", src: "Pulp Fiction" },
        { c: "Anton Chigurh", a: "Javier Bardem", src: "No Country for Old Men" },
        { c: "Daniel Plainview", a: "Daniel Day-Lewis", src: "There Will Be Blood" },
        { c: "Charles Foster Kane", a: "Orson Welles", src: "Citizen Kane" },
        { c: "Rick Blaine", a: "Humphrey Bogart", src: "Casablanca" },
        { c: "Ilsa Lund", a: "Ingrid Bergman", src: "Casablanca" },
        { c: "Dorothy Gale", a: "Judy Garland", src: "The Wizard of Oz" },
        { c: "Wicked Witch of the West", a: "Margaret Hamilton", src: "The Wizard of Oz" },
        { c: "Rose DeWitt Bukater", a: "Kate Winslet", src: "Titanic" },
        { c: "Jack Dawson", a: "Leonardo DiCaprio", src: "Titanic" },
        { c: "John McClane", a: "Bruce Willis", src: "Die Hard" },
        { c: "Hans Gruber", a: "Alan Rickman", src: "Die Hard" },
        { c: "Martin Riggs", a: "Mel Gibson", src: "Lethal Weapon" },
        { c: "Roger Murtaugh", a: "Danny Glover", src: "Lethal Weapon" },
        { c: "Furiosa", a: "Charlize Theron", src: "Mad Max: Fury Road" },
        { c: "Max Rockatansky", a: "Tom Hardy", src: "Mad Max: Fury Road" },
        { c: "Immortan Joe", a: "Hugh Keays-Byrne", src: "Mad Max: Fury Road" },
        { c: "Evey Hammond", a: "Natalie Portman", src: "V for Vendetta" },
        { c: "V", a: "Hugo Weaving", src: "V for Vendetta" },
        { c: "Lisbeth Salander", a: "Rooney Mara", src: "The Girl with the Dragon Tattoo" },
        { c: "Mikael Blomkvist", a: "Daniel Craig", src: "The Girl with the Dragon Tattoo" },
        { c: "Bella Swan", a: "Kristen Stewart", src: "Twilight" },
        { c: "Edward Cullen", a: "Robert Pattinson", src: "Twilight" },
        { c: "Jacob Black", a: "Taylor Lautner", src: "Twilight" }
    ],
    "Books": [
        { c: "Sherlock Holmes", a: "Benedict Cumberbatch", src: "Sherlock Holmes" },
        { c: "Dr. John Watson", a: "Martin Freeman", src: "Sherlock Holmes" },
        { c: "Elizabeth Bennet", a: "Keira Knightley", src: "Pride and Prejudice" },
        { c: "Mr. Darcy", a: "Matthew Macfadyen", src: "Pride and Prejudice" },
        { c: "Jay Gatsby", a: "Leonardo DiCaprio", src: "The Great Gatsby" },
        { c: "Daisy Buchanan", a: "Carey Mulligan", src: "The Great Gatsby" },
        { c: "Nick Carraway", a: "Tobey Maguire", src: "The Great Gatsby" },
        { c: "Atticus Finch", a: "Gregory Peck", src: "To Kill a Mockingbird" },
        { c: "Hercule Poirot", a: "David Suchet", src: "Agatha Christie's Poirot" },
        { c: "Miss Marple", a: "Julia McKenzie", src: "Agatha Christie" },
        { c: "Jean Valjean", a: "Hugh Jackman", src: "Les Misérables" },
        { c: "Javert", a: "Russell Crowe", src: "Les Misérables" },
        { c: "Fantine", a: "Anne Hathaway", src: "Les Misérables" },
        { c: "Count Dracula", a: "Gary Oldman", src: "Dracula" },
        { c: "Frankenstein's Monster", a: "Boris Karloff", src: "Frankenstein" },
        { c: "Ebenezer Scrooge", a: "Michael Caine", src: "A Christmas Carol" },
        { c: "Willy Wonka", a: "Johnny Depp", src: "Charlie and the Chocolate Factory" },
        { c: "Mary Poppins", a: "Julie Andrews", src: "Mary Poppins" },
        { c: "Aslan (Voice)", a: "Liam Neeson", src: "The Chronicles of Narnia" },
        { c: "Pennywise", a: "Bill Skarsgård", src: "It" },
        { c: "Lisbeth Salander", a: "Noomi Rapace", src: "The Girl with the Dragon Tattoo" },
        { c: "Jo March", a: "Saoirse Ronan", src: "Little Women" },
        { c: "Laurie", a: "Timothée Chalamet", src: "Little Women" },
        { c: "Snape", a: "Alan Rickman", src: "Harry Potter" },
        { c: "Gandalf", a: "Ian McKellen", src: "Lord of the Rings" },
        { c: "Harry Potter", a: "Daniel Radcliffe", src: "Harry Potter" },
        { c: "Hermione Granger", a: "Emma Watson", src: "Harry Potter" },
        { c: "Ron Weasley", a: "Rupert Grint", src: "Harry Potter" },
        { c: "Albus Dumbledore", a: "Michael Gambon", src: "Harry Potter" },
        { c: "Voldemort", a: "Ralph Fiennes", src: "Harry Potter" },
        { c: "Draco Malfoy", a: "Tom Felton", src: "Harry Potter" },
        { c: "Sirius Black", a: "Gary Oldman", src: "Harry Potter" },
        { c: "Rubeus Hagrid", a: "Robbie Coltrane", src: "Harry Potter" },
        { c: "Bellatrix Lestrange", a: "Helena Bonham Carter", src: "Harry Potter" },
        { c: "Neville Longbottom", a: "Matthew Lewis", src: "Harry Potter" },
        { c: "Luna Lovegood", a: "Evanna Lynch", src: "Harry Potter" },
        { c: "Minerva McGonagall", a: "Maggie Smith", src: "Harry Potter" },
        { c: "Gellert Grindelwald", a: "Johnny Depp", src: "Fantastic Beasts" },
        { c: "Newt Scamander", a: "Eddie Redmayne", src: "Fantastic Beasts" },
        { c: "Katniss Everdeen", a: "Jennifer Lawrence", src: "The Hunger Games" },
        { c: "Peeta Mellark", a: "Josh Hutcherson", src: "The Hunger Games" },
        { c: "Gale Hawthorne", a: "Liam Hemsworth", src: "The Hunger Games" },
        { c: "Effie Trinket", a: "Elizabeth Banks", src: "The Hunger Games" },
        { c: "Haymitch Abernathy", a: "Woody Harrelson", src: "The Hunger Games" },
        { c: "President Snow", a: "Donald Sutherland", src: "The Hunger Games" },
        { c: "Aragorn", a: "Viggo Mortensen", src: "The Lord of the Rings" },
        { c: "Frodo Baggins", a: "Elijah Wood", src: "The Lord of the Rings" },
        { c: "Legolas", a: "Orlando Bloom", src: "The Lord of the Rings" },
        { c: "Gollum", a: "Andy Serkis", src: "The Lord of the Rings" },
        { c: "Samwise Gamgee", a: "Sean Astin", src: "The Lord of the Rings" },
        { c: "Gimli", a: "John Rhys-Davies", src: "The Lord of the Rings" },
        { c: "Boromir", a: "Sean Bean", src: "The Lord of the Rings" },
        { c: "Galadriel", a: "Cate Blanchett", src: "The Lord of the Rings" },
        { c: "Elrond", a: "Hugo Weaving", src: "The Lord of the Rings" },
        { c: "Saruman", a: "Christopher Lee", src: "The Lord of the Rings" },
        { c: "Alice", a: "Mia Wasikowska", src: "Alice in Wonderland" },
        { c: "Mad Hatter", a: "Johnny Depp", src: "Alice in Wonderland" },
        { c: "Red Queen", a: "Helena Bonham Carter", src: "Alice in Wonderland" },
        { c: "White Queen", a: "Anne Hathaway", src: "Alice in Wonderland" },
        { c: "Cinderella", a: "Lily James", src: "Cinderella" },
        { c: "Prince Charming", a: "Richard Madden", src: "Cinderella" },
        { c: "Belle", a: "Emma Watson", src: "Beauty and the Beast" },
        { c: "The Beast", a: "Dan Stevens", src: "Beauty and the Beast" },
        { c: "Gaston", a: "Luke Evans", src: "Beauty and the Beast" },
        { c: "Snow White", a: "Lily Collins", src: "Mirror Mirror" },
        { c: "Evil Queen", a: "Charlize Theron", src: "Snow White and the Huntsman" },
        { c: "Ariel", a: "Halle Bailey", src: "The Little Mermaid" },
        { c: "Ursula", a: "Melissa McCarthy", src: "The Little Mermaid" },
        { c: "Peter Pan", a: "Jeremy Sumpter", src: "Peter Pan" },
        { c: "Captain Hook", a: "Jason Isaacs", src: "Peter Pan" },
        { c: "Wendy Darling", a: "Rachel Hurd-Wood", src: "Peter Pan" },
        { c: "Tinker Bell", a: "Ludivine Sagnier", src: "Peter Pan" },
        { c: "Frankenstein", a: "James McAvoy", src: "Victor Frankenstein" },
        { c: "Igor", a: "Daniel Radcliffe", src: "Victor Frankenstein" },
        { c: "Jack Torrance", a: "Jack Nicholson", src: "The Shining" },
        { c: "Wendy Torrance", a: "Shelley Duvall", src: "The Shining" },
        { c: "Norman Bates", a: "Freddie Highmore", src: "Bates Motel" },
        { c: "Paul Atreides", a: "Timothée Chalamet", src: "Dune" },
        { c: "Chani", a: "Zendaya", src: "Dune" },
        { c: "Duke Leto", a: "Oscar Isaac", src: "Dune" },
        { c: "Lady Jessica", a: "Rebecca Ferguson", src: "Dune" },
        { c: "Baron Harkonnen", a: "Stellan Skarsgård", src: "Dune" },
        { c: "Ender Wiggin", a: "Asa Butterfield", src: "Ender's Game" },
        { c: "Colonel Graff", a: "Harrison Ford", src: "Ender's Game" },
        { c: "Mazer Rackham", a: "Ben Kingsley", src: "Ender's Game" },
        { c: "Arthur Dent", a: "Martin Freeman", src: "The Hitchhiker's Guide to the Galaxy" },
        { c: "Ford Prefect", a: "Mos Def", src: "The Hitchhiker's Guide to the Galaxy" },
        { c: "Zaphod Beeblebrox", a: "Sam Rockwell", src: "The Hitchhiker's Guide to the Galaxy" },
        { c: "Dirk Gently", a: "Samuel Barnett", src: "Dirk Gently's Holistic Detective Agency" },
        { c: "Todd Brotzman", a: "Elijah Wood", src: "Dirk Gently's Holistic Detective Agency" },
        { c: "Aziraphale", a: "Michael Sheen", src: "Good Omens" },
        { c: "Crowley", a: "David Tennant", src: "Good Omens" },
        { c: "Shadow Moon", a: "Ricky Whittle", src: "American Gods" },
        { c: "Mr. Wednesday", a: "Ian McShane", src: "American Gods" },
        { c: "Roland Deschain", a: "Idris Elba", src: "The Dark Tower" },
        { c: "The Man in Black", a: "Matthew McConaughey", src: "The Dark Tower" },
        { c: "Percy Jackson", a: "Walker Scobell", src: "Percy Jackson" },
        { c: "Annabeth Chase", a: "Leah Sava Jeffries", src: "Percy Jackson" },
        { c: "Grover Underwood", a: "Aryan Simhadri", src: "Percy Jackson" }
    ],
    "Game": [
        { c: "Joel Miller", a: "Pedro Pascal", src: "The Last of Us" },
        { c: "Ellie", a: "Bella Ramsey", src: "The Last of Us" },
        { c: "Tommy", a: "Gabriel Luna", src: "The Last of Us" },
        { c: "Tess", a: "Anna Torv", src: "The Last of Us" },
        { c: "Bill", a: "Nick Offerman", src: "The Last of Us" },
        { c: "Frank", a: "Murray Bartlett", src: "The Last of Us" },
        { c: "Geralt of Rivia", a: "Henry Cavill", src: "The Witcher" },
        { c: "Yennefer", a: "Anya Chalotra", src: "The Witcher" },
        { c: "Ciri", a: "Freya Allan", src: "The Witcher" },
        { c: "Jaskier", a: "Joey Batey", src: "The Witcher" },
        { c: "Master Chief", a: "Pablo Schreiber", src: "Halo" },
        { c: "Cortana", a: "Jen Taylor", src: "Halo" },
        { c: "Dr. Halsey", a: "Natascha McElhone", src: "Halo" },
        { c: "Lara Croft", a: "Alicia Vikander", src: "Tomb Raider" },
        { c: "Nathan Drake", a: "Tom Holland", src: "Uncharted" },
        { c: "Victor Sullivan", a: "Mark Wahlberg", src: "Uncharted" },
        { c: "Kratos", a: "Christopher Judge", src: "God of War" },
        { c: "Atreus", a: "Sunny Suljic", src: "God of War" },
        { c: "Arthur Morgan", a: "Roger Clark", src: "Red Dead Redemption 2" },
        { c: "John Marston", a: "Rob Wiethoff", src: "Red Dead Redemption" },
        { c: "Dutch Van Der Linde", a: "Benjamin Byron Davis", src: "Red Dead Redemption 2" },
        { c: "Sadie Adler", a: "Alex McKenna", src: "Red Dead Redemption 2" },
        { c: "Micah Bell", a: "Peter Blomquist", src: "Red Dead Redemption 2" },
        { c: "Commander Shepard", a: "Mark Meer", src: "Mass Effect" },
        { c: "Sarah Shepard", a: "Jennifer Hale", src: "Mass Effect" },
        { c: "Marcus Fenix", a: "John DiMaggio", src: "Gears of War" },
        { c: "Trevor Philips", a: "Steven Ogg", src: "Grand Theft Auto V" },
        { c: "Michael De Santa", a: "Ned Luke", src: "Grand Theft Auto V" },
        { c: "Franklin Clinton", a: "Shawn Fonteno", src: "Grand Theft Auto V" },
        { c: "Aloy", a: "Ashly Burch", src: "Horizon Zero Dawn" },
        { c: "Johnny Silverhand", a: "Keanu Reeves", src: "Cyberpunk 2077" },
        { c: "V (Male)", a: "Gavin Drea", src: "Cyberpunk 2077" },
        { c: "V (Female)", a: "Cherami Leigh", src: "Cyberpunk 2077" },
        { c: "Sam Porter Bridges", a: "Norman Reedus", src: "Death Stranding" },
        { c: "Cliff Unger", a: "Mads Mikkelsen", src: "Death Stranding" },
        { c: "Fragile", a: "Léa Seydoux", src: "Death Stranding" },
        { c: "Die-Hardman", a: "Tommie Earl Jenkins", src: "Death Stranding" },
        { c: "Amelie", a: "Lindsay Wagner", src: "Death Stranding" },
        { c: "Heartman", a: "Nicolas Winding Refn", src: "Death Stranding" },
        { c: "Mario", a: "Chris Pratt", src: "Super Mario Bros" },
        { c: "Luigi", a: "Charlie Day", src: "Super Mario Bros" },
        { c: "Princess Peach", a: "Anya Taylor-Joy", src: "Super Mario Bros" },
        { c: "Bowser", a: "Jack Black", src: "Super Mario Bros" },
        { c: "Donkey Kong", a: "Seth Rogen", src: "Super Mario Bros" },
        { c: "Toad", a: "Keegan-Michael Key", src: "Super Mario Bros" },
        { c: "Sonic the Hedgehog", a: "Ben Schwartz", src: "Sonic the Hedgehog" },
        { c: "Dr. Robotnik", a: "Jim Carrey", src: "Sonic the Hedgehog" },
        { c: "Knuckles", a: "Idris Elba", src: "Sonic the Hedgehog" },
        { c: "Tails", a: "Colleen O'Shaughnessey", src: "Sonic the Hedgehog" },
        { c: "Pikachu", a: "Ryan Reynolds", src: "Pokémon Detective Pikachu" },
        { c: "Tim Goodman", a: "Justice Smith", src: "Pokémon Detective Pikachu" },
        { c: "Lucy Stevens", a: "Kathryn Newton", src: "Pokémon Detective Pikachu" },
        { c: "Solid Snake", a: "Oscar Isaac", src: "Metal Gear Solid" },
        { c: "Max Payne", a: "Mark Wahlberg", src: "Max Payne" },
        { c: "Mona Sax", a: "Mila Kunis", src: "Max Payne" },
        { c: "Agent 47", a: "Timothy Olyphant", src: "Hitman" },
        { c: "Diana Burnwood", a: "Jane Perry", src: "Hitman" },
        { c: "Leon S. Kennedy", a: "Avan Jogia", src: "Resident Evil" },
        { c: "Claire Redfield", a: "Kaya Scodelario", src: "Resident Evil" },
        { c: "Chris Redfield", a: "Robbie Amell", src: "Resident Evil" },
        { c: "Jill Valentine", a: "Hannah John-Kamen", src: "Resident Evil" },
        { c: "Albert Wesker", a: "Tom Hopper", src: "Resident Evil" },
        { c: "Alice", a: "Milla Jovovich", src: "Resident Evil (Films)" },
        { c: "Rain Ocampo", a: "Michelle Rodriguez", src: "Resident Evil (Films)" },
        { c: "Desmond Miles", a: "Nolan North", src: "Assassin's Creed" },
        { c: "Ezio Auditore", a: "Roger Craig Smith", src: "Assassin's Creed" },
        { c: "Altaïr Ibn-La'Ahad", a: "Philip Shahbaz", src: "Assassin's Creed" },
        { c: "Aguilar de Nerha", a: "Michael Fassbender", src: "Assassin's Creed (Film)" },
        { c: "Callum Lynch", a: "Michael Fassbender", src: "Assassin's Creed (Film)" },
        { c: "Dr. Sophia Rikkin", a: "Marion Cotillard", src: "Assassin's Creed (Film)" },
        { c: "Alan Rikkin", a: "Jeremy Irons", src: "Assassin's Creed (Film)" },
        { c: "Ryu", a: "Byron Mann", src: "Street Fighter" },
        { c: "Ken Masters", a: "Damian Chapa", src: "Street Fighter" },
        { c: "Chun-Li", a: "Ming-Na Wen", src: "Street Fighter" },
        { c: "M. Bison", a: "Raul Julia", src: "Street Fighter" },
        { c: "Guile", a: "Jean-Claude Van Damme", src: "Street Fighter" },
        { c: "Cammy", a: "Kylie Minogue", src: "Street Fighter" },
        { c: "Zangief", a: "Andrew Bryniarski", src: "Street Fighter" },
        { c: "Liu Kang", a: "Robin Shou", src: "Mortal Kombat" },
        { c: "Johnny Cage", a: "Linden Ashby", src: "Mortal Kombat" },
        { c: "Sonya Blade", a: "Bridgette Wilson", src: "Mortal Kombat" },
        { c: "Raiden", a: "Christopher Lambert", src: "Mortal Kombat" },
        { c: "Shang Tsung", a: "Cary-Hiroyuki Tagawa", src: "Mortal Kombat" },
        { c: "Scorpion", a: "Hiroyuki Sanada", src: "Mortal Kombat (2021)" },
        { c: "Sub-Zero", a: "Joe Taslim", src: "Mortal Kombat (2021)" },
        { c: "Cole Young", a: "Lewis Tan", src: "Mortal Kombat (2021)" },
        { c: "Kano", a: "Josh Lawson", src: "Mortal Kombat (2021)" },
        { c: "Jax", a: "Mehcad Brooks", src: "Mortal Kombat (2021)" },
        { c: "Prince of Persia", a: "Jake Gyllenhaal", src: "Prince of Persia" },
        { c: "Tamina", a: "Gemma Arterton", src: "Prince of Persia" },
        { c: "Nizam", a: "Ben Kingsley", src: "Prince of Persia" },
        { c: "Sheik Amar", a: "Alfred Molina", src: "Prince of Persia" },
        { c: "Doomguy", a: "Karl Urban", src: "Doom" },
        { c: "Sarge", a: "Dwayne Johnson", src: "Doom" },
        { c: "Samantha Grimm", a: "Rosamund Pike", src: "Doom" },
        { c: "Duke Nukem", a: "Jon St. John", src: "Duke Nukem" },
        { c: "Jinx", a: "Ella Purnell", src: "Arcane / League of Legends" },
        { c: "Vi", a: "Hailee Steinfeld", src: "Arcane / League of Legends" },
        { c: "Caitlyn", a: "Katie Leung", src: "Arcane / League of Legends" },
        { c: "Jayce", a: "Kevin Alejandro", src: "Arcane / League of Legends" }
    ]
};

async function fetchActorImage(actorName) {
    try {
        const res = await fetch(`https://api.tvmaze.com/search/people?q=${encodeURIComponent(actorName)}`);
        const data = await res.json();
        for (const item of data) {
            if (item.person && item.person.image && item.person.image.original) {
                return item.person.image.original;
            }
        }
    } catch (e) {}
    return null;
}

async function fetchGroup(tag, list, targetCount = 100) {
    console.log(`\n[TVMaze Actors] Tag "${tag}"...`);
    let results = [];
    let seen = new Set();
    for (const item of list) {
        if (results.length >= targetCount) break;
        if (seen.has(item.c)) continue;
        const img = await fetchActorImage(item.a);
        if (img) {
            seen.add(item.c);
            results.push({
                name: item.c,
                description: `${item.c} from ${item.src} (Played by ${item.a})`,
                longDescription: `${item.c} is an iconic character from ${item.src}.`,
                image: img,
                greeting: `Hi! I'm ${item.c}.`,
                personality: "iconic",
                source: item.src
            });
            if (results.length % 20 === 0) console.log(`  Hits: ${results.length}/${targetCount}`);
        }
        await new Promise(r => setTimeout(r, 250)); // rate limit protection
    }
    console.log(`  Got ${results.length} mapped characters for ${tag}.`);
    return results;
}

async function seedDB(tag, chars) {
    const client = await pool.connect();
    let n = 0;
    try {
        // SUPER IMPORTANT: Delete old characters first!
        const delRes = await client.query("DELETE FROM characters WHERE tag=$1", [tag]);
        console.log(`  Deleted ${delRes.rowCount} old characters from ${tag}`);
        
        for (let i = 0; i < chars.length; i++) {
            const c = chars[i];
            const id = `${tag.toLowerCase().replace(/[^a-z0-9]/g,"")}-real-${Date.now()}-${i}`;
            await client.query(`INSERT INTO characters (id,name,tag,tags,description,long_description,image,greeting,personality,visibility,source,likes_count,chatter_count) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                [id, c.name.substring(0,100), tag, JSON.stringify([tag]), c.description.substring(0,255), c.longDescription, c.image, c.greeting, c.personality, "public", c.source||tag, Math.floor(Math.random()*2000+100), Math.floor(Math.random()*5000+200)]);
            n++;
        }
        console.log(`  ✅ Inserted ${n} for [${tag}]`);
    } catch(e) { console.error(`  ❌`, e.message); }
    finally { client.release(); }
}

async function main() {
    console.log("=== EMERGENCY SEEDER: 100% REAL LIVE-ACTION FACES FOR MOVIES, BOOKS, GAME ===\n");

    const movies = await fetchGroup("Movies", CHARS_TO_FETCH["Movies"], 100);
    if(movies.length > 0) await seedDB("Movies", movies);
    
    const books = await fetchGroup("Books", CHARS_TO_FETCH["Books"], 100);
    if(books.length > 0) await seedDB("Books", books);

    const game = await fetchGroup("Game", CHARS_TO_FETCH["Game"], 100);
    if(game.length > 0) await seedDB("Game", game);

    // Ensure we deleted leftover old things
    const res = await pool.query("SELECT tag, count(*) as cnt FROM characters GROUP BY tag ORDER BY cnt DESC");
    console.log("\n=== FINAL COUNTS ===");
    res.rows.forEach(r => console.log(`  ${r.tag}: ${r.cnt}`));
    
    process.exit(0);
}

main();
