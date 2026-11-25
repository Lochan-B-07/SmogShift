'use client';

import type { ReactElement } from 'react';
import type { EngineSummary, Toggles } from '@/shared/schemas';

export interface ImpactSummaryBarProps {
  readonly summary: EngineSummary;
  readonly toggles: Toggles;
}

export function ImpactSummaryBar({ summary, toggles }: ImpactSummaryBarProps): ReactElement | null {
  const reductionPct =
    summary.baselinePctWho > 0
      ? Math.max(
          0,
          Math.round(
            ((summary.baselinePctWho - summary.adjustedPctWho) / summary.baselinePctWho) * 100,
          ),
        )
      : 0;

  const activeChoices = [
    toggles.indoor !== 'none',
    toggles.travel !== 'solo_car',
    toggles.smartTiming,
  ].filter(Boolean).length;

  if (activeChoices === 0 && reductionPct === 0) return null;

  return (
    <div
      aria-live="polite"
      className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3.5 py-2.5 text-xs dark:border-emerald-900/60 dark:bg-emerald-950/30"
    >
      {/* Checkmark icon */}
      <span
        aria-hidden="true"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white"
      >
        <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current">
          <path d="M10.5 2.5 4.5 9.5 1.5 6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>

      {activeChoices > 0 ? (
        <span className="font-semibold text-emerald-950 dark:text-emerald-200">
          {activeChoices} active choice{activeChoices !== 1 ? 's' : ''}
        </span>
      ) : null}

      {reductionPct > 0 ? (
        <span className="text-emerald-900 dark:text-emerald-300">
          reduce PM2.5 exposure by{' '}
          <strong className="tabular-nums">{reductionPct}%</strong>
        </span>
      ) : (
        <span className="text-emerald-800 dark:text-emerald-300">
          No what-if choices active yet — try Indoor defense or Smart timing below.
        </span>
      )}

      {summary.co2eKg > 0 ? (
        <>
          <span className="text-emerald-700 dark:text-emerald-500" aria-hidden="true">
            ·
          </span>
          <span className="text-emerald-900 dark:text-emerald-300">
            saves <strong className="tabular-nums">{summary.co2eKg.toFixed(1)} kg</strong> CO2e/day
          </span>
        </>
      ) : null}
    </div>
  );
}
