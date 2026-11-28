import type { CostTier, HouseholdProfile, Hour, Toggles } from '@/shared/schemas';
import { simulateDay } from './exposure';

export interface BudgetFrontierTier {
  readonly tier: CostTier;
  readonly label: string;
  readonly summary: string;
  readonly toggles: Toggles;
  readonly meanUgM3: number;
  readonly reductionUgM3: number;
  readonly reductionPct: number;
  readonly shareOfMaxBenefitPct: number;
}

export type BudgetFrontierResult =
  | {
      readonly ok: true;
      readonly unmitigatedMeanUgM3: number;
      readonly tiers: readonly BudgetFrontierTier[];
    }
  | {
      readonly ok: false;
      readonly reason: 'insufficient_data';
    };

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

/**
 * Evaluates 4 Indian household budget tiers (₹0 to ₹12,000+) against today's live forecast
 * to show exposure reduction per rupee.
 */
export function computeBudgetFrontier(
  hours: readonly Hour[],
  profile: HouseholdProfile,
  baseToggles: Toggles,
): BudgetFrontierResult {
  const referenceSim = simulateDay(hours, profile, {
    ...baseToggles,
    smartTiming: false,
    indoor: 'none',
  });
  if (!referenceSim.ok) {
    return referenceSim;
  }

  const unmitigatedMean = referenceSim.adjustedMeters.mean24;

  const specs: readonly {
    readonly tier: CostTier;
    readonly label: string;
    readonly summary: string;
    readonly toggles: Toggles;
  }[] = [
    {
      tier: 'free_0',
      label: '₹0 Free',
      summary: 'Smart Timing + exhaust habit',
      toggles: { ...baseToggles, smartTiming: true, indoor: 'none' },
    },
    {
      tier: 'under_500',
      label: 'Under ₹500',
      summary: 'Draft seal + kitchen exhaust',
      toggles: { ...baseToggles, smartTiming: true, indoor: 'seal_exhaust' },
    },
    {
      tier: 'diy_2500',
      label: '~₹2,500 DIY',
      summary: 'Corsi-Rosenthal box fan',
      toggles: { ...baseToggles, smartTiming: true, indoor: 'diy_box' },
    },
    {
      tier: 'hepa_12000',
      label: '₹12,000+ HEPA',
      summary: 'Mid-size HEPA purifier',
      toggles: { ...baseToggles, smartTiming: true, indoor: 'hepa' },
    },
  ];

  const rawSims = specs.map((spec) => {
    const sim = simulateDay(hours, profile, spec.toggles);
    const mean = sim.ok ? sim.adjustedMeters.mean24 : unmitigatedMean;
    const saved = Math.max(0, unmitigatedMean - mean);
    return { spec, mean, saved };
  });

  const maxSaved = Math.max(0, rawSims[rawSims.length - 1]?.saved ?? 0);

  const tiers: BudgetFrontierTier[] = rawSims.map(({ spec, mean, saved }) => {
    const reductionPct = unmitigatedMean > 0 ? round1((saved / unmitigatedMean) * 100) : 0;
    const shareOfMaxBenefitPct =
      maxSaved > 0 ? Math.min(100, round1((saved / maxSaved) * 100)) : 0;

    return {
      tier: spec.tier,
      label: spec.label,
      summary: spec.summary,
      toggles: spec.toggles,
      meanUgM3: round1(mean),
      reductionUgM3: round1(saved),
      reductionPct,
      shareOfMaxBenefitPct,
    };
  });

  return {
    ok: true,
    unmitigatedMeanUgM3: round1(unmitigatedMean),
    tiers,
  };
}
