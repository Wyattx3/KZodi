require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]*/g, ''), 
  ssl: { rejectUnauthorized: false }  
});

async function run() {
  await pool.query(`UPDATE characters SET image = '/specialists/astrologer.png' WHERE id = 'astrologer-specialist'`);
  await pool.query(`UPDATE characters SET image = '/specialists/best_friend.png' WHERE id = 'specialist-best-friend'`);
  await pool.query(`UPDATE characters SET image = '/specialists/teacher.png' WHERE id = 'specialist-teacher-sensei'`);
  await pool.query(`UPDATE characters SET image = '/specialists/past_connection.png' WHERE id = 'specialist-past-connection'`);
  console.log("Updated specialist images to custom models in DB successfully.");
  pool.end();
}
run().catch(e => { console.error(e); pool.end(); });
