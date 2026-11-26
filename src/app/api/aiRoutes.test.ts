import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildAnalyzeCacheKey, clearAnalyzeCacheForTest, getCachedAnalysis } from '@/server/cache';
import { resetRateLimitsForTest } from '@/server/rateLimit';
import { AnalyzeRequestSchema } from '@/shared/schemas';
import { POST as postAnalyze, maxDuration as analyzeMaxDuration } from './analyze/route';
import { POST as postBrief } from './brief/route';
import { POST as postPlanDay, maxDuration as planDayMaxDuration } from './plan-day/route';
import { POST as postRoomCheck, maxDuration as roomCheckMaxDuration } from './room-check/route';

const VALID_ANALYZE_BODY = {
  cityKey: 'delhi',
  question: 'overview',
  profile: {
    sensitive: 'none',
    roomSize: 'medium',
    cooking: 'gas_no_exhaust',
    commuteKm: 10,
  },
  toggles: {
    travel: 'carpool',
    smartTiming: true,
    indoor: 'hepa',
    households: 25,
  },
  regime: 'combustion',
  no2Level: 'moderate',
  engine: {
    baselinePctWho: 400,
    adjustedPctWho: 180,
    cigAvoided: 1.5,
    bestHour: 14,
    bestHourLabel: 'safe_window',
    co2eKg: 43.3,
    noxG: 26.7,
  },
};

const VALID_BRIEF_BODY = {
  lang: 'en',
  cityName: 'Delhi NCR',
  profile: VALID_ANALYZE_BODY.profile,
  toggles: VALID_ANALYZE_BODY.toggles,
  engine: VALID_ANALYZE_BODY.engine,
  bestHourClock: '14:00',
};

describe('/api/analyze and /api/brief routes', () => {
  afterEach(() => {
    resetRateLimitsForTest();
    clearAnalyzeCacheForTest();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('exports maxDuration = 15 on /api/analyze', () => {
    expect(analyzeMaxDuration).toBe(15);
  });

  it('POST /api/analyze returns template fallback cleanly and does not poison cache', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    const req = new NextRequest('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.9' },
      body: JSON.stringify(VALID_ANALYZE_BODY),
    });
    const res = await postAnalyze(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.source).toBe('template');
    expect(body.headlineReason).toBeTruthy();

    const parsed = AnalyzeRequestSchema.parse(VALID_ANALYZE_BODY);
    expect(getCachedAnalysis(buildAnalyzeCacheKey(parsed))).toBeNull();
  });

  it('POST /api/analyze enforces 4 KB cap (413) and schema validation (400)', async () => {
    const oversized = JSON.stringify({ ...VALID_ANALYZE_BODY, pad: 'x'.repeat(4200) });
    const bigReq = new NextRequest('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: oversized,
    });
    expect((await postAnalyze(bigReq)).status).toBe(413);

    const badReq = new NextRequest('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...VALID_ANALYZE_BODY, cityKey: 'invalid city!' }),
    });
    expect((await postAnalyze(badReq)).status).toBe(400);
  });

  it('POST /api/analyze enforces 10/min per-IP rate limit (429)', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    for (let i = 0; i < 10; i += 1) {
      const req = new NextRequest('http://localhost/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.77' },
        body: JSON.stringify({ ...VALID_ANALYZE_BODY, cityKey: `city_${i}` }),
      });
      expect((await postAnalyze(req)).status).toBe(200);
    }

    const blocked = new NextRequest('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.77' },
      body: JSON.stringify(VALID_ANALYZE_BODY),
    });
    const blockedRes = await postAnalyze(blocked);
    expect(blockedRes.status).toBe(429);
    expect((await blockedRes.json()).error.code).toBe('RATE_LIMITED');
  });

  it('POST /api/brief returns EN/HI brief and rejects invalid or oversized payloads', async () => {
    const req = new NextRequest('http://localhost/api/brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...VALID_BRIEF_BODY, lang: 'hi' }),
    });
    const res = await postBrief(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lang).toBe('hi');
    expect(body.text).toContain('14:00');

    const badReq = new NextRequest('http://localhost/api/brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...VALID_BRIEF_BODY, bestHourClock: 'bad' }),
    });
    expect((await postBrief(badReq)).status).toBe(400);

    const bigReq = new NextRequest('http://localhost/api/brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...VALID_BRIEF_BODY, pad: 'x'.repeat(4200) }),
    });
    expect((await postBrief(bigReq)).status).toBe(413);
  });

  it('POST /api/plan-day returns valid PlanDayResponse, validates input, and enforces 5/min rate limit', async () => {
    expect(planDayMaxDuration).toBe(15);
    vi.stubEnv('GEMINI_API_KEY', '');

    const validReq = new NextRequest('http://localhost/api/plan-day', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.88' },
      body: JSON.stringify({
        text: 'Dropping my child to school, cooking on gas without exhaust, using metro.',
        cityKey: 'delhi',
      }),
    });
    const res = await postPlanDay(validReq);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.source).toBe('template');
    expect(body.profile.sensitive).toBe('child');
    expect(body.toggles.travel).toBe('metro_walk');
    expect(body.gameplan.bullets.length).toBeGreaterThanOrEqual(1);

    const shortReq = new NextRequest('http://localhost/api/plan-day', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.89' },
      body: JSON.stringify({ text: 'hi', cityKey: 'delhi' }),
    });
    expect((await postPlanDay(shortReq)).status).toBe(400);

    for (let i = 0; i < 4; i += 1) {
      const okReq = new NextRequest('http://localhost/api/plan-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.88' },
        body: JSON.stringify({
          text: 'Working from home with induction stove.',
          cityKey: 'delhi',
        }),
      });
      expect((await postPlanDay(okReq)).status).toBe(200);
    }

    const rateLimitedReq = new NextRequest('http://localhost/api/plan-day', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.88' },
      body: JSON.stringify({
        text: 'Working from home with induction stove.',
        cityKey: 'delhi',
      }),
    });
    expect((await postPlanDay(rateLimitedReq)).status).toBe(429);
  });

  it('POST /api/room-check returns fallback cleanly, validates payload, and enforces 3/min rate limit', async () => {
    expect(roomCheckMaxDuration).toBe(15);
    vi.stubEnv('GEMINI_API_KEY', '');

    const validPayload = {
      imageBase64: 'A'.repeat(64),
      cityKey: 'delhi',
    };

    for (let i = 0; i < 3; i += 1) {
      const req = new NextRequest('http://localhost/api/room-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.95' },
        body: JSON.stringify(validPayload),
      });
      const res = await postRoomCheck(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.source).toBe('template');
      expect(body.mappedIndoor).toBe('seal_exhaust');
      expect(body.bottlenecks.length).toBeGreaterThanOrEqual(1);
    }

    const blockedReq = new NextRequest('http://localhost/api/room-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.95' },
      body: JSON.stringify(validPayload),
    });
    expect((await postRoomCheck(blockedReq)).status).toBe(429);

    const badReq = new NextRequest('http://localhost/api/room-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.96' },
      body: JSON.stringify({ imageBase64: 'short', cityKey: 'delhi' }),
    });
    expect((await postRoomCheck(badReq)).status).toBe(400);
  });
});
