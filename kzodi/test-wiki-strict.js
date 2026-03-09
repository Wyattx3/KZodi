async function testWikiFetch(name) {
    // Stage 1: Search Wikipedia to get the exact canonical title
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&format=json`;
    const searchRes = await fetch(searchUrl, { headers: { 'User-Agent': 'KZodi/1.0' } });
    const searchData = await searchRes.json();
    
    if (!searchData.query?.search || searchData.query.search.length === 0) return null;
    
    // Get the most relevant exact title
    const exactTitle = searchData.query.search[0].title;
    console.log(`Matched '${name}' to Wikipedia exactly as '${exactTitle}'`);

    // Stage 2: Fetch thumbnail and extract for the exact title
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages|extracts&exintro&explaintext&exchars=400&titles=${encodeURIComponent(exactTitle)}&format=json&pithumbsize=500`;
    const res = await fetch(url, { headers: { 'User-Agent': 'KZodi/1.0' } });
    const data = await res.json();
    
    const pages = data.query?.pages;
    if (!pages) return null;
    
    const pageId = Object.keys(pages)[0];
    if (pageId === "-1") return null;
    
    const page = pages[pageId];
    if (page.thumbnail) {
        return {
            title: exactTitle,
            extract: page.extract,
            image: page.thumbnail.source
        }
    } else {
        return null; // NO FALLBACK!
    }
}

async function run() {
    const results = [];
    const testNames = ["Lisa (rapper)", "Jennie Kim", "Julius Caesar", "Sherlock Holmes", "Daenerys Targaryen", "Abraham Lincoln", "Nonexistent Fake Name"];
    for (const n of testNames) {
        const res = await testWikiFetch(n);
        results.push({ name: n, found: res !== null, image: res?.image });
    }
    console.log(results);
}

run();
