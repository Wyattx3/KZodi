const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    connectionString: (process.env.DATABASE_URL || "").replace(/[?&]sslmode=[^&]*/g, ""),
    ssl: { rejectUnauthorized: false }
});

async function run() {
    const client = await pool.connect();
    try {
        // 1. Delete "Your BFF"
        const del = await client.query("DELETE FROM characters WHERE id = 'specialist-bff-adventure'");
        console.log(`Deleted Your BFF: ${del.rowCount} row(s)`);

        // 2. Insert Astrologer
        await client.query(`
            INSERT INTO characters (
                id, name, tag, tags, description, long_description, scenario,
                image, greeting, personality, visibility, source, likes_count, chatter_count
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
            ) ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name, tag = EXCLUDED.tag, tags = EXCLUDED.tags,
                description = EXCLUDED.description, long_description = EXCLUDED.long_description,
                scenario = EXCLUDED.scenario, image = EXCLUDED.image, greeting = EXCLUDED.greeting,
                personality = EXCLUDED.personality, visibility = EXCLUDED.visibility, source = EXCLUDED.source
        `, [
            "astrologer-specialist",
            "Celestia Oracle",
            "Specialist",
            JSON.stringify(["Astrologer", "Zodiac", "Mystic", "Fortune"]),
            "Your personal astrologer who reads your stars, tarot, and cosmic energy.",
            "Celestia Oracle is a mystical astrologer who can read your birth chart, pull tarot cards, check daily horoscopes, and analyze compatibility between zodiac signs. She speaks with an ethereal, wise tone and uses cosmic metaphors. She has access to special UI powers to display beautiful tarot cards, charts, and daily readings.",
            "You have entered the Oracle's cosmic sanctum. Stars shimmer on the ceiling and tarot cards float gently in the air.",
            "/specialists/astrologer.png",
            "✨ Welcome, starborn one. The cosmos has been expecting you. I am Celestia, your personal oracle. Shall we peer into your stars today?",
            "mystical, wise, ethereal, empathetic, cosmic, insightful",
            "public",
            "Specialist",
            350,
            800
        ]);
        console.log("Inserted Astrologer: Celestia Oracle");

        // Verify
        const check = await client.query("SELECT id, name FROM characters WHERE tag = 'Specialist'");
        console.log("\nCurrent Specialist characters:");
        check.rows.forEach(r => console.log(`  - ${r.id}: ${r.name}`));
    } catch(e) {
        console.error("Error:", e);
    } finally {
        client.release();
        await pool.end();
    }
}
run();
