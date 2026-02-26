const data = {
    id: "gojo",
    name: "Gojo Satoru (Edited)",
    nickname: "The Strongest",
    tag: "Anime",
    description: "I am the strongest Jujutsu Sorcerer.",
    longDescription: "",
    scenario: "",
    exampleDialogue: "",
    image: "https://example.com/gojo.png",
    greeting: "Yoo!",
    personality: "Cocky",
    visibility: "public"
};

async function run() {
    try {
        const res = await fetch("http://localhost:3000/api/characters", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });
        const json = await res.json();
        console.log("POST Response:", json);

        const getRes = await fetch("http://localhost:3000/api/characters");
        const chars = await getRes.json();
        const gojo = chars.find(c => c.id === "gojo");
        console.log("GET Result Nickname:", gojo?.nickname);
    } catch (e) {
        console.error(e);
    }
}
run();
