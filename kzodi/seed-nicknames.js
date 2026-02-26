const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]*/g, ""),
    ssl: { rejectUnauthorized: false }
});

async function run() {
    const client = await pool.connect();
    try {
        console.log("Setting default nicknames for existing characters...");
        await client.query(`
      UPDATE characters 
      SET nickname = 'The ' || tag 
      WHERE nickname IS NULL;
    `);
        console.log("Successfully updated.");
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        client.release();
        pool.end();
    }
}

run();
