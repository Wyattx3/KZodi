require("dotenv").config();
const { Pool } = require("pg");
const p = new Pool({
    connectionString: (process.env.DATABASE_URL || "").replace(/[?&]sslmode=[^&]*/g, ""),
    ssl: { rejectUnauthorized: false }
});

async function check() {
    const tags = ["K-pop","History","Celebrity","Movies","TV","Books","Mythology","Philosophy","Game","VTuber","BL","GL","Roleplay","Original"];
    for (const tag of tags) {
        const r = await p.query("SELECT name, substring(image,1,60) as img FROM characters WHERE tag=$1 ORDER BY name LIMIT 5", [tag]);
        console.log(`\n[${tag}] sample:`);
        r.rows.forEach(row => console.log(`  ${row.name} | ${row.img}`));
    }
    await p.end();
}
check();
