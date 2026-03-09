const path = require("path");
require("dotenv").config({ path: path.join(__dirname, '..', '.env') });

async function test() {
    // Try using variables-based genre_in approach
    const queries = [
        {
            label: "genre_in variable",
            query: `query($page:Int,$perPage:Int,$genres:[String]){Page(page:$page,perPage:$perPage){media(sort:POPULARITY_DESC,genre_in:$genres){title{english romaji}characters(sort:FAVOURITES_DESC,perPage:3){nodes{name{full}image{large}}}}}}`,
            variables: { page: 1, perPage: 5, genres: ["Boys Love"] }
        },
        {
            label: "tag_in variable",
            query: `query($page:Int,$perPage:Int,$tags:[String]){Page(page:$page,perPage:$perPage){media(sort:POPULARITY_DESC,tag_in:$tags){title{english romaji}characters(sort:FAVOURITES_DESC,perPage:3){nodes{name{full}image{large}}}}}}`,
            variables: { page: 1, perPage: 5, tags: ["Boys' Love"] }
        },
        {
            label: "tag_in BL variable",
            query: `query($page:Int,$perPage:Int,$tags:[String]){Page(page:$page,perPage:$perPage){media(sort:POPULARITY_DESC,tag_in:$tags){title{english romaji}characters(sort:FAVOURITES_DESC,perPage:3){nodes{name{full}image{large}}}}}}`,
            variables: { page: 1, perPage: 5, tags: ["Boys Love"] }
        },
        {
            label: "search BL keyword",
            query: `query($page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){media(sort:POPULARITY_DESC,search:"BL",type:MANGA){title{english romaji}characters(sort:FAVOURITES_DESC,perPage:3){nodes{name{full}image{large}}}}}}`,
            variables: { page: 1, perPage: 5 }
        },
    ];

    for (const q of queries) {
        try {
            const r = await fetch("https://graphql.anilist.co", {
                method: "POST",
                headers: {"Content-Type":"application/json"},
                body: JSON.stringify({query: q.query, variables: q.variables})
            });
            const d = await r.json();
            if (d.errors) {
                console.log(`[${q.label}] ERROR: ${d.errors[0]?.message}`);
                continue;
            }
            const m = d?.data?.Page?.media || [];
            const chars = m.flatMap(x => x.characters?.nodes || []).filter(c => c.image?.large);
            console.log(`[${q.label}] => ${m.length} media, ${chars.length} chars`);
            if (m.length > 0) {
                console.log(`  Titles: ${m.map(x=>x.title?.english||x.title?.romaji).join(', ')}`);
            }
        } catch(e) {
            console.log(`[${q.label}] FETCH ERROR: ${e.message}`);
        }
        await new Promise(r => setTimeout(r, 1000));
    }
    process.exit(0);
}
test();
