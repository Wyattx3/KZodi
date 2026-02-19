export interface StickerPackData {
    id: string;
    name: string;
    description: string;
    stickers: string[]; // List of prompts
    icon: string; // Emoji icon for the pack
    date: string; // ISO date string without time "YYYY-MM-DD"
}

// Initial set of packs (Themes)
// Initial set of packs (Themes)
// Initial set of packs (Themes)
export const PACK_THEMES = [
    {
        name: "Chubby Panda",
        description: "A cute chubby panda life",
        icon: "🐼",
        stickers: [
            "Chubby panda waving hello", "Chubby panda sleeping", "Chubby panda eating bamboo", "Chubby panda rolling",
            "Chubby panda crying", "Chubby panda angry", "Chubby panda laughing", "Chubby panda giving thumbs up",
            "Chubby panda working on laptop", "Chubby panda drinking boba", "Chubby panda confused", "Chubby panda in love",
            "Chubby panda shocked", "Chubby panda celebrating", "Chubby panda tired", "Chubby panda dancing",
            "Chubby panda holding heart", "Chubby panda wearing sunglasses", "Chubby panda with birthday cake", "Chubby panda saying goodbye"
        ]
    },
    {
        name: "Neon Robot",
        description: "A friendly neon robot helper",
        icon: "🤖",
        stickers: [
            "Cute neon robot saying hi", "Neon robot charging", "Neon robot processing data", "Neon robot error",
            "Neon robot happy", "Neon robot sad", "Neon robot dancing", "Neon robot flying",
            "Neon robot gaming", "Neon robot reading", "Neon robot taking photo", "Neon robot sleeping mode",
            "Neon robot thumbs up", "Neon robot heart eyes", "Neon robot waving", "Neon robot confused",
            "Neon robot high five", "Neon robot pointing", "Neon robot presenting", "Neon robot shutting down"
        ]
    },
    {
        name: "Magical Dragon",
        description: "Tiny green dragon adventures",
        icon: "🐉",
        stickers: [
            "Tiny green dragon flying", "Tiny green dragon breathing fire", "Tiny green dragon sleeping on gold", "Tiny green dragon hatching",
            "Tiny green dragon eating meat", "Tiny green dragon roaring cute", "Tiny green dragon hiding", "Tiny green dragon playing",
            "Tiny green dragon sad", "Tiny green dragon happy", "Tiny green dragon confused", "Tiny green dragon angry",
            "Tiny green dragon magical sparkles", "Tiny green dragon reading scroll", "Tiny green dragon wearing wizard hat", "Tiny green dragon flying fast",
            "Tiny green dragon hugging", "Tiny green dragon scared", "Tiny green dragon blinking", "Tiny green dragon waving"
        ]
    },
    {
        name: "Shiba Inu",
        description: "Funny Shiba Inu dog expressions",
        icon: "🐕",
        stickers: [
            "Shiba Inu smiling", "Shiba Inu judging you", "Shiba Inu bonk", "Shiba Inu sleeping",
            "Shiba Inu running", "Shiba Inu eating", "Shiba Inu begging", "Shiba Inu barking",
            "Shiba Inu waiting", "Shiba Inu excited", "Shiba Inu sad puppy eyes", "Shiba Inu wearing bandana",
            "Shiba Inu shaking hands", "Shiba Inu spinning", "Shiba Inu zoomies", "Shiba Inu tired",
            "Shiba Inu angry", "Shiba Inu curious", "Shiba Inu loaf", "Shiba Inu licking screen"
        ]
    },
    {
        name: "Pixel Ghost",
        description: "Retro glowing ghost character",
        icon: "👻",
        stickers: [
            "Pixel ghost boo", "Pixel ghost floating", "Pixel ghost scared", "Pixel ghost laughing",
            "Pixel ghost thumb up", "Pixel ghost eating dot", "Pixel ghost sleeping", "Pixel ghost gaming",
            "Pixel ghost glitching", "Pixel ghost heart", "Pixel ghost angry", "Pixel ghost crying",
            "Pixel ghost winking", "Pixel ghost disappearing", "Pixel ghost party", "Pixel ghost confused",
            "Pixel ghost holding flower", "Pixel ghost sunglasses", "Pixel ghost reading", "Pixel ghost waving"
        ]
    }
];

