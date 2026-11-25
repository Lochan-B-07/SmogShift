import type { HouseholdProfile, Toggles } from '@/shared/schemas';

export interface CityPreset {
  readonly key: string;
  readonly name: string;
  readonly lat: number;
  readonly lon: number;
}

export const CITY_PRESETS: readonly CityPreset[] = [
  { key: 'delhi', name: 'Delhi NCR', lat: 28.61, lon: 77.21 },
  { key: 'lucknow', name: 'Lucknow', lat: 26.85, lon: 80.95 },
  { key: 'mumbai', name: 'Mumbai', lat: 19.08, lon: 72.88 },
  { key: 'bengaluru', name: 'Bengaluru', lat: 12.97, lon: 77.59 },
];

export const DEFAULT_CITY: CityPreset = CITY_PRESETS[0];

export const DEFAULT_PROFILE: HouseholdProfile = {
  sensitive: 'none',
  roomSize: 'medium',
  cooking: 'gas_no_exhaust',
  commuteKm: 10,
};

export const DEFAULT_TOGGLES: Toggles = {
  travel: 'solo_car',
  smartTiming: false,
  indoor: 'none',
  households: 25,
};
