const fetch = require('node-fetch'); // Check if node-fetch is available, or use built-in fetch if node 18+

const API_KEY = "4edb1ce0380be0b1c282b3ea001af5487e1ba8756cc6dc5176c4bc2f0190f3cb";
const URL = "https://api.together.xyz/v1/images/generations";

async function test() {
    try {
        console.log("Testing Together AI API...");
        const response = await fetch(URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "google/flash-image-2.5", // Trying the requested model
                prompt: "a cute cat sticker",
                n: 1,
                response_format: "b64_json",
                width: 512,
                height: 512
            })
        });

        console.log("Status:", response.status);
        const text = await response.text();
        console.log("Response:", text.substring(0, 1000)); // Print first 1000 chars
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
