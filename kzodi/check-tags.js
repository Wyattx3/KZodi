const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const DATABASE_URL = (process.env.DATABASE_URL || "").replace(/[?&]sslmode=[^&]*/g, "");

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
});

async function check() {
    try {
        const res = await pool.query('SELECT DISTINCT tag FROM characters');
        console.log("Distinct main tags:", res.rows.map(r => r.tag));
        
        // Also check if 'tags' JSON array is being used
        const res3 = await pool.query('SELECT COUNT(*) FROM characters');
        console.log("Total characters:", res3.rows[0].count);
        
        // Let's count characters by tag
        const res4 = await pool.query('SELECT tag, COUNT(*) FROM characters GROUP BY tag');
        console.log("Characters by tag:", res4.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

check();
