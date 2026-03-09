require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: (process.env.DATABASE_URL || "").replace(/[?&]sslmode=[^&]*/g, ""),
    ssl: { rejectUnauthorized: false }
});

async function main() {
    const client = await pool.connect();
    try {
        const res = await client.query('SELECT DISTINCT tag, COUNT(*) FROM characters GROUP BY tag');
        console.log(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        process.exit(0);
    }
}

main();
