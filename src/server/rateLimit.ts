export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterSeconds: number;
}

interface Bucket {
  tokens: number;
  lastRefillMs: number;
}

const buckets = new Map<string, Bucket>();
let dailyGeminiDate = '';
let dailyGeminiCount = 0;

const WINDOW_MS = 60_000;

export function extractClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get('x-real-ip')?.trim();
  return realIp || '127.0.0.1';
}

export function checkRateLimit(
  routeKey: string,
  ip: string,
  limitPerMinute: number,
  nowMs: number = Date.now(),
): RateLimitResult {
  const key = `${routeKey}:${ip}`;
  const refillRatePerMs = limitPerMinute / WINDOW_MS;
  const existing = buckets.get(key);

  if (!existing) {
    buckets.set(key, { tokens: limitPerMinute - 1, lastRefillMs: nowMs });
    return { allowed: true, remaining: limitPerMinute - 1, retryAfterSeconds: 0 };
  }

  const elapsed = Math.max(0, nowMs - existing.lastRefillMs);
  const replenished = Math.min(limitPerMinute, existing.tokens + elapsed * refillRatePerMs);

  if (replenished < 1) {
    const missing = 1 - replenished;
    const retryAfterSeconds = Math.max(1, Math.ceil(missing / refillRatePerMs / 1000));
    existing.tokens = replenished;
    existing.lastRefillMs = nowMs;
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  existing.tokens = replenished - 1;
  existing.lastRefillMs = nowMs;
  return {
    allowed: true,
    remaining: Math.floor(existing.tokens),
    retryAfterSeconds: 0,
  };
}

export function getGeminiDailyCap(): number {
  const raw = process.env.GEMINI_DAILY_CAP;
  const parsed = raw ? Number(raw) : 500;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 500;
}

export function consumeGeminiDailyQuota(now: Date = new Date()): boolean {
  const today = now.toISOString().slice(0, 10);
  if (dailyGeminiDate !== today) {
    dailyGeminiDate = today;
    dailyGeminiCount = 0;
  }
  if (dailyGeminiCount >= getGeminiDailyCap()) {
    return false;
  }
  dailyGeminiCount += 1;
  return true;
}

export function resetRateLimitsForTest(): void {
  buckets.clear();
  dailyGeminiDate = '';
  dailyGeminiCount = 0;
}
