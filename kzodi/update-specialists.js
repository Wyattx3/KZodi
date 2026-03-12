require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]*/g, ''), 
  ssl: { rejectUnauthorized: false }  
});

async function run() {
  await pool.query(`UPDATE characters SET image = 'https://s4.anilist.co/file/anilistcdn/character/large/b176754-PCnpqIOkjhFk.png' WHERE id = 'astrologer-specialist'`);
  await pool.query(`UPDATE characters SET image = 'https://s4.anilist.co/file/anilistcdn/character/large/b138100-4Li0tWRCa5bQ.png' WHERE id = 'specialist-best-friend'`);
  await pool.query(`UPDATE characters SET image = 'https://s4.anilist.co/file/anilistcdn/character/large/b137080-UHcynYNjb5ZU.png' WHERE id = 'specialist-teacher-sensei'`);
  await pool.query(`UPDATE characters SET image = 'https://s4.anilist.co/file/anilistcdn/character/large/b40881-F3gr1PkreDvj.png' WHERE id = 'specialist-past-connection'`);
  console.log("Updated specialist images in DB successfully.");
  pool.end();
}
run().catch(e => { console.error(e); pool.end(); });
