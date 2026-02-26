const dotenv = require('dotenv');
dotenv.config();

async function testTavily() {
    const url = "https://en.wikipedia.org/wiki/Makima";
    console.log("Using key:", process.env.TAVILY_API_KEY);
    const response = await fetch("https://api.tavily.com/extract", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.TAVILY_API_KEY}`
        },
        body: JSON.stringify({ urls: [url] })
    });

    const data = await response.json();
    console.log(data);
}

testTavily();
