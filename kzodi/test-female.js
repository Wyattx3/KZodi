require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]*/g, ''), 
  ssl: { rejectUnauthorized: false }  
});

async function run() {
  const chars = await pool.query("SELECT name, image FROM characters WHERE name IN ('Frieren', 'Makima', 'Nami', 'Nico Robin', 'Mikasa Ackerman', 'Anya Forger')");
  console.log(chars.rows);
  pool.end();
}
run().catch(e => { console.error(e); pool.end(); });
