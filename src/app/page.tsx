'use client';

import { useCallback, useRef, useState, useSyncExternalStore, type ReactElement } from 'react';
import { ExposureChart } from '@/components/chart/ExposureChart';
import { HourlyTable } from '@/components/chart/HourlyTable';
import { CausalCard } from '@/components/controls/CausalCard';
import { DayPlannerInput } from '@/components/controls/DayPlannerInput';
import { GamePlanCard } from '@/components/controls/GamePlanCard';
import { ImpactSummaryBar } from '@/components/controls/ImpactSummaryBar';
import { MeterCards } from '@/components/controls/MeterCards';
import { ToggleGroup } from '@/components/controls/ToggleGroup';
import { AssumptionsModal } from '@/components/drawers/AssumptionsModal';
import { BriefDrawer } from '@/components/drawers/BriefDrawer';
import { CadrDrawer } from '@/components/drawers/CadrDrawer';
import { ProfileDrawer } from '@/components/drawers/ProfileDrawer';
import { RoomCheckDrawer } from '@/components/drawers/RoomCheckDrawer';
import { Header } from '@/components/layout/Header';
import { VerdictBanner } from '@/components/layout/VerdictBanner';
import { useAirQuality, type ActiveLocation } from '@/hooks/useAirQuality';
import { useAnalyze } from '@/hooks/useAnalyze';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { usePlanDay } from '@/hooks/usePlanDay';
import { useSimulation } from '@/hooks/useSimulation';
import { useTheme } from '@/hooks/useTheme';
import { CITY_PRESETS, DEFAULT_CITY, DEFAULT_PROFILE, DEFAULT_TOGGLES } from '@/lib/presets';
import {
  TogglesSchema,
  type AnalyzeQuestion,
  type HouseholdProfile,
  type Toggles,
} from '@/shared/schemas';

const subscribeNoop = (): (() => void) => () => {};

function getUrlSearchSnapshot(): string {
  return typeof window === 'undefined' ? '' : window.location.search;
}

function getServerSearchSnapshot(): string {
  return '';
}

function parseUrlOverrides(search: string, base: Toggles): {
  readonly cityKey: string | null;
  readonly toggles: Toggles | null;
} {
  if (!search) return { cityKey: null, toggles: null };
  const params = new URLSearchParams(search);
  const cityKey = params.get('city');
  const indoor = params.get('indoor');
  const travel = params.get('travel');
  const timing = params.get('timing');
  const hh = params.get('hh');

  if (!indoor && !travel && timing === null && !hh) {
    return { cityKey, toggles: null };
  }

  const candidate = {
    indoor: indoor ?? base.indoor,
    travel: travel ?? base.travel,
    smartTiming: timing !== null ? timing === '1' : base.smartTiming,
    households: hh !== null ? Number(hh) : base.households,
  };
  const parsed = TogglesSchema.safeParse(candidate);
  return { cityKey, toggles: parsed.success ? parsed.data : null };
}

