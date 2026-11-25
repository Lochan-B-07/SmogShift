import { createHash } from 'node:crypto';
import type { AnalyzeRequest, AnalyzeResponse } from '@/shared/schemas';

interface CacheEntry {
  readonly value: AnalyzeResponse;
  readonly expiresAtMs: number;
}

const TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 200;

const store = new Map<string, CacheEntry>();

export function buildAnalyzeCacheKey(req: AnalyzeRequest): string {
  return createHash('sha256').update(JSON.stringify(req)).digest('hex');
}

export function getCachedAnalysis(key: string, nowMs: number = Date.now()): AnalyzeResponse | null {
  const entry = store.get(key);
  if (!entry) return null;

  if (nowMs >= entry.expiresAtMs) {
    store.delete(key);
    return null;
  }

  // Refresh LRU order
  store.delete(key);
  store.set(key, entry);
  return entry.value;
}

export function setCachedAnalysis(
  key: string,
  value: AnalyzeResponse,
  nowMs: number = Date.now(),
): void {
  if (store.has(key)) {
    store.delete(key);
  } else if (store.size >= MAX_ENTRIES) {
    const oldestKey = store.keys().next().value;
    if (oldestKey !== undefined) {
      store.delete(oldestKey);
    }
  }
  store.set(key, { value, expiresAtMs: nowMs + TTL_MS });
}

export function clearAnalyzeCacheForTest(): void {
  store.clear();
}
