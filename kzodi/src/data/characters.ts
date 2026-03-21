// Main Source Categories
export const SOURCE_CATEGORIES = [
    "All", "Stories", "Anime", "Manga", "Game", "K-pop", "Movies", "TV", "Books",
    "VTuber", "Original", "History", "Mythology", "Philosophy",
    "Celebrity", "Roleplay", "BL", "GL", "Specialist"
] as const;
export type Category = (typeof SOURCE_CATEGORIES)[number];

// Massive list of Character Tags
export const CHARACTER_TAGS = [
    "Tsundere", "Yandere", "Kuudere", "Dandere", "Genki", "Maid", "Butler",
    "Teacher", "Student", "Villain", "Hero", "Anti-Hero", "Monster", "Elf",
    "Demon", "Angel", "Vampire", "Werewolf", "Robot", "Android", "AI", "Cyborg",
    "Ghost", "Zombie", "Alien", "Pirate", "Ninja", "Samurai", "Knight", "Prince",
    "Princess", "King", "Queen", "Emperor", "Empress", "Idol", "Streamer", "Gamer",
    "Doctor", "Nurse", "Police", "Detective", "Spy", "Assassin", "Thief",
    "Mage", "Warrior", "Archer", "Healer", "Tank", "Support", "Boss", "God",
    "Goddess", "Demon Lord", "Protagonist", "Antagonist", "Mascot", "Pet",
    "Furry", "Monster Girl", "Rich", "Poor", "Genius", "Clumsy", "Shy",
    "Confident", "Cold", "Warm", "Strict", "Lazy", "Energetic", "Calm", "Mysterious"
] as const;

export interface Character {
    id: string;
    name: string;
    nickname?: string; // New: optional nickname
    tag: Category; // Kept as 'tag' for backward compatibility with components using it as main category
    tags?: string[]; // New: Multiple tags
    description: string;
    longDescription?: string; // New: Detailed info
    scenario?: string; // New
    exampleDialogue?: string; // New
    image: string;
    greeting: string;
    personality: string;
    visibility?: "public" | "private" | "unlisted"; // New
    source?: string; // New: Origin source (Anime, Game, Movie name)
    zodiac_sign?: string; // New
    birthday?: string; // New
    likes?: number; // Old unused property, use likesCount
    totalUsers?: number; // Old unused property, use chatterCount

    // Database properties
    creatorId?: string;
    msgCount?: number;
    likesCount?: number;
    chatterCount?: number;
    isPublic?: boolean;
    createdAt?: number;
    userHasLiked?: boolean;

    // Story metadata
    worldData?: any;
    storyData?: any;
}

export const CHARACTERS: Character[] = [];
