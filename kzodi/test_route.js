const testPayload = {
    message: "I am so sad right now",
    characterId: "char-1",
    characterName: "Yuki",
    characterPersonality: "Tsundere who secretly cares",
    characterTag: "Tsundere",
    history: [],
    context: "reply",
    isGroupChat: false,
    groupMembers: [],
    responseLanguage: "English (Default)",
};

async function testFetch() {
    console.log("Starting test fetch...");
    try {
        const res = await fetch("http://localhost:3000/api/roleplay", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(testPayload)
        });
        const text = await res.text();
        console.log("Raw Response:", text);
    } catch (e) {
        console.error("Test failed:", e);
    }
}

testFetch();
