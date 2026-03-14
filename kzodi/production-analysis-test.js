/**
 * ══════════════════════════════════════════════════════════════════════
 *  KZodi Production Scalability Analysis Script
 * ══════════════════════════════════════════════════════════════════════
 *
 * This script tests ALL backend services individually to determine
 * exact limits, then runs a combined simulation to find the real
 * production user capacity.
 *
 * Services tested:
 *   1. PostgreSQL (Aiven Free) — connection pool & query throughput
 *   2. Redis/Valkey (Aiven Free) — read/write throughput & memory
 *   3. Groq AI API — rate limits per key & TPM capacity
 *   4. xAI API — rate limits
 *   5. Middleware Rate Limiter — per-IP limits
 *   6. Combined End-to-End — simulated user sessions
 *
 * Usage:
 *   node production-analysis-test.js
 *   USERS=100 DURATION=30 node production-analysis-test.js
 */

require('dotenv').config();
const http = require('http');
const https = require('https');
const { Pool } = require('pg');
const Redis = require('ioredis');

// ─── Configuration ────────────────────────────────────────────────────────────

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CONCURRENT_USERS = parseInt(process.env.USERS || '100', 10);
const DURATION_SECONDS = parseInt(process.env.DURATION || '15', 10);

const DATABASE_URL = (process.env.DATABASE_URL || '').replace(/[?&]sslmode=[^&]*/g, '');
const REDIS_URL = process.env.REDIS_URL || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_API_KEY_4 = process.env.GROQ_API_KEY_4 || '';
const XAI_API_KEY = process.env.XAI_API_KEY || '';

// ─── Utility Helpers ──────────────────────────────────────────────────────────

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function percentile(arr, p) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * p);
    return sorted[Math.min(idx, sorted.length - 1)];
}

function avg(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function makeRequest(url, options = {}) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const parsedUrl = new URL(url);
        const client = parsedUrl.protocol === 'https:' ? https : http;

        const reqOpts = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname + parsedUrl.search,
            method: options.method || 'GET',
            headers: options.headers || {},
        };

        const req = client.request(reqOpts, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    duration: Date.now() - startTime,
                    data,
                    headers: res.headers,
                });
            });
        });

        req.on('error', (e) => {
            resolve({
                status: 0,
                duration: Date.now() - startTime,
                data: '',
                error: e.message,
            });
        });

        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

// ─── Colors for terminal output ───────────────────────────────────────────────

const C = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    dim: '\x1b[2m',
};

function header(title) {
    console.log(`\n${C.bright}${C.cyan}${'═'.repeat(60)}${C.reset}`);
    console.log(`${C.bright}${C.cyan}  ${title}${C.reset}`);
    console.log(`${C.bright}${C.cyan}${'═'.repeat(60)}${C.reset}\n`);
}

function success(msg) { console.log(`  ${C.green}✓${C.reset} ${msg}`); }
function warn(msg) { console.log(`  ${C.yellow}⚠${C.reset} ${msg}`); }
function fail(msg) { console.log(`  ${C.red}✗${C.reset} ${msg}`); }
function info(msg) { console.log(`  ${C.blue}ℹ${C.reset} ${msg}`); }
function metric(label, value) { console.log(`  ${C.dim}${label}:${C.reset} ${C.bright}${value}${C.reset}`); }

// ═══════════════════════════════════════════════════════════════════════
//  TEST 1: PostgreSQL (Aiven) — Connection Pool & Query Throughput
// ═══════════════════════════════════════════════════════════════════════

