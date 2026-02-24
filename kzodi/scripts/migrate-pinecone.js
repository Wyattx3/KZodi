const { Pinecone } = require("@pinecone-database/pinecone");
const PINECONE_API_KEY = "pcsk_5pceUe_KyJqoikr1osssJaVyZkdPWS8B7pa1tXkdk7h2xBouWGPvPzj3FdMP7UtyiRuGwG";
const INDEX_NAME = "kzodi-multi";
const OLD_USER_ID = "2f358f72-dc6f-4e2f-aacb-a903f79cf198";
const CORRECT_USER_ID = "42212f75-b047-4400-8e13-21122711f23c";

async function migrate() {
    const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
    const index = pc.index(INDEX_NAME);

    // Try multiple random vectors to find all old-userId vectors
    let allOldIds = new Set();
    let allOldRecords = {};

    for (let attempt = 0; attempt < 5; attempt++) {
        // Random vector for broader coverage
        const rv = Array.from({ length: 1024 }, () => Math.random() * 2 - 1);

        const results = await index.query({
            vector: rv, topK: 100,
            filter: { userId: OLD_USER_ID },
            includeMetadata: true, includeValues: true
        });

        for (const m of results.matches) {
            if (!allOldIds.has(m.id)) {
                allOldIds.add(m.id);
                allOldRecords[m.id] = m;
            }
        }
        console.log(`Attempt ${attempt + 1}: found ${results.matches.length} new, total unique: ${allOldIds.size}`);
    }

    const records = Object.values(allOldRecords).map(m => ({
        id: m.id,
        values: m.values,
        metadata: { ...m.metadata, userId: CORRECT_USER_ID }
    }));

    if (records.length === 0) {
        console.log("No vectors with old userId found. Migration might already be complete.");
        return;
    }

    await index.upsert(records);
    console.log(`Updated ${records.length} vectors to correct userId`);

    // Verify
    const rv2 = Array.from({ length: 1024 }, () => Math.random() * 2 - 1);
    const oldCheck = await index.query({ vector: rv2, topK: 100, filter: { userId: OLD_USER_ID }, includeMetadata: true });
    const newCheck = await index.query({ vector: rv2, topK: 100, filter: { userId: CORRECT_USER_ID }, includeMetadata: true });
    console.log(`After migration: OLD=${oldCheck.matches.length}, CORRECT=${newCheck.matches.length}`);
}

migrate().catch(console.error);
