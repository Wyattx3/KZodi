const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function check() {
    try {
        const res = await pool.query('SELECT COUNT(*) FROM characters');
        console.log(`Number of characters in DB: ${res.rows[0].count}`);
    } catch (err) {
        if (err.code === '42P01') {
            console.log('The characters table does not exist.');
        } else {
            console.error(err);
        }
    } finally {
        pool.end();
    }
}

check();
