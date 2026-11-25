import type { HouseholdProfile, Toggles } from '@/shared/schemas';
import {
  CARPOOL_OCCUPANCY,
  METRO_CO2E_G_PKM,
  METRO_NOX_G_PKM,
  PETROL_CAR_CO2E_G_KM,
  PETROL_CAR_NOX_G_KM,
} from './constants';

export interface EmissionsInput {
  readonly households: Toggles['households'] | number;
  readonly commuteKm: HouseholdProfile['commuteKm'] | number;
  readonly travel: Toggles['travel'];
}

export interface EmissionsSavings {
  readonly co2eKg: number;
  readonly noxG: number;
}

export function computeDailyEmissionsSavings(input: EmissionsInput): EmissionsSavings {
  const { households, commuteKm, travel } = input;
  const totalPkm = households * 2 * commuteKm;

  let modeCo2ePerKm = PETROL_CAR_CO2E_G_KM.value;
  let modeNoxPerKm = PETROL_CAR_NOX_G_KM.value;

  if (travel === 'carpool') {
    modeCo2ePerKm = PETROL_CAR_CO2E_G_KM.value / CARPOOL_OCCUPANCY.value;
    modeNoxPerKm = PETROL_CAR_NOX_G_KM.value / CARPOOL_OCCUPANCY.value;
  } else if (travel === 'metro_walk') {
    modeCo2ePerKm = METRO_CO2E_G_PKM.value;
    modeNoxPerKm = METRO_NOX_G_PKM.value;
  }

  const co2eSavingsG = totalPkm * Math.max(0, PETROL_CAR_CO2E_G_KM.value - modeCo2ePerKm);
  const noxSavingsG = totalPkm * Math.max(0, PETROL_CAR_NOX_G_KM.value - modeNoxPerKm);

  return {
    co2eKg: co2eSavingsG / 1000,
    noxG: noxSavingsG,
  };
}
