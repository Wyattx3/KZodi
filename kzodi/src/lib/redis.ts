import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
    console.warn("⚠️ REDIS_URL is not defined in the environment variables. Valkey connection might fail or use defaults.");
}

// Global variable to maintain connection across hot reloads in development
const globalForRedis = global as unknown as { valkey: Redis };

export const valkey =
    globalForRedis.valkey ||
    new Redis(REDIS_URL || '', {
        tls: REDIS_URL?.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
        retryStrategy(times: number) {
            const delay = Math.min(times * 50, 2000);
            return delay;
        },
        maxRetriesPerRequest: 3,
        lazyConnect: false,
    });

if (process.env.NODE_ENV !== "production") {
    globalForRedis.valkey = valkey;
}

export default valkey;
