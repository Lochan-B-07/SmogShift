import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetRateLimitsForTest } from '@/server/rateLimit';
import { GET as getAirQuality } from './air-quality/route';
import { GET as getGeocode } from './geocode/route';
import { GET as getHealth } from './health/route';

describe('API data routes', () => {
  afterEach(() => {
    resetRateLimitsForTest();
    vi.restoreAllMocks();
  });

  it('GET /api/health returns { ok: true }', async () => {
    const res = getHealth();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it('GET /api/air-quality returns 400 on invalid coordinates', async () => {
    const req = new NextRequest('http://localhost/api/air-quality?lat=999&lon=77.21');
    const res = await getAirQuality(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({
      error: {
        code: 'INVALID_QUERY',
        message: 'Valid lat (-90..90) and lon (-180..180) are required.',
      },
    });
  });

  it('GET /api/air-quality returns fallback JSON cleanly on upstream failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Upstream down', { status: 503 }));
    const req = new NextRequest('http://localhost/api/air-quality?lat=26.85&lon=80.95');
    const res = await getAirQuality(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.source.isFallback).toBe(true);
    expect(body.location.name).toBe('Lucknow');
  });

  it('GET /api/air-quality returns 429 after 60 requests per minute from same IP', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Down', { status: 503 }));
    for (let i = 0; i < 60; i += 1) {
      const req = new NextRequest('http://localhost/api/air-quality?lat=28.61&lon=77.21', {
        headers: { 'x-forwarded-for': '198.51.100.5' },
      });
      const res = await getAirQuality(req);
      expect(res.status).toBe(200);
    }

    const blockedReq = new NextRequest('http://localhost/api/air-quality?lat=28.61&lon=77.21', {
      headers: { 'x-forwarded-for': '198.51.100.5' },
    });
    const blockedRes = await getAirQuality(blockedReq);
    expect(blockedRes.status).toBe(429);
    const body = await blockedRes.json();
    expect(body.error.code).toBe('RATE_LIMITED');
  });

  it('GET /api/geocode returns max 5 sanitized Indian city results', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              id: 1,
              name: 'Jaipur',
              admin1: 'Rajasthan',
              latitude: 26.9124,
              longitude: 75.7873,
              country_code: 'IN',
              population: 3000000,
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const req = new NextRequest('http://localhost/api/geocode?q=Jaipur');
    const res = await getGeocode(req);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      results: [{ name: 'Jaipur', admin1: 'Rajasthan', lat: 26.91, lon: 75.79 }],
    });
  });

  it('GET /api/geocode returns 400 for short/invalid query and 502 without leaking URLs on error', async () => {
    const badReq = new NextRequest('http://localhost/api/geocode?q=a');
    const badRes = await getGeocode(badReq);
    expect(badRes.status).toBe(400);

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new Error('connect ECONNREFUSED https://geocoding-api.open-meteo.com/v1/search'),
    );
    const errReq = new NextRequest('http://localhost/api/geocode?q=Jaipur');
    const errRes = await getGeocode(errReq);
    expect(errRes.status).toBe(502);
    const errBody = await errRes.json();
    expect(errBody.error.code).toBe('UPSTREAM_ERROR');
    expect(JSON.stringify(errBody)).not.toContain('open-meteo.com');
  });
});