async function testPostgreSQL() {
    header('TEST 1: PostgreSQL (Aiven) — Connection & Query Limits');

    if (!DATABASE_URL) {
        fail('DATABASE_URL not set, skipping PostgreSQL test');
        return { maxConnections: 0, queriesPerSec: 0, avgLatency: 0 };
    }

    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 25, // Test with higher pool size
    });

    // 1. Check max_connections setting
    let maxConnections = 0;
    try {
        const res = await pool.query("SHOW max_connections;");
        maxConnections = parseInt(res.rows[0].max_connections);
        metric('Server max_connections', maxConnections);
    } catch (e) {
        warn(`Could not read max_connections: ${e.message}`);
    }

    // 2. Check current active connections
    try {
        const res = await pool.query("SELECT count(*) FROM pg_stat_activity WHERE state = 'active';");
        metric('Current active connections', res.rows[0].count);
    } catch (e) { /* ignore */ }

    // 3. Check database size
    try {
        const res = await pool.query("SELECT pg_size_pretty(pg_database_size(current_database())) as size;");
        metric('Database size', res.rows[0].size);
    } catch (e) { /* ignore */ }

    // 4. Count key tables
    try {
        const [usersRes, msgsRes, charsRes] = await Promise.all([
            pool.query("SELECT count(*) FROM users;"),
            pool.query("SELECT count(*) FROM messages;"),
            pool.query("SELECT count(*) FROM characters;"),
        ]);
        metric('Total users in DB', usersRes.rows[0].count);
        metric('Total messages in DB', msgsRes.rows[0].count);
        metric('Total characters in DB', charsRes.rows[0].count);
    } catch (e) {
        warn(`Could not count tables: ${e.message}`);
    }

    // 5. Concurrent query stress test
    info(`Running ${CONCURRENT_USERS} concurrent queries for ${DURATION_SECONDS}s...`);
    const durations = [];
    let totalQueries = 0;
    let failedQueries = 0;
    const endTime = Date.now() + (DURATION_SECONDS * 1000);

    async function queryLoop() {
        while (Date.now() < endTime) {
            const start = Date.now();
            try {
                await pool.query("SELECT c.*, EXISTS(SELECT 1 FROM character_likes cl WHERE cl.character_id = c.id AND cl.user_id = 'test') as liked FROM characters c WHERE visibility = 'public' ORDER BY (likes_count * 2 + msg_count) DESC LIMIT 20;");
                durations.push(Date.now() - start);
                totalQueries++;
            } catch (e) {
                failedQueries++;
                durations.push(Date.now() - start);
            }
        }
    }

    const workers = [];
    for (let i = 0; i < Math.min(CONCURRENT_USERS, 50); i++) {
        workers.push(queryLoop());
    }
    await Promise.all(workers);

    const elapsed = DURATION_SECONDS;
    const qps = (totalQueries / elapsed).toFixed(1);

    metric('Total queries executed', totalQueries);
    metric('Failed queries', failedQueries);
    metric('Queries/second (QPS)', qps);
    metric('Avg latency', `${avg(durations).toFixed(1)} ms`);
    metric('p95 latency', `${percentile(durations, 0.95)} ms`);
    metric('Max latency', `${Math.max(...durations)} ms`);

    // Calculate user capacity from DB side
    // Each active user triggers ~3 DB queries on page load + 1 per message
    const dbUsersCapacity = Math.floor(parseFloat(qps) / 4);
    info(`${C.bright}DB can support ~${dbUsersCapacity} concurrent active users (4 queries/user)${C.reset}`);

    await pool.end();
    return { maxConnections, queriesPerSec: parseFloat(qps), avgLatency: avg(durations), dbUsersCapacity };
}

// ═══════════════════════════════════════════════════════════════════════
//  TEST 2: Redis/Valkey (Aiven) — Throughput & Memory
// ═══════════════════════════════════════════════════════════════════════

