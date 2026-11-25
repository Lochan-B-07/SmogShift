import bengaluruRaw from '@/data/fallback/bengaluru.json';
import delhiRaw from '@/data/fallback/delhi.json';
import lucknowRaw from '@/data/fallback/lucknow.json';
import mumbaiRaw from '@/data/fallback/mumbai.json';
import { AirQualityResponseSchema, type AirQualityResponse } from '@/shared/schemas';

const SNAPSHOTS: readonly AirQualityResponse[] = [
  AirQualityResponseSchema.parse(delhiRaw),
  AirQualityResponseSchema.parse(lucknowRaw),
  AirQualityResponseSchema.parse(mumbaiRaw),
  AirQualityResponseSchema.parse(bengaluruRaw),
];

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function getNearestFallback(lat: number, lon: number): AirQualityResponse {
  let nearest = SNAPSHOTS[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const snapshot of SNAPSHOTS) {
    const dist = haversineKm(lat, lon, snapshot.location.lat, snapshot.location.lon);
    if (dist < bestDistance) {
      bestDistance = dist;
      nearest = snapshot;
    }
  }

  return {
    ...nearest,
    source: {
      ...nearest.source,
      isFallback: true,
    },
  };
}
