const query = `
SELECT ?itemLabel ?itemDescription ?image WHERE {
  ?item wdt:P31 wd:Q5;
        wdt:P106 wd:Q177220;
        wdt:P27 wd:Q884;
        wdt:P18 ?image;
        wikibase:sitelinks ?sitelinks.
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY DESC(?sitelinks)
LIMIT 5
`;

async function test() {
    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`;
    const res = await fetch(url, { headers: { 'User-Agent': 'KZodi/1.0' } });
    const data = await res.json();
    console.log(JSON.stringify(data.results.bindings.map(b => ({
        name: b.itemLabel.value,
        desc: b.itemDescription?.value,
        img: b.image.value
    })), null, 2));
}

test();
