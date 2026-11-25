'use client';

import type { ReactElement } from 'react';
import { getCpcbPm25Category, type HourlySimulationPoint } from '@/engine';
import { describeActivity, formatIsoClock } from '@/lib/formatters';

export interface HourlyTableProps {
  readonly points: readonly HourlySimulationPoint[];
}

export function HourlyTable({ points }: HourlyTableProps): ReactElement {
  const outdoorVals = points.map((p) => p.outdoorPm25);
  const minOutdoor = outdoorVals.length > 0 ? Math.min(...outdoorVals) : 0;
  const maxOutdoor = outdoorVals.length > 0 ? Math.max(...outdoorVals) : 0;

  return (
    <details className="rounded-2xl border border-zinc-200/90 bg-white/95 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/95">
      <summary className="cursor-pointer text-sm font-semibold text-zinc-900 focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 dark:text-zinc-100">
        Hourly exposure data table ({points.length}h · outdoor {minOutdoor.toFixed(0)}–
        {maxOutdoor.toFixed(0)} µg/m³)
      </summary>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs text-zinc-800 dark:text-zinc-200">
          <caption className="mb-2 text-left text-xs text-zinc-600 dark:text-zinc-400">
            Hourly modeled outdoor PM2.5 (µg/m³), baseline routine exposure, and adjusted routine
            exposure.
          </caption>
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              <th scope="col" className="px-2 py-2 font-semibold">
                Hour
              </th>
              <th scope="col" className="px-2 py-2 font-semibold">
                Activity
              </th>
              <th scope="col" className="px-2 py-2 font-semibold">
                Outdoor PM2.5
              </th>
              <th scope="col" className="px-2 py-2 font-semibold">
                Baseline
              </th>
              <th scope="col" className="px-2 py-2 font-semibold">
                Adjusted
              </th>
              <th scope="col" className="px-2 py-2 font-semibold">
                CPCB Outdoor Band
              </th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => {
              const cat = getCpcbPm25Category(point.outdoorPm25);
              return (
                <tr
                  key={point.time}
                  className={`border-b border-zinc-100 dark:border-zinc-800 ${
                    point.isBestWindow ? 'bg-teal-50/80 dark:bg-teal-950/40' : ''
                  }`}
                >
                  <th scope="row" className="whitespace-nowrap px-2 py-1.5 font-medium">
                    {formatIsoClock(point.time)}
                    {point.isBestWindow ? (
                      <span className="ml-1 font-semibold text-teal-800 dark:text-teal-300">
                        (Best)
                      </span>
                    ) : null}
                  </th>
                  <td className="px-2 py-1.5">{describeActivity(point.adjustedActivity)}</td>
                  <td className="px-2 py-1.5 tabular-nums">{point.outdoorPm25.toFixed(1)} µg/m³</td>
                  <td className="px-2 py-1.5 tabular-nums">
                    {point.baselineExposure.toFixed(1)} µg/m³
                  </td>
                  <td className="px-2 py-1.5 font-semibold tabular-nums">
                    {point.adjustedExposure.toFixed(1)} µg/m³
                  </td>
                  <td className="px-2 py-1.5">
                    {cat.label} ({cat.rangeText})
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}
