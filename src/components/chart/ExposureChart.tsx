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
      <div className="flex h-64 w-full items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-300 sm:h-72">
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
  readonly isDark?: boolean;
}

export function ExposureChart({
  points,
  baselinePctWho,
  adjustedPctWho,
  bestHour,
  isDark = false,
}: ExposureChartProps): ReactElement {
  const ariaSummary =
    `24-hour PM2.5 exposure chart comparing outdoor air, baseline routine (${Math.round(baselinePctWho)}% of WHO guideline), ` +
    `and adjusted routine (${Math.round(adjustedPctWho)}% of WHO guideline). Cleanest airing hour is ${formatClockHour(bestHour)}.`;

  return (
    <section
      aria-labelledby="exposure-chart-heading"
      className="rounded-2xl border border-zinc-200/90 bg-white/95 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/95"
    >
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="exposure-chart-heading"
          className="text-base font-bold text-zinc-900 dark:text-zinc-50"
        >
          24-Hour Personal Exposure Curve (µg/m³)
        </h2>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Dotted = outdoor · Dashed = baseline · Solid = adjusted · Shaded = best window
        </p>
      </div>
      <div role="img" aria-label={ariaSummary}>
        <ExposureChartInner points={points} isDark={isDark} />
      </div>
    </section>
  );
}
