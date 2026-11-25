import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

interface CityTarget {
  key: string;
  name: string;
  lat: number;
  lon: number;
}

const CITIES: readonly CityTarget[] = [
  { key: 'delhi', name: 'Delhi NCR', lat: 28.61, lon: 77.21 },
  { key: 'lucknow', name: 'Lucknow', lat: 26.85, lon: 80.95 },
  { key: 'mumbai', name: 'Mumbai', lat: 19.08, lon: 72.88 },
  { key: 'bengaluru', name: 'Bengaluru', lat: 12.97, lon: 77.59 },
];

const OpenMeteoRawSchema = z.object({
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

type Regime = 'combustion' | 'mixed' | 'dust' | 'unknown';
type No2Level = 'low' | 'moderate' | 'high' | 'unknown';

interface NormalizedHour {
  time: string;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  o3?: number | null;
  co?: number | null;
  so2?: number | null;
  usAqi?: number | null;
}

interface SnapshotPayload {
  location: {
    lat: number;
    lon: number;
    name: string;
    timezone: string;
  };
  source: {
    name: 'Open-Meteo Air Quality (CAMS model)';
    kind: 'modeled';
    fetchedAt: string;
    isFallback: true;
    snapshotDate: string;
  };
  hours: NormalizedHour[];
  fingerprint: {
    ratio: number | null;
    regime: Regime;
    no2Level: No2Level;
  };
}

function computeFingerprint(hours: readonly NormalizedHour[]): SnapshotPayload['fingerprint'] {
  const ratios: number[] = [];
  const no2Values: number[] = [];

  for (const h of hours) {
    if (h.pm25 !== null && h.pm10 !== null && h.pm10 > 0) {
      ratios.push(h.pm25 / h.pm10);
    }
    if (h.no2 !== null) {
      no2Values.push(h.no2);
    }
  }

  const ratio =
    ratios.length > 0
      ? Math.round((ratios.reduce((sum, r) => sum + r, 0) / ratios.length) * 1000) / 1000
      : null;

  let regime: Regime = 'unknown';
  if (ratio !== null) {
    if (ratio >= 0.6) regime = 'combustion';
    else if (ratio >= 0.4) regime = 'mixed';
    else regime = 'dust';
  }

  let no2Level: No2Level = 'unknown';
  if (no2Values.length > 0) {
    const meanNo2 = no2Values.reduce((sum, v) => sum + v, 0) / no2Values.length;
    if (meanNo2 < 25) no2Level = 'low';
    else if (meanNo2 <= 80) no2Level = 'moderate';
    else no2Level = 'high';
  }

  return { ratio, regime, no2Level };
}

function getLocalHourIsoPrefix(timezone: string, now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? '00';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:00`;
}

function getRolling24Hours(
  hours: readonly NormalizedHour[],
  timezone: string,
  now: Date,
): NormalizedHour[] {
  const prefix = getLocalHourIsoPrefix(timezone, now);
  const startIdx = hours.findIndex((h) => h.time >= prefix);
  const safeStart = startIdx >= 0 && startIdx + 24 <= hours.length ? startIdx : 0;
  return hours.slice(safeStart, safeStart + 24);
}

function countNulls(hours: readonly NormalizedHour[]): Record<string, number> {
  const keys: readonly (keyof Omit<NormalizedHour, 'time'>)[] = [
    'pm25',
    'pm10',
    'no2',
    'o3',
    'co',
    'so2',
    'usAqi',
  ];
  const counts: Record<string, number> = {};
  for (const key of keys) {
    counts[key] = hours.filter((h) => h[key] === null || h[key] === undefined).length;
  }
  return counts;
}

async function fetchCitySnapshot(city: CityTarget, now: Date): Promise<void> {
  const lat = Number(city.lat.toFixed(2));
  const lon = Number(city.lon.toFixed(2));
  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality` +
    `?latitude=${lat.toFixed(2)}&longitude=${lon.toFixed(2)}` +
    `&hourly=pm2_5,pm10,nitrogen_dioxide,ozone,carbon_monoxide,sulphur_dioxide,us_aqi` +
    `&timezone=auto&forecast_days=2`;

  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) {
    throw new Error(`Open-Meteo HTTP ${res.status} for ${city.name}`);
  }

  const rawJson: unknown = await res.json();
  const parsed = OpenMeteoRawSchema.parse(rawJson);

  const hours: NormalizedHour[] = parsed.hourly.time.map((time, idx) => ({
    time,
    pm25: parsed.hourly.pm2_5[idx] ?? null,
    pm10: parsed.hourly.pm10[idx] ?? null,
    no2: parsed.hourly.nitrogen_dioxide[idx] ?? null,
    o3: parsed.hourly.ozone?.[idx] ?? null,
    co: parsed.hourly.carbon_monoxide?.[idx] ?? null,
    so2: parsed.hourly.sulphur_dioxide?.[idx] ?? null,
    usAqi: parsed.hourly.us_aqi?.[idx] ?? null,
  }));

  const rolling24 = getRolling24Hours(hours, parsed.timezone, now);
  const fingerprint = computeFingerprint(rolling24);
  const fetchedAt = now.toISOString();
  const snapshotDate = rolling24[0]?.time.slice(0, 10) ?? fetchedAt.slice(0, 10);

  const payload: SnapshotPayload = {
    location: {
      lat,
      lon,
      name: city.name,
      timezone: parsed.timezone,
    },
    source: {
      name: 'Open-Meteo Air Quality (CAMS model)',
      kind: 'modeled',
      fetchedAt,
      isFallback: true,
      snapshotDate,
    },
    hours,
    fingerprint,
  };

  const outDir = path.resolve(process.cwd(), 'src/data/fallback');
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `${city.key}.json`);
  await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  const valid24 = rolling24.filter((h): h is NormalizedHour & { pm25: number } => h.pm25 !== null);
  const minEntry = valid24.reduce((a, b) => (b.pm25 < a.pm25 ? b : a));
  const maxEntry = valid24.reduce((a, b) => (b.pm25 > a.pm25 ? b : a));
  const ratio = minEntry.pm25 > 0 ? maxEntry.pm25 / minEntry.pm25 : Number.POSITIVE_INFINITY;

  console.log(`\n=== ${city.name} (${lat}, ${lon}, ${parsed.timezone}) ===`);
  console.log(`Variables present: ${Object.keys(parsed.hourly).join(', ')}`);
  console.log(`Total hours: ${hours.length} | Snapshot date: ${snapshotDate}`);
  console.log(`Null counts (48h): ${JSON.stringify(countNulls(hours))}`);
  console.log(
    `24h PM2.5 min: ${minEntry.pm25} ug/m3 at ${minEntry.time} | max: ${maxEntry.pm25} ug/m3 at ${maxEntry.time}`,
  );
  console.log(
    `24h PM2.5 max/min ratio: ${ratio.toFixed(2)} (${ratio >= 1.5 ? 'swings >= 1.5x -> smart timing + indoor' : 'flat < 1.5x -> emphasize indoor defense'})`,
  );
  console.log(
    `Fingerprint: ratio=${fingerprint.ratio ?? 'null'}, regime=${fingerprint.regime}, no2Level=${fingerprint.no2Level}`,
  );
}

async function main(): Promise<void> {
  const now = new Date();
  for (const city of CITIES) {
    await fetchCitySnapshot(city, now);
  }
}

main().catch((err: unknown) => {
  console.error('Failed to capture fallback snapshots:', err);
  process.exit(1);
});
