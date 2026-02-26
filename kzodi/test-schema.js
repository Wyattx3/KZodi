const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]*/g, ""),
    ssl: { rejectUnauthorized: false }
});

async function run() {
    const client = await pool.connect();
    try {
        console.log("Creating messages table...");
        await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(255) PRIMARY KEY,
        conversation_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        content TEXT,
        timestamp BIGINT NOT NULL,
        status VARCHAR(50) DEFAULT 'sent',
        reply_to_id VARCHAR(255),
        reactions JSONB,
        attachment JSONB,
        sender_id VARCHAR(255),
        sender_name VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
        console.log("Creating msg_user_idx...");
        await client.query(`CREATE INDEX IF NOT EXISTS msg_user_idx ON messages (user_id);`);

        console.log("Creating character_likes table...");
        await client.query(`
      CREATE TABLE IF NOT EXISTS character_likes (
        character_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (character_id, user_id),
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
      )
    `);
        console.log("All done.");
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        client.release();
        pool.end();
    }
}
run();
