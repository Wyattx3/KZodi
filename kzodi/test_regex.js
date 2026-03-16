const content = '{\n  "understanding": "Processing the message",\n  "intent": "conversation",\n  "strategy": "Respond naturally in character",\n  "tone": "natural",\n  "reply": "[[STICKER: smiling]] Hello there!"\n}';
let clean = content.replace(/^["']+|["']+$/g, '').trim();
if (clean.startsWith('{') && clean.endsWith('}')) {
    try {
        const parsed = JSON.parse(clean);
        console.log('SUCCESS JSON:', parsed.reply);
    } catch(e) {
        console.log('JSON failed, trying regex');
        const replyExtract = clean.match(/"(?:reply|text|content|response|message)"\s*:\s*"([\s\S]*?)"\s*(?:,|})/);
        if(replyExtract) console.log('SUCCESS REGEX:', replyExtract[1]);
        else console.log('REGEX FAILED', clean);
    }
}
