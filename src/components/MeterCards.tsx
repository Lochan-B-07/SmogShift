'use client';

import * as Slider from '@radix-ui/react-slider';
import * as Tooltip from '@radix-ui/react-tooltip';
import type { ReactElement } from 'react';
import { formatWhoPercent } from '@/lib/formatters';
import type { EngineSummary, Toggles } from '@/shared/schemas';

export interface MeterCardsProps {
  readonly summary: EngineSummary;
  readonly adjustedMean24: number;
  readonly households: Toggles['households'];
  readonly onHouseholdsChange: (households: Toggles['households']) => void;
}

const RWA_STEPS: readonly Toggles['households'][] = [1, 25, 100, 200];

export function MeterCards({
  summary,
  adjustedMean24,
  households,
  onHouseholdsChange,
}: MeterCardsProps): ReactElement {
  const currentStepIndex = Math.max(0, RWA_STEPS.indexOf(households));

  return (
    <Tooltip.Provider delayDuration={150}>
      <section aria-label="Exposure and community meters" className="grid gap-4 sm:grid-cols-2">
        <div
          aria-live="polite"
          className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-xs"
        >
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Household Exposure Meter</h2>
            <p className="mt-2 text-xl font-bold text-zinc-900">
              {formatWhoPercent(summary.adjustedPctWho)}
            </p>
            <p className="text-xs text-zinc-700">
              Baseline without changes: {formatWhoPercent(summary.baselinePctWho)} · 24-h mean:{' '}
              {adjustedMean24.toFixed(1)} µg/m³
            </p>

            <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-zinc-50 p-2.5">
              <span className="text-sm font-bold text-teal-900">
                {summary.cigAvoided.toFixed(2)} cigarettes/day avoided
              </span>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    type="button"
                    aria-label="Explain cigarette equivalence heuristic"
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-zinc-400 text-[11px] font-bold text-zinc-800 hover:bg-zinc-200 focus:outline-2 focus:outline-offset-1 focus:outline-teal-800"
                  >
                    ?
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    sideOffset={5}
                    className="z-50 max-w-xs rounded-lg bg-zinc-900 px-3 py-2 text-xs text-white shadow-lg"
                  >
                    Rough rule of thumb: Berkeley Earth equates ~22 µg/m³ of daily PM2.5 to ~1
                    cigarette/day. Not a clinical equivalence.
                    <Tooltip.Arrow className="fill-zinc-900" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </div>
          </div>

          <p className="mt-3 text-xs text-zinc-600">
            Time-weighted exposure concentration, not a medical inhaled dose (breathing rate and
            activity intensity are not modeled).
          </p>
        </div>

        <div
          aria-live="polite"
          className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-xs"
        >
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Community Emissions Meter</h2>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-zinc-50 p-2.5">
                <p className="text-xs text-zinc-700">CO2e avoided/day</p>
                <p className="text-lg font-bold text-zinc-900">{summary.co2eKg.toFixed(1)} kg</p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-2.5">
                <p className="text-xs text-zinc-700">NOx avoided/day</p>
                <p className="text-lg font-bold text-zinc-900">{summary.noxG.toFixed(1)} g</p>
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-800">
                <label id="rwa-slider-label">RWA society scale</label>
                <span className="font-bold text-teal-900">{households} households</span>
              </div>
              <Slider.Root
                aria-labelledby="rwa-slider-label"
                min={0}
                max={RWA_STEPS.length - 1}
                step={1}
                value={[currentStepIndex]}
                onValueChange={(vals) => {
                  const idx = vals[0] ?? 0;
                  const next = RWA_STEPS[idx] ?? 25;
                  onHouseholdsChange(next);
                }}
                className="relative mt-2 flex h-5 w-full touch-none select-none items-center"
              >
                <Slider.Track className="relative h-1.5 w-full grow rounded-full bg-zinc-200">
                  <Slider.Range className="absolute h-full rounded-full bg-teal-800" />
                </Slider.Track>
                <Slider.Thumb
                  aria-label="Households participating"
                  className="block h-4 w-4 rounded-full border-2 border-teal-800 bg-white shadow focus:outline-2 focus:outline-offset-2 focus:outline-teal-800"
                />
              </Slider.Root>
              <div className="flex justify-between text-[11px] text-zinc-600">
                {RWA_STEPS.map((step) => (
                  <span key={step}>{step}</span>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs text-zinc-600">
            Illustrative scenario: if {households} households in your society make this swap. Not a
            forecast of neighborhood air quality. Tailpipe PM2.5 from a car swap is small compared
            with road dust and biomass burning, so we headline CO2e and NOx.
          </p>
        </div>
      </section>
    </Tooltip.Provider>
  );
}