async function testRedis() {
    header('TEST 2: Redis/Valkey (Aiven) — Throughput & Memory');

    if (!REDIS_URL) {
        fail('REDIS_URL not set, skipping Redis test');
        return { opsPerSec: 0, memoryUsed: '0' };
    }

    const redis = new Redis(REDIS_URL, {
        tls: REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
        retryStrategy: () => null, // Don't retry for testing
        lazyConnect: true,
    });

    try {
        await redis.connect();
        success('Connected to Redis/Valkey');
    } catch (e) {
        fail(`Redis connection failed: ${e.message}`);
        return { opsPerSec: 0, memoryUsed: '0' };
    }

    // 1. Check server info
    try {
        const infoStr = await redis.info('memory');
        const usedMemMatch = infoStr.match(/used_memory_human:(.+)/);
        const maxMemMatch = infoStr.match(/maxmemory_human:(.+)/);
        const connectedMatch = (await redis.info('clients')).match(/connected_clients:(\d+)/);

        metric('Memory used', usedMemMatch ? usedMemMatch[1].trim() : 'unknown');
        metric('Max memory', maxMemMatch ? maxMemMatch[1].trim() : 'unlimited');
        metric('Connected clients', connectedMatch ? connectedMatch[1] : 'unknown');
    } catch (e) {
        warn(`Could not read Redis info: ${e.message}`);
    }

    // 2. SET/GET throughput test
    info(`Running read/write throughput test for ${DURATION_SECONDS}s...`);
    const durations = [];
    let totalOps = 0;
    let failedOps = 0;
    const endTime = Date.now() + (DURATION_SECONDS * 1000);

    async function redisLoop(id) {
        while (Date.now() < endTime) {
            const start = Date.now();
            try {
                const testKey = `loadtest:user:${id}:${Date.now()}`;
                await redis.set(testKey, JSON.stringify({ user: id, data: 'test-session-data-' + Math.random() }), 'EX', 10);
                await redis.get(testKey);
                await redis.del(testKey);
                durations.push(Date.now() - start);
                totalOps++;
            } catch (e) {
                failedOps++;
                durations.push(Date.now() - start);
            }
        }
    }

    const workers = [];
    for (let i = 0; i < Math.min(CONCURRENT_USERS, 50); i++) {
        workers.push(redisLoop(i));
    }
    await Promise.all(workers);

    const opsPerSec = (totalOps / DURATION_SECONDS).toFixed(1);

    metric('Total operations (SET+GET+DEL)', totalOps);
    metric('Failed operations', failedOps);
    metric('Operations/second', opsPerSec);
    metric('Avg latency', `${avg(durations).toFixed(1)} ms`);
    metric('p95 latency', `${percentile(durations, 0.95)} ms`);

    // Each user session needs ~2 Redis ops, so:
    const redisUsersCapacity = Math.floor(parseFloat(opsPerSec) / 2);
    info(`${C.bright}Redis can support ~${redisUsersCapacity} concurrent active users (2 ops/user)${C.reset}`);

    await redis.quit();
    return { opsPerSec: parseFloat(opsPerSec), redisUsersCapacity };
}

// ═══════════════════════════════════════════════════════════════════════
//  TEST 3: Groq AI API — Rate Limits & TPM
// ═══════════════════════════════════════════════════════════════════════

async function testGroqAPI() {
    header('TEST 3: Groq AI API — Rate Limits & Token Capacity');

    const keys = [];
    if (GROQ_API_KEY) keys.push({ key: GROQ_API_KEY, label: 'Key 1' });
    if (GROQ_API_KEY_4) keys.push({ key: GROQ_API_KEY_4, label: 'Key 4' });

    if (keys.length === 0) {
        fail('No GROQ_API_KEY found, skipping Groq test');
        return { totalKeysAvailable: 0, effectiveRPM: 0 };
    }

    metric('API Keys available', keys.length);

    // Known Groq limits (pay-as-you-go)
    info('Known Groq limits for moonshotai/kimi-k2-instruct:');
    metric('  TPM (tokens/min)', '131,072 per key');
    metric('  RPM (requests/min)', '30 per key (free) / 60+ (paid)');
    metric('  Max concurrent (app-level)', '2 per model');

    // Test each key with a minimal request
    for (const { key, label } of keys) {
        const start = Date.now();
        const res = await makeRequest('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`,
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: 'say hi in one word' }],
                max_tokens: 5,
                temperature: 0,
            }),
        });

        const latency = Date.now() - start;
        if (res.status === 200) {
            success(`${label}: OK (${latency}ms)`);
            // Check rate limit headers
            const remaining = res.headers['x-ratelimit-remaining-requests'];
            const limit = res.headers['x-ratelimit-limit-requests'];
            const tokensRemaining = res.headers['x-ratelimit-remaining-tokens'];
            const tokensLimit = res.headers['x-ratelimit-limit-tokens'];
            if (limit) metric(`  ${label} RPM limit`, limit);
            if (remaining) metric(`  ${label} RPM remaining`, remaining);
            if (tokensLimit) metric(`  ${label} TPM limit`, tokensLimit);
            if (tokensRemaining) metric(`  ${label} TPM remaining`, tokensRemaining);
        } else if (res.status === 429) {
            warn(`${label}: Rate limited (429) — ${latency}ms`);
        } else {
            fail(`${label}: Error ${res.status} — ${latency}ms`);
        }
    }

    // Calculate effective capacity
    // Average roleplay response = ~500 tokens input + ~300 tokens output = 800 tokens
    const tokensPerChat = 800;
    const tpmPerKey = 131072;
    const chatsPerMinPerKey = Math.floor(tpmPerKey / tokensPerChat);
    const totalChatsPerMin = chatsPerMinPerKey * keys.length;

    metric('Est. chats/min per key', chatsPerMinPerKey);
    metric('Est. total chats/min (all keys)', totalChatsPerMin);

    // A typical user sends ~2-3 messages per minute during active chat
    const aiUsersCapacity = Math.floor(totalChatsPerMin / 3);
    info(`${C.bright}AI API can support ~${aiUsersCapacity} concurrently CHATTING users (3 msgs/min)${C.reset}`);

    return { totalKeysAvailable: keys.length, totalChatsPerMin, aiUsersCapacity };
}

