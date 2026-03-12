require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
pool.query("SELECT name, image FROM characters WHERE tag = 'Specialist'")
  .then(res => {
    console.log(res.rows);
    pool.end();
  })
  .catch(e => {
    console.error(e);
    pool.end();
  });
