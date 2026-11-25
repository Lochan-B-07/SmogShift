'use client';

import * as Slider from '@radix-ui/react-slider';
import * as Tooltip from '@radix-ui/react-tooltip';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { formatWhoPercent } from '@/lib/formatters';
import type { EngineSummary, Toggles } from '@/shared/schemas';

export interface MeterCardsProps {
  readonly summary: EngineSummary;
  readonly adjustedMean24: number;
  readonly households: Toggles['households'];
  readonly travel: Toggles['travel'];
  readonly onHouseholdsChange: (households: Toggles['households']) => void;
}

const RWA_STEPS: readonly Toggles['households'][] = [1, 25, 100, 200];

export function MeterCards({
  summary,
  adjustedMean24,
  households,
  travel,
  onHouseholdsChange,
}: MeterCardsProps): ReactElement {
  const currentStepIndex = Math.max(0, RWA_STEPS.indexOf(households));
  const reductionPct =
    summary.baselinePctWho > 0
      ? Math.max(
          0,
          Math.round(
            ((summary.baselinePctWho - summary.adjustedPctWho) / summary.baselinePctWho) * 100,
          ),
        )
      : 0;

  // Flash the exposure tile when the adjusted value changes
  const flashRef = useRef<HTMLDivElement | null>(null);
  const prevAdjusted = useRef<number>(summary.adjustedPctWho);
  const [flashKey, setFlashKey] = useState<number>(0);

  useEffect(() => {
    if (prevAdjusted.current !== summary.adjustedPctWho) {
      prevAdjusted.current = summary.adjustedPctWho;
      setFlashKey((k) => k + 1);
    }
  }, [summary.adjustedPctWho]);

  return (
    <Tooltip.Provider delayDuration={150}>
      <section aria-label="Exposure and community meters" className="grid gap-4 sm:grid-cols-2">
        <div
          ref={flashRef}
          key={flashKey}
          aria-live="polite"
          className={`flex flex-col justify-between rounded-2xl border border-zinc-200/90 bg-white/95 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/95${flashKey > 0 ? ' meter-flash' : ''}`}
        >
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                Household Exposure Meter
              </h2>
              {reductionPct > 0 ? (
                <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200">
                  −{reductionPct}% exposure
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
              {formatWhoPercent(summary.adjustedPctWho)}
            </p>
            <p className="text-xs text-zinc-700 dark:text-zinc-300">
              Baseline:{' '}
              <span className="tabular-nums">{formatWhoPercent(summary.baselinePctWho)}</span> ·
              24-h mean:{' '}
              <span className="font-semibold tabular-nums">{adjustedMean24.toFixed(1)} µg/m³</span>
            </p>

            <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-teal-200/80 bg-teal-50/70 p-2.5 dark:border-teal-900 dark:bg-teal-950/40">
              <span className="text-sm font-bold tabular-nums text-teal-900 dark:text-teal-200">
                {summary.cigAvoided.toFixed(2)} cigarettes/day avoided
              </span>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    type="button"
                    aria-label="Explain cigarette equivalence heuristic"
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-zinc-400 bg-white text-[11px] font-bold text-zinc-800 hover:bg-zinc-100 focus:outline-2 focus:outline-offset-1 focus:outline-teal-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                  >
                    ?
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    sideOffset={5}
                    className="z-50 max-w-xs rounded-lg bg-zinc-900 px-3 py-2 text-xs text-white shadow-lg dark:bg-zinc-800"
                  >
                    Rough rule of thumb: Berkeley Earth equates ~22 µg/m³ of daily PM2.5 to ~1
                    cigarette/day. Not a clinical equivalence.
                    <Tooltip.Arrow className="fill-zinc-900 dark:fill-zinc-800" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </div>
          </div>

          <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
            Time-weighted exposure concentration, not a medical inhaled dose (breathing rate and
            activity intensity are not modeled).
          </p>
        </div>

        <div
          aria-live="polite"
          className="flex flex-col justify-between rounded-2xl border border-zinc-200/90 bg-white/95 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/95"
        >
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
              Community Emissions Meter
            </h2>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 dark:border-zinc-800 dark:bg-zinc-800/70">
                <p className="text-xs text-zinc-700 dark:text-zinc-300">CO2e avoided/day</p>
                <p className="text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {summary.co2eKg.toFixed(1)} kg
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 dark:border-zinc-800 dark:bg-zinc-800/70">
                <p className="text-xs text-zinc-700 dark:text-zinc-300">NOx avoided/day</p>
                <p className="text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {summary.noxG.toFixed(1)} g
                </p>
              </div>
            </div>

            {travel === 'solo_car' ? (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-1.5 text-xs font-medium text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                Switch Daily Travel to Carpool or Metro + Walk to see society emission savings.
              </p>
            ) : null}

            <div className="mt-3">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-800 dark:text-zinc-200">
                <label id="rwa-slider-label">RWA society scale</label>
                <span className="font-bold text-teal-900 dark:text-teal-300">
                  {households} households
                </span>
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
                <Slider.Track className="relative h-1.5 w-full grow rounded-full bg-zinc-200 dark:bg-zinc-700">
                  <Slider.Range className="absolute h-full rounded-full bg-teal-800 dark:bg-teal-500" />
                </Slider.Track>
                <Slider.Thumb
                  aria-label="Households participating"
                  aria-valuetext={`${households} households`}
                  className="block h-5 w-5 rounded-full border-2 border-teal-800 bg-white shadow focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 dark:border-teal-400 dark:bg-zinc-900"
                />
              </Slider.Root>
              <div className="mt-1 grid grid-cols-4 gap-1 text-[11px]">
                {RWA_STEPS.map((step) => (
                  <button
                    key={step}
                    type="button"
                    aria-pressed={households === step}
                    onClick={() => onHouseholdsChange(step)}
                    className={`rounded py-0.5 font-medium transition focus:outline-2 focus:outline-offset-1 focus:outline-teal-700 ${
                      households === step
                        ? 'bg-teal-100 font-bold text-teal-900 dark:bg-teal-900/70 dark:text-teal-200'
                        : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {step}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
            Illustrative scenario: if {households} households in your society make this swap. Not a
            forecast of neighborhood air quality. Tailpipe PM2.5 from a car swap is small compared
            with road dust and biomass burning, so we headline CO2e and NOx.
          </p>
        </div>
      </section>
    </Tooltip.Provider>
  );
}
