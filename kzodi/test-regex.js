function parseThinking(raw) {
    let text = raw.trim();

    // Strip <think>...</think> tags if present
    text = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    const thinkEndIdx = text.indexOf("</think>");
    if (thinkEndIdx !== -1) {
        text = text.slice(thinkEndIdx + 8).trim();
    }

    // Strip markdown bolding and bullet points to normalize the text for parsing
    text = text.replace(/\*\*/g, ""); 
    text = text.replace(/^\s*(?:-\s*|\*\s*|\d+\.\s*)/gm, ""); 

    // Extract values using simple KEY: value regex (one per line)
    const extract = (key) => {
        const regex = new RegExp(`^${key}\\s*(?::|-|–)\\s*(.+)$`, "mi");
        const match = text.match(regex);
        return match ? match[1].trim() : "";
    };

    const shouldReplyToId = extract("REPLY_TO");
    return { shouldReplyToId };
}

function cleanResponseText(rawContent) {
    let content = rawContent.replace(/^["']+|["']+$/g, "").trim();

    // The destructive REPLY Regex that was amputating text -> REMOVED IN FIX!
    // const replyMatch = content.match(/(?:【|\[|\*\*|<)?REPLY(?:】|\]|\*\*|>)?\s*:?\s*/i);
    // if (replyMatch && replyMatch.index !== undefined) {
    //     content = content.slice(replyMatch.index + replyMatch[0].length).trim();
    // }

    content = content
        .replace(/<Message ID:\s*[^>]+>/gi, "")           
        .replace(/\[MessageID:\s*[^\]]+\]/gi, "")          
        .replace(/\[\[REPLY\s*:\s*[^\]]*\]+/gi, "")        
        .replace(/\[REPLY\s*:\s*[^\]]*\]/gi, "")           
        .replace(/\[\[\s*RE?P?L?Y?[^\]]*\]*/gi, "")        
        .replace(/[a-zA-Z0-9]{13,}-(?:ai|user)-[a-z0-9]+/gi, "")    
        .replace(/^\]+\s*/g, "")                            
        .replace(/(?<=^|\s)\]+(?=\s|[a-zA-Zက-အ])/g, "")      
        .replace(/\s{2,}/g, " ")                            
        .trim();

    return content;
}

function enforceShortMessages(content, isBurmese) {
    let cleaned = content;
    const bubbles = cleaned.split(/\s*\|\s*/).filter(b => b.trim().length > 0);
    const maxCharsPerBubble = isBurmese ? 160 : 250;
    const finalBubbles = [];

    for (const bubble of bubbles) {
        const trimmed = bubble.trim();
        if (!trimmed) continue;

        if (trimmed.length <= maxCharsPerBubble) {
            finalBubbles.push(trimmed);
        } else {
            const sentenceDelimiters = isBurmese
                ? /(?<=[\u104B\.!?\n])/g
                : /(?<=[.!?\n])/g;

            const sentences = trimmed.split(sentenceDelimiters).filter(s => s.trim().length > 0);

            let currentBubble = "";
            for (const sentence of sentences) {
                const s = sentence.trim();
                if (!s) continue;

                if (!currentBubble) {
                    currentBubble = s;
                } else if ((currentBubble + " " + s).trim().length <= maxCharsPerBubble) {
                    currentBubble = (currentBubble + " " + s).trim();
                } else {
                    finalBubbles.push(currentBubble);
                    currentBubble = s;
                }
            }
            if (currentBubble) finalBubbles.push(currentBubble);
        }
    }

    if (finalBubbles.length > 6) {
        const kept = finalBubbles.slice(0, 5);
        const squashed = finalBubbles.slice(5).join(" ");
        kept.push(squashed);
        return kept.join(" | ");
    }

    return finalBubbles.join(" | ");
}


console.log("=== TEST CASE 1: AI MARKDOWN REASONING (Reply Quote Fetch) ===");
const rawBrainJson = `
**UNDERSTANDING:** They are upset.
**INTENT:** Comfort
**REPLY_TO:** 1773263175056-user-abc123
`;
console.log("Extracted ID:", parseThinking(rawBrainJson).shouldReplyToId);


console.log("\\n=== TEST CASE 2: LONG MYANMAR TEXT WITHOUT PUNCTUATION (No Amputation) ===");
const rawLongText = "အရမ်းပျော်ဖို့ကောင်းတဲ့နေ့ပါပဲနော် မနက်ဖြန်ကျရင် အတူတူသွားပြီးတော့ ဗိုက်ဆာတဲ့အခါစားဖို့မုန့်တွေအများကြီးဝယ်ရအောင် ကျွန်တော်ကတော့ ကြက်ကြော်နဲ့အတူ အချိုရည်လေးပါသောက်ချင်သေးတယ် ဒါပေမယ့် စျေးကြီးရင်တော့ မစားတော့ဘူးပေါ့လေ ဟုတ်တယ်မလား";
// It is physically impossible to truncate strings now
console.log("Packed Bubbles:\\n", enforceShortMessages(rawLongText, true));

console.log("\\n=== TEST CASE 3: TEXT WITH 'REPLY' VERB INTERNALLY (No Deletion) ===");
const textWithReplyDesc = "ဟုတ်ပါတယ်၊ reply ပြန်ရမှာ သိပ်အရေးကြီးတာပေါ့။ ငါတကယ်ပဲ replyပြန်ဖို့ စဉ်းစားနေတာပါ 177326317S056-user-xxx ပေါ့။ ပြီးတော့ ဆက်ပြောရရင်]] ] ] ] တော်တော်အဆင်ပြေပါတယ်။";
console.log("Cleaned Text (No missing half-sentences):\\n", cleanResponseText(textWithReplyDesc));
