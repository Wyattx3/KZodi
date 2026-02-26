const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]*/g, ""),
    ssl: { rejectUnauthorized: false }
});

async function run() {
    const client = await pool.connect();
    try {
        console.log("Adding nickname column to characters table...");
        await client.query(`
      ALTER TABLE characters ADD COLUMN IF NOT EXISTS nickname VARCHAR(255);
    `);
        console.log("Successfully added nickname column.");
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        client.release();
        pool.end();
    }
}

run();
