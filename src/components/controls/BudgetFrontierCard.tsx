'use client';

import { useMemo, type ReactElement } from 'react';
import { computeBudgetFrontier } from '@/engine/budgetFrontier';
import type { HouseholdProfile, Hour, Toggles } from '@/shared/schemas';

export interface BudgetFrontierCardProps {
  readonly hours: readonly Hour[];
  readonly profile: HouseholdProfile;
  readonly toggles: Toggles;
  readonly onSelectTier: (nextToggles: Toggles) => void;
}

export function BudgetFrontierCard({
  hours,
  profile,
  toggles,
  onSelectTier,
}: BudgetFrontierCardProps): ReactElement | null {
  const frontier = useMemo(
    () => computeBudgetFrontier(hours, profile, toggles),
    [hours, profile, toggles],
  );

  if (!frontier.ok) return null;

  const under500 = frontier.tiers.find((t) => t.tier === 'under_500');

  return (
    <section
      aria-label="Clean air per rupee budget frontier"
      className="rounded-2xl border border-zinc-200/90 bg-white/95 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/95"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
            ₹0 to ₹12,000+ Clean-Air Per Rupee
          </h2>
          <p className="mt-0.5 text-xs text-zinc-700 dark:text-zinc-300">
            {under500
              ? `Under ₹500 captures ${under500.shareOfMaxBenefitPct.toFixed(0)}% of a HEPA purifier's exposure cut today.`
              : 'Compare exposure drop across Indian household budget tiers.'}
          </p>
        </div>
        <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
          Tap a tier to apply
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {frontier.tiers.map((tier) => {
          const isActive =
            toggles.smartTiming === tier.toggles.smartTiming &&
            toggles.indoor === tier.toggles.indoor;
          return (
            <button
              key={tier.tier}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelectTier(tier.toggles)}
              className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 ${
                isActive
                  ? 'border-teal-700 bg-teal-50/90 shadow-xs dark:border-teal-500 dark:bg-teal-950/50'
                  : 'border-zinc-200 bg-zinc-50/70 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/60 dark:hover:bg-zinc-800'
              }`}
            >
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50">
                {tier.label}
              </span>
              <span className="mt-0.5 text-[11px] text-zinc-700 dark:text-zinc-300">
                {tier.summary}
              </span>
              <div className="mt-2 flex w-full items-baseline justify-between gap-1 text-xs">
                <span className="font-bold text-teal-800 dark:text-teal-300">
                  -{tier.reductionPct.toFixed(0)}%
                </span>
                <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  {tier.meanUgM3.toFixed(0)} µg/m³
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
