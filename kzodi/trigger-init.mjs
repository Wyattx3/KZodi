import { ensureSchema } from "./src/lib/db.js";

async function run() {
    try {
        console.log("Triggering schema init...");
        await ensureSchema();
        console.log("Schema initialized successfully. The char_trending_idx index should now be created.");
        process.exit(0);
    } catch(err) {
        console.error("Failed", err);
        process.exit(1);
    }
}

run();
