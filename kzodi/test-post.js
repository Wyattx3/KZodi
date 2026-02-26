const url = "http://localhost:3000/api/character/setup";
const formData = new FormData();
formData.append("type", "link");
formData.append("name", "Gojo Satoru");
formData.append("url", "https://jujutsu-kaisen.fandom.com/wiki/Satoru_Gojo");

async function run() {
    console.log("Sending POST request to create character from Fandom Wiki...");
    try {
        const res = await fetch(url, { method: "POST", body: formData });
        const json = await res.json();
        console.log("Response:", JSON.stringify(json, null, 2));
    } catch (e) {
        console.error(e);
    }
}
run();
