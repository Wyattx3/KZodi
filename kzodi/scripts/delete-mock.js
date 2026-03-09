const { Pool } = require("pg");
require("dotenv").config();

const DATABASE_URL = (process.env.DATABASE_URL || "").replace(/[?&]sslmode=[^&]*/g, "");

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

pool.query("DELETE FROM characters WHERE id LIKE 'mock-%'")
    .then(res => console.log('Successfully deleted ' + res.rowCount + ' mock characters from DB.'))
    .catch(e => console.error(e))
    .finally(() => pool.end());
