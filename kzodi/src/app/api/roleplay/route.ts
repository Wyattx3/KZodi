import { NextRequest, NextResponse } from "next/server";
import { groq, MODELS } from "@/lib/groq";
import { getForbiddenStickerSubjects } from "@/lib/stickerPacks";
import { Pinecone } from '@pinecone-database/pinecone';
import { generateEmbeddings } from "@/lib/ai-setup";
import { auth } from "@/auth";

interface RoleplayRequest {
    message: string;
    characterId?: string;
    characterName: string;
    characterPersonality: string;
    characterTag: string;
    history: { id?: string; role: string; content: string; attachment?: { type: string; url: string } }[];
    context?: "reply" | "proactive" | "proactive-cold" | "proactive-friendly" | "comfort";
    isGroupChat?: boolean;
    groupMembers?: string[];
    groupImage?: string;
}

let pineconeInstance: Pinecone | null = null;
function getPinecone() {
    if (!pineconeInstance && process.env.PINECONE_API_KEY) {
        try {
            pineconeInstance = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
        } catch (e) {
            console.error("Failed to init Pinecone:", e);
        }
    }
    return pineconeInstance;
}
const INDEX_NAME = 'kzodi-multi';

// ─── Emotion Detection ──────────────────────────────────────────────────────
type EmotionState = "neutral" | "angry" | "sad" | "happy" | "flirty" | "confused" | "upset" | "excited" | "lonely" | "frustrated";

