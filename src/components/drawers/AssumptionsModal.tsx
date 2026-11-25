'use client';

import type { ReactElement } from 'react';
import {
  CADR_DIY_BOX,
  CADR_HEPA,
  CADR_PLANTS,
  CARPOOL_OCCUPANCY,
  CIGARETTE_EQUIVALENCE,
  COOKING_S_GAS_EXHAUST,
  COOKING_S_GAS_NO_EXHAUST,
  COOKING_S_INDUCTION,
  CPCB_PM25_24H,
  DEPOSITION_K,
  LAMBDA_AIRING,
  LAMBDA_CLOSED,
  LAMBDA_SEALED,
  METRO_CO2E_G_PKM,
  METRO_NOX_G_PKM,
  PENETRATION_P,
  PETROL_CAR_CO2E_G_KM,
  PETROL_CAR_NOX_G_KM,
  WHO_PM25_24H,
} from '@/engine/constants';
import { DrawerShell } from './DrawerShell';

export interface AssumptionsModalProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

const CONSTANT_ROWS = [
  ['WHO 24-h PM2.5 guideline', WHO_PM25_24H],
  ['CPCB 24-h PM2.5 standard', CPCB_PM25_24H],
  ['Cigarette equivalence', CIGARETTE_EQUIVALENCE],
  ['Penetration factor P', PENETRATION_P],
  ['Deposition rate k', DEPOSITION_K],
  [
    'Air exchange (closed / sealed / airing)',
    {
      value: `${LAMBDA_CLOSED.value} / ${LAMBDA_SEALED.value} / ${LAMBDA_AIRING.value}`,
      unit: 'h^-1',
      source: LAMBDA_CLOSED.source,
    },
  ],
  [
    'CADR (HEPA / DIY box / plants)',
    {
      value: `${CADR_HEPA.value} / ${CADR_DIY_BOX.value} / ${CADR_PLANTS.value}`,
      unit: 'm^3/h',
      source: `${CADR_HEPA.source}; ${CADR_DIY_BOX.source}`,
    },
  ],
  [
    'Cooking source S (gas / exhaust / induction)',
    {
      value: `${COOKING_S_GAS_NO_EXHAUST.value} / ${COOKING_S_GAS_EXHAUST.value} / ${COOKING_S_INDUCTION.value}`,
      unit: 'ug/h',
      source: COOKING_S_GAS_NO_EXHAUST.source,
    },
  ],
  ['Carpool occupancy', CARPOOL_OCCUPANCY],
  ['Petrol car CO2e (<1400 cc)', PETROL_CAR_CO2E_G_KM],
  ['Petrol car NOx', PETROL_CAR_NOX_G_KM],
  ['Metro rail CO2e', METRO_CO2E_G_PKM],
  ['Metro rail local NOx', METRO_NOX_G_PKM],
] as const;

export function AssumptionsModal({ open, onOpenChange }: AssumptionsModalProps): ReactElement {
  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Assumptions & Methodology"
      description="Transparent physics constants, citations, and model boundaries."
    >
      <div className="space-y-4 text-xs text-zinc-800 dark:text-zinc-200">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
            Modeled forecast vs. ground monitors
          </h3>
          <p className="mt-1">
            Hourly air-quality forecasts come from Open-Meteo (Copernicus CAMS ~45 km global model).
            They are indicative regional forecasts—not street-level CPCB sensor readings.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
            What we explicitly do NOT model
          </h3>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            <li>Workplace or school indoor air quality (non-commute hours assume home).</li>
            <li>In-vehicle cabin exposure during commutes.</li>
            <li>Breathing rate, physical exertion intensity, or clinical medical risk.</li>
            <li>Boundary-layer height feedbacks from individual household travel choices.</li>
          </ul>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                <th scope="col" className="px-2 py-1.5 font-semibold">
                  Parameter
                </th>
                <th scope="col" className="px-2 py-1.5 font-semibold">
                  Value
                </th>
                <th scope="col" className="px-2 py-1.5 font-semibold">
                  Source / Status
                </th>
              </tr>
            </thead>
            <tbody>
              {CONSTANT_ROWS.map(([name, item]) => (
                <tr key={name} className="border-b border-zinc-100 dark:border-zinc-800">
                  <th scope="row" className="px-2 py-1.5 font-medium">
                    {name}
                  </th>
                  <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">
                    {item.value} {item.unit}
                  </td>
                  <td className="px-2 py-1.5 text-zinc-600 dark:text-zinc-400">{item.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DrawerShell>
  );
}