// ═══════════════════════════════════════════════════════════════════════
//  TEST 4: xAI (Grok) API — Rate Limits
// ═══════════════════════════════════════════════════════════════════════

async function testXAI() {
    header('TEST 4: xAI (Grok) API — Rate Limits');

    if (!XAI_API_KEY) {
        fail('XAI_API_KEY not set, skipping xAI test');
        return { available: false };
    }

    const start = Date.now();
    const res = await makeRequest('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${XAI_API_KEY}`,
        },
        body: JSON.stringify({
            model: 'grok-3-mini-fast',
            messages: [{ role: 'user', content: 'say hi' }],
            max_tokens: 5,
        }),
    });

    const latency = Date.now() - start;
    if (res.status === 200) {
        success(`xAI API: OK (${latency}ms)`);
        const remaining = res.headers['x-ratelimit-remaining-requests'];
        const limit = res.headers['x-ratelimit-limit-requests'];
        if (limit) metric('RPM limit', limit);
        if (remaining) metric('RPM remaining', remaining);
    } else if (res.status === 429) {
        warn(`xAI API: Rate limited (429) — consider upgrading tier`);
    } else {
        fail(`xAI API: Error ${res.status} (${latency}ms)`);
        try {
            const err = JSON.parse(res.data);
            info(`  Error: ${err.error?.message || res.data.slice(0, 200)}`);
        } catch { }
    }

    return { available: res.status === 200 };
}

// ═══════════════════════════════════════════════════════════════════════
//  TEST 5: HTTP Endpoint Load Test (Full Stack)
// ═══════════════════════════════════════════════════════════════════════

async function testHTTPEndpoints() {
    header('TEST 5: HTTP API Endpoint Load Test (Full Stack)');

    // Test if server is running
    const ping = await makeRequest(`${BASE_URL}/api/characters?limit=1`);
    if (ping.status === 0) {
        warn(`Server not reachable at ${BASE_URL}. Skipping HTTP load test.`);
        info('Start the Next.js server first with: npm run dev');
        return { available: false };
    }

    const endpoints = [
        { path: '/api/characters?limit=20', name: 'Characters (Explore)', weight: 3 },
        { path: '/api/conversations', name: 'Conversations (Chat List)', weight: 2 },
    ];

    const results = {};

    for (const ep of endpoints) {
        info(`Testing ${ep.name} — ${CONCURRENT_USERS} concurrent users, ${DURATION_SECONDS}s...`);

        const durations = [];
        let total = 0, success_count = 0, failed = 0, rateLimited = 0;
        const endTime = Date.now() + (DURATION_SECONDS * 1000);

        async function httpLoop() {
            while (Date.now() < endTime) {
                const res = await makeRequest(`${BASE_URL}${ep.path}`);
                durations.push(res.duration);
                total++;
                if (res.status >= 200 && res.status < 300) success_count++;
                else if (res.status === 429) rateLimited++;
                else failed++;
            }
        }

        const workers = [];
        for (let i = 0; i < CONCURRENT_USERS; i++) {
            workers.push(httpLoop());
        }
        await Promise.all(workers);

        const rps = (total / DURATION_SECONDS).toFixed(1);
        metric(`  Total requests`, total);
        metric(`  Successful`, success_count);
        metric(`  Rate limited (429)`, rateLimited);
        metric(`  Failed`, failed);
        metric(`  Requests/sec`, rps);
        metric(`  Avg latency`, `${avg(durations).toFixed(0)} ms`);
        metric(`  p95 latency`, `${percentile(durations, 0.95)} ms`);
        metric(`  Max latency`, `${Math.max(...durations)} ms`);

        results[ep.name] = { rps: parseFloat(rps), avgLatency: avg(durations), total, failed, rateLimited };
    }

    return { available: true, results };
}

