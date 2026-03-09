const { POST } = require('./src/app/api/chat/route');
const { NextRequest } = require('next/server');

// Mock request
async function testChat() {
    console.log("Testing English request (Should use Kimi/Groq fallback)...");
    const reqEn = new NextRequest("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
            message: "Hello Oracle",
            zodiacSign: "Leo",
            mbtiType: "INTJ",
            lang: "en",
            history: []
        })
    });
    
    // Test Myanmar request
    console.log("Testing Myanmar request (Should use Gemini)...");
    const reqMy = new NextRequest("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
            message: "မင်္ဂလာပါ",
            zodiacSign: "Leo",
            mbtiType: "INTJ",
            lang: "my",
            history: []
        })
    });
    // Visual verification of logs when this runs
    // We expect the first to log [AI][groq] moonshotai...
    // and the second to log: [AI][gemini] gemini-3...
}
