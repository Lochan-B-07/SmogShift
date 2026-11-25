import type { HouseholdProfile } from '@/shared/schemas';
import { CADR_DIY_BOX, CADR_HEPA, CADR_PLANTS } from './constants';
import { computeSteadyState, getRoomVolume } from './indoorModel';

export interface CadrComparisonEntry {
  readonly id: 'hepa' | 'diy_box' | 'plants';
  readonly label: string;
  readonly cadrM3h: number;
  readonly ach: number;
  readonly steadyStateFractionOfBaseline: number;
  readonly note: string;
}

export function computeAch(cadrM3h: number, volumeM3: number): number {
  return cadrM3h / volumeM3;
}

export function compareIndoorMethods(
  roomSize: HouseholdProfile['roomSize'],
): readonly CadrComparisonEntry[] {
  const volume = getRoomVolume(roomSize);
  const baselineSs = computeSteadyState({
    cOut: 100,
    lambda: 1.0,
    cadr: 0,
    volume,
    sourceRate: 0,
  }).cSs;

  const entries: readonly {
    id: CadrComparisonEntry['id'];
    label: string;
    cadrM3h: number;
    note: string;
  }[] = [
    {
      id: 'hepa',
      label: 'HEPA Air Purifier',
      cadrM3h: CADR_HEPA.value,
      note: CADR_HEPA.source,
    },
    {
      id: 'diy_box',
      label: 'DIY Corsi-Rosenthal Box',
      cadrM3h: CADR_DIY_BOX.value,
      note: CADR_DIY_BOX.source,
    },
    {
      id: 'plants',
      label: 'Indoor Potted Plants',
      cadrM3h: CADR_PLANTS.value,
      note: CADR_PLANTS.source,
    },
  ];

  return entries.map((entry) => {
    const ss = computeSteadyState({
      cOut: 100,
      lambda: 1.0,
      cadr: entry.cadrM3h,
      volume,
      sourceRate: 0,
    }).cSs;
    return {
      id: entry.id,
      label: entry.label,
      cadrM3h: entry.cadrM3h,
      ach: computeAch(entry.cadrM3h, volume),
      steadyStateFractionOfBaseline: baselineSs > 0 ? ss / baselineSs : 1,
      note: entry.note,
    };
  });
}
