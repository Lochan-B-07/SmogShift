import type { ExposureHitId, HouseholdProfile, Hour, Toggles } from '@/shared/schemas';
import {
  HIT_CLOSED_KITCHEN_SMOKE_UG_M3,
  HIT_OUTDOOR_ERRAND_1H_UG_M3,
  HIT_TRAFFIC_JAM_45M_UG_M3,
  WHO_PM25_24H,
} from './constants';
import { simulateDay, type HourlySimulationPoint } from './exposure';

export interface RecoveryPlanStep {
  readonly title: string;
  readonly detail: string;
}

export type RecoveryPlanResult =
  | {
      readonly ok: true;
      readonly baselineMeanUgM3: number;
      readonly hitMeanUgM3: number;
      readonly recoveredMeanUgM3: number;
      readonly debtUgM3: number;
      readonly budgetUsedPct: number;
      readonly recoverableUgM3: number;
      readonly recoverablePct: number;
      readonly recoveryToggles: Toggles;
      readonly steps: readonly RecoveryPlanStep[];
    }
  | {
      readonly ok: false;
      readonly reason: 'insufficient_data';
    };

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

function resolveHitHour(hit: ExposureHitId, toggles: Toggles, currentHour: number): number {
  const safeCurrent = Math.max(0, Math.min(23, Math.trunc(currentHour)));
  switch (hit) {
    case 'traffic_jam_45m':
      return toggles.customCommuteHour ?? 9;
    case 'closed_kitchen_smoke':
      return safeCurrent >= 19 ? 20 : 8;
    case 'outdoor_errand_1h':
      return safeCurrent;
  }
}

function getHitSpikeUgM3(hit: ExposureHitId): number {
  switch (hit) {
    case 'traffic_jam_45m':
      return HIT_TRAFFIC_JAM_45M_UG_M3.value;
    case 'closed_kitchen_smoke':
      return HIT_CLOSED_KITCHEN_SMOKE_UG_M3.value;
    case 'outdoor_errand_1h':
      return HIT_OUTDOOR_ERRAND_1H_UG_M3.value;
  }
}

function computeMeanWithHits(
  points: readonly HourlySimulationPoint[],
  activeHits: readonly ExposureHitId[],
  toggles: Toggles,
  currentHour: number,
): number {
  if (points.length === 0) return 0;

  const extraByHour = new Map<number, number>();
  for (const hit of activeHits) {
    const targetHour = resolveHitHour(hit, toggles, currentHour);
    extraByHour.set(targetHour, (extraByHour.get(targetHour) ?? 0) + getHitSpikeUgM3(hit));
  }

  let sum = 0;
  for (const pt of points) {
    sum += pt.adjustedExposure + (extraByHour.get(pt.hourOfDay) ?? 0);
  }
  return sum / points.length;
}

function findPeakOutdoorHour(points: readonly HourlySimulationPoint[]): number {
  let peakHour = points[0]?.hourOfDay ?? 20;
  let maxPm25 = -1;
  for (const pt of points) {
    if (pt.outdoorPm25 > maxPm25) {
      maxPm25 = pt.outdoorPm25;
      peakHour = pt.hourOfDay;
    }
  }
  return peakHour;
}

/**
 * Computes deterministic exposure debt from logged mid-day events and a recovery plan
 * for the remaining hours of the day. Never calls `new Date()`; `currentHour` is explicit.
 */
export function computeRecoveryPlan(
  hours: readonly Hour[],
  profile: HouseholdProfile,
  toggles: Toggles,
  activeHits: readonly ExposureHitId[],
  currentHour: number,
): RecoveryPlanResult {
  const baseSim = simulateDay(hours, profile, toggles);
  if (!baseSim.ok) {
    return baseSim;
  }

  const baseMean = baseSim.adjustedMeters.mean24;
  const hitMean = computeMeanWithHits(baseSim.points, activeHits, toggles, currentHour);

  const recoveryToggles: Toggles = {
    ...toggles,
    smartTiming: true,
    indoor: toggles.indoor === 'none' ? 'seal_exhaust' : toggles.indoor,
  };

  const recoveredSim = simulateDay(hours, profile, recoveryToggles);
  if (!recoveredSim.ok) {
    return recoveredSim;
  }

  const recoveredHitMean = computeMeanWithHits(
    recoveredSim.points,
    activeHits,
    toggles,
    currentHour,
  );

  const debtUgM3 = Math.max(0, round1(hitMean - baseMean));
  const budgetUsedPct = round1((hitMean / WHO_PM25_24H.value) * 100);
  const recoverableUgM3 = Math.max(0, round1(hitMean - recoveredHitMean));
  const recoverablePct = hitMean > 0 ? round1((recoverableUgM3 / hitMean) * 100) : 0;

  const bestHourClock = `${String(recoveredSim.summary.bestHour).padStart(2, '0')}:00`;
  const peakHourClock = `${String(findPeakOutdoorHour(baseSim.points)).padStart(2, '0')}:00`;

  const steps: RecoveryPlanStep[] = [
    {
      title: `Shift remaining ventilation to ${bestHourClock}`,
      detail: 'Keep windows closed outside the cleanest daytime window to limit fresh infiltration.',
    },
    {
      title:
        recoveryToggles.indoor === 'seal_exhaust'
          ? 'Enable draft sealing + kitchen exhaust'
          : `Keep ${recoveryToggles.indoor.replace('_', ' ')} active through tonight`,
      detail: 'Reduces indoor particle buildup during evening cooking and outdoor peaks.',
    },
    {
      title: `Avoid outdoor exertion near ${peakHourClock}`,
      detail: 'Reschedule walks or errands away from the forecast peak hour.',
    },
  ];

  return {
    ok: true,
    baselineMeanUgM3: round1(baseMean),
    hitMeanUgM3: round1(hitMean),
    recoveredMeanUgM3: round1(recoveredHitMean),
    debtUgM3,
    budgetUsedPct,
    recoverableUgM3,
    recoverablePct,
    recoveryToggles,
    steps,
  };
}
