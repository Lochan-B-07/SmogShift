import type {
  DetectedHazard,
  HouseholdProfile,
  Hour,
  RoomHazardId,
  Toggles,
} from '@/shared/schemas';
import { HAZARD_SMOKE_HOURS, HAZARD_SMOKE_SOURCE_UG_H, LAMBDA_AIRING } from './constants';
import { simulateDay } from './exposure';
import { computeSteadyState, getIndoorConfig, stepIndoorConcentration } from './indoorModel';
import { buildRolling24Window, mapRoutine } from './routine';
import { selectVentilationWindow } from './ventilationWindow';

export interface EvaluatedRoomHazard {
  readonly hazard: DetectedHazard;
  readonly deltaUgM3: number;
  readonly deltaPct: number;
}

export type RoomHazardEvaluationResult =
  | {
      readonly ok: true;
      readonly items: readonly EvaluatedRoomHazard[];
      readonly baselineMeanUgM3: number;
      readonly projectedMeanUgM3: number;
      readonly totalSavedUgM3: number;
      readonly totalSavedPct: number;
      readonly recommendedProfile: HouseholdProfile;
      readonly recommendedToggles: Toggles;
    }
  | {
      readonly ok: false;
      readonly reason: 'insufficient_data';
    };

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

function simulateMeanWithExtraSmoke(
  hours: readonly Hour[],
  profile: HouseholdProfile,
  toggles: Toggles,
  includeExtraSmoke: boolean,
): number | null {
  const windowRes = buildRolling24Window(hours);
  if (!windowRes.ok) return null;

  const resolvedHours = windowRes.hours;
  const bestWindow = selectVentilationWindow(resolvedHours);
  const routine = mapRoutine(resolvedHours, {
    smartTiming: toggles.smartTiming,
    bestHour: bestWindow.bestHour,
    customAiringHour: toggles.customAiringHour,
    customCommuteHour: toggles.customCommuteHour,
  });

  const config = getIndoorConfig(toggles.indoor, profile);
  const firstLambda = routine[0].isAiring ? LAMBDA_AIRING.value : config.lambdaClosed;
  let currentCIn = computeSteadyState({
    cOut: routine[0].pm25,
    lambda: firstLambda,
    cadr: config.cadr,
    volume: config.roomVolume,
    sourceRate: 0,
  }).cSs;

  let exposureSum = 0;
  for (const step of routine) {
    const lambda = step.isAiring ? LAMBDA_AIRING.value : config.lambdaClosed;
    const baseCook = step.isCooking ? config.effectiveCookingS : 0;
    const extraSmoke =
      includeExtraSmoke && HAZARD_SMOKE_HOURS.includes(step.hourOfDay)
        ? HAZARD_SMOKE_SOURCE_UG_H.value
        : 0;

    const { cInNext } = stepIndoorConcentration({
      cInPrev: currentCIn,
      cOut: step.pm25,
      lambda,
      cadr: config.cadr,
      volume: config.roomVolume,
      sourceRate: baseCook + extraSmoke,
    });
    currentCIn = cInNext;
    exposureSum += step.isOutdoors ? step.pm25 : cInNext;
  }

  return exposureSum / routine.length;
}

/**
 * Computes deterministic per-hazard PM2.5 savings and projected 24-hour exposure
 * when the selected hazard fixes are applied.
 */
export function evaluateRoomHazards(
  hours: readonly Hour[],
  profile: HouseholdProfile,
  toggles: Toggles,
  hazards: readonly DetectedHazard[],
  checkedIds?: readonly RoomHazardId[],
): RoomHazardEvaluationResult {
  const baseSim = simulateDay(hours, profile, toggles);
  if (!baseSim.ok) {
    return baseSim;
  }

  const hasSmokeHazard = hazards.some((h) => h.id === 'indoor_smoke_source');
  const unmitigatedMean =
    simulateMeanWithExtraSmoke(hours, profile, toggles, hasSmokeHazard) ??
    baseSim.adjustedMeters.mean24;

  const items: EvaluatedRoomHazard[] = hazards.map((hazard) => {
    let fixedMean = unmitigatedMean;

    switch (hazard.id) {
      case 'unvented_gas_stove': {
        const nextProfile: HouseholdProfile =
          profile.cooking === 'gas_no_exhaust' ? { ...profile, cooking: 'gas_exhaust' } : profile;
        fixedMean =
          simulateMeanWithExtraSmoke(hours, nextProfile, toggles, hasSmokeHazard) ?? unmitigatedMean;
        break;
      }
      case 'unsealed_door_gap': {
        const nextToggles: Toggles =
          toggles.indoor === 'none' ? { ...toggles, indoor: 'seal_exhaust' } : toggles;
        fixedMean =
          simulateMeanWithExtraSmoke(hours, profile, nextToggles, hasSmokeHazard) ?? unmitigatedMean;
        break;
      }
      case 'blocked_cross_vent': {
        const nextToggles: Toggles = toggles.smartTiming
          ? toggles
          : { ...toggles, smartTiming: true };
        fixedMean =
          simulateMeanWithExtraSmoke(hours, profile, nextToggles, hasSmokeHazard) ?? unmitigatedMean;
        break;
      }
      case 'indoor_smoke_source': {
        fixedMean = simulateMeanWithExtraSmoke(hours, profile, toggles, false) ?? unmitigatedMean;
        break;
      }
      case 'potted_plants_myth': {
        fixedMean = unmitigatedMean;
        break;
      }
    }

    const deltaUgM3 = Math.max(0, round1(unmitigatedMean - fixedMean));
    const deltaPct = unmitigatedMean > 0 ? round1((deltaUgM3 / unmitigatedMean) * 100) : 0;

    return {
      hazard,
      deltaUgM3,
      deltaPct,
    };
  });

  const activeSet = new Set<RoomHazardId>(checkedIds ?? hazards.map((h) => h.id));

  let recommendedProfile: HouseholdProfile = { ...profile };
  let recommendedToggles: Toggles = { ...toggles };

  if (activeSet.has('unvented_gas_stove') && recommendedProfile.cooking === 'gas_no_exhaust') {
    recommendedProfile = { ...recommendedProfile, cooking: 'gas_exhaust' };
  }
  if (activeSet.has('unsealed_door_gap') && recommendedToggles.indoor === 'none') {
    recommendedToggles = { ...recommendedToggles, indoor: 'seal_exhaust' };
  }
  if (activeSet.has('blocked_cross_vent') && !recommendedToggles.smartTiming) {
    recommendedToggles = { ...recommendedToggles, smartTiming: true };
  }

  const smokeStillActive = hasSmokeHazard && !activeSet.has('indoor_smoke_source');
  const projectedRaw =
    simulateMeanWithExtraSmoke(hours, recommendedProfile, recommendedToggles, smokeStillActive) ??
    unmitigatedMean;

  const baselineMeanUgM3 = round1(unmitigatedMean);
  const projectedMeanUgM3 = round1(projectedRaw);
  const totalSavedUgM3 = Math.max(0, round1(unmitigatedMean - projectedRaw));
  const totalSavedPct =
    unmitigatedMean > 0 ? round1((totalSavedUgM3 / unmitigatedMean) * 100) : 0;

  return {
    ok: true,
    items,
    baselineMeanUgM3,
    projectedMeanUgM3,
    totalSavedUgM3,
    totalSavedPct,
    recommendedProfile,
    recommendedToggles,
  };
}
