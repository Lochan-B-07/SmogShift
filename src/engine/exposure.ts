import type { EngineSummary, HouseholdProfile, Hour, Toggles } from '@/shared/schemas';
import { CIGARETTE_EQUIVALENCE, WHO_PM25_24H } from './constants';
import { computeDailyEmissionsSavings } from './emissions';
import { getIndoorConfig, simulateIndoorSeries } from './indoorModel';
import { mapRoutine, buildRolling24Window, type RoutineActivity } from './routine';
import { selectVentilationWindow, type VentilationWindowResult } from './ventilationWindow';

export interface ExposureMeters {
  readonly mean24: number;
  readonly pctWHO: number;
  readonly cigEq: number;
  readonly cigAvoided: number;
}

export interface HourlySimulationPoint {
  readonly time: string;
  readonly hourOfDay: number;
  readonly outdoorPm25: number;
  readonly baselineIndoorPm25: number;
  readonly adjustedIndoorPm25: number;
  readonly baselineExposure: number;
  readonly adjustedExposure: number;
  readonly baselineActivity: RoutineActivity;
  readonly adjustedActivity: RoutineActivity;
  readonly isBestWindow: boolean;
}

export type SimulationResult =
  | {
      readonly ok: true;
      readonly points: readonly HourlySimulationPoint[];
      readonly baselineMeters: ExposureMeters;
      readonly adjustedMeters: ExposureMeters;
      readonly window: VentilationWindowResult;
      readonly summary: EngineSummary;
    }
  | {
      readonly ok: false;
      readonly reason: 'insufficient_data';
    };

export function computeMeters(mean24: number, baselineMean24?: number): ExposureMeters {
  const pctWHO = (mean24 / WHO_PM25_24H.value) * 100;
  const cigEq = mean24 / CIGARETTE_EQUIVALENCE.value;
  const cigAvoided =
    baselineMean24 !== undefined
      ? Math.max(0, (baselineMean24 - mean24) / CIGARETTE_EQUIVALENCE.value)
      : 0;

  return { mean24, pctWHO, cigEq, cigAvoided };
}

export function simulateDay(
  hours: readonly Hour[],
  profile: HouseholdProfile,
  toggles: Toggles,
  startIsoPrefix?: string,
): SimulationResult {
  const windowRes = buildRolling24Window(hours, startIsoPrefix);
  if (!windowRes.ok) {
    return windowRes;
  }

  const resolvedHours = windowRes.hours;
  const bestWindow = selectVentilationWindow(resolvedHours);

  const baselineRoutine = mapRoutine(resolvedHours, {
    smartTiming: false,
    bestHour: bestWindow.bestHour,
    customAiringHour: toggles.customAiringHour,
    customCommuteHour: toggles.customCommuteHour,
  });
  const adjustedRoutine = mapRoutine(resolvedHours, {
    smartTiming: toggles.smartTiming,
    bestHour: bestWindow.bestHour,
    customAiringHour: toggles.customAiringHour,
    customCommuteHour: toggles.customCommuteHour,
  });

  const baselineIndoorConfig = getIndoorConfig('none', profile);
  const adjustedIndoorConfig = getIndoorConfig(toggles.indoor, profile);

  const baselineIndoorSeries = simulateIndoorSeries(baselineRoutine, baselineIndoorConfig);
  const adjustedIndoorSeries = simulateIndoorSeries(adjustedRoutine, adjustedIndoorConfig);

  const spanSet = new Set(bestWindow.spanIndices);
  const points: HourlySimulationPoint[] = resolvedHours.map((h, i) => {
    const baseStep = baselineRoutine[i];
    const adjStep = adjustedRoutine[i];
    const baseIn = baselineIndoorSeries[i];
    const adjIn = adjustedIndoorSeries[i];

    return {
      time: h.time,
      hourOfDay: h.hourOfDay,
      outdoorPm25: h.pm25,
      baselineIndoorPm25: baseIn,
      adjustedIndoorPm25: adjIn,
      baselineExposure: baseStep.isOutdoors ? h.pm25 : baseIn,
      adjustedExposure: adjStep.isOutdoors ? h.pm25 : adjIn,
      baselineActivity: baseStep.activity,
      adjustedActivity: adjStep.activity,
      isBestWindow: spanSet.has(i),
    };
  });

  const baselineMean = points.reduce((sum, p) => sum + p.baselineExposure, 0) / points.length;
  const adjustedMean = points.reduce((sum, p) => sum + p.adjustedExposure, 0) / points.length;

  const baselineMeters = computeMeters(baselineMean);
  const adjustedMeters = computeMeters(adjustedMean, baselineMean);
  const emissions = computeDailyEmissionsSavings({
    households: toggles.households,
    commuteKm: profile.commuteKm,
    travel: toggles.travel,
  });

  const round1 = (val: number): number => Math.round(val * 10) / 10;

  const summary: EngineSummary = {
    baselinePctWho: Math.min(5000, round1(baselineMeters.pctWHO)),
    adjustedPctWho: Math.min(5000, round1(adjustedMeters.pctWHO)),
    cigAvoided: Math.min(50, Math.round(adjustedMeters.cigAvoided * 100) / 100),
    bestHour: bestWindow.bestHour,
    bestHourLabel: bestWindow.label,
    co2eKg: round1(emissions.co2eKg),
    noxG: round1(emissions.noxG),
  };

  return {
    ok: true,
    points,
    baselineMeters,
    adjustedMeters,
    window: bestWindow,
    summary,
  };
}
