const { Pool } = require("pg");
require("dotenv").config();

const p = new Pool({
  connectionString: process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]*/g, ""),
  ssl: { rejectUnauthorized: false }
});

async function run() {
    const res = await p.query("SELECT tag, image FROM characters WHERE tag IN ('History', 'K-pop', 'Manga', 'Movies') LIMIT 15");
    console.log(res.rows);
    p.end();
}

run();
