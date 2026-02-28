require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');

const FIGMA_TOKEN = process.env.FIGMA_TOKEN || "YOUR_FIGMA_PERSONAL_ACCESS_TOKEN";
const FILE_ID = "K1I0kO5j0x9p8EycSXH5DO";
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'tarot');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Helper for HTTP GET requests with Rate Limit backoff
function request(url, headers = {}, retries = 5) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers }, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode === 429 && retries > 0) {
                    console.log(`\nRate limit hit (429)! Waiting 35 seconds before retry... (${retries} retries left)`);
                    setTimeout(() => {
                        request(url, headers, retries - 1).then(resolve).catch(reject);
                    }, 35000);
                    return;
                }
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(data);
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        }).on('error', reject);
    });
}

// Helper to download an image
function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filepath);
        https.get(url, (res) => {
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(filepath, () => reject(err));
        });
    });
}

async function main() {
    console.log("Fetching full Figma document...");
    try {
        // 1. Get the document structure (no depth limit!)
        const docRes = await request(`https://api.figma.com/v1/files/${FILE_ID}`, {
            'X-Figma-Token': FIGMA_TOKEN
        });

        console.log("Document fetched. Recursively finding card nodes...");

        const cardNodes = {};

        // Major Arcana Name Mapping
        const majorNames = [
            "the_fool", "the_magician", "the_high_priestess", "the_empress", "the_emperor",
            "the_hierophant", "the_lovers", "the_chariot", "strength", "the_hermit",
            "the_wheel_of_fortune", "justice", "the_hanged_man", "death", "temperance",
            "the_devil", "the_tower", "the_star", "the_moon", "the_sun", "judgement", "the_world"
        ];

        // Minor Arcana Number Mapping
        const rankNames = {
            "1": "ace", "2": "two", "3": "three", "4": "four", "5": "five",
            "6": "six", "7": "seven", "8": "eight", "9": "nine", "10": "ten",
            "Page": "page", "Knight": "knight", "Queen": "queen", "King": "king",
            "ace": "ace", "two": "two", "three": "three", "four": "four", "five": "five",
            "six": "six", "seven": "seven", "eight": "eight", "nine": "nine", "ten": "ten",
            "page": "page", "knight": "knight", "queen": "queen", "king": "king"
        };

        // Parse the tree using explicit Section structure
        const canvas = docRes.document.children[0];
        if (canvas && canvas.children) {
            let majorSection = null;
            let minorSection = null;

            canvas.children.forEach(section => {
                if (section.name === 'Major Arcana') majorSection = section;
                if (section.name === 'Minor Arcana') minorSection = section;
            });

            // Major Arcana (Sorted by visual layout coordinates Y then X)
            if (majorSection && majorSection.children) {
                let majorChildren = majorSection.children.map(c => ({
                    id: c.id,
                    name: c.name,
                    x: c.absoluteBoundingBox ? c.absoluteBoundingBox.x : 0,
                    y: c.absoluteBoundingBox ? c.absoluteBoundingBox.y : 0
                }));
                majorChildren.sort((a, b) => {
                    if (Math.abs(a.y - b.y) > 50) return a.y - b.y; // different row
                    return a.x - b.x; // same row
                });
                majorChildren.forEach((item, index) => {
                    if (index < majorNames.length) {
                        cardNodes[item.id] = majorNames[index];
                    }
                });
            }

            // Minor Arcana (Separated by localized Suit Sub-sections)
            if (minorSection && minorSection.children) {
                minorSection.children.forEach(suitSection => {
                    const suitName = suitSection.name ? suitSection.name.toLowerCase() : '';
                    if (suitName.includes('wand') || suitName.includes('cup') || suitName.includes('sword') || suitName.includes('pentacle')) {
                        let suit = '';
                        if (suitName.includes('wand')) suit = 'wands';
                        if (suitName.includes('cup')) suit = 'cups';
                        if (suitName.includes('sword')) suit = 'swords';
                        if (suitName.includes('pentacle')) suit = 'pentacles';

                        if (suitSection.children) {
                            function findCards(node) {
                                const cardName = node.name ? node.name.trim() : '';
                                if (rankNames[cardName]) {
                                    cardNodes[node.id] = `${rankNames[cardName]}_of_${suit}`;
                                }
                                if (node.children) {
                                    node.children.forEach(findCards);
                                }
                            }
                            findCards(suitSection);
                        }
                    }
                });
            }
        }

        const nodeIds = Object.keys(cardNodes);
        console.log(`Found ${nodeIds.length} unique card nodes in the tree.`);

        if (nodeIds.length === 0) {
            console.log("No card nodes found matching the criteria. Please check the Figma file structure.");
            return;
        }

        // 2. Request image URLs for these nodes in chunks
        console.log("Requesting image exports from Figma in chunks...");

        let count = 0;
        const chunkSize = 14; // Download 14 cards at a time (e.g. one suit) to avoid rate limiting

        for (let i = 0; i < nodeIds.length; i += chunkSize) {
            const batchIds = nodeIds.slice(i, i + chunkSize);
            const idString = batchIds.join(',');
            console.log(`\nRequesting batch ${Math.floor(i / chunkSize) + 1} (${batchIds.length} cards)...`);

            const imgRes = await request(`https://api.figma.com/v1/images/${FILE_ID}?ids=${idString}&format=png&scale=2`, {
                'X-Figma-Token': FIGMA_TOKEN
            });

            if (imgRes.err) {
                console.error(`Figma Image API Error for batch: ${imgRes.err}`);
                continue;
            }

            const imageUrls = imgRes.images || {};

            // 3. Download each image in this batch
            for (const [id, url] of Object.entries(imageUrls)) {
                if (!url) {
                    console.warn(`No URL for node ${id} (${cardNodes[id]})`);
                    continue;
                }

                const cleanName = cardNodes[id];
                const filepath = path.join(OUTPUT_DIR, `${cleanName}.png`);

                console.log(`Downloading: ${cleanName}.png`);
                await downloadImage(url, filepath);
                count++;

                // Small delay to prevent hammering
                await new Promise(r => setTimeout(r, 100));
            }

            // Wait 2 seconds between batch requests
            await new Promise(r => setTimeout(r, 2000));
        }

        console.log(`\nSuccess! Downloaded ${count} images to /public/tarot/`);

    } catch (err) {
        console.error("Error running Figma exporter:", err);
    }
}

main();
