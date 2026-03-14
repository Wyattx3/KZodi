require('dotenv').config();
const { Pool } = require('pg');

const DATABASE_URL = (process.env.DATABASE_URL || "").replace(/[?&]sslmode=[^&]*/g, "");

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function applyIndex() {
  console.log('Connecting to database:', DATABASE_URL.replace(/:[^:@]+@/, ':***@'));
  const client = await pool.connect();
  try {
    console.log('Creating index char_trending_idx...');
    await client.query(`CREATE INDEX IF NOT EXISTS char_trending_idx ON characters ((likes_count * 2 + msg_count) DESC);`);
    console.log('Index created successfully.');
  } catch (err) {
    console.error('Error creating index:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

applyIndex();
