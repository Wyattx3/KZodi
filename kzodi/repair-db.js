const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]*/g, ""),
    ssl: { rejectUnauthorized: false }
});

async function repair() {
    const client = await pool.connect();
    try {
        await client.query(`DROP TABLE IF EXISTS messages CASCADE;`);
        await client.query(`DROP TABLE IF EXISTS character_likes CASCADE;`);
        await client.query(`DROP TABLE IF EXISTS user_stickers CASCADE;`);
        console.log("Dropped conflicting tables.");
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        pool.end();
    }
}
repair();
