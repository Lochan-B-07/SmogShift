import { z } from 'zod';
import { computeFingerprint } from '@/engine/fingerprint';
import {
  AirQualityResponseSchema,
  type AirQualityResponse,
  type GeocodeResult,
  type Hour,
} from '@/shared/schemas';
import { getNearestFallback } from './fallback';

const OpenMeteoAirQualityRawSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
  hourly: z.object({
    time: z.array(z.string()).min(24),
    pm2_5: z.array(z.number().nullable()),
    pm10: z.array(z.number().nullable()),
    nitrogen_dioxide: z.array(z.number().nullable()),
    ozone: z.array(z.number().nullable()).optional(),
    carbon_monoxide: z.array(z.number().nullable()).optional(),
    sulphur_dioxide: z.array(z.number().nullable()).optional(),
    us_aqi: z.array(z.number().nullable()).optional(),
  }),
});

const OpenMeteoGeocodeRawSchema = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        admin1: z.string().optional(),
        latitude: z.number().finite(),
        longitude: z.number().finite(),
      }),
    )
    .optional(),
});

export function roundCoord(value: number): string {
  return value.toFixed(2);
}

export function buildAirQualityUrl(lat: number, lon: number): string {
  const roundedLat = roundCoord(lat);
  const roundedLon = roundCoord(lon);
  return (
    `https://air-quality-api.open-meteo.com/v1/air-quality` +
    `?latitude=${roundedLat}&longitude=${roundedLon}` +
    `&hourly=pm2_5,pm10,nitrogen_dioxide,ozone,carbon_monoxide,sulphur_dioxide,us_aqi` +
    `&timezone=auto&forecast_days=2`
  );
}

export async function fetchAirQuality(
  lat: number,
  lon: number,
  locationName?: string,
): Promise<AirQualityResponse> {
  const url = buildAirQualityUrl(lat, lon);
  const roundedLat = Number(roundCoord(lat));
  const roundedLon = Number(roundCoord(lon));

  try {
    const res = await fetch(url, {
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return getNearestFallback(roundedLat, roundedLon);
    }

    const rawJson: unknown = await res.json();
    const parsed = OpenMeteoAirQualityRawSchema.parse(rawJson);

    const hours: Hour[] = parsed.hourly.time.slice(0, 72).map((time, idx) => ({
      time,
      pm25: parsed.hourly.pm2_5[idx] ?? null,
      pm10: parsed.hourly.pm10[idx] ?? null,
      no2: parsed.hourly.nitrogen_dioxide[idx] ?? null,
      o3: parsed.hourly.ozone?.[idx] ?? null,
      co: parsed.hourly.carbon_monoxide?.[idx] ?? null,
      so2: parsed.hourly.sulphur_dioxide?.[idx] ?? null,
      usAqi: parsed.hourly.us_aqi?.[idx] ?? null,
    }));

    const fingerprint = computeFingerprint(hours.slice(0, 24));

    const normalized: AirQualityResponse = AirQualityResponseSchema.parse({
      location: {
        lat: roundedLat,
        lon: roundedLon,
        ...(locationName ? { name: locationName.slice(0, 80) } : {}),
        timezone: parsed.timezone,
      },
      source: {
        name: 'Open-Meteo Air Quality (CAMS model)',
        kind: 'modeled',
        fetchedAt: new Date().toISOString(),
        isFallback: false,
      },
      hours,
      fingerprint,
    });

    return normalized;
  } catch {
    return getNearestFallback(roundedLat, roundedLon);
  }
}

export async function fetchGeocode(query: string): Promise<GeocodeResult[]> {
  const url =
    `https://geocoding-api.open-meteo.com/v1/search` +
    `?name=${encodeURIComponent(query)}&count=5&language=en&countryCode=IN`;

  const res = await fetch(url, {
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    throw new Error('GEOCODE_UPSTREAM_ERROR');
  }

  const rawJson: unknown = await res.json();
  const parsed = OpenMeteoGeocodeRawSchema.parse(rawJson);

  return (parsed.results ?? []).slice(0, 5).map((item) => ({
    name: item.name,
    ...(item.admin1 ? { admin1: item.admin1 } : {}),
    lat: Number(item.latitude.toFixed(2)),
    lon: Number(item.longitude.toFixed(2)),
  }));
}
