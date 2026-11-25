import { afterEach, describe, expect, it, vi } from 'vitest';
import { getNearestFallback } from './fallback';
import { buildAirQualityUrl, fetchAirQuality, roundCoord } from './openMeteo';
import {
  checkRateLimit,
  consumeGeminiDailyQuota,
  extractClientIp,
  resetRateLimitsForTest,
} from './rateLimit';

describe('Rate limiting and daily Gemini quota', () => {
  afterEach(() => {
    resetRateLimitsForTest();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('extracts first IP from x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.10, 10.0.0.1' });
    expect(extractClientIp(headers)).toBe('203.0.113.10');
  });

  it('enforces per-IP burst limit and isolates different IPs', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 10; i += 1) {
      expect(checkRateLimit('analyze', '1.1.1.1', 10, t0).allowed).toBe(true);
    }
    const blocked = checkRateLimit('analyze', '1.1.1.1', 10, t0);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);

    // Different IP is unaffected
    expect(checkRateLimit('analyze', '2.2.2.2', 10, t0).allowed).toBe(true);

    // Refills after 60s
    expect(checkRateLimit('analyze', '1.1.1.1', 10, t0 + 60_000).allowed).toBe(true);
  });

  it('enforces global daily Gemini cap', () => {
    vi.stubEnv('GEMINI_DAILY_CAP', '2');
    const now = new Date('2026-11-25T10:00:00Z');
    expect(consumeGeminiDailyQuota(now)).toBe(true);
    expect(consumeGeminiDailyQuota(now)).toBe(true);
    expect(consumeGeminiDailyQuota(now)).toBe(false);

    // Next UTC day resets quota
    expect(consumeGeminiDailyQuota(new Date('2026-11-26T00:01:00Z'))).toBe(true);
  });
});

describe('Fallback snapshots and Open-Meteo client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('selects nearest snapshot by haversine distance with isFallback: true', () => {
    expect(getNearestFallback(26.8, 80.9).location.name).toBe('Lucknow');
    expect(getNearestFallback(19.1, 72.9).location.name).toBe('Mumbai');
    expect(getNearestFallback(13.0, 77.6).location.name).toBe('Bengaluru');
    expect(getNearestFallback(28.6, 77.2).location.name).toBe('Delhi NCR');
    expect(getNearestFallback(28.6, 77.2).source.isFallback).toBe(true);
  });

  it('rounds coordinates to 2 decimal places before calling Open-Meteo', async () => {
    expect(roundCoord(28.6139)).toBe('28.61');
    expect(buildAirQualityUrl(28.6139, 77.209)).toContain('latitude=28.61&longitude=77.21');

    const mockHours = Array.from({ length: 24 }, (_, h) => `2026-11-25T${String(h).padStart(2, '0')}:00`);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          latitude: 28.61,
          longitude: 77.21,
          timezone: 'Asia/Kolkata',
          hourly: {
            time: mockHours,
            pm2_5: mockHours.map(() => 90),
            pm10: mockHours.map(() => 120),
            nitrogen_dioxide: mockHours.map(() => 40),
          },
        }),
        { status: 200 },
      ),
    );

    const res = await fetchAirQuality(28.6139, 77.209, 'Delhi NCR');
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('latitude=28.61&longitude=77.21'),
      expect.objectContaining({ next: { revalidate: 900 } }),
    );
    expect(res.source.isFallback).toBe(false);
    expect(res.fingerprint.regime).toBe('combustion');
  });

  it('falls back to nearest ES snapshot on upstream timeout or error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Timeout'));

    const res = await fetchAirQuality(19.08, 72.88);
    expect(res.source.isFallback).toBe(true);
    expect(res.location.name).toBe('Mumbai');
    expect(res.hours.length).toBeGreaterThanOrEqual(24);
  });
});
