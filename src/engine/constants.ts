export interface CitedConstant {
  readonly value: number;
  readonly unit: string;
  readonly source: string;
}

export const WHO_PM25_24H: CitedConstant = {
  value: 15,
  unit: 'ug/m3',
  source: 'WHO Global Air Quality Guidelines (2021)',
};

export const CPCB_PM25_24H: CitedConstant = {
  value: 60,
  unit: 'ug/m3',
  source: 'India NAAQS (CPCB)',
};

export const CIGARETTE_EQUIVALENCE: CitedConstant = {
  value: 22,
  unit: 'ug/m3 per cig/day',
  source: 'Berkeley Earth heuristic (rough rule of thumb)',
};

export const PENETRATION_P: CitedConstant = {
  value: 0.9,
  unit: 'dimensionless',
  source: 'Assumption (typical range 0.7-1.0)',
};

export const DEPOSITION_K: CitedConstant = {
  value: 0.3,
  unit: 'h^-1',
  source: 'Assumption (typical range 0.1-0.5)',
};

export const LAMBDA_CLOSED: CitedConstant = {
  value: 1.0,
  unit: 'h^-1',
  source: 'Assumption (Indian apartment leakage varies widely)',
};

export const LAMBDA_SEALED: CitedConstant = {
  value: 0.6,
  unit: 'h^-1',
  source: 'Assumption (Indian apartment leakage varies widely)',
};

export const LAMBDA_AIRING: CitedConstant = {
  value: 5.0,
  unit: 'h^-1',
  source: 'Assumption (Indian apartment leakage varies widely)',
};

export const ROOM_VOLUME_SMALL: CitedConstant = {
  value: 30,
  unit: 'm^3',
  source: 'Assumption (~10x10x10 ft room)',
};

export const ROOM_VOLUME_MEDIUM: CitedConstant = {
  value: 45,
  unit: 'm^3',
  source: 'Assumption (~12x12x10 ft room)',
};

export const ROOM_VOLUME_LARGE: CitedConstant = {
  value: 70,
  unit: 'm^3',
  source: 'Assumption (~16x15x10 ft room)',
};

export const CADR_HEPA: CitedConstant = {
  value: 250,
  unit: 'm^3/h',
  source: 'Typical mid-size HEPA purifier',
};

export const CADR_DIY_BOX: CitedConstant = {
  value: 200,
  unit: 'm^3/h',
  source: 'Corsi-Rosenthal box studies',
};

export const CADR_PLANTS: CitedConstant = {
  value: 0,
  unit: 'm^3/h',
  source: 'Indoor potted plants PM2.5 removal negligible',
};

export const COOKING_S_GAS_NO_EXHAUST: CitedConstant = {
  value: 2000,
  unit: 'ug/h',
  source: 'Assumption (order-of-magnitude indoor cooking emission tier)',
};

export const COOKING_S_GAS_EXHAUST: CitedConstant = {
  value: 800,
  unit: 'ug/h',
  source: 'Assumption (order-of-magnitude indoor cooking emission tier)',
};

export const COOKING_S_INDUCTION: CitedConstant = {
  value: 400,
  unit: 'ug/h',
  source: 'Assumption (order-of-magnitude indoor cooking emission tier)',
};

export const CARPOOL_OCCUPANCY: CitedConstant = {
  value: 3,
  unit: 'persons',
  source: 'Assumption',
};

export const PETROL_CAR_CO2E_G_KM: CitedConstant = {
  value: 130,
  unit: 'g/km',
  source: 'India GHG Program (WRI India / CII / TERI, 2015), petrol car <1400 cc',
};

export const PETROL_CAR_NOX_G_KM: CitedConstant = {
  value: 0.08,
  unit: 'g/km',
  source: 'ARAI / CPCB BS-IV petrol passenger car benchmark',
};

export const METRO_CO2E_G_PKM: CitedConstant = {
  value: 25,
  unit: 'g/pkm',
  source: 'Mumbai Metro LCA (ScienceDirect, 2024; conservative upper bound)',
};

export const METRO_NOX_G_PKM: CitedConstant = {
  value: 0,
  unit: 'g/pkm',
  source: 'Zero urban tailpipe NOx',
};

export const DEFAULT_AIRING_HOUR = 7;
export const COOKING_HOURS: readonly number[] = [8, 20];
export const COMMUTE_HOURS: readonly number[] = [9, 18];
export const VENTILATION_SEARCH_START_HOUR = 6;
export const VENTILATION_SEARCH_END_HOUR = 22;
export const CLEAN_DAY_MAX_PM25 = 30;
export const WINDOW_SPAN_TOLERANCE = 0.15;
export const MAX_CONSECUTIVE_NULL_HOURS = 3;