// Helper to get initial packs
export function getInitialPacks(): StickerPackData[] {
    const today = new Date().toISOString().split("T")[0];
    return PACK_THEMES.map((theme, index) => ({
        id: `pack-${index + 1}`,
        name: theme.name,
        description: theme.description,
        stickers: theme.stickers,
        icon: theme.icon,
        date: today // All initial packs set to "today" for simplicity
    }));
}

// Daily themes for generating new packs
export const DAILY_STICKER_THEMES = [
    // Animals
    { subject: "Astronaut Cat", icon: "🚀" },
    { subject: "Blue Jellyfish", icon: "🌊" },
    { subject: "Wise Old Owl", icon: "🦉" },
    { subject: "Ninja Hamster", icon: "🐹" },
    { subject: "Sleepy Sloth", icon: "🦥" },
    { subject: "Gentleman Frog", icon: "🐸" },
    { subject: "Baby Elephant", icon: "🐘" },
    { subject: "Party Corgi", icon: "🐕" },
    { subject: "Magic Unicorn", icon: "🦄" },
    { subject: "Fluffy Sheep", icon: "🐑" },

    // Food & Objects
    { subject: "Happy Bubble Tea", icon: "🧋" },
    { subject: "Cool Pineapple", icon: "🍍" },
    { subject: "Kawaii Sushi", icon: "🍣" },
    { subject: "Sweet Donut", icon: "🍩" },
    { subject: "Cheeky Pizza Slice", icon: "🍕" },
    { subject: "Cozy Coffee Cup", icon: "☕" },
    { subject: "Bouncing Burger", icon: "🍔" },
    { subject: "Lucky Fortune Cookie", icon: "🥠" },

    // Fantasy & Characters
    { subject: "Skater Boy", icon: "🛹" },
    { subject: "Gamer Girl", icon: "🎧" },
    { subject: "Alien Tourist", icon: "👽" },
    { subject: "Little Witch", icon: "🧙‍♀️" },
    { subject: "Cloud Angel", icon: "👼" },
    { subject: "Baby Demon", icon: "😈" },
    { subject: "Pixel Hero", icon: "⚔️" },
    { subject: "Flower Fairy", icon: "🧚" },
    { subject: "Detective Raccoon", icon: "🦝" },
    { subject: "Robo Buddy", icon: "🤖" }
];

// Helper to generate a new daily pack with consistent character seed
export function generateDailyPack(existingCount: number): StickerPackData {
    const today = new Date().toISOString().split("T")[0];

    // Use shared themes list
    const randomTheme = DAILY_STICKER_THEMES[Math.floor(Math.random() * DAILY_STICKER_THEMES.length)];
    const subject = randomTheme.subject;

    const actions = [
        "waving hello", "sleeping", "eating", "laughing", "crying", "angry", "thumbs up", "shrugging",
        "confused", "in love", "celebrating", "tired", "dancing", "working", "playing",
        "scared", "surprised", "thinking", "saying no", "saying yes"
    ];

    // Generate prompts: Subject + Action (Ensures consistent character)
    const stickers = actions.map(action => `${subject} ${action}`);

    return {
        id: `daily-${today}-${existingCount + 1}`,
        name: `Daily: ${subject}`,
        description: `New ${subject} stickers for today!`,
        stickers: stickers,
        icon: randomTheme.icon,
        date: today
    };
}

export function getForbiddenStickerSubjects(): string[] {
    const forbidden: string[] = [];

    // Add full names
    PACK_THEMES.forEach(t => forbidden.push(t.name));
    DAILY_STICKER_THEMES.forEach(t => forbidden.push(t.subject));

    // Add individual keywords (e.g. "Panda" from "Chubby Panda")
    const allThemes = [...PACK_THEMES.map(t => t.name), ...DAILY_STICKER_THEMES.map(t => t.subject)];

    allThemes.forEach(name => {
        const parts = name.split(" ");
        parts.forEach(p => {
            // Filter out common adjectives/verbs if needed, but mostly nouns are dangerous
            // Block words > 3 chars to avoid blocking "cat" (wait, "cat" is 3 chars and dangerous!)
            // Let's just block everything > 2 chars
            if (p.length > 2 && !forbidden.includes(p)) {
                forbidden.push(p);
            }
        });
    });

    return forbidden;
}
