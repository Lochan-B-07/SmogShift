'use client';

import { useState, type ReactElement } from 'react';
import { ExposureChart } from '@/components/chart/ExposureChart';
import { HourlyTable } from '@/components/chart/HourlyTable';
import { CausalCard } from '@/components/controls/CausalCard';
import { MeterCards } from '@/components/controls/MeterCards';
import { ToggleGroup } from '@/components/controls/ToggleGroup';
import { AssumptionsModal } from '@/components/drawers/AssumptionsModal';
import { BriefDrawer } from '@/components/drawers/BriefDrawer';
import { CadrDrawer } from '@/components/drawers/CadrDrawer';
import { ProfileDrawer } from '@/components/drawers/ProfileDrawer';
import { Header } from '@/components/layout/Header';
import { VerdictBanner } from '@/components/layout/VerdictBanner';
import { useAirQuality, type ActiveLocation } from '@/hooks/useAirQuality';
import { useAnalyze } from '@/hooks/useAnalyze';
import { useSimulation } from '@/hooks/useSimulation';
import { useTheme } from '@/hooks/useTheme';
import { DEFAULT_CITY, DEFAULT_PROFILE, DEFAULT_TOGGLES } from '@/lib/presets';
import type { AnalyzeQuestion, HouseholdProfile, Toggles } from '@/shared/schemas';

export default function Home(): ReactElement {
  const { theme, toggleTheme } = useTheme();
  const [location, setLocation] = useState<ActiveLocation>(DEFAULT_CITY);
  const [profile, setProfile] = useState<HouseholdProfile>(DEFAULT_PROFILE);
  const [toggles, setToggles] = useState<Toggles>(DEFAULT_TOGGLES);
  const [question, setQuestion] = useState<AnalyzeQuestion>('overview');

  const [profileOpen, setProfileOpen] = useState<boolean>(false);
  const [cadrOpen, setCadrOpen] = useState<boolean>(false);
  const [briefOpen, setBriefOpen] = useState<boolean>(false);
  const [assumptionsOpen, setAssumptionsOpen] = useState<boolean>(false);

  const { data, loading, error, retry } = useAirQuality(location);
  const simulation = useSimulation(data, profile, toggles);

  const engineSummary = simulation && simulation.ok ? simulation.summary : null;
  const {
    analysis,
    loading: analyzeLoading,
    error: analyzeError,
  } = useAnalyze({
    enabled: Boolean(data && engineSummary),
    cityKey: location.key,
    question,
    profile,
    toggles,
    fingerprint: data?.fingerprint ?? null,
    engine: engineSummary,
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/70 via-zinc-50 to-zinc-100 text-zinc-900 dark:from-teal-950/25 dark:via-zinc-950 dark:to-zinc-950 dark:text-zinc-100">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-teal-800 focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>

      <Header
        location={location}
        airQuality={data}
        loading={loading}
        theme={theme}
        onToggleTheme={toggleTheme}
        onSelectLocation={setLocation}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenCadr={() => setCadrOpen(true)}
        onOpenBrief={() => setBriefOpen(true)}
      />

      <main id="main-content" className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-6">
        {loading && !data ? (
          <div
            aria-live="polite"
            className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="h-4 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-56 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            <p className="text-xs text-zinc-700 dark:text-zinc-300">
              Loading modeled 48-hour air quality forecast for {location.name}...
            </p>
          </div>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-950 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={retry}
              className="rounded-lg bg-red-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-900 focus:outline-2 focus:outline-offset-2 focus:outline-red-700"
            >
              Retry
            </button>
          </div>
        ) : null}

        {simulation && !simulation.ok ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200"
          >
            <span>Insufficient forecast data (&gt;3 consecutive missing hours).</span>
            <button
              type="button"
              onClick={retry}
              className="rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white focus:outline-2 focus:outline-offset-2 focus:outline-amber-700"
            >
              Retry
            </button>
          </div>
        ) : null}

        {data && simulation && simulation.ok ? (
          <>
            <VerdictBanner
              summary={simulation.summary}
              adjustedMean24={simulation.adjustedMeters.mean24}
              fingerprint={data.fingerprint}
            />

            <ExposureChart
              points={simulation.points}
              baselinePctWho={simulation.summary.baselinePctWho}
              adjustedPctWho={simulation.summary.adjustedPctWho}
              bestHour={simulation.summary.bestHour}
              isDark={theme === 'dark'}
            />

            <HourlyTable points={simulation.points} />

            <ToggleGroup
              toggles={toggles}
              bestHour={simulation.summary.bestHour}
              onChange={setToggles}
            />

            <MeterCards
              summary={simulation.summary}
              adjustedMean24={simulation.adjustedMeters.mean24}
              households={toggles.households}
              travel={toggles.travel}
              onHouseholdsChange={(households) => setToggles((prev) => ({ ...prev, households }))}
            />

            <CausalCard
              question={question}
              analysis={analysis}
              loading={analyzeLoading}
              error={analyzeError}
              regime={data.fingerprint.regime}
              profile={profile}
              toggles={toggles}
              onSelectQuestion={setQuestion}
            />

            <ProfileDrawer
              open={profileOpen}
              onOpenChange={setProfileOpen}
              profile={profile}
              onChange={setProfile}
            />

            <CadrDrawer open={cadrOpen} onOpenChange={setCadrOpen} roomSize={profile.roomSize} />

            <BriefDrawer
              open={briefOpen}
              onOpenChange={setBriefOpen}
              cityName={location.name}
              profile={profile}
              toggles={toggles}
              engine={simulation.summary}
            />
          </>
        ) : null}
      </main>

      <footer className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 pb-8 pt-2 text-xs text-zinc-700 dark:text-zinc-400">
        <span>Air quality data by Open-Meteo.com (CC BY 4.0) · Not medical advice.</span>
        <button
          type="button"
          onClick={() => setAssumptionsOpen(true)}
          className="font-semibold text-teal-900 underline underline-offset-2 hover:text-teal-700 focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 dark:text-teal-300 dark:hover:text-teal-200"
        >
          Assumptions &amp; methodology
        </button>
      </footer>

      <AssumptionsModal open={assumptionsOpen} onOpenChange={setAssumptionsOpen} />
    </div>
  );
}
