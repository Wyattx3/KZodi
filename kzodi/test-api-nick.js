async function run() {
    const res = await fetch("http://localhost:3000/api/characters?limit=10");
    const data = await res.json();
    data.forEach(c => console.log(c.name, "->", c.nickname));
}
run();
