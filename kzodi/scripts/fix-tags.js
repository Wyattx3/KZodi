const { Pool } = require("pg");
require("dotenv").config();

const DATABASE_URL = (process.env.DATABASE_URL || "").replace(/[?&]sslmode=[^&]*/g, "");

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    const client = await pool.connect();
    try {
        console.log("Moving all non-Specialist and non-Anime characters to the Anime tag...");
        const res = await client.query(`
            UPDATE characters 
            SET tag = 'Anime', tags = '["Anime"]'::jsonb 
            WHERE tag != 'Specialist' AND tag != 'Anime'
        `);
        console.log(`Successfully moved ${res.rowCount} leftover characters to the Anime tag.`);
    } catch(e) {
        console.error("Migration failed:", e);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
