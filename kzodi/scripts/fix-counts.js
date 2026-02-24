const { Pool } = require('pg');

const pool = new Pool({
    connectionString: (process.env.DATABASE_URL || '').replace(/[?&]sslmode=[^&]*/g, ''),
    ssl: { rejectUnauthorized: false }
});

async function main() {
    try {
        const chars = await pool.query('SELECT id FROM characters');
        for (const row of chars.rows) {
            const id = row.id;

            const msgCountRes = await pool.query('SELECT COUNT(id) as count FROM messages WHERE conversation_id = $1', [id]);
            const msgCount = parseInt(msgCountRes.rows[0].count, 10);

            const chatterCountRes = await pool.query('SELECT COUNT(DISTINCT user_id) as count FROM messages WHERE conversation_id = $1 AND role = $2', [id, 'user']);
            const chatterCount = parseInt(chatterCountRes.rows[0].count, 10);

            await pool.query('UPDATE characters SET msg_count = $1, chatter_count = $2 WHERE id = $3', [msgCount, chatterCount, id]);
            console.log(`Updated character ${id}: msg_count=${msgCount}, chatter_count=${chatterCount}`);
        }
        console.log('Backfill complete!');
    } catch (e) {
        console.error('Error during backfill:', e);
    } finally {
        pool.end();
    }
}

main();
