require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]*/g, ''), 
  ssl: { rejectUnauthorized: false }  
});

async function run() {
  const anime = await pool.query("SELECT name, image FROM characters WHERE tag = 'Anime' LIMIT 4");
  const kpop = await pool.query("SELECT name, image FROM characters WHERE tag = 'K-pop' LIMIT 3");
  const bl = await pool.query("SELECT name, image FROM characters WHERE tag = 'BL' LIMIT 2");
  
  console.log("Anime:", anime.rows);
  console.log("Kpop:", kpop.rows);
  console.log("BL:", bl.rows);
  pool.end();
}
run().catch(e => { console.error(e); pool.end(); });
