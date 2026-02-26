const { extractTextFromUrl } = require('./src/lib/ai-setup');
require('dotenv').config();

async function test() {
    console.log("Testing with wiki link...");
    try {
        const text = await extractTextFromUrl("https://en.wikipedia.org/wiki/Makima");
        console.log("Success! Extracted length:", text.length);
        console.log("Preview:", text.substring(0, 100).replace(/\n/g, "\\n"));
    } catch (e) {
        console.error(e);
    }
}
test();
