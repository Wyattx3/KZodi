const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: (process.env.DATABASE_URL || "").replace(/[?&]sslmode=[^&]*/g, ""),
    ssl: { rejectUnauthorized: false },
});

async function main() {
    console.log("=== STEP 1: CLEANUP DUPLICATES & BROKEN IMAGES ===\n");

    // 1. Show current state
    const before = await pool.query("SELECT tag, count(*) as cnt FROM characters GROUP BY tag ORDER BY cnt DESC");
    console.log("BEFORE:");
    let totalBefore = 0;
    before.rows.forEach(r => { console.log(`  ${r.tag}: ${r.cnt}`); totalBefore += parseInt(r.cnt); });
    console.log(`  TOTAL: ${totalBefore}\n`);

    // 2. Delete duplicates (keep the one with the lowest id alphabetically)
    const dupeRes = await pool.query(`
        DELETE FROM characters 
        WHERE id NOT IN (
            SELECT MIN(id) FROM characters GROUP BY name, tag
        )
    `);
    console.log(`🗑️ Deleted ${dupeRes.rowCount} duplicate entries.`);

    // 3. Delete characters with ui-avatars fallback (broken images)
    const brokenRes = await pool.query("DELETE FROM characters WHERE image LIKE '%ui-avatars.com%'");
    console.log(`🗑️ Deleted ${brokenRes.rowCount} characters with broken fallback images.`);

    // 4. Show cleaned state
    const after = await pool.query("SELECT tag, count(*) as cnt FROM characters GROUP BY tag ORDER BY cnt DESC");
    console.log("\nAFTER CLEANUP:");
    let totalAfter = 0;
    after.rows.forEach(r => { console.log(`  ${r.tag}: ${r.cnt}`); totalAfter += parseInt(r.cnt); });
    console.log(`  TOTAL: ${totalAfter}`);
    console.log(`  Removed: ${totalBefore - totalAfter} characters total`);

    console.log("\n✅ Cleanup complete!");
    process.exit(0);
}

main();
