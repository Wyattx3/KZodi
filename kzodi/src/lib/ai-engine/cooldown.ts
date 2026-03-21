import { valkey } from "@/lib/redis";
import { analyzePersonalityTraits } from "@/lib/ai-engine/types";

function getPersonalityMultipliers(characterPersonality: string) {
    const traits = analyzePersonalityTraits(characterPersonality);

    if (traits.isCold || traits.isTsundere) {
        return { reactions: 1.8, stickers: 2.0, quoteReplies: 1.5 };
    }
    if (traits.isWarm || traits.isClingy) {
        return { reactions: 0.7, stickers: 0.7, quoteReplies: 0.8 };
    }
    if (traits.isPlayful) {
        return { reactions: 0.8, stickers: 0.6, quoteReplies: 0.9 };
    }
    if (traits.isShy) {
        return { reactions: 1.2, stickers: 1.3, quoteReplies: 1.1 };
    }
    return { reactions: 1.0, stickers: 1.0, quoteReplies: 1.0 };
}

const BASE_COOLDOWNS = {
    reactions: { min: 4, max: 7 },
    stickers: { min: 8, max: 14 },
    quoteReplies: { min: 6, max: 10 }
};

function pickCooldown(min: number, max: number, multiplier: number): number {
    const scaledMin = Math.round(min * multiplier);
    const scaledMax = Math.round(max * multiplier);
    const range = Math.max(0, scaledMax - scaledMin);
    return scaledMin + Math.floor(Math.random() * (range + 1));
}

async function checkAndConsumeCooldown(userId: string, characterId: string, behavior: 'reactions' | 'stickers' | 'quoteReplies', characterPersonality: string): Promise<boolean> {
    try {
        const key = `cooldown:${userId}:${characterId}:${behavior}`;
        const val = await valkey.get(key);

        if (!val || val === "0" || val === "1") {
            const multipliers = getPersonalityMultipliers(characterPersonality);
            const base = BASE_COOLDOWNS[behavior];
            const nextCooldown = pickCooldown(base.min, base.max, multipliers[behavior]);
            
            await valkey.set(key, nextCooldown.toString(), "EX", 86400); // 24h TTL
            return true;
        }

        await valkey.decr(key);
        return false;
    } catch (e) {
        console.warn(`[AI Cooldown] Redis error on ${behavior}, failing open:`, e);
        return true; // Fail open
    }
}

async function bypassCooldown(userId: string, characterId: string, behavior: 'reactions' | 'stickers' | 'quoteReplies'): Promise<void> {
    try {
        const key = `cooldown:${userId}:${characterId}:${behavior}`;
        await valkey.del(key);
    } catch (e) {
        console.warn(`[AI Cooldown] Redis error bypassing ${behavior}:`, e);
    }
}

export async function applyBehaviorCooldowns(params: {
    userId: string,
    characterId: string,
    characterPersonality: string,
    userEmotionIntensity: number,
    content: string,
    shouldReplyToId: string,
}): Promise<{ content: string, shouldReplyToId: string }> {
    let { content, shouldReplyToId } = params;

    if (params.userEmotionIntensity > 0.7) {
        await Promise.all([
            bypassCooldown(params.userId, params.characterId, 'reactions'),
            bypassCooldown(params.userId, params.characterId, 'stickers'),
            bypassCooldown(params.userId, params.characterId, 'quoteReplies')
        ]);
        return { content, shouldReplyToId };
    }

    const [reactionsAllowed, stickersAllowed, quoteRepliesAllowed] = await Promise.all([
        checkAndConsumeCooldown(params.userId, params.characterId, 'reactions', params.characterPersonality),
        checkAndConsumeCooldown(params.userId, params.characterId, 'stickers', params.characterPersonality),
        checkAndConsumeCooldown(params.userId, params.characterId, 'quoteReplies', params.characterPersonality)
    ]);

    if (!reactionsAllowed) {
        content = content.replace(/\[\[\s*REACT[^\]]*\]\]/gi, "").trim();
    }
    
    if (!stickersAllowed) {
        content = content.replace(/\[\[\s*STICKER[^\]]*\]\]/gi, "").trim();
    }
    
    if (!quoteRepliesAllowed) {
        shouldReplyToId = ""; // Strip quote reply if blocked
    }

    return { content, shouldReplyToId };
}
