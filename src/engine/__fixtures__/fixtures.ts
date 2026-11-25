import type { Hour } from '@/shared/schemas';

export function make24Hours(
  pm25Values: readonly (number | null)[],
  overrides?: { readonly pm10?: number | null; readonly no2?: number | null },
): Hour[] {
  return pm25Values.map((pm25, h) => ({
    time: `2026-11-25T${String(h).padStart(2, '0')}:00`,
    pm25,
    pm10: overrides?.pm10 !== undefined ? overrides.pm10 : pm25 !== null ? pm25 * 1.4 : null,
    no2: overrides?.no2 !== undefined ? overrides.no2 : 30,
  }));
}

export const FIXTURE_WINDOW_HOURS: Hour[] = make24Hours(
  Array.from({ length: 24 }, (_, h) => (h === 14 ? 42 : 110 + (h % 5) * 10)),
);

export const FIXTURE_HAZARDOUS_HOURS: Hour[] = make24Hours(
  Array.from({ length: 24 }, (_, h) => 180 + h * 2),
);

export const FIXTURE_CLEAN_HOURS: Hour[] = make24Hours(
  Array.from({ length: 24 }, (_, h) => 20 + (h % 9)),
);
