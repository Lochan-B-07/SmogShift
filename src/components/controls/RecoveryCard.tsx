'use client';

import { useMemo, useState, type ReactElement } from 'react';
import { computeRecoveryPlan } from '@/engine/recovery';
import type { ExposureHitId, HouseholdProfile, Hour, Toggles } from '@/shared/schemas';

export interface RecoveryCardProps {
  readonly hours: readonly Hour[];
  readonly profile: HouseholdProfile;
  readonly toggles: Toggles;
  readonly onApplyRecovery: (nextToggles: Toggles) => void;
}

const HIT_OPTIONS: readonly {
  readonly id: ExposureHitId;
  readonly label: string;
}[] = [
  { id: 'traffic_jam_45m', label: '45m traffic jam' },
  { id: 'closed_kitchen_smoke', label: '30m closed-kitchen smoke' },
  { id: 'outdoor_errand_1h', label: '1h outdoor errand' },
];

export function RecoveryCard({
  hours,
  profile,
  toggles,
  onApplyRecovery,
}: RecoveryCardProps): ReactElement {
  const [activeHits, setActiveHits] = useState<readonly ExposureHitId[]>([]);

  const currentHour = new Date().getHours();
  const plan = useMemo(
    () => computeRecoveryPlan(hours, profile, toggles, activeHits, currentHour),
    [hours, profile, toggles, activeHits, currentHour],
  );

  function toggleHit(id: ExposureHitId): void {
    setActiveHits((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  return (
    <section
      aria-label="Exposure Debt and Mid-Day Recovery"
      className="rounded-2xl border border-amber-200/90 bg-white/95 p-4 shadow-sm dark:border-amber-900/70 dark:bg-zinc-900/95"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
            Exposure Debt &amp; Mid-Day Recovery
          </h3>
          <p className="mt-0.5 text-xs text-zinc-700 dark:text-zinc-300">
            Already got hit today? Log an unavoidable spike to compute a deterministic recovery plan.
          </p>
        </div>
        {plan.ok && activeHits.length > 0 ? (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-950 dark:bg-amber-950/70 dark:text-amber-200">
            {plan.budgetUsedPct}% WHO budget used (+{plan.debtUgM3.toFixed(1)} µg/m³)
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Log exposure hits">
        {HIT_OPTIONS.map((hit) => {
          const active = activeHits.includes(hit.id);
          return (
            <button
              key={hit.id}
              type="button"
              aria-pressed={active}
              onClick={() => toggleHit(hit.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 ${
                active
                  ? 'bg-amber-800 text-white shadow-xs dark:bg-amber-600'
                  : 'border border-zinc-300 bg-white text-zinc-800 hover:bg-amber-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {active ? `✓ ${hit.label}` : `+ ${hit.label}`}
            </button>
          );
        })}
      </div>

      {plan.ok && activeHits.length > 0 ? (
        <div
          aria-live="polite"
          className="mt-3.5 space-y-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-800/80 dark:bg-amber-950/30"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-zinc-900 dark:text-zinc-50">
              Remaining recovery potential: -{plan.recoverableUgM3.toFixed(1)} µg/m³ (-
              {plan.recoverablePct.toFixed(1)}%)
            </span>
            <button
              type="button"
              onClick={() => onApplyRecovery(plan.recoveryToggles)}
              className="rounded-lg bg-teal-800 px-3 py-1 text-xs font-semibold text-white hover:bg-teal-900 focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              Apply Recovery Mode
            </button>
          </div>
          <ul className="space-y-1.5 text-xs text-zinc-800 dark:text-zinc-200">
            {plan.steps.map((step) => (
              <li key={step.title} className="flex items-start gap-2">
                <span aria-hidden="true" className="font-bold text-teal-800 dark:text-teal-300">
                  →
                </span>
                <span>
                  <strong>{step.title}:</strong> {step.detail}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
