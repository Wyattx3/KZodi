function cleanRegex(content) {
    return content
        .replace(/^\]+\s*/g, "")                            // Aggressively strip `]]` or `]] ` at the very start
        .replace(/(?<=^|\s)\]+(?=\s|[a-zA-Zက-အ])/g, "")      // Strip stray `]]` in the middle, even if joined to a word (English or Myanmar)
        .replace(/\s{2,}/g, " ")                            // Clean double spaces
        .trim();
}

console.log(cleanRegex("]]ကဲ... ရပြီလား"));
console.log(cleanRegex("The array is [1, 2] and it works"));
console.log(cleanRegex("Hello ]]world"));
console.log(cleanRegex("Testing ] "));
