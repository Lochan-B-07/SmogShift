'use client';

import * as RadixToggleGroup from '@radix-ui/react-toggle-group';
import type { ReactElement } from 'react';
import {
  describeIndoorDefense,
  describeTravelMode,
  formatClockHour,
} from '@/lib/formatters';
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

export function ToggleGroup({ toggles, bestHour, onChange }: ToggleGroupProps): ReactElement {
  return (
    <section
      aria-label="What-if simulation controls"
      className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-xs sm:grid-cols-2"
    >
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">1. Indoor defense</h2>
        <p className="mb-2 text-xs text-zinc-700">
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
          {INDOOR_OPTIONS.map((opt) => (
            <RadixToggleGroup.Item
              key={opt.value}
              value={opt.value}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-teal-800 data-[state=on]:border-teal-800 data-[state=on]:bg-teal-800 data-[state=on]:text-white"
            >
              {opt.label}
            </RadixToggleGroup.Item>
          ))}
        </RadixToggleGroup.Root>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">2. Daily travel</h2>
          <p className="mb-2 text-xs text-zinc-700">
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
            {TRAVEL_OPTIONS.map((opt) => (
              <RadixToggleGroup.Item
                key={opt.value}
                value={opt.value}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-teal-800 data-[state=on]:border-teal-800 data-[state=on]:bg-teal-800 data-[state=on]:text-white"
              >
                {opt.label}
              </RadixToggleGroup.Item>
            ))}
          </RadixToggleGroup.Root>
        </div>

        <div className="border-t border-zinc-100 pt-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">3. Smart timing</h2>
              <p className="text-xs text-zinc-700">
                Moves airing &amp; outdoor errand from 07:00 to {formatClockHour(bestHour)}.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={toggles.smartTiming}
              aria-label="Toggle smart timing"
              onClick={() => onChange({ ...toggles, smartTiming: !toggles.smartTiming })}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition focus:outline-2 focus:outline-offset-2 focus:outline-teal-800 ${
                toggles.smartTiming
                  ? 'bg-teal-800 text-white'
                  : 'border border-zinc-300 bg-zinc-100 text-zinc-800 hover:bg-zinc-200'
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
