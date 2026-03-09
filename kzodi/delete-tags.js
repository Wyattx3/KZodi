const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const DATABASE_URL = (process.env.DATABASE_URL || "").replace(/[?&]sslmode=[^&]*/g, "");

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
});

async function checkAndDelete() {
    try {
        console.log("Checking total characters before deletion...");
        const resBefore = await pool.query('SELECT COUNT(*) FROM characters');
        console.log("Total characters before:", resBefore.rows[0].count);

        console.log("Executing DELETE query...");
        // Use 'Specialist' instead of 'special' since that's what's in the DB based on the check-tags script
        const resDelete = await pool.query("DELETE FROM characters WHERE tag NOT IN ('Anime', 'Specialist')");
        console.log("Rows deleted:", resDelete.rowCount);

        console.log("Checking total characters after deletion...");
        const resAfter = await pool.query('SELECT COUNT(*) FROM characters');
        console.log("Total characters after:", resAfter.rows[0].count);

        // Verify tags remaining
        const resTags = await pool.query('SELECT tag, COUNT(*) FROM characters GROUP BY tag');
        console.log("Characters by tag after deletion:", resTags.rows);

    } catch (err) {
        console.error("Error during deletion:", err);
    } finally {
        pool.end();
    }
}

checkAndDelete();
