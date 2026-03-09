const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbUrl = process.env.DATABASE_URL;
const pool = new Pool({
    connectionString: dbUrl + (dbUrl.includes('?') ? '&' : '?') + 'sslmode=no-verify',
    ssl: { rejectUnauthorized: false }
});

async function main() {
    const del = await pool.query("DELETE FROM characters WHERE tag NOT IN ('Anime', 'Specialist')");
    console.log('Deleted', del.rowCount, 'characters');
    const res = await pool.query('SELECT tag, count(*) FROM characters GROUP BY tag ORDER BY tag');
    console.table(res.rows);
    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
