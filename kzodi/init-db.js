const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]*/g, ""),
    ssl: { rejectUnauthorized: false }
});

async function init() {
    const client = await pool.connect();
    try {
        await client.query(`
      CREATE TABLE IF NOT EXISTS characters (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        tag VARCHAR(100) NOT NULL,
        tags JSONB,
        description TEXT NOT NULL,
        long_description TEXT,
        scenario TEXT,
        example_dialogue TEXT,
        image TEXT NOT NULL,
        greeting TEXT NOT NULL,
        personality TEXT NOT NULL,
        visibility VARCHAR(50) DEFAULT 'public',
        source VARCHAR(255),
        zodiac_sign VARCHAR(50),
        birthday VARCHAR(50),
        creator_id VARCHAR(255),
        likes_count INTEGER DEFAULT 0,
        msg_count INTEGER DEFAULT 0,
        chatter_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
        await client.query(`CREATE INDEX IF NOT EXISTS char_tag_idx ON characters (tag);`);
        await client.query(`CREATE INDEX IF NOT EXISTS char_visibility_idx ON characters (visibility);`);
        await client.query(`CREATE INDEX IF NOT EXISTS char_likes_idx ON characters (likes_count DESC);`);
        await client.query(`CREATE INDEX IF NOT EXISTS char_msg_count_idx ON characters (msg_count DESC);`);
        console.log("Characters table created successfully.");
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        pool.end();
    }
}
init();
