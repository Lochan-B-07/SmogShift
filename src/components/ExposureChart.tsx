'use client';

import dynamic from 'next/dynamic';
import type { ReactElement } from 'react';
import type { HourlySimulationPoint } from '@/engine';
import { formatClockHour } from '@/lib/formatters';

const ExposureChartInner = dynamic(
  () => import('./ExposureChartInner').then((mod) => mod.ExposureChartInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-72 w-full items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-sm text-zinc-600">
        Loading exposure curve...
      </div>
    ),
  },
);

export interface ExposureChartProps {
  readonly points: readonly HourlySimulationPoint[];
  readonly baselinePctWho: number;
  readonly adjustedPctWho: number;
  readonly bestHour: number;
}

export function ExposureChart({
  points,
  baselinePctWho,
  adjustedPctWho,
  bestHour,
}: ExposureChartProps): ReactElement {
  const ariaSummary =
    `24-hour PM2.5 exposure chart comparing outdoor air, baseline routine (${Math.round(baselinePctWho)}% of WHO guideline), ` +
    `and adjusted routine (${Math.round(adjustedPctWho)}% of WHO guideline). Cleanest airing hour is ${formatClockHour(bestHour)}.`;

  return (
    <section
      aria-label={ariaSummary}
      role="img"
      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs"
    >
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-zinc-900">
          24-Hour Personal Exposure Curve
        </h2>
        <p className="text-xs text-zinc-600">
          Lines differ by dash pattern &amp; color · Shaded span = best window
        </p>
      </div>
      <ExposureChartInner points={points} />
    </section>
  );
}
