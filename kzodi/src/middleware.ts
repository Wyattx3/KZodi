import { NextRequest, NextResponse } from "next/server";

/**
 * Per-IP Sliding Window Rate Limiter
 * - /api/chat:      20 requests / minute
 * - /api/analyze:    5 requests / minute
 * - /api/translate: 30 requests / minute
 * - /api/feedback:  10 requests / minute
 *
 * Returns 429 with Retry-After header when limit exceeded.
 * Uses in-memory Map (works per-instance; for multi-instance deploy, use Upstash Redis).
 */

// ─── Rate Limit Config ───────────────────────────────────────────────────────

interface RateLimitRule {
  windowMs: number;
  maxRequests: number;
}

const RATE_LIMITS: Record<string, RateLimitRule> = {
  "/api/chat":      { windowMs: 60_000, maxRequests: 20 },
  "/api/analyze":   { windowMs: 60_000, maxRequests: 5 },
  "/api/translate":  { windowMs: 60_000, maxRequests: 30 },
  "/api/feedback":  { windowMs: 60_000, maxRequests: 10 },
};

// ─── Sliding Window Store ────────────────────────────────────────────────────

interface WindowEntry {
  timestamps: number[];
}

// Global store: Map<"ip:path", WindowEntry>
const store = new Map<string, WindowEntry>();

// Periodic cleanup every 5 minutes to prevent memory leak
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 5 * 60_000;

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  const cutoff = now - 120_000; // Remove entries older than 2 minutes
  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}

// ─── Rate Check ──────────────────────────────────────────────────────────────

function checkRateLimit(ip: string, path: string): { allowed: boolean; retryAfter: number; remaining: number } {
  // Find matching rule
  const rule = Object.entries(RATE_LIMITS).find(([prefix]) => path.startsWith(prefix));
  if (!rule) return { allowed: true, retryAfter: 0, remaining: 999 };

  const [, config] = rule;
  const key = `${ip}:${rule[0]}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Get or create entry
  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove old timestamps outside window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= config.maxRequests) {
    // Rate limited - calculate when the oldest request in window expires
    const oldestInWindow = entry.timestamps[0];
    const retryAfter = Math.ceil((oldestInWindow + config.windowMs - now) / 1000);
    return { allowed: false, retryAfter: Math.max(retryAfter, 1), remaining: 0 };
  }

  // Allow and record
  entry.timestamps.push(now);
  const remaining = config.maxRequests - entry.timestamps.length;
  return { allowed: true, retryAfter: 0, remaining };
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only rate-limit API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Periodic cleanup
  cleanup();

  // Get client IP
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";

  const { allowed, retryAfter, remaining } = checkRateLimit(ip, pathname);

  if (!allowed) {
    console.warn(`[RateLimit] Blocked ${ip} on ${pathname}. Retry after ${retryAfter}s`);
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again.", retryAfter },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  // Add rate limit headers to response
  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Remaining", String(remaining));
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