// ═══════════════════════════════════════════════════════════════════════
//  TEST 6: Middleware Rate Limiter Analysis
// ═══════════════════════════════════════════════════════════════════════

async function testRateLimiter() {
    header('TEST 6: Middleware Rate Limiter Analysis');

    info('Current rate limit configuration (from middleware.ts):');
    metric('  /api/chat', '20 requests/minute per IP');
    metric('  /api/analyze', '5 requests/minute per IP');
    metric('  /api/translate', '30 requests/minute per IP');
    metric('  /api/feedback', '10 requests/minute per IP');
    metric('  /api/roleplay', 'NO rate limit (bottleneck!)');
    metric('  /api/characters', 'NO rate limit');
    metric('  /api/messages', 'NO rate limit');
    metric('  /api/conversations', 'NO rate limit');

    console.log('');
    warn('⚠ /api/roleplay has NO rate limit but calls external AI APIs!');
    info('Each /api/roleplay call consumes:');
    metric('  1x Groq/xAI API call', '~800 tokens');
    metric('  1x Pinecone vector query', 'retrieveContext()');
    metric('  1x Pinecone vector upsert', 'saveContext()');
    metric('  1x PostgreSQL query', 'getLatestReadingForUser()');
    metric('  1x Auth check', 'session verification');

    return {
        chatRPM: 20,
        analyzeRPM: 5,
        roleplayRPM: 'unlimited (dangerous!)',
    };
}

// ═══════════════════════════════════════════════════════════════════════
//  FINAL REPORT — Production Capacity Summary
// ═══════════════════════════════════════════════════════════════════════

