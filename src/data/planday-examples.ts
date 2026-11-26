import type { PlanDayResponse } from '@/shared/schemas';

export interface PlanDayExample {
  readonly id: string;
  readonly shortLabel: string;
  readonly prompt: string;
  readonly response: PlanDayResponse;
}

export const PLANDAY_EXAMPLES: readonly PlanDayExample[] = [
  {
    id: 'school_run',
    shortLabel: 'School run + gas cooking',
    prompt: 'Dropping my child to school on scooter in the morning, cooking lunch on gas, no purifier.',
    response: {
      profile: {
        sensitive: 'child',
        roomSize: 'medium',
        cooking: 'gas_no_exhaust',
        commuteKm: 10,
      },
      toggles: {
        travel: 'solo_car',
        smartTiming: true,
        indoor: 'seal_exhaust',
        households: 25,
      },
      activityShiftHour: null,
      gameplan: {
        bullets: [
          'Morning scooter drop-off hits peak outdoor PM2.5 — pair an N95 mask for the ride and shift non-urgent errands to the cleanest afternoon window.',
          'Cooking on gas without an exhaust spikes indoor PM2.5; crack a kitchen cross-vent or run an exhaust fan while cooking, then close up.',
          'Draft-sealing gaps and Smart Timing cut your child’s daily indoor exposure without needing a purifier.',
        ],
      },
      understoodAs: 'Child at home · Gas stove (no exhaust) · Solo commute · Smart Timing on',
      source: 'static_example',
    },
  },
  {
    id: 'wfh_cook',
    shortLabel: 'WFH + cooking twice',
    prompt: 'Working from home all day, cooking lunch and dinner on gas without exhaust, no filter.',
    response: {
      profile: {
        sensitive: 'none',
        roomSize: 'medium',
        cooking: 'gas_no_exhaust',
        commuteKm: 5,
      },
      toggles: {
        travel: 'metro_walk',
        smartTiming: true,
        indoor: 'diy_box',
        households: 25,
      },
      activityShiftHour: null,
      gameplan: {
        bullets: [
          'Two unvented gas cooking sessions are your biggest indoor PM2.5 spike when staying home all day.',
          'A DIY Corsi-Rosenthal box fan in your main work room clears cooking and leaked outdoor particles rapidly.',
          'Keep windows shut during morning and evening peaks, and air out only during the cleanest daytime hour.',
        ],
      },
      understoodAs: 'WFH · Gas stove (no exhaust) · DIY Box filter · Smart Timing on',
      source: 'static_example',
    },
  },
  {
    id: 'elder_hepa',
    shortLabel: 'Elder + HEPA + induction',
    prompt: 'Elder parent at home all day, we use induction cooking and have a HEPA purifier in the bedroom.',
    response: {
      profile: {
        sensitive: 'elder',
        roomSize: 'medium',
        cooking: 'induction',
        commuteKm: 10,
      },
      toggles: {
        travel: 'carpool',
        smartTiming: true,
        indoor: 'hepa',
        households: 25,
      },
      activityShiftHour: null,
      gameplan: {
        bullets: [
          'Induction cooking plus a HEPA purifier is already the strongest indoor defense for an older adult.',
          'Keep the HEPA unit running in whichever room your parent spends most daytime hours, with doors closed.',
          'Smart Timing shifts brief window airing to the cleanest midday hour so indoor air stays fresh safely.',
        ],
      },
      understoodAs: 'Older adult · Induction cooker · HEPA purifier · Smart Timing on',
      source: 'static_example',
    },
  },
];
