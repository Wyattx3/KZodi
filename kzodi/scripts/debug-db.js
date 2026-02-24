const { Pool } = require("pg");
const p = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
});
async function run() {
    // Get the correct user ID from the users table
    const users = await p.query("SELECT id, email FROM users");
    if (users.rows.length === 0) { console.log("No users!"); p.end(); return; }

    const correctUserId = users.rows[0].id;
    console.log("Correct user ID:", correctUserId);

    // Find all messages with wrong user_id
    const wrongMsgs = await p.query("SELECT DISTINCT user_id FROM messages WHERE user_id != $1", [correctUserId]);
    console.log("Wrong user IDs in messages:", wrongMsgs.rows.map(r => r.user_id));

    if (wrongMsgs.rows.length > 0) {
        // Update all messages to use the correct user ID
        const result = await p.query("UPDATE messages SET user_id = $1 WHERE user_id != $1", [correctUserId]);
        console.log("Updated", result.rowCount, "messages to correct user ID");
    } else {
        console.log("All messages already have the correct user ID");
    }

    // Verify
    const verify = await p.query("SELECT user_id, COUNT(*) as cnt FROM messages GROUP BY user_id");
    console.log("After fix:", verify.rows);

    p.end();
}
run().catch(e => { console.error("ERR:" + e.message); p.end(); });
