const { Pool } = require("pg");
require("dotenv").config();

const p = new Pool({
  connectionString: process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]*/g, ""),
  ssl: { rejectUnauthorized: false }
});

async function run() {
    const res = await p.query("SELECT tag, name, image FROM characters WHERE tag IN ('History', 'K-pop') LIMIT 5");
    console.log(JSON.stringify(res.rows, null, 2));
    p.end();
}

run();
