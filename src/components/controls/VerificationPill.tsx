'use client';

import { useState, type ReactElement } from 'react';
import { formatClockHour } from '@/lib/formatters';
import type { EngineSummary, Fingerprint } from '@/shared/schemas';

export interface VerificationPillProps {
  readonly source: 'gemini' | 'static_example' | 'template';
  readonly baselineMeanUgM3: number;
  readonly adjustedMeanUgM3: number;
  readonly engine: EngineSummary;
  readonly regime: Fingerprint['regime'];
}

function describeSource(source: VerificationPillProps['source']): string {
  switch (source) {
    case 'gemini':
      return 'Gemini + guardNumbers()';
    case 'static_example':
      return 'Curated static example';
    case 'template':
      return 'Deterministic template';
  }
}

export function VerificationPill({
  source,
  baselineMeanUgM3,
  adjustedMeanUgM3,
  engine,
  regime,
}: VerificationPillProps): ReactElement {
  const [expanded, setExpanded] = useState<boolean>(false);

  return (
    <div className="mt-3 rounded-xl border border-zinc-200/90 bg-zinc-50/90 px-3 py-2 text-[11px] dark:border-zinc-700/80 dark:bg-zinc-800/60">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-teal-900 dark:text-teal-300">
          ✓ Verified by Physics Engine · 0 Invented Numbers
        </span>
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="font-semibold text-zinc-700 underline underline-offset-2 hover:text-zinc-900 focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 dark:text-zinc-300 dark:hover:text-zinc-100"
        >
          {expanded ? 'Hide audit' : 'Inspect inputs'}
        </button>
      </div>

      {expanded ? (
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-zinc-200 pt-2 text-[11px] text-zinc-700 sm:grid-cols-3 dark:border-zinc-700 dark:text-zinc-300">
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">Baseline mean</dt>
            <dd className="font-semibold">{baselineMeanUgM3.toFixed(1)} µg/m³</dd>
          </div>
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">Adjusted mean</dt>
            <dd className="font-semibold">{adjustedMeanUgM3.toFixed(1)} µg/m³</dd>
          </div>
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">Best hour</dt>
            <dd className="font-semibold">{formatClockHour(engine.bestHour)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">Regime</dt>
            <dd className="font-semibold capitalize">{regime}</dd>
          </div>
          <div className="col-span-2 sm:col-span-2">
            <dt className="text-zinc-500 dark:text-zinc-400">Narrative source</dt>
            <dd className="font-semibold">{describeSource(source)}</dd>
          </div>
        </dl>
      ) : null}
    </div>
  );
}