function buildShareUrl(location: ActiveLocation, toggles: Toggles): string {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams({
    city: location.key,
    indoor: toggles.indoor,
    travel: toggles.travel,
    timing: toggles.smartTiming ? '1' : '0',
    hh: String(toggles.households),
  });
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

function OnboardingCard(): ReactElement {
  return (
    <section
      aria-label="Welcome to SmogShift"
      className="rounded-2xl border border-teal-200/80 bg-gradient-to-br from-teal-50/80 via-white to-white p-5 shadow-sm dark:border-teal-900/70 dark:from-teal-950/40 dark:via-zinc-900 dark:to-zinc-900"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-800 text-white dark:bg-teal-600"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current">
            <path d="M10 2a.75.75 0 0 1 .72.54l1.06 3.7 3.7 1.06a.75.75 0 0 1 0 1.44l-3.7 1.06-1.06 3.7a.75.75 0 0 1-1.44 0l-1.06-3.7-3.7-1.06a.75.75 0 0 1 0-1.44l3.7-1.06 1.06-3.7A.75.75 0 0 1 10 2Z" />
          </svg>
        </span>
        <div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
            Your personal air-quality simulator
          </h2>
          <p className="mt-1 text-xs text-zinc-700 dark:text-zinc-300">
            SmogShift uses real forecast data to show how your daily choices — filter type, commute,
            and timing — change your PM2.5 exposure. No sign-in needed.
          </p>
          <ol className="mt-3 space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
            <li className="flex items-start gap-2">
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-[11px] font-bold text-teal-900 dark:bg-teal-900/70 dark:text-teal-200">
                1
              </span>
              <span>
                <strong>Pick your city</strong> — or tap &ldquo;Use my location&rdquo; for live
                coordinates.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-[11px] font-bold text-teal-900 dark:bg-teal-900/70 dark:text-teal-200">
                2
              </span>
              <span>
                <strong>Describe your day</strong> — or tune the what-if controls to watch exposure
                drop in real time.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-[11px] font-bold text-teal-900 dark:bg-teal-900/70 dark:text-teal-200">
                3
              </span>
              <span>
                <strong>Save your cleanest-air window</strong> — add a 1-tap calendar reminder or
                share a Hindi/English brief.
              </span>
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactElement {
  const { theme, toggleTheme } = useTheme();

  const [locationKey, setLocationKey] = useLocalStorage<string>('smogshift_city', DEFAULT_CITY.key);
  const [profile, setProfile] = useLocalStorage<HouseholdProfile>(
    'smogshift_profile',
    DEFAULT_PROFILE,
  );
  const [storedToggles, setStoredToggles] = useLocalStorage<Toggles>(
    'smogshift_toggles',
    DEFAULT_TOGGLES,
  );
  const [customLocation, setCustomLocation] = useState<ActiveLocation | null>(null);
  const [urlOverridesDismissed, setUrlOverridesDismissed] = useState<boolean>(false);

  const search = useSyncExternalStore(subscribeNoop, getUrlSearchSnapshot, getServerSearchSnapshot);
  const urlOverrides = parseUrlOverrides(search, storedToggles);

  const location: ActiveLocation =
    customLocation ??
    (urlOverrides.cityKey && !urlOverridesDismissed
      ? CITY_PRESETS.find((c) => c.key === urlOverrides.cityKey)
      : undefined) ??
    CITY_PRESETS.find((c) => c.key === locationKey) ??
    DEFAULT_CITY;

  const toggles: Toggles =
    urlOverrides.toggles && !urlOverridesDismissed ? urlOverrides.toggles : storedToggles;

  const handleSelectLocation = useCallback(
    (loc: ActiveLocation) => {
      setUrlOverridesDismissed(true);
      if (loc.key === 'geo' || !CITY_PRESETS.some((c) => c.key === loc.key)) {
        setCustomLocation(loc);
      } else {
        setCustomLocation(null);
        setLocationKey(loc.key);
      }
    },
    [setLocationKey],
  );

  const handleTogglesChange = useCallback(
    (next: Toggles) => {
      setUrlOverridesDismissed(true);
      setStoredToggles(next);
    },
    [setStoredToggles],
  );

  const handlePlanExtracted = useCallback(
    (nextProfile: HouseholdProfile, nextToggles: Toggles) => {
      setProfile(nextProfile);
      handleTogglesChange(nextToggles);
    },
    [setProfile, handleTogglesChange],
  );

  const plannerTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const {
    result: planResult,
    loading: planLoading,
    error: planError,
    trigger: triggerPlanDay,
    applyExample: applyPlanExample,
    reset: resetPlanDay,
  } = usePlanDay({ onExtracted: handlePlanExtracted });

  const [question, setQuestion] = useState<AnalyzeQuestion>('overview');
  const [explicitAnalyzeTrigger, setExplicitAnalyzeTrigger] = useState<number>(0);
  const [profileOpen, setProfileOpen] = useState<boolean>(false);
  const [cadrOpen, setCadrOpen] = useState<boolean>(false);
  const [roomCheckOpen, setRoomCheckOpen] = useState<boolean>(false);
  const [briefOpen, setBriefOpen] = useState<boolean>(false);
  const [assumptionsOpen, setAssumptionsOpen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  function handleCopyShareUrl(): void {
    const url = buildShareUrl(location, toggles);
    if (!url || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return;
    navigator.clipboard.writeText(url).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {
        /* ignore clipboard rejection */
      },
    );
  }

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
    explicitTrigger: explicitAnalyzeTrigger,
  });

  const hasData = Boolean(data && simulation && simulation.ok);

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
        onSelectLocation={handleSelectLocation}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenCadr={() => setCadrOpen(true)}
        onOpenRoomCheck={() => setRoomCheckOpen(true)}
        onOpenBrief={() => setBriefOpen(true)}
        onCopyShareUrl={handleCopyShareUrl}
        shareCopied={copied}
      />

      <main id="main-content" className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-6">
        {loading && !data ? (
          <>
            <OnboardingCard />
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
          </>
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

        {hasData && data && simulation && simulation.ok ? (
          <>
            <DayPlannerInput
              loading={planLoading}
              error={planError}
              textareaRef={plannerTextareaRef}
              onSubmitText={(text) => void triggerPlanDay(text, location.key)}
              onSelectExample={applyPlanExample}
            />

            {planResult ? (
              <GamePlanCard
                plan={planResult}
                bestHour={simulation.summary.bestHour}
                cityName={location.name}
                onEdit={() => {
                  resetPlanDay();
                  plannerTextareaRef.current?.focus();
                }}
                onOpenBrief={() => setBriefOpen(true)}
              />
            ) : null}

            <ImpactSummaryBar summary={simulation.summary} toggles={toggles} />

            <VerdictBanner
              summary={simulation.summary}
              adjustedMean24={simulation.adjustedMeters.mean24}
              fingerprint={data.fingerprint}
              onOpenAssumptions={() => setAssumptionsOpen(true)}
            />

            <ExposureChart
              points={simulation.points}
              baselinePctWho={simulation.summary.baselinePctWho}
              adjustedPctWho={simulation.summary.adjustedPctWho}
              bestHour={simulation.summary.bestHour}
              isDark={theme === 'dark'}
            />

            <HourlyTable points={simulation.points} />

            <div className="pt-1">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                See the math / Tweak it yourself
              </p>
              <ToggleGroup
                toggles={toggles}
                bestHour={simulation.summary.bestHour}
                summary={simulation.summary}
                onChange={handleTogglesChange}
              />
            </div>

            <MeterCards
              summary={simulation.summary}
              adjustedMean24={simulation.adjustedMeters.mean24}
              households={toggles.households}
              travel={toggles.travel}
              onHouseholdsChange={(households) =>
                handleTogglesChange({ ...toggles, households })
              }
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
              onExplainPlan={() => setExplicitAnalyzeTrigger((n) => n + 1)}
            />

            <ProfileDrawer
              open={profileOpen}
              onOpenChange={setProfileOpen}
              profile={profile}
              onChange={setProfile}
            />

            <CadrDrawer open={cadrOpen} onOpenChange={setCadrOpen} roomSize={profile.roomSize} />

            <RoomCheckDrawer
              open={roomCheckOpen}
              onOpenChange={setRoomCheckOpen}
              cityKey={location.key}
              onApplyIndoor={(indoor) => handleTogglesChange({ ...toggles, indoor })}
            />

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
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleCopyShareUrl}
            className="font-semibold text-zinc-700 underline underline-offset-2 hover:text-zinc-900 focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            {copied ? '✓ Link copied' : 'Share this view'}
          </button>
          <button
            type="button"
            onClick={() => setAssumptionsOpen(true)}
            className="font-semibold text-teal-900 underline underline-offset-2 hover:text-teal-700 focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 dark:text-teal-300 dark:hover:text-teal-200"
          >
            Assumptions &amp; methodology
          </button>
        </div>
      </footer>

      <AssumptionsModal open={assumptionsOpen} onOpenChange={setAssumptionsOpen} />
    </div>
  );
}
