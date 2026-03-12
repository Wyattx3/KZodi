require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]*/g, ''), 
  ssl: { rejectUnauthorized: false }  
});
pool.query("SELECT id, name, image FROM characters WHERE tag = 'Specialist'")
  .then(res => { console.log(JSON.stringify(res.rows, null, 2)); pool.end(); })
  .catch(e => { console.error(e); pool.end(); });
