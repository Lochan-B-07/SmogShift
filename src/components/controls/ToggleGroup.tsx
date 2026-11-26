'use client';

import * as RadixToggleGroup from '@radix-ui/react-toggle-group';
import type { ReactElement } from 'react';
import { describeIndoorDefense, describeTravelMode, formatClockHour } from '@/lib/formatters';
import type { Toggles } from '@/shared/schemas';

export interface ToggleGroupProps {
  readonly toggles: Toggles;
  readonly bestHour: number;
  readonly onChange: (next: Toggles) => void;
}

const TRAVEL_OPTIONS: readonly { readonly value: Toggles['travel']; readonly label: string }[] = [
  { value: 'solo_car', label: 'Solo Car' },
  { value: 'carpool', label: 'Carpool' },
  { value: 'metro_walk', label: 'Metro + Walk' },
];

const INDOOR_OPTIONS: readonly { readonly value: Toggles['indoor']; readonly label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'seal_exhaust', label: 'Seal + Exhaust' },
  { value: 'diy_box', label: 'DIY Box' },
  { value: 'hepa', label: 'HEPA' },
];

/** Returns a rough impact pill label based on how much each choice affects exposure */
function indoorImpactLabel(value: Toggles['indoor']): string {
  if (value === 'hepa') return 'High impact';
  if (value === 'diy_box') return 'Medium impact';
  if (value === 'seal_exhaust') return 'Low–Medium impact';
  return '';
}

function travelImpactLabel(value: Toggles['travel']): string {
  if (value === 'metro_walk') return 'High CO2e saving';
  if (value === 'carpool') return 'Medium CO2e saving';
  return '';
}

export function ToggleGroup({ toggles, bestHour, onChange }: ToggleGroupProps): ReactElement {
  return (
    <section
      aria-label="What-if simulation controls"
      className="grid gap-4 rounded-2xl border border-zinc-200/90 bg-white/95 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/95 sm:grid-cols-2"
    >
      {/* Indoor defense */}
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-[11px] font-bold text-teal-900 dark:bg-teal-900/70 dark:text-teal-200">
            1
          </span>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Indoor defense</h2>
        </div>
        <p className="mb-2.5 mt-1 text-xs text-zinc-700 dark:text-zinc-300">
          {describeIndoorDefense(toggles.indoor)} · Controls indoor leakage &amp; particle removal.
        </p>
        <RadixToggleGroup.Root
          type="single"
          aria-label="Indoor defense mode"
          value={toggles.indoor}
          onValueChange={(value) => {
            if (value) {
              onChange({ ...toggles, indoor: value as Toggles['indoor'] });
            }
          }}
          className="flex flex-wrap gap-2"
        >
          {INDOOR_OPTIONS.map((opt) => {
            const impactLabel = indoorImpactLabel(opt.value);
            return (
              <RadixToggleGroup.Item
                key={opt.value}
                value={opt.value}
                title={impactLabel || undefined}
                className="group relative rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 data-[state=on]:border-teal-800 data-[state=on]:bg-teal-800 data-[state=on]:text-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 dark:data-[state=on]:border-teal-600 dark:data-[state=on]:bg-teal-600 dark:data-[state=on]:text-white"
              >
                {opt.label}
                {impactLabel ? (
                  <span
                    aria-hidden="true"
                    className="ml-1.5 hidden text-[10px] font-normal opacity-80 group-data-[state=on]:inline"
                  >
                    · {impactLabel}
                  </span>
                ) : null}
              </RadixToggleGroup.Item>
            );
          })}
        </RadixToggleGroup.Root>
      </div>

      <div className="flex flex-col gap-3">
        {/* Daily travel */}
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-[11px] font-bold text-teal-900 dark:bg-teal-900/70 dark:text-teal-200">
              2
            </span>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Daily travel</h2>
          </div>
          <p className="mb-2.5 mt-1 text-xs text-zinc-700 dark:text-zinc-300">
            {describeTravelMode(toggles.travel)} · Affects community emissions only; in-vehicle
            exposure is not modeled.
          </p>
          <RadixToggleGroup.Root
            type="single"
            aria-label="Daily travel mode"
            value={toggles.travel}
            onValueChange={(value) => {
              if (value) {
                onChange({ ...toggles, travel: value as Toggles['travel'] });
              }
            }}
            className="flex flex-wrap gap-2"
          >
            {TRAVEL_OPTIONS.map((opt) => {
              const impactLabel = travelImpactLabel(opt.value);
              return (
                <RadixToggleGroup.Item
                  key={opt.value}
                  value={opt.value}
                  title={impactLabel || undefined}
                  className="group relative rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 data-[state=on]:border-teal-800 data-[state=on]:bg-teal-800 data-[state=on]:text-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 dark:data-[state=on]:border-teal-600 dark:data-[state=on]:bg-teal-600 dark:data-[state=on]:text-white"
                >
                  {opt.label}
                  {impactLabel ? (
                    <span
                      aria-hidden="true"
                      className="ml-1.5 hidden text-[10px] font-normal opacity-80 group-data-[state=on]:inline"
                    >
                      · {impactLabel}
                    </span>
                  ) : null}
                </RadixToggleGroup.Item>
              );
            })}
          </RadixToggleGroup.Root>
        </div>

        {/* Smart timing */}
        <div className="border-t border-zinc-100 pt-2.5 dark:border-zinc-800">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-[11px] font-bold text-teal-900 dark:bg-teal-900/70 dark:text-teal-200">
                  3
                </span>
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Smart timing</h2>
              </div>
              <p className="mt-0.5 text-xs text-zinc-700 dark:text-zinc-300">
                Moves airing &amp; outdoor errand from 07:00 to {formatClockHour(bestHour)}.
                {toggles.smartTiming ? (
                  <span className="ml-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                    Active · Shifted to {formatClockHour(bestHour)}
                  </span>
                ) : null}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={toggles.smartTiming}
              aria-label="Toggle smart timing"
              onClick={() => onChange({ ...toggles, smartTiming: !toggles.smartTiming })}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 ${
                toggles.smartTiming
                  ? 'bg-teal-800 text-white shadow-xs dark:bg-teal-600'
                  : 'border border-zinc-300 bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {toggles.smartTiming ? 'On' : 'Off'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
