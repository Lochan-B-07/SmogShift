import type { EngineSummary } from '@/shared/schemas';
import {
  CLEAN_DAY_MAX_PM25,
  CPCB_PM25_24H,
  VENTILATION_SEARCH_END_HOUR,
  VENTILATION_SEARCH_START_HOUR,
  WINDOW_SPAN_TOLERANCE,
} from './constants';
import type { ResolvedHour } from './routine';

export interface VentilationWindowResult {
  readonly bestHour: number;
  readonly bestIndex: number;
  readonly minPm25: number;
  readonly label: EngineSummary['bestHourLabel'];
  readonly spanIndices: readonly number[];
  readonly spanHours: readonly number[];
}

export function selectVentilationWindow(
  hours: readonly ResolvedHour[],
): VentilationWindowResult {
  if (hours.length === 0) {
    throw new Error('Cannot select ventilation window from empty hour list');
  }

  let bestIndex = -1;
  let minPm25 = Number.POSITIVE_INFINITY;
  let overallMaxPm25 = 0;

  for (let i = 0; i < hours.length; i += 1) {
    const h = hours[i];
    if (h.pm25 > overallMaxPm25) {
      overallMaxPm25 = h.pm25;
    }
    if (
      h.hourOfDay >= VENTILATION_SEARCH_START_HOUR &&
      h.hourOfDay <= VENTILATION_SEARCH_END_HOUR &&
      h.pm25 < minPm25
    ) {
      minPm25 = h.pm25;
      bestIndex = i;
    }
  }

  // Fallback if caller passed fewer than full day without 06..22
  if (bestIndex === -1) {
    for (let i = 0; i < hours.length; i += 1) {
      if (hours[i].pm25 < minPm25) {
        minPm25 = hours[i].pm25;
        bestIndex = i;
      }
    }
  }

  const bestHour = hours[bestIndex].hourOfDay;

  let label: EngineSummary['bestHourLabel'] = 'least_bad';
  if (overallMaxPm25 <= CLEAN_DAY_MAX_PM25) {
    label = 'clean_day';
  } else if (minPm25 <= CPCB_PM25_24H.value) {
    label = 'safe_window';
  }

  const threshold = minPm25 * (1 + WINDOW_SPAN_TOLERANCE);
  const candidateNeighbors: number[] = [];

  for (const neighborIdx of [bestIndex - 1, bestIndex + 1]) {
    if (neighborIdx < 0 || neighborIdx >= hours.length) continue;
    const neighbor = hours[neighborIdx];
    if (
      neighbor.hourOfDay >= VENTILATION_SEARCH_START_HOUR &&
      neighbor.hourOfDay <= VENTILATION_SEARCH_END_HOUR &&
      neighbor.pm25 <= threshold
    ) {
      candidateNeighbors.push(neighborIdx);
    }
  }

  const spanIndices = [bestIndex];
  if (candidateNeighbors.length === 1) {
    spanIndices.push(candidateNeighbors[0]);
  } else if (candidateNeighbors.length === 2) {
    const [left, right] = candidateNeighbors;
    spanIndices.push(hours[left].pm25 <= hours[right].pm25 ? left : right);
  }
  spanIndices.sort((a, b) => a - b);

  return {
    bestHour,
    bestIndex,
    minPm25,
    label,
    spanIndices,
    spanHours: spanIndices.map((idx) => hours[idx].hourOfDay),
  };
}
