'use client';

import type { ReactElement } from 'react';
import { getCpcbPm25Category, type CpcbBandKey } from '@/engine';
import { describeBestWindowLabel } from '@/lib/formatters';
import type { EngineSummary, Fingerprint } from '@/shared/schemas';

export interface VerdictBannerProps {
  readonly summary: EngineSummary;
  readonly adjustedMean24: number;
  readonly fingerprint: Fingerprint;
}

function getBadgeStyle(band: CpcbBandKey): string {
  switch (band) {
    case 'good':
      return 'border-emerald-300 bg-emerald-50 text-emerald-950';
    case 'satisfactory':
      return 'border-lime-300 bg-lime-50 text-lime-950';
    case 'moderately_polluted':
      return 'border-amber-300 bg-amber-50 text-amber-950';
    case 'poor':
      return 'border-orange-300 bg-orange-50 text-orange-950';
    case 'very_poor':
      return 'border-red-300 bg-red-50 text-red-950';
    case 'severe':
      return 'border-rose-400 bg-rose-50 text-rose-950';
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
}: VerdictBannerProps): ReactElement {
  const category = getCpcbPm25Category(adjustedMean24);

  return (
    <section
      aria-live="polite"
      aria-label="Daily air quality verdict"
      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-900">
          {describeBestWindowLabel(summary.bestHourLabel, summary.bestHour)}
        </p>
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${getBadgeStyle(category.band)}`}
        >
          <BandIcon band={category.band} />
          <span>
            {category.label} · {adjustedMean24.toFixed(1)} µg/m³ (band {category.rangeText})
          </span>
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-700">
        <span>
          Source fingerprint (heuristic): <strong className="capitalize">{fingerprint.regime}</strong>
          {fingerprint.ratio !== null ? ` (PM2.5/PM10 ≈ ${fingerprint.ratio.toFixed(2)})` : ''} · NO2:{' '}
          <strong className="capitalize">{fingerprint.no2Level}</strong>
        </span>
        <span className="text-zinc-600">
          Assumes non-commute hours are spent at home; workplace/school indoor air is not modeled.
        </span>
      </div>
    </section>
  );
}
