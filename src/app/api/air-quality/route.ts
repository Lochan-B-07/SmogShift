import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, extractClientIp } from '@/server/rateLimit';
import { fetchAirQuality } from '@/server/openMeteo';
import { AirQualityQuerySchema } from '@/shared/schemas';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ip = extractClientIp(request.headers);
  const limit = checkRateLimit('air-quality', ip, 60);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again shortly.' } },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  const params = request.nextUrl.searchParams;
  const parsed = AirQualityQuerySchema.safeParse({
    lat: params.get('lat') ?? '',
    lon: params.get('lon') ?? '',
    name: params.get('name') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_QUERY',
          message: 'Valid lat (-90..90) and lon (-180..180) are required.',
        },
      },
      { status: 400 },
    );
  }

  const data = await fetchAirQuality(parsed.data.lat, parsed.data.lon, parsed.data.name);
  return NextResponse.json(data);
}
