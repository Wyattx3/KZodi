/**
 * One-time migration script: Load cached stickers from generated_stickers.json into Aiven Valkey.
 * 
 * Usage: node scripts/migrate-stickers.js
 */
const Redis = require("ioredis");
const fs = require("fs");
const path = require("path");

const REDIS_URL = process.env.REDIS_URL;
const CACHE_FILE = path.join(__dirname, "..", "src", "data", "generated_stickers.json");

async function migrate() {
    console.log("Connecting to Aiven Valkey...");
    const valkey = new Redis(REDIS_URL, {
        tls: { rejectUnauthorized: false },
        maxRetriesPerRequest: 3,
        connectTimeout: 10000,
    });

    valkey.on("error", (err) => {
        console.error("Redis connection error:", err.message);
    });

    console.log(`Reading sticker cache from: ${CACHE_FILE}`);
    if (!fs.existsSync(CACHE_FILE)) {
        console.error("Cache file not found!");
        valkey.disconnect();
        return;
    }

    const raw = fs.readFileSync(CACHE_FILE, "utf-8");
    const cache = JSON.parse(raw);
    const keys = Object.keys(cache);
    console.log(`Found ${keys.length} stickers to migrate.`);

    let success = 0;
    let failed = 0;

    // Use pipeline for faster bulk insert
    const batchSize = 50;
    for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        const pipeline = valkey.pipeline();

        for (const key of batch) {
            pipeline.set(`sticker:${key}`, cache[key]);
        }

        try {
            const results = await pipeline.exec();
            for (const [err] of results) {
                if (err) {
                    failed++;
                    console.error(`  Failed key: ${err.message}`);
                } else {
                    success++;
                }
            }
            console.log(`  Progress: ${Math.min(i + batchSize, keys.length)}/${keys.length}`);
        } catch (e) {
            console.error(`  Batch error:`, e.message);
            failed += batch.length;
        }
    }

    console.log(`\nMigration complete!`);
    console.log(`  ✅ Success: ${success}`);
    console.log(`  ❌ Failed: ${failed}`);

    valkey.disconnect();
}

migrate().catch(console.error);
