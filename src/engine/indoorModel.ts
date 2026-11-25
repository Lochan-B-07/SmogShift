import type { HouseholdProfile, Toggles } from '@/shared/schemas';
import {
  CADR_DIY_BOX,
  CADR_HEPA,
  COOKING_S_GAS_EXHAUST,
  COOKING_S_GAS_NO_EXHAUST,
  COOKING_S_INDUCTION,
  DEPOSITION_K,
  LAMBDA_AIRING,
  LAMBDA_CLOSED,
  LAMBDA_SEALED,
  PENETRATION_P,
  ROOM_VOLUME_LARGE,
  ROOM_VOLUME_MEDIUM,
  ROOM_VOLUME_SMALL,
} from './constants';

export interface SteadyStateParams {
  readonly cOut: number;
  readonly lambda: number;
  readonly cadr: number;
  readonly volume: number;
  readonly sourceRate: number;
  readonly penetration?: number;
  readonly deposition?: number;
}

export interface SteadyStateResult {
  readonly q: number;
  readonly a: number;
  readonly cSs: number;
}

export interface StepParams extends SteadyStateParams {
  readonly cInPrev: number;
}

export interface StepResult extends SteadyStateResult {
  readonly cInNext: number;
}

export interface IndoorConfig {
  readonly lambdaClosed: number;
  readonly cadr: number;
  readonly effectiveCookingS: number;
  readonly roomVolume: number;
}

export function getRoomVolume(roomSize: HouseholdProfile['roomSize']): number {
  switch (roomSize) {
    case 'small':
      return ROOM_VOLUME_SMALL.value;
    case 'medium':
      return ROOM_VOLUME_MEDIUM.value;
    case 'large':
      return ROOM_VOLUME_LARGE.value;
  }
}

export function getProfileCookingSource(cooking: HouseholdProfile['cooking']): number {
  switch (cooking) {
    case 'gas_no_exhaust':
      return COOKING_S_GAS_NO_EXHAUST.value;
    case 'gas_exhaust':
      return COOKING_S_GAS_EXHAUST.value;
    case 'induction':
      return COOKING_S_INDUCTION.value;
  }
}

export function getIndoorConfig(
  indoor: Toggles['indoor'],
  profile: Pick<HouseholdProfile, 'roomSize' | 'cooking'>,
): IndoorConfig {
  const roomVolume = getRoomVolume(profile.roomSize);
  const profileCookingS = getProfileCookingSource(profile.cooking);

  switch (indoor) {
    case 'none':
      return {
        lambdaClosed: LAMBDA_CLOSED.value,
        cadr: 0,
        effectiveCookingS: profileCookingS,
        roomVolume,
      };
    case 'seal_exhaust':
      return {
        lambdaClosed: LAMBDA_SEALED.value,
        cadr: 0,
        effectiveCookingS: Math.min(profileCookingS, COOKING_S_GAS_EXHAUST.value),
        roomVolume,
      };
    case 'diy_box':
      return {
        lambdaClosed: LAMBDA_CLOSED.value,
        cadr: CADR_DIY_BOX.value,
        effectiveCookingS: profileCookingS,
        roomVolume,
      };
    case 'hepa':
      return {
        lambdaClosed: LAMBDA_CLOSED.value,
        cadr: CADR_HEPA.value,
        effectiveCookingS: profileCookingS,
        roomVolume,
      };
  }
}

export function computeSteadyState(params: SteadyStateParams): SteadyStateResult {
  const penetration = params.penetration ?? PENETRATION_P.value;
  const deposition = params.deposition ?? DEPOSITION_K.value;
  const q = params.cadr / params.volume;
  const a = params.lambda + deposition + q;
  const cSs = (penetration * params.lambda * params.cOut + params.sourceRate / params.volume) / a;
  return { q, a, cSs };
}

export function stepIndoorConcentration(params: StepParams): StepResult {
  const { q, a, cSs } = computeSteadyState(params);
  const cInNext = cSs + (params.cInPrev - cSs) * Math.exp(-a);
  return { q, a, cSs, cInNext };
}

export function simulateIndoorSeries(
  steps: readonly {
    readonly pm25: number;
    readonly isAiring: boolean;
    readonly isCooking: boolean;
  }[],
  config: IndoorConfig,
): readonly number[] {
  if (steps.length === 0) return [];

  const firstLambda = steps[0].isAiring ? LAMBDA_AIRING.value : config.lambdaClosed;
  let currentCIn = computeSteadyState({
    cOut: steps[0].pm25,
    lambda: firstLambda,
    cadr: config.cadr,
    volume: config.roomVolume,
    sourceRate: 0,
  }).cSs;

  const series: number[] = [];
  for (const step of steps) {
    const lambda = step.isAiring ? LAMBDA_AIRING.value : config.lambdaClosed;
    const sourceRate = step.isCooking ? config.effectiveCookingS : 0;
    const { cInNext } = stepIndoorConcentration({
      cInPrev: currentCIn,
      cOut: step.pm25,
      lambda,
      cadr: config.cadr,
      volume: config.roomVolume,
      sourceRate,
    });
    currentCIn = cInNext;
    series.push(cInNext);
  }

  return series;
}
