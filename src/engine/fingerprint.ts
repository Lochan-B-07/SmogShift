import type { Fingerprint, Hour } from '@/shared/schemas';

export function computeFingerprint(hours: readonly Hour[]): Fingerprint {
  const ratios: number[] = [];
  const no2Values: number[] = [];

  for (const hour of hours) {
    if (hour.pm25 !== null && hour.pm10 !== null && hour.pm10 > 0) {
      ratios.push(hour.pm25 / hour.pm10);
    }
    if (hour.no2 !== null) {
      no2Values.push(hour.no2);
    }
  }

  const ratio =
    ratios.length > 0
      ? Math.round((ratios.reduce((sum, r) => sum + r, 0) / ratios.length) * 1000) / 1000
      : null;

  let regime: Fingerprint['regime'] = 'unknown';
  if (ratio !== null) {
    if (ratio >= 0.6) {
      regime = 'combustion';
    } else if (ratio >= 0.4) {
      regime = 'mixed';
    } else {
      regime = 'dust';
    }
  }

  let no2Level: Fingerprint['no2Level'] = 'unknown';
  if (no2Values.length > 0) {
    const meanNo2 = no2Values.reduce((sum, v) => sum + v, 0) / no2Values.length;
    if (meanNo2 < 25) {
      no2Level = 'low';
    } else if (meanNo2 <= 80) {
      no2Level = 'moderate';
    } else {
      no2Level = 'high';
    }
  }

  return { ratio, regime, no2Level };
}
