import type { Hour } from '@/shared/schemas';
import {
  COMMUTE_HOURS,
  COOKING_HOURS,
  DEFAULT_AIRING_HOUR,
  MAX_CONSECUTIVE_NULL_HOURS,
} from './constants';

export type RoutineActivity = 'airing_outdoor' | 'cooking' | 'commute' | 'home_indoors';

export interface ResolvedHour {
  readonly time: string;
  readonly hourOfDay: number;
  readonly pm25: number;
}

export type RollingWindowResult =
  | { readonly ok: true; readonly hours: readonly ResolvedHour[] }
  | { readonly ok: false; readonly reason: 'insufficient_data' };

export interface RoutineStep {
  readonly time: string;
  readonly hourOfDay: number;
  readonly pm25: number;
  readonly isOutdoors: boolean;
  readonly isAiring: boolean;
  readonly isCooking: boolean;
  readonly activity: RoutineActivity;
}

export function parseLocalHour(isoTime: string): number {
  const match = /T(\d{2}):/.exec(isoTime);
  if (!match) {
    throw new Error(`Invalid local ISO timestamp: ${isoTime}`);
  }
  const hour = Number(match[1]);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error(`Invalid local hour in timestamp: ${isoTime}`);
  }
  return hour;
}

export function buildRolling24Window(
  hours: readonly Hour[],
  startIsoPrefix?: string,
): RollingWindowResult {
  if (hours.length < 24) {
    return { ok: false, reason: 'insufficient_data' };
  }

  let startIdx = 0;
  if (startIsoPrefix) {
    const foundIdx = hours.findIndex((h) => h.time >= startIsoPrefix);
    if (foundIdx >= 0 && foundIdx + 24 <= hours.length) {
      startIdx = foundIdx;
    }
  }

  const slice = hours.slice(startIdx, startIdx + 24);
  const rawPm25 = slice.map((h) => h.pm25);

  let consecutiveNulls = 0;
  let validCount = 0;
  for (const val of rawPm25) {
    if (val === null) {
      consecutiveNulls += 1;
      if (consecutiveNulls > MAX_CONSECUTIVE_NULL_HOURS) {
        return { ok: false, reason: 'insufficient_data' };
      }
    } else {
      consecutiveNulls = 0;
      validCount += 1;
    }
  }

  if (validCount === 0) {
    return { ok: false, reason: 'insufficient_data' };
  }

  const interpolated = [...rawPm25];
  let idx = 0;
  while (idx < interpolated.length) {
    if (interpolated[idx] !== null) {
      idx += 1;
      continue;
    }
    const runStart = idx;
    while (idx < interpolated.length && interpolated[idx] === null) {
      idx += 1;
    }
    const runEnd = idx; // first non-null after run, or 24
    const prevVal = runStart > 0 ? interpolated[runStart - 1] : null;
    const nextVal = runEnd < interpolated.length ? interpolated[runEnd] : null;

    if (prevVal !== null && nextVal !== null) {
      const span = runEnd - (runStart - 1);
      for (let k = runStart; k < runEnd; k += 1) {
        interpolated[k] = prevVal + ((nextVal - prevVal) * (k - (runStart - 1))) / span;
      }
    } else if (prevVal !== null) {
      for (let k = runStart; k < runEnd; k += 1) {
        interpolated[k] = prevVal;
      }
    } else if (nextVal !== null) {
      for (let k = runStart; k < runEnd; k += 1) {
        interpolated[k] = nextVal;
      }
    }
  }

  const resolved: ResolvedHour[] = slice.map((h, i) => ({
    time: h.time,
    hourOfDay: parseLocalHour(h.time),
    pm25: Math.max(0, interpolated[i] ?? 0),
  }));

  return { ok: true, hours: resolved };
}

export function mapRoutine(
  hours: readonly ResolvedHour[],
  options: { readonly smartTiming: boolean; readonly bestHour: number },
): readonly RoutineStep[] {
  const airingAndFlexHour = options.smartTiming ? options.bestHour : DEFAULT_AIRING_HOUR;

  return hours.map((h) => {
    const isFlexOrAiring = h.hourOfDay === airingAndFlexHour;
    const isCommute = COMMUTE_HOURS.includes(h.hourOfDay);
    const isCooking = COOKING_HOURS.includes(h.hourOfDay);
    const isOutdoors = isFlexOrAiring || isCommute;
    const isAiring = isFlexOrAiring;

    let activity: RoutineActivity = 'home_indoors';
    if (isFlexOrAiring) {
      activity = 'airing_outdoor';
    } else if (isCommute) {
      activity = 'commute';
    } else if (isCooking) {
      activity = 'cooking';
    }

    return {
      time: h.time,
      hourOfDay: h.hourOfDay,
      pm25: h.pm25,
      isOutdoors,
      isAiring,
      isCooking,
      activity,
    };
  });
}
