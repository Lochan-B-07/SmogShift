'use client';

import { useState, type ReactElement } from 'react';
import { getCpcbPm25Category } from '@/engine';
import { ExposureChart } from '@/components/ExposureChart';
import { HourlyTable } from '@/components/HourlyTable';
import { useAirQuality, type ActiveLocation } from '@/hooks/useAirQuality';
import { useAnalyze } from '@/hooks/useAnalyze';
import { useSimulation } from '@/hooks/useSimulation';
import {
  describeBestWindowLabel,
  describeIndoorDefense,
  describeTravelMode,
  formatMinutesAgo,
  formatWhoPercent,
} from '@/lib/formatters';
import { CITY_PRESETS, DEFAULT_CITY, DEFAULT_PROFILE, DEFAULT_TOGGLES } from '@/lib/presets';
import type { Toggles } from '@/shared/schemas';

export default function Home(): ReactElement {
  const [location, setLocation] = useState<ActiveLocation>(DEFAULT_CITY);
  const [toggles, setToggles] = useState<Toggles>(DEFAULT_TOGGLES);
  const profile = DEFAULT_PROFILE;

  const { data, loading, error, retry } = useAirQuality(location);
  const simulation = useSimulation(data, profile, toggles);

  const engineSummary = simulation && simulation.ok ? simulation.summary : null;
  const { analysis, loading: analyzeLoading } = useAnalyze({
    enabled: Boolean(data && engineSummary),
    cityKey: location.key,
    question: 'overview',
    profile,
    toggles,
    fingerprint: data?.fingerprint ?? null,
    engine: engineSummary,
  });

  const adjustedCategory =
    simulation && simulation.ok
      ? getCpcbPm25Category(simulation.adjustedMeters.mean24)
      : null;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900">SmogShift</h1>
              <p className="text-xs text-zinc-600">
                Exposure Budget &amp; Causal What-If Simulator
              </p>
            </div>
            {data ? (
              <span className="rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-800">
                {data.source.isFallback
                  ? `Offline snapshot from ${data.source.snapshotDate ?? 'recent capture'}. Not live data.`
                  : `Modeled forecast · Open-Meteo · Updated ${formatMinutesAgo(data.source.fetchedAt)}`}
              </span>
            ) : null}
          </div>

          <nav aria-label="Preset cities" className="flex flex-wrap gap-2">
            {CITY_PRESETS.map((city) => {
              const active = city.key === location.key;
              return (
                <button
                  key={city.key}
                  type="button"
                  onClick={() => setLocation(city)}
                  aria-pressed={active}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 ${
                    active
                      ? 'bg-teal-700 text-white'
                      : 'border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100'
                  }`}
                >
                  {city.name}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-6">
        {loading && !data ? (
          <div
            aria-live="polite"
            className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600"
          >
            Loading modeled 48-hour air quality forecast for {location.name}...
          </div>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={retry}
              className="rounded-lg bg-red-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-900"
            >
              Retry
            </button>
          </div>
        ) : null}

        {simulation && !simulation.ok ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
          >
            <span>Insufficient forecast data (&gt;3 consecutive missing hours).</span>
            <button
              type="button"
              onClick={retry}
              className="rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Retry
            </button>
          </div>
        ) : null}

        {simulation && simulation.ok && adjustedCategory ? (
          <>
            <section
              aria-live="polite"
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-zinc-900">
                  {describeBestWindowLabel(
                    simulation.summary.bestHourLabel,
                    simulation.summary.bestHour,
                  )}
                </p>
                <span className="rounded-md border border-zinc-300 bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-800">
                  [{adjustedCategory.icon}] {adjustedCategory.label} ({adjustedCategory.rangeText} µg/m³)
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-600">
                Assumes non-commute hours are spent at home; workplace/school indoor air is not
                modeled.
              </p>
            </section>

            <ExposureChart
              points={simulation.points}
              baselinePctWho={simulation.summary.baselinePctWho}
              adjustedPctWho={simulation.summary.adjustedPctWho}
              bestHour={simulation.summary.bestHour}
            />

            <HourlyTable points={simulation.points} />

            <section
              aria-label="What-if choices"
              className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-xs sm:grid-cols-2"
            >
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Indoor defense</h2>
                <p className="mb-2 text-xs text-zinc-600">
                  Active: {describeIndoorDefense(toggles.indoor)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ['none', 'None'],
                      ['seal_exhaust', 'Seal + Exhaust'],
                      ['diy_box', 'DIY Box'],
                      ['hepa', 'HEPA'],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      aria-pressed={toggles.indoor === val}
                      onClick={() => setToggles((prev) => ({ ...prev, indoor: val }))}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 ${
                        toggles.indoor === val
                          ? 'bg-teal-700 text-white'
                          : 'border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Daily travel</h2>
                <p className="mb-2 text-xs text-zinc-600">
                  Active: {describeTravelMode(toggles.travel)} · Affects community emissions only
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ['solo_car', 'Solo Car'],
                      ['carpool', 'Carpool'],
                      ['metro_walk', 'Metro + Walk'],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      aria-pressed={toggles.travel === val}
                      onClick={() => setToggles((prev) => ({ ...prev, travel: val }))}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 ${
                        toggles.travel === val
                          ? 'bg-teal-700 text-white'
                          : 'border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-medium text-zinc-800">
                  <input
                    type="checkbox"
                    checked={toggles.smartTiming}
                    onChange={(e) =>
                      setToggles((prev) => ({ ...prev, smartTiming: e.target.checked }))
                    }
                    className="h-4 w-4 accent-teal-700"
                  />
                  Smart timing (move airing &amp; errand to cleanest hour)
                </label>
              </div>
            </section>

            <section
              aria-live="polite"
              aria-label="Household exposure meter"
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs"
            >
              <h2 className="text-sm font-semibold text-zinc-900">Household Exposure Meter</h2>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-zinc-50 p-3">
                  <p className="text-xs text-zinc-600">Adjusted 24-h Exposure</p>
                  <p className="text-lg font-bold text-zinc-900">
                    {formatWhoPercent(simulation.summary.adjustedPctWho)}
                  </p>
                  <p className="text-xs text-zinc-600">
                    Baseline: {formatWhoPercent(simulation.summary.baselinePctWho)}
                  </p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3">
                  <p className="text-xs text-zinc-600">Cigarette-equivalent avoided (rough rule of thumb)</p>
                  <p className="text-lg font-bold text-teal-800">
                    {simulation.summary.cigAvoided.toFixed(2)} cig/day avoided
                  </p>
                  <p className="text-xs text-zinc-600">
                    24-h mean: {simulation.adjustedMeters.mean24.toFixed(1)} µg/m³
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs text-zinc-600">
                Time-weighted exposure concentration, not a medical inhaled dose (breathing rate
                and activity intensity are not modeled).
              </p>
            </section>

            <section
              aria-live="polite"
              aria-label="Causal explanation"
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-zinc-900">Why these choices matter</h2>
                {analysis?.source === 'template' ? (
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                    Rule-based explanation
                  </span>
                ) : null}
              </div>
              {analyzeLoading && !analysis ? (
                <p className="mt-2 text-xs text-zinc-600">Generating causal explanation...</p>
              ) : analysis ? (
                <div className="mt-2 space-y-2 text-sm text-zinc-800">
                  <p className="font-medium">{analysis.headlineReason}</p>
                  <ul className="list-disc space-y-1 pl-5 text-xs text-zinc-700">
                    {analysis.tradeoffs.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p className="text-xs font-semibold text-teal-800">
                    Next move: {analysis.nextMove}
                  </p>
                  <p className="text-xs text-zinc-500">{analysis.caveat}</p>
                </div>
              ) : null}
            </section>
          </>
        ) : null}
      </main>

      <footer className="mx-auto max-w-4xl px-4 pb-8 text-xs text-zinc-600">
        Air quality data by Open-Meteo.com (CC BY 4.0) · Not medical advice.
      </footer>
    </div>
  );
}
