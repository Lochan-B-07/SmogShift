import { NextRequest, NextResponse } from 'next/server';
import { fetchGeocode } from '@/server/openMeteo';
import { checkRateLimit, extractClientIp } from '@/server/rateLimit';
import { GeocodeQuerySchema } from '@/shared/schemas';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ip = extractClientIp(request.headers);
  const limit = checkRateLimit('geocode', ip, 60);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again shortly.' } },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  const q = request.nextUrl.searchParams.get('q') ?? '';
  const parsed = GeocodeQuerySchema.safeParse({ q });
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_QUERY', message: 'Query must be 2 to 60 valid characters.' } },
      { status: 400 },
    );
  }

  try {
    const results = await fetchGeocode(parsed.data.q);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: { code: 'UPSTREAM_ERROR', message: 'Unable to fetch city search results right now.' } },
      { status: 502 },
    );
  }
}
