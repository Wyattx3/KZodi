const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
    connectionString: (process.env.DATABASE_URL || "").replace(/[?&]sslmode=[^&]*/g, ""),
    ssl: { rejectUnauthorized: false },
});
async function run() {
    const dupes = await pool.query('SELECT name, COUNT(*) as cnt FROM characters GROUP BY name HAVING COUNT(*) > 1 ORDER BY cnt DESC LIMIT 20');
    console.log('DUPLICATES:', dupes.rowCount);
    dupes.rows.forEach(r => console.log('  ' + r.name + ': ' + r.cnt));

    const broken = await pool.query("SELECT COUNT(*) as cnt FROM characters WHERE image LIKE '%ui-avatars%'");
    console.log('BROKEN IMAGES:', broken.rows[0].cnt);

    const tags = await pool.query('SELECT tag, count(*) as cnt FROM characters GROUP BY tag ORDER BY cnt DESC');
    console.log('\nFINAL TAG COUNTS:');
    let total = 0;
    tags.rows.forEach(r => { console.log('  ' + r.tag + ': ' + r.cnt); total += parseInt(r.cnt); });
    console.log('  TOTAL:', total);

    pool.end();
}
run();