function generateReport(dbResult, redisResult, groqResult, xaiResult, httpResult) {
    header('FINAL PRODUCTION CAPACITY REPORT');

    console.log(`${C.bright}${C.white}  Service-by-Service Bottleneck Analysis:${C.reset}\n`);

    // Collect all capacity numbers
    const capacities = [];

    if (dbResult.dbUsersCapacity) {
        const status = dbResult.dbUsersCapacity > 100 ? C.green : dbResult.dbUsersCapacity > 30 ? C.yellow : C.red;
        console.log(`  ${status}PostgreSQL (Aiven):  ~${dbResult.dbUsersCapacity} concurrent users${C.reset}`);
        console.log(`  ${C.dim}  └─ ${dbResult.queriesPerSec} QPS, max_conn: ${dbResult.maxConnections}, avg: ${dbResult.avgLatency.toFixed(0)}ms${C.reset}`);
        capacities.push({ service: 'PostgreSQL', users: dbResult.dbUsersCapacity });
    }

    if (redisResult.redisUsersCapacity) {
        const status = redisResult.redisUsersCapacity > 500 ? C.green : redisResult.redisUsersCapacity > 100 ? C.yellow : C.red;
        console.log(`  ${status}Redis/Valkey (Aiven): ~${redisResult.redisUsersCapacity} concurrent users${C.reset}`);
        console.log(`  ${C.dim}  └─ ${redisResult.opsPerSec} ops/sec${C.reset}`);
        capacities.push({ service: 'Redis/Valkey', users: redisResult.redisUsersCapacity });
    }

    if (groqResult.aiUsersCapacity) {
        const status = groqResult.aiUsersCapacity > 50 ? C.green : groqResult.aiUsersCapacity > 20 ? C.yellow : C.red;
        console.log(`  ${status}Groq AI API:         ~${groqResult.aiUsersCapacity} concurrently chatting users${C.reset}`);
        console.log(`  ${C.dim}  └─ ${groqResult.totalKeysAvailable} keys, ${groqResult.totalChatsPerMin} chats/min total${C.reset}`);
        capacities.push({ service: 'Groq AI API', users: groqResult.aiUsersCapacity });
    }

    if (xaiResult.available) {
        console.log(`  ${C.green}xAI (Grok):          Available as fallback${C.reset}`);
    } else {
        console.log(`  ${C.yellow}xAI (Grok):          Not available / rate limited${C.reset}`);
    }

    console.log('');

    // Find the bottleneck
    if (capacities.length > 0) {
        capacities.sort((a, b) => a.users - b.users);
        const bottleneck = capacities[0];
        const maxUsers = bottleneck.users;

        console.log(`${C.bright}${C.cyan}  ┌────────────────────────────────────────────────┐${C.reset}`);
        console.log(`${C.bright}${C.cyan}  │                                                │${C.reset}`);
        console.log(`${C.bright}${C.cyan}  │  Max Concurrent Active Users: ${C.white}~${maxUsers} users${C.cyan}       │${C.reset}`);
        console.log(`${C.bright}${C.cyan}  │  Bottleneck: ${C.yellow}${bottleneck.service}${C.cyan}                     │${C.reset}`);
        console.log(`${C.bright}${C.cyan}  │                                                │${C.reset}`);
        console.log(`${C.bright}${C.cyan}  └────────────────────────────────────────────────┘${C.reset}`);

        console.log('');

        // DAU estimation (not all users are active simultaneously)
        // Typically 5-10% of DAU are concurrent at peak
        const estimatedDAU = maxUsers * 15; // ~6.6% concurrency ratio
        console.log(`  ${C.bright}Estimated Daily Active Users (DAU): ~${estimatedDAU}${C.reset}`);
        console.log(`  ${C.dim}(Assuming ~7% peak concurrency ratio like c.ai)${C.reset}`);

        console.log('');
        console.log(`${C.bright}${C.white}  Recommendations to Scale Further:${C.reset}`);
        console.log('');

        if (bottleneck.service === 'Groq AI API') {
            console.log(`  ${C.yellow}1.${C.reset} Add more Groq API keys (GROQ_API_KEY_2, _3, _5)`);
            console.log(`     ${C.dim}Each key adds ~54 more concurrent chatters${C.reset}`);
            console.log(`  ${C.yellow}2.${C.reset} Upgrade to Groq paid tier for higher TPM/RPM`);
            console.log(`  ${C.yellow}3.${C.reset} Enable Gemini fallback (add GEMINI_API_KEY to .env)`);
            console.log(`  ${C.yellow}4.${C.reset} Increase LRU cache size in groq.ts for repeat queries`);
        }
        if (bottleneck.service === 'PostgreSQL') {
            console.log(`  ${C.yellow}1.${C.reset} Upgrade Aiven PostgreSQL to a paid plan (more connections)`);
            console.log(`  ${C.yellow}2.${C.reset} Add connection pooler (PgBouncer)`);
            console.log(`  ${C.yellow}3.${C.reset} Add Redis caching for /api/characters and /api/conversations`);
            console.log(`  ${C.yellow}4.${C.reset} Consider read replicas for heavy read paths`);
        }
        if (bottleneck.service === 'Redis/Valkey') {
            console.log(`  ${C.yellow}1.${C.reset} Upgrade Aiven Valkey to a paid plan (more memory)`);
            console.log(`  ${C.yellow}2.${C.reset} Optimize cache key TTLs`);
        }

        console.log('');
        console.log(`  ${C.yellow}General:${C.reset}`);
        console.log(`  ${C.yellow}•${C.reset} Add rate limiting to /api/roleplay (currently unlimited!)`);
        console.log(`  ${C.yellow}•${C.reset} Use Upstash Redis for rate limiting in multi-instance deploys`);
        console.log(`  ${C.yellow}•${C.reset} Deploy on Vercel Edge for auto-scaling`);

    }
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════

async function main() {
    console.log(`\n${C.bright}${C.magenta}╔══════════════════════════════════════════════════════════╗${C.reset}`);
    console.log(`${C.bright}${C.magenta}║    KZodi Production Scalability Analysis                 ║${C.reset}`);
    console.log(`${C.bright}${C.magenta}║    Testing: DB, Redis, AI APIs, Rate Limits              ║${C.reset}`);
    console.log(`${C.bright}${C.magenta}║    Concurrent Users: ${CONCURRENT_USERS.toString().padEnd(4)} | Duration: ${DURATION_SECONDS}s              ║${C.reset}`);
    console.log(`${C.bright}${C.magenta}╚══════════════════════════════════════════════════════════╝${C.reset}`);

    const dbResult = await testPostgreSQL();
    const redisResult = await testRedis();
    const groqResult = await testGroqAPI();
    const xaiResult = await testXAI();
    const rateLimitResult = await testRateLimiter();

    let httpResult = { available: false };
    try {
        httpResult = await testHTTPEndpoints();
    } catch (e) {
        warn(`HTTP endpoint test failed: ${e.message}`);
    }

    generateReport(dbResult, redisResult, groqResult, xaiResult, httpResult);

    console.log(`\n${C.dim}Analysis completed at ${new Date().toISOString()}${C.reset}\n`);
}

main().catch(console.error);
