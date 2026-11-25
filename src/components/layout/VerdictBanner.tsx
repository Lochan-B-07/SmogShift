'use client';

import type { ReactElement } from 'react';
import { getCpcbPm25Category, type CpcbBandKey } from '@/engine';
import { describeBestWindowLabel } from '@/lib/formatters';
import type { EngineSummary, Fingerprint } from '@/shared/schemas';

export interface VerdictBannerProps {
  readonly summary: EngineSummary;
  readonly adjustedMean24: number;
  readonly fingerprint: Fingerprint;
  readonly onOpenAssumptions: () => void;
}

function getBadgeStyle(band: CpcbBandKey): string {
  switch (band) {
    case 'good':
      return 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200';
    case 'satisfactory':
      return 'border-lime-300 bg-lime-50 text-lime-950 dark:border-lime-700 dark:bg-lime-950/60 dark:text-lime-200';
    case 'moderately_polluted':
      return 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200';
    case 'poor':
      return 'border-orange-300 bg-orange-50 text-orange-950 dark:border-orange-700 dark:bg-orange-950/60 dark:text-orange-200';
    case 'very_poor':
      return 'border-red-300 bg-red-50 text-red-950 dark:border-red-700 dark:bg-red-950/60 dark:text-red-200';
    case 'severe':
      return 'border-rose-400 bg-rose-50 text-rose-950 dark:border-rose-700 dark:bg-rose-950/60 dark:text-rose-200';
  }
}

function getLeftAccent(band: CpcbBandKey): string {
  switch (band) {
    case 'good':
      return 'border-l-emerald-600';
    case 'satisfactory':
      return 'border-l-lime-600';
    case 'moderately_polluted':
      return 'border-l-amber-500';
    case 'poor':
      return 'border-l-orange-600';
    case 'very_poor':
      return 'border-l-red-600';
    case 'severe':
      return 'border-l-rose-700';
  }
}

function BandIcon({ band }: { readonly band: CpcbBandKey }): ReactElement {
  if (band === 'good' || band === 'satisfactory') {
    return (
      <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
        <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm3.2 5.3-3.7 4a.75.75 0 0 1-1.1 0l-1.6-1.7a.75.75 0 1 1 1.1-1l1.05 1.1 3.15-3.4a.75.75 0 1 1 1.1 1Z" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
      <path d="M7.14 2.18a1 1 0 0 1 1.72 0l5.2 9A1 1 0 0 1 13.2 12.7H2.8a1 1 0 0 1-.86-1.52l5.2-9ZM8 6a.75.75 0 0 0-.75.75v2.5a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8 6Zm0 5.5a.85.85 0 1 0 0-1.7.85.85 0 0 0 0 1.7Z" />
    </svg>
  );
}

export function VerdictBanner({
  summary,
  adjustedMean24,
  fingerprint,
  onOpenAssumptions,
}: VerdictBannerProps): ReactElement {
  const category = getCpcbPm25Category(adjustedMean24);

  return (
    <section
      aria-live="polite"
      aria-label="Daily air quality verdict"
      className={`rounded-2xl border border-l-4 border-zinc-200/90 bg-white/95 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/95 ${getLeftAccent(category.band)}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-base font-bold text-zinc-900 dark:text-zinc-50">
          {describeBestWindowLabel(summary.bestHourLabel, summary.bestHour)}
        </p>
        <span
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${getBadgeStyle(category.band)}`}
        >
          <BandIcon band={category.band} />
          <span>
            {category.label} · {adjustedMean24.toFixed(1)} µg/m³ (band {category.rangeText})
          </span>
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-700 dark:text-zinc-300">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
            Heuristic regime: <strong className="capitalize">{fingerprint.regime}</strong>
            {fingerprint.ratio !== null ? ` (${fingerprint.ratio.toFixed(2)})` : ''}
          </span>
          <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
            NO2: <strong className="capitalize">{fingerprint.no2Level}</strong>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-zinc-600 dark:text-zinc-400">
          <span>Non-commute hours modeled at home; workplace air not included.</span>
          <button
            type="button"
            onClick={onOpenAssumptions}
            className="font-semibold text-teal-800 underline underline-offset-2 hover:text-teal-600 focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 dark:text-teal-300 dark:hover:text-teal-200"
          >
            See methodology →
          </button>
        </div>
      </div>
    </section>
  );
}