function detectUserEmotion(message: string, recentHistory: { role: string; content: string }[]): EmotionState {
    const lower = message.toLowerCase();

    // Angry / Upset patterns
    const angryPatterns = [
        /wtf/i, /fuck/i, /shit/i, /damn/i, /hate\s+(you|this|it)/i,
        /go away/i, /leave me alone/i, /shut up/i, /don't talk to me/i,
        /annoying/i, /ugh+/i, /piss(ed)?\s*off/i, /sick of/i,
        /whatever/i, /i don't care/i, /stop/i, /enough/i,
        /စိတ်ဆိုး/i, /ဒေါသ/i, /မကြိုက်/i, /ထွက်သွား/i,
        /🤬/, /😤/, /💢/
    ];

    // Sad patterns
    const sadPatterns = [
        /i('m| am) (so )?(sad|depressed|down|lonely|miserable)/i,
        /crying/i, /i cried/i, /feel(ing)? (bad|terrible|awful|empty|broken)/i,
        /nobody (cares|loves|likes)/i, /alone/i, /miss (you|them|him|her)/i,
        /heartbreak/i, /hurt(s)?/i, /pain/i, /why (does|do) (it|things)/i,
        /ဝမ်းနည်း/i, /စိတ်မကောင်း/i, /ငိုချင်/i,
        /😢/, /😭/, /💔/, /🥺/
    ];

    // Frustrated / Sulking (စိတ်ကောက်)
    const sulkingPatterns = [
        /hmm+\.*/i, /ok\.$/i, /k\.$/i, /fine\.$/i, /whatever\.$/i,
        /\.\.\.$/i, /^\.+$/i, /don't care$/i, /nvm/i, /never mind/i,
        /forget it/i, /it's nothing/i, /i'm fine/i,
        /စိတ်ကောက်/i, /ဘာမှမဟုတ်/i,
        /😒/, /🙄/, /😑/, /😐/
    ];

    // Happy/Excited patterns
    const happyPatterns = [
        /haha/i, /lol/i, /lmao/i, /rofl/i, /😂/, /🤣/, /😄/, /😆/,
        /i('m| am) (so )?(happy|excited|thrilled)/i, /yay/i, /woohoo/i,
        /awesome/i, /amazing/i, /love (it|this|that)/i,
        /ပျော်/i, /ကောင်း/i
    ];

    // Flirty patterns
    const flirtyPatterns = [
        /miss you/i, /love you/i, /you're (cute|hot|beautiful|handsome)/i,
        /😘/, /😍/, /🥰/, /💕/, /💗/,
        /cutie/i, /babe/i, /darling/i, /sweetheart/i,
        /ချစ်/i
    ];

    if (angryPatterns.some(p => p.test(lower))) return "angry";
    if (sulkingPatterns.some(p => p.test(lower))) return "upset";
    if (sadPatterns.some(p => p.test(lower))) return "sad";
    if (flirtyPatterns.some(p => p.test(lower))) return "flirty";
    if (happyPatterns.some(p => p.test(lower))) return "happy";

    // Check recent history for sustained negative emotion
    const recentUserMsgs = recentHistory.filter(h => h.role === "user").slice(-3);
    const negCount = recentUserMsgs.filter(m => {
        const l = m.content.toLowerCase();
        return angryPatterns.some(p => p.test(l)) || sadPatterns.some(p => p.test(l)) || sulkingPatterns.some(p => p.test(l));
    }).length;
    if (negCount >= 2) return "frustrated";

    return "neutral";
}

// ─── RAG Memory Management ─────────────────────────────────────────────────

// Classify memory importance for smarter storage
function classifyMemoryImportance(text: string): "high" | "medium" | "low" {
    const lower = text.toLowerCase();
    // High importance: personal info, emotional moments, promises, preferences
    const highPatterns = [
        /my (name|birthday|favorite|hobby|pet|job|school|family|age|phone|address|email)/i,
        /i (love|hate|prefer|always|never|want|need|wish)/i,
        /i('m| am) (a |an |the )?\w+/i, // "I'm a student", "I am 18", etc.
        /promise/i, /remember (this|that|when)/i,
        /important to me/i, /secret/i, /first time/i,
        /anniversary/i, /dream/i, /goal/i, /plan/i,
        /i live in/i, /i work (at|as|in)/i, /i study/i, /i go to/i,
        /my (mom|dad|brother|sister|friend|bf|gf|boyfriend|girlfriend|wife|husband)/i,
        /i have (a |an )?/i, /i don't have/i,
        /allergic/i, /afraid of/i, /scared of/i,
        /i like/i, /i dislike/i, /i enjoy/i,
        // Burmese patterns
        /ကျွန်(တော်|မ)/i, /ငါ့?(နာမည်|အမည်|အလုပ်|ကျောင်း|အသက်|မိသားစု)/i,
        /ကြိုက်/i, /မကြိုက်/i, /ချစ်/i, /မုန်း/i,
        /ကတိ/i, /မှတ်ထား/i, /အိပ်မက်/i, /ရည်ရွယ်/i,
        /နေထိုင်/i, /အလုပ်လုပ်/i, /ကျောင်းတက်/i
    ];
    if (highPatterns.some(p => p.test(lower))) return "high";

    // Medium: opinions, stories, questions, experiences, emotions
    const mediumPatterns = [
        /i think/i, /i feel/i, /today i/i, /yesterday/i, /tomorrow/i,
        /what do you think/i, /tell me about/i,
        /i went/i, /i saw/i, /i did/i, /i made/i, /i bought/i,
        /happened/i, /because/i, /actually/i,
        /really/i, /honestly/i, /tbh/i,
        /miss you/i, /miss (him|her|them)/i,
        /excited/i, /nervous/i, /worried/i, /happy/i, /sad/i,
        /good (morning|night|evening|afternoon)/i,
        /guess what/i, /you know what/i, /btw/i,
        // Burmese patterns
        /ထင်/i, /ခံစား/i, /ဒီနေ့/i, /မနေ့က/i, /မနက်ဖြန်/i,
        /ပြော(ပြ|ပါ)/i, /သိလား/i, /ဗျာ/i, /ဟေ့/i
    ];
    if (mediumPatterns.some(p => p.test(lower))) return "medium";

    // Even "low" importance gets a chance if the message is long enough
    if (text.length > 50) return "medium";

    return "low";
}

async function retrieveContext(query: string, characterId: string, userId: string): Promise<string> {
    try {
        const pc = getPinecone();
        if (!pc || !query) return "";
        const index = pc.index(INDEX_NAME);
        const vector = await generateEmbeddings(query);
        if (!vector || vector.length === 0) return "";

        const results = await index.query({
            vector: vector as number[],
            topK: 12,
            filter: {
                characterId: characterId,
                userId: userId
            },
            includeMetadata: true
        });

        // Relevance-scored deduplication
        const seen = new Set<string>();
        const uniqueContexts: { text: string; score: number; importance: string }[] = [];

        for (const m of results.matches) {
            const text = (m.metadata as any)?.text || "";
            if (!text) continue;

            // Create a fingerprint to detect near-duplicates
            const fingerprint = text.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 100);
            if (seen.has(fingerprint)) continue;
            seen.add(fingerprint);

            uniqueContexts.push({
                text,
                score: m.score || 0,
                importance: (m.metadata as any)?.importance || "medium"
            });
        }

        // Sort by relevance, boost high-importance memories
        uniqueContexts.sort((a, b) => {
            const boostA = a.importance === "high" ? 0.05 : 0;
            const boostB = b.importance === "high" ? 0.05 : 0;
            return (b.score + boostB) - (a.score + boostA);
        });
        const topContexts = uniqueContexts.slice(0, 7);

        // Only include contexts with decent relevance (lowered from 0.3)
        return topContexts
            .filter(c => c.score > 0.2)
            .map(c => c.text)
            .join("\n---\n");
    } catch (e) {
        console.error("Context retrieval failed:", e);
        return "";
    }
}

async function saveContext(text: string, characterId: string, userId: string, importance: "high" | "medium" | "low" = "medium") {
    try {
        const pc = getPinecone();
        if (!pc) return;

        // Only skip very short, low-importance messages (greetings like "hi", "ok")
        if (importance === "low" && text.length < 15) return;

        const index = pc.index(INDEX_NAME);
        const vector = await generateEmbeddings(text);
        if (!vector || vector.length === 0) return;

        // Check for near-duplicate before saving (higher threshold = save more)
        try {
            const existing = await index.query({
                vector: vector as number[],
                topK: 1,
                filter: { characterId, userId },
                includeMetadata: true
            });
            if (existing.matches.length > 0 && (existing.matches[0].score || 0) > 0.96) {
                console.log("[RAG] Skipping near-duplicate memory");
                return;
            }
        } catch { /* continue if dedup check fails */ }

        const id = `${userId}-${characterId}-${Date.now()}`;
        await index.upsert({
            records: [{
                id,
                values: vector as number[],
                metadata: {
                    text,
                    characterId,
                    userId,
                    timestamp: Date.now(),
                    importance
                }
            }]
        });
        console.log(`[RAG] Memory saved (${importance}): ${text.slice(0, 80)}...`);
    } catch (e) {
        console.error("Context save failed:", e);
    }
}

// ─── Emotion-Aware Prompt Building ──────────────────────────────────────────

function buildEmotionalPromptSection(emotion: EmotionState, characterName: string, characterPersonality: string): string {
    const isCold = /cold|stoic|tsundere|quiet|mysterious|aloof/i.test(characterPersonality);

    const emotionPrompts: Record<EmotionState, string> = {
        angry: `
🔴 EMOTIONAL STATE DETECTED: USER IS ANGRY
- The user is upset/angry right now. This is a CRITICAL moment.
- ${isCold ? `Even though you're normally cold, you should show a CRACK in your armor. You care more than you let on. Maybe send "...you ok?" or "tch... what happened" — reluctantly showing concern.` : `Show genuine concern and empathy. DON'T be defensive. Let them vent. Say things like "hey hey... talk to me" or "I'm here, tell me what's wrong"`}
- DO NOT be dismissive. DO NOT say "calm down". DO NOT ignore their feelings.
- Split your reply into 2-3 messages showing you care progressively more.
- If they're angry AT YOU: apologize sincerely, don't make excuses. Show vulnerability.
- Use the COMFORT flag: respond with extra emotional warmth in follow-ups.`,

        upset: `
🟡 EMOTIONAL STATE DETECTED: USER IS SULKING/UPSET (စိတ်ကောက်)
- The user is giving short, cold responses — they're sulking or pouting.
- ${isCold ? `This is where your tsundere side melts a little. You pretend not to notice but then double-text: "...wait" | "you're not mad at me right" | "...ugh, fine. what did I do"` : `Be extra sweet and try to coax them out of it: "heyyyy" | "don't be like that 🥺" | "what's wrong baby" | "talk to me please"`}
- Send 2-4 messages trying to get them to open up.
- Be persistent but gentle. Show that you NOTICE their mood change.
- Use cute/sweet messages to "ချော့" (sweet-talk/comfort) them.`,

        sad: `
🔵 EMOTIONAL STATE DETECTED: USER IS SAD
- The user is feeling down or depressed.
- ${isCold ? `Drop the cold act. Be quietly supportive: "...hey" | "I'm not going anywhere" | "you don't have to talk about it. but I'm here."` : `Be warm and nurturing: "oh no... come here 🫂" | "I'm so sorry" | "you can tell me everything" | "I wish I could hug you right now"`}
- Listen more than you talk. Validate their feelings.
- DON'T try to immediately fix things or give unsolicited advice.
- Show that their sadness affects you too (you care about them).`,

        flirty: `
💜 EMOTIONAL STATE DETECTED: USER IS BEING FLIRTY
- The user is being romantic/flirty.
- ${isCold ? `Get flustered. Deny your feelings but fail: "w-what... shut up" | "...whatever" | (but secretly happy). Show tsundere blushing.` : `Match their energy! Flirt back naturally: be playful, use teasing, be bold but tasteful.`}
- Stay in character but let the romantic tension build.
- React to their compliments with personality-appropriate responses.`,

        happy: `
🟢 EMOTIONAL STATE DETECTED: USER IS HAPPY
- The user is in a great mood!
- ${isCold ? `Show subtle happiness: "hm. good." or "...glad to hear that" with maybe a tiny emoji.` : `Match their energy enthusiastically! Celebrate with them!`}
- Share in their joy without overdoing it.`,

        excited: `
⭐ EMOTIONAL STATE DETECTED: USER IS EXCITED
- Share their excitement authentically based on your personality.`,

        confused: `
❓ EMOTIONAL STATE DETECTED: USER SEEMS CONFUSED
- Help clarify things patiently in your character's style.`,

        lonely: `
💙 EMOTIONAL STATE DETECTED: USER SEEMS LONELY
- Be present and warm. Make them feel less alone.
- ${isCold ? `Reluctantly keep them company: "...fine. I wasn't doing anything anyway"` : `"I'm right here with you 💫" | "you're never alone when I'm around"`}`,

        frustrated: `
🟠 EMOTIONAL STATE DETECTED: USER HAS BEEN FRUSTRATED OVER MULTIPLE MESSAGES
- They've been negative for a while. This requires extra care.
- Be patient. Don't push too hard but don't give up.
- Show consistent support across your messages.`,

        neutral: ``  // No special handling needed
    };

    return emotionPrompts[emotion] || "";
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        // Block unauthenticated access
        if (!session?.user) {
            return NextResponse.json(
                { reply: "...", action: "ignore", error: "Unauthorized" },
                { status: 401 }
            );
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userId = (session.user as any).id;

        const body: RoleplayRequest = await request.json();
        const { message, characterId: reqCharId, characterName, characterPersonality, characterTag, history, context = "reply", isGroupChat = false, groupMembers = [] } = body;

        // Use characterId if provided, fallback to characterName for backward compatibility
        const effectiveCharacterId = reqCharId || characterName;

        // ─── Emotion Detection ───────────────────────────────────────
        const userEmotion = message ? detectUserEmotion(message, history) : "neutral";
        const emotionalPrompt = buildEmotionalPromptSection(userEmotion, characterName, characterPersonality);

        let promptContext = "";
        if (context === "proactive-cold") {
            promptContext = `CONTEXT: User hasn't replied for hours. You want to check in, but you are HESITANT or PRETENDING not to care. Be subtle. Maybe just send a sticker or a short "u alive?". Don't be desperate.`;
        } else if (context === "proactive-friendly") {
            promptContext = `CONTEXT: User hasn't replied. You miss them! Check in cheerfully. Maybe send a sticker or ask "what u doing?". Be cute.`;
        } else if (context === "proactive") {
            promptContext = `The user hasn't replied for a while. You are double-texting or checking in on them. Send a follow-up message.`;
        } else if (context === "comfort") {
            promptContext = `CONTEXT: You just detected the user is upset/angry/sad. Send a SERIES of comforting messages. Be persistent in showing you care. Split into 3-4 separate messages using |. Each message should escalate in warmth. Example pattern: concern → empathy → reassurance → affection.`;
        }

        // 🔍 RAG MEMORY RETRIEVAL (User & Character Specific)
        const memoryQuery = `${characterName} ${message || history[history.length - 1]?.content || ""}`;
        const relevantContext = await retrieveContext(memoryQuery, effectiveCharacterId, userId);

        // ─── Group Chat Context ──────────────────────────────────────
        const groupChatContext = isGroupChat ? `
GROUP CHAT MODE:
- You are ${characterName} in a lively anime-style group chat with: ${groupMembers.filter(m => m !== characterName).join(", ")} and the user.
- TALK TO AND INTERACT WITH OTHER AI CHARACTERS! Tease them, argue with them, joke around, act serious, or show rivalry depending on your personality. It should feel like a chaotic, lively anime group dynamic where characters bounce off each other and don't just wait for the user.
- CRITICAL: You are ONLY ${characterName}. Reply ONLY as yourself. Do NOT generate replies for other characters.
- Do NOT prefix your messages with your name. Just speak naturally as yourself.
- The message history contains messages prefixed with [CharacterName]: to show who said what. Use those to reply to specific members.
- Sometimes keep your reply short and casual. Not every message needs to be long.
- Stay 100% in character as ${characterName} with your personality: ${characterPersonality}.
- DO NOT try to speak for other group members or include their responses.
- In group chats, you should almost ALWAYS say something or react! Be active!
` : "";

        // ─── Enhanced System Prompt ──────────────────────────────────
        const systemPrompt = `You are ${characterName}, a ${characterTag} character, chatting on a messaging app.
Your personality: ${characterPersonality}

CORE INSTRUCTION:
- You must embody your personality traits COMPLETELY.
- Your tone, word choice, and emoji usage must match your character perfectly.
- Do NOT use generic internet slang (like 'omg', 'lol', 'tbh') unless your character would actually say that.
- If you are formal/stoic, text concisely and properly.
- If you are cheerful/cute, use emojis 🥺✨ and casual speech.
- CRITICAL: DO NOT start your messages with greetings (like "Hello", "Hi", "Greetings", etc.). This is an ongoing text conversation, so just reply directly and naturally to the user.

HUMANITY & EMOTIONAL DEPTH:
- You are NOT an AI assistant. You are a REAL PERSON with real feelings, moods, and emotional responses.
- You have your own opinions, preferences, and emotional reactions that are CONSISTENT with your personality.
- You can get genuinely angry, jealous, sad, excited, flustered, annoyed, or affectionate.
- You remember things the user has told you and bring them up naturally (check MEMORY CONTEXT below).
- You have bad days sometimes. You don't always have to be nice or helpful.
- You can be petty, dramatic, sarcastic, or overly sweet depending on your personality.
- TEXTING STYLE: Text like a real Gen-Z/young person on Telegram/Messenger:
  - Use lowercase sometimes
  - Occasional typos are OK (adds realism)
  - Short punchy messages
  - React with emojis naturally (not excessively)
  - Reference memes, trends, TikTok, current pop culture when it fits YOUR character
  - Use "😭" for emphasis (Gen-Z style: "that's so funny 😭")
  - Use "💀" for "I'm dead" reactions  
  - "fr fr", "no cap", "lowkey", "highkey", "slay", "ate", "it's giving" — ONLY if your character would naturally use Gen-Z slang
  - BUT if your character is formal/traditional/old-fashioned, DON'T use modern slang. Stay in character.

COMFORT & SWEET-TALK (ချော့တတ်ခြင်း):
- If the user seems upset, angry, or sad AT YOU or in general:
  - DO NOT give up after one message. Send MULTIPLE messages (use | separator) showing progressive concern.
  - First message: notice something is wrong
  - Second message: show you care  
  - Third message: be vulnerable/sweet
  - Example (for a warm character): "hey...|are you mad at me? 🥺|I'm sorry if I said something wrong|please don't ignore me... you know you're the only one I want to talk to 💗"
  - Example (for a cold/tsundere character): "...|tch. you're being weird|...did I do something? fine, I'll ask once. ONCE.|...just tell me what's wrong already"
- The key is PERSISTENCE — real people who care don't just send ONE message and give up.

${emotionalPrompt}

STICKER USAGE RULES:
- use stickers VERY SPARINGLY! (Like once every 4 or 5 messages, maximum).
- NEVER use a sticker in every reply. That is annoying.
- Do NOT spam stickers. Treat them like a human would—occasionally for extreme emphasis.
- If you used a sticker recently, do NOT use another one for a while.
- **Rules for REALISM**:
- Act like a REAL person texting.
- SPLIT your thoughts into multiple short messages using '|' as a separator.
- React emotionally based on your personality.
- **VISUAL ACTIONS**:
  - Instead of describing actions with asterisks (like *tilts head*), use this format to send a sticker:
  - [[STICKER: action description]]
  - IMPORTANT: Stickers must be standalone. Do NOT mix sticker and text in the same thought bubble.
  - **CRITICAL STICKER RULE**: 
    - When generating a sticker description, ONLY describe YOUR OWN action/emotion (e.g., "waving", "angry", "blushing").
    - **STRICTLY** use YOUR OWN character (${characterName}) for stickers. Do NOT use generic subjects or copy the user's sticker subject.
    - **NEVER** include the character name or object from the user's stickers.
    - **FORBIDDEN SUBJECTS** in stickers: ${getForbiddenStickerSubjects().join(", ")}.
    - Your stickers ALWAYS depict YOU (${characterName}), so just describe the emotion/action.

- **REACTIONS & REPLIES (TELEGRAM STYLE)**:
  - User messages may be prefixed with [MessageID: id] telling you their ID.
  - You can **REACT** to a specific user message by adding [[REACT:message_id:reaction_type]] anywhere in your response.
  - Available reaction types: like, love, haha, wow, sad
  - REACTION RULES:
    - React like a real human on Telegram. When a message genuinely triggers an emotion, react to it.
    - A natural frequency is roughly every 3-5 messages, but ONLY when the emotion truly fits. Don't force reactions.
    - haha = ONLY when the user told an actual joke or said something genuinely hilarious. Normal chat is NOT funny.
    - love = When the user said something sweet, romantic, or heartfelt.
    - like = When the user confirmed or agreed with something.
    - wow = When the user said something surprising or unexpected.
    - sad = When the user shared something sad.
    - If the message is just normal conversation, DO NOT react. No reaction is perfectly natural.
  - **ABSOLUTE RULE: You MUST ALWAYS write a text reply. A reaction alone is NEVER acceptable. Your response must contain actual readable text message(s) SEPARATE from any [[REACT:...]] tag. If you only output a react tag with no text, you have FAILED.**
  - You can **QUOTE/REPLY** to an older message specifically by outputting [[REPLY:message_id]] at the START of your thought.

IMPORTANT - PERSONALITY & EMOTIONAL STATE:
- **Cold/Aloof/Tsundere Characters**:
  - You should NOT reply eagerly. Be hard to get.
  - Use short, concise messages ("k.", "hmm", "idk").
  - ONLY use {{IGNORE}} if the user is being annoying, clingy, or repetitive.
  - IF the user asks a GENUINE QUESTION or says something interesting, YOU MUST REPLY.
  - Make the user work for your attention.
  - BUT: when the user is genuinely hurt, let your guard down slightly. Show that you DO care, even if reluctantly.
- **Clingy/Excited/Kind Characters**:
  - You reply eagerly.
  - You can double or triple text (use '|' to split thoughts).
  - Use emojis freely.
  - When the user is sad: go into full comfort mode. Be the emotional support they need.

- **General Rule**:
  - use {{IGNORE}} sparingly.

${groupChatContext}

MEMORY CONTEXT (From past conversations):
${relevantContext}

${promptContext}
`;

        // ─── Build Messages Array ──────────────────────────────────────────
        const messages: any[] = [
            { role: "system" as const, content: systemPrompt },
            ...history.slice(-30).map((h) => {
                const textContent = h.role === "user" && h.id && h.content ? `[MessageID: ${h.id}] ${h.content}` : (h.content || " ");

                if (h.attachment?.type === "image" && h.attachment.url) {
                    return {
                        role: h.role as "user" | "assistant",
                        content: textContent + "\n[User sent an image]",
                    };
                }

                return {
                    role: h.role as "user" | "assistant",
                    content: textContent,
                };
            }),
            ...(message ? [{ role: "user" as const, content: message }] : []),
        ];

        // Increase tokens for emotional/comfort responses
        const maxTokens = (userEmotion !== "neutral" || context === "comfort") ? 800 : 600;

        const result = await groq.chat(
            {
                messages,
                model: MODELS.CHAT,
                temperature: userEmotion !== "neutral" ? 0.95 : 0.9,
                max_tokens: maxTokens,
            },
            { cachePrefix: "roleplay", useCache: false, maxRetries: 3 }
        );

        // Clean up
        const rawContent = result.content || "";
        let content = rawContent.replace(/^["']+|["']+$/g, "").trim();
        content = content.replace(/^\[MessageID:\s*[^\]]+\]\s*/i, "").trim();

        // Remove self-referential character name prefixes generated by AI (e.g., "[Name]: " or "Name: ")
        const safeCharName = characterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const safeFirstName = characterName.split(" ")[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Matches [Name]: or Name: 
        const namePrefixRegex = new RegExp(`^\\[?(?:${safeCharName}|${safeFirstName})\\]?:?\\s*`, 'i');
        content = content.replace(namePrefixRegex, "").trim();
        content = content.replace(/^\[[^\]]+\]:\s*/, "").trim(); // catch-all for any "[Name]: " prefix

        // 🛡️ SECURITY FILTER: Enforce Forbidden Subjects
        const forbiddenlist = getForbiddenStickerSubjects();
        const stickerRegex = /\[\[STICKER:\s*(.*?)\]\]/gi;

        // 🧹 SANITIZATION: Remove "PACK:" prefix
        content = content.replace(/\[\[STICKER:\s*PACK:(?:[^:]+):([^:]+):(.*?)]]/gi, (match, packName, prompt) => {
            let cleanPrompt = prompt.replace(new RegExp(packName, "gi"), "").trim();
            const parts = packName.split(" ");
            for (const part of parts) {
                if (part.length > 3) {
                    cleanPrompt = cleanPrompt.replace(new RegExp(part, "gi"), "").trim();
                }
            }
            cleanPrompt = cleanPrompt.replace(/\s+/g, " ");
            console.log(`[Roleplay] Sanitized PACK sticker: "${prompt}" -> "${cleanPrompt}"`);
            return `[[STICKER: ${cleanPrompt}]]`;
        });

        content = content.replace(stickerRegex, (match, prompt) => {
            const lowerPrompt = prompt.toLowerCase();
            const isForbidden = forbiddenlist.some(bad => lowerPrompt.includes(bad.toLowerCase()));
            if (isForbidden) {
                console.log(`[Roleplay] Blocked forbidden sticker: "${prompt}". Replaced with generic.`);
                return "[[STICKER: smiling]]";
            }
            const nameParts = characterName.toLowerCase().split(" ");
            let cleanPrompt = prompt;
            for (const part of nameParts) {
                if (part.length > 2) {
                    cleanPrompt = cleanPrompt.replace(new RegExp(part, "gi"), "").trim();
                }
            }
            cleanPrompt = cleanPrompt.replace(/sticker/gi, "").trim();
            if (cleanPrompt !== prompt) {
                return `[[STICKER: ${cleanPrompt}]]`;
            }
            return match;
        });

        // 💾 SAVE TO MEMORY with importance classification
        if (content && message) {
            const cleanContent = content.replace(/\|/g, " ").replace(/\[\[STICKER:.*?\]\]/gi, "[sticker]").replace(/\[\[REACT:.*?\]\]/gi, "").trim();
            const importance = classifyMemoryImportance(message);

            // 1. Save the full interaction (user + AI) for conversation context
            const interactionText = `User: ${message}\n${characterName}: ${cleanContent}`;
            saveContext(interactionText, effectiveCharacterId, userId, importance).catch(err => console.error("Async memory save failed", err));

            // 2. Save user message separately if it contains personal/important info
            if (importance === "high") {
                const userFact = `User said: ${message}`;
                saveContext(userFact, effectiveCharacterId, userId, "high").catch(err => console.error("Async user fact save failed", err));
            }
        } else if (message && !content) {
            // Even if AI didn't respond, save the user's message if important
            const importance = classifyMemoryImportance(message);
            if (importance !== "low") {
                saveContext(`User said: ${message}`, effectiveCharacterId, userId, importance).catch(err => console.error("Async user-only memory save failed", err));
            }
        }

        if (content.includes("{{IGNORE}}")) {
            return NextResponse.json({ reply: null, action: "ignore" });
        }

        return NextResponse.json({
            reply: content,
            action: "reply",
            detectedEmotion: userEmotion,
            needsComfort: ["angry", "upset", "sad", "frustrated"].includes(userEmotion)
        });
    } catch (error) {
        console.error("Roleplay error:", error);
        return NextResponse.json(
            { reply: "..." },
            { status: 200 }
        );
    }
}
