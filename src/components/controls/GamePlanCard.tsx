'use client';

import type { ReactElement } from 'react';
import { useSpeechBrief } from '@/hooks/useSpeechBrief';
import { formatClockHour } from '@/lib/formatters';
import { downloadIcs } from '@/lib/icsGenerator';
import type { EngineSummary, Fingerprint, PlanDayResponse } from '@/shared/schemas';
import { VerificationPill } from './VerificationPill';

export interface GamePlanCardProps {
  readonly plan: PlanDayResponse;
  readonly bestHour: number;
  readonly cityName: string;
  readonly baselineMeanUgM3?: number;
  readonly adjustedMeanUgM3?: number;
  readonly engine?: EngineSummary;
  readonly regime?: Fingerprint['regime'];
  readonly onEdit: () => void;
  readonly onOpenBrief: () => void;
}

function sourceBadgeLabel(source: PlanDayResponse['source']): string {
  switch (source) {
    case 'gemini':
      return 'Powered by Gemini';
    case 'static_example':
      return 'Example plan';
    case 'template':
      return 'Rule-based plan';
  }
}

export function GamePlanCard({
  plan,
  bestHour,
  cityName,
  baselineMeanUgM3,
  adjustedMeanUgM3,
  engine,
  regime,
  onEdit,
  onOpenBrief,
}: GamePlanCardProps): ReactElement {
  const bestClock = formatClockHour(bestHour);
  const { supported: speechSupported, speaking, speak, stop } = useSpeechBrief();

  function handleDownloadCalendar(): void {
    downloadIcs({
      title: `Open windows & outdoor errand — cleanest air (${cityName})`,
      description: plan.gameplan.bullets.join('\n'),
      startHour: bestHour,
      durationMinutes: 45,
      cityName,
    });
  }

  return (
    <section
      aria-live="polite"
      aria-label="Today's personalized game plan"
      className="rounded-2xl border border-emerald-300/90 bg-white/95 p-4 shadow-sm dark:border-emerald-800/80 dark:bg-zinc-900/95"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-2.5 dark:border-zinc-800">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 font-semibold text-emerald-950 dark:bg-emerald-950/70 dark:text-emerald-200">
            ✓ Understood: {plan.understoodAs}
          </span>
          <button
            type="button"
            onClick={onEdit}
            className="font-semibold text-teal-800 underline underline-offset-2 hover:text-teal-600 focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 dark:text-teal-300 dark:hover:text-teal-200"
          >
            Edit
          </button>
        </div>

        <span
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
            plan.source === 'gemini'
              ? 'border-teal-300 bg-teal-100/80 text-teal-950 dark:border-teal-700 dark:bg-teal-900/70 dark:text-teal-100'
              : 'border-zinc-300 bg-zinc-100 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
          }`}
        >
          {sourceBadgeLabel(plan.source)}
        </span>
      </div>

      <h3 className="mt-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">
        Today&apos;s Game Plan · {cityName}
      </h3>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-zinc-800 dark:text-zinc-200">
        {plan.gameplan.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>

      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleDownloadCalendar}
          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-900 focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Add {bestClock} reminder (.ics)
        </button>
        <button
          type="button"
          onClick={onOpenBrief}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        >
          Share EN/HI Brief
        </button>
        {speechSupported ? (
          <button
            type="button"
            onClick={() =>
              speaking ? stop() : speak(plan.gameplan.bullets.join(' '), 'en')
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            {speaking ? 'Stop' : 'Listen'}
          </button>
        ) : null}
      </div>

      {engine && regime !== undefined && baselineMeanUgM3 !== undefined && adjustedMeanUgM3 !== undefined ? (
        <VerificationPill
          source={plan.source}
          baselineMeanUgM3={baselineMeanUgM3}
          adjustedMeanUgM3={adjustedMeanUgM3}
          engine={engine}
          regime={regime}
        />
      ) : null}
    </section>
  );
}
