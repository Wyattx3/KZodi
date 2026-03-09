const { aiClient, MODELS } = require('./src/lib/groq');

async function testGemini() {
    console.log("Testing Gemini Chat Model...");
    try {
        const response = await aiClient.chat({
            model: "gemini-3.1-flash-lite-preview",
            temperature: 0.7,
            max_tokens: 50,
            messages: [
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: "What is 2 + 2? Answer in one word." }
            ]
        });
        
        console.log("Response:", response.content);
        if (response.content.includes("4") || response.content.includes("Four") || response.content.includes("four")) {
            console.log("✅ Gemini test passed");
        } else {
            console.log("❌ Gemini test failed, unexpected output");
        }
    } catch (e) {
        console.error("❌ Gemini test crashed:", e);
    }
}

testGemini();
