# PROMPT_LOG

## Tools used and why
- Google Antigravity: Planning Mode, phased scaffolding, browser verification
- Gemini (`gemini-3.5-flash-lite`): runtime causal explanations and quick-question chips
- Open-Meteo: live modeled air-quality forecasts and geocoding
- Vercel: native Next.js serverless hosting and secret management

## Human vs. AI boundary
- Human: product architecture, physics engine spec and cited constants, hand-verified fixtures, AGENTS.md guardrails, audit & security posture, Hindi review
- AI (build time): milestone scaffolding, UI components, Vitest/axe test suites
- AI (run time): non-numeric causal trade-off synthesis and household Q&A chips

## Prompt evolution (runtime)
- v1: generic AQI tips -> verbose, repeated dashboard numbers, hallucinated stats
- v2: JSON schema grounded on regime & toggles -> better structure, still leaked numbers
- v3: domain-aware numeric guard + "never restate numbers" + 4 enum Q&A chips + deterministic fallback -> zero hallucinations

## Session entries (append one per milestone)
### 2026-11-25 — M0
- Asked: Analyze Challenge 6 reference guide and implementation spec, then set up the repository foundation (M0) and provide GitHub setup instructions.
- Agent produced: Organized `docs/IMPLEMENTATION.md`, `docs/ENGINE_SPEC.md`, `docs/COMPETITION_GUIDE.md`, `AGENTS.md`, `PROMPT_LOG.md`, `.gitignore`, `.env.example`, Next.js 16 App Router TypeScript/Tailwind/ESLint skeleton, dependency installation, `eslint.config.mjs` boundary rules, `next.config.ts` security headers, `.github/workflows/ci.yml`, `.prettierrc`, starter `README.md`, clean M0 `src/app/page.tsx` (removed unused template SVGs), Vitest setup with smoke test, and local git initialization.
- What I had to correct (include real bugs/failures): Upgraded `@types/node` from `^20` to `^22` so `vitest@5` peer dependencies resolved cleanly; replaced `LayoutProps<"/">` in `src/app/layout.tsx` with explicit `Readonly<{ children: ReactNode }>: ReactElement` so `tsc --noEmit` passes in clean CI checkouts before `next build`; switched `vitest.config.ts` to `vitest.config.mts` with `import.meta.dirname` to eliminate Vite CJS/ESM config warnings; added `*.tsbuildinfo` to `.gitignore`.
- Artifacts kept: `AGENTS.md`, `docs/IMPLEMENTATION.md`, `docs/ENGINE_SPEC.md`, `PROMPT_LOG.md`.

### 2026-11-25 — M1 (Data spike & fallback snapshots)
- Asked: Implement `scripts/capture-fallback.ts`, capture live Open-Meteo hourly snapshots for Delhi, Lucknow, Mumbai, and Bengaluru, and verify §9.5 variance decision rule.
- Agent produced: `scripts/capture-fallback.ts` and normalized fallback JSONs in `src/data/fallback/{delhi,lucknow,mumbai,bengaluru}.json` (`snapshotDate: 2026-11-25`, 48h each, zero nulls across all 7 variables).
- Findings (§9.5): All 4 cities show `max/min >= 1.5x` over 24h (Delhi NCR 2.94×: 47.7–140.2 µg/m³, lowest 15:00; Lucknow 2.05×: 58.8–120.6 µg/m³, lowest 14:00; Mumbai 1.60×: 43.2–69.2 µg/m³, lowest 21:00; Bengaluru 4.16×: 3.7–15.4 µg/m³, lowest 13:00 — clean-day case). Decision: lead with both smart timing and indoor defense levers. Note: CAMS modeled `PM2.5/PM10` ratios are ~0.94–0.99 across all 4 cities (`combustion` regime), reinforcing the §8.10 methodology caveat that ~45 km global modeled ratios are indicative rather than street-level dust monitors.
- What I had to correct (include real bugs/failures): None.
- Artifacts kept: `scripts/capture-fallback.ts`, `src/data/fallback/*.json`.

### 2026-11-25 — Session 2 (M2 + M3: Pure Engine & Data Routes)
- Asked: Implement `src/shared/schemas.ts`, pure exposure/emissions engine (`src/engine/*`) verified against fixtures F1–F11 + property tests, and cached/rate-limited data routes (`/api/air-quality`, `/api/geocode`, `/api/health`).
- Agent produced: Full Zod schemas in `src/shared/schemas.ts`, modular pure engine (`constants.ts`, `category.ts`, `fingerprint.ts`, `routine.ts`, `ventilationWindow.ts`, `indoorModel.ts`, `cadr.ts`, `emissions.ts`, `exposure.ts`, `index.ts`) with fixtures & 18 engine tests, plus `src/server/{rateLimit,fallback,openMeteo}.ts` and `/api/{air-quality,geocode,health}/route.ts` with 11 server/API tests.
- What I had to correct (include real bugs/failures): Verified `AirQualityQuerySchema` rejects empty `?lat=` rather than coercing `""` to `0`; kept `process.env` reads isolated to `src/server/rateLimit.ts`.
- Artifacts kept: `session2_implementation_plan.md`, `session2_walkthrough.md`.

### 2026-11-25 — Session 3 (M4 + M5: Vertical Slice & Guarded Gemini)
- Asked: Implement the vertical-slice UI (city chips, dynamically imported `ExposureChart`, `HourlyTable`, toggles, Household meter) plus `/api/analyze` (`maxDuration = 15`), `/api/brief`, LRU cache, domain-aware `guardNumbers()`, deterministic templates, and `useAnalyze`.
- Agent produced: `src/lib/{presets,formatters}.ts`, `src/hooks/{useAirQuality,useSimulation,useAnalyze}.ts`, `src/components/{ExposureChart,ExposureChartInner,HourlyTable}.tsx`, vertical-slice `src/app/page.tsx`, `src/server/{cache,guard,analyzeTemplates,briefTemplates,gemini}.ts`, `/api/{analyze,brief}/route.ts`, and 15 new tests in `src/server/ai.test.ts` + `src/app/api/aiRoutes.test.ts`.
- What I had to correct (include real bugs/failures): Updated `guardNumbers` domain token regex so `₹500` matches cleanly without requiring a word boundary `\b` before the non-ASCII rupee symbol `₹`.
- Artifacts kept: `session3_implementation_plan.md`, `session3_walkthrough.md`.

### 2026-11-25 — Session 4 (M6 + M7: Full Hero UI, Drawers & Accessibility)
- Asked: Build the complete mobile-first hero UI using Radix primitives, debounced city search + click-triggered geolocation, VerdictBanner with CPCB badge & heuristic fingerprint, Community Meter + RWA scale slider, CausalCard with 4 quick-question chips, Profile / CADR / EN-HI Brief drawers, AssumptionsModal, and `vitest-axe` + RTL tests.
- Agent produced: `src/components/{Header,VerdictBanner,ToggleGroup,MeterCards,CausalCard,DrawerShell,ProfileDrawer,CadrDrawer,BriefDrawer,AssumptionsModal}.tsx`, updated `src/app/{page,layout,globals.css}`, and added `src/app/ui.test.tsx` (5 RTL + `vitest-axe` tests).
- What I had to correct (include real bugs/failures): Sanitized parentheses in `"Your location (lat, lon)"` before sending `cityName` to `/api/brief` so `BriefRequestSchema` regex does not reject geolocated briefs; fixed ESLint `react-hooks/set-state-in-effect` and `jsx-a11y/role-supports-aria-props` in `Header.tsx`; moved `role="img"` + `aria-label` in `ExposureChart.tsx` from `<section>` to an inner `<div>` after `vitest-axe` flagged `aria-allowed-role`.
- Artifacts kept: `session4_implementation_plan.md`, `session4_walkthrough.md`.

### 2026-11-25 — Session 5 (M8 + M9 + M10: Hardening, Live API Smoke & Final Docs)
- Asked: Audit §16 & §13.2 edge states, verify the live Vercel deployment (`https://smog-shift.vercel.app/`), finalize `README.md` and `PROMPT_LOG.md`, and prepare Stage 3 LinkedIn submission draft.
- Agent produced: Edge-state tests in `src/app/ui.test.tsx` (small-town search, city-not-found, `clean_day`, `least_bad`), refined Hindi brief phrasing in `src/server/briefTemplates.ts`, live Vercel API smoke checks (`/api/health`, `/api/air-quality`, `/api/geocode`, `/api/analyze`, `/api/brief`), finalized `README.md` with real measured results, and Stage 3 LinkedIn draft in `session5_walkthrough.md`.
- What I had to correct (include real bugs/failures): Improved two literal Hindi phrases in `briefTemplates.ts` (`अनुमानित उदाहरण` and `सामान्य स्थिति`); browser subagent could not attach because local Chrome remote debugging (`DevToolsActivePort`) was not active, so live verification covered all 5 deployed Vercel API routes via HTTP and full `vitest-axe`/RTL suite locally.
- Artifacts kept: `session5_implementation_plan.md`, `session5_walkthrough.md`.

### 2026-11-25 — Repo Organization & Formatting Polish
- Asked: Arrange and structure the repository files more cleanly and professionally.
- Agent produced: Grouped `src/components/` into domain folders (`layout/`, `chart/`, `controls/`, `drawers/`), removed the redundant M0 `src/app/smoke.test.ts` placeholder, formatted `src/` and `scripts/` consistently with Prettier, and updated `README.md` paths and test counts (`6` files, `57` tests).
- What I had to correct (include real bugs/failures): None.

### 2026-11-25 — UI/UX Hard Audit & DOM Stress Testing
- Asked: Audit the entire UI/DOM for edge-case bugs and UX flaws, refactor rough interactions, and expand DOM/accessibility tests.
- Agent produced: Fixed 0-width single-hour `ReferenceArea` bug and Y-axis/ReferenceLine label clipping in `ExposureChartInner.tsx`; made `Header.tsx` compact on 375 px mobile with outside-click dropdown dismissal and refresh indicator; triggered `useAnalyze.ts` immediately on city switch; added clickable RWA scale buttons + `aria-valuetext` + solo-car helper in `MeterCards.tsx`; added clipboard fallback error state in `BriefDrawer.tsx`, `Reset to defaults` in `ProfileDrawer.tsx`, min/max summary in `HourlyTable.tsx`, and `Updating...` indicator in `CausalCard.tsx`; expanded `src/app/ui.test.tsx` to 9 comprehensive DOM/`vitest-axe` tests (`59` total tests).
- What I had to correct (include real bugs/failures): Caught that a 1-hour best window produced `x1 === x2` in Recharts `ReferenceArea` (invisible highlight) and that `YAxis unit` + `insideLeft` label overlapped on narrow screens.

### 2026-11-25 — Gemini Reliability Upgrade & UI/Dark-Mode Polish
- Asked: Diagnose why live Gemini chips fell back to templates, strengthen the Gemini integration, add visual highlights/polish, and add a light/dark mode toggle.
- Agent produced: Fixed template-cache poisoning in `/api/analyze` (never cache `source === 'template'`), added automatic `gemini-3.5-flash` fallback on transient `gemini-3.5-flash-lite` 503 demand spikes, expanded `AnalyzeQuestionSchema` + `CausalCard` + `analyzeTemplates.ts` with `commute_mask` and `cooking_impact` chips, added `useTheme.ts` + Tailwind v4 `@custom-variant dark` + accessible Light/Dark header toggle, and polished visual hierarchy (brand mark, CPCB left-accent border, `-X%` exposure reduction badge, highlighted `AI Causal Advisor` gradient card & `Recommended next move` callout, and full dark-mode chart/drawer styling).
- What I had to correct (include real bugs/failures): Live diagnostic revealed `gemini-3.5-flash-lite` returning intermittent `503 UNAVAILABLE` spikes and `/api/analyze` caching the resulting `'template'` fallback for 10 minutes.

### 2026-11-25 — UX Improvement Report & First-Wave UX Polish
- Asked: Audit the product from a user perspective, produce a rule-compliant UX improvement report, and complete the in-progress UX enhancements cleanly.
- Agent produced: Created `ux_improvement_report.md` artifact covering onboarding, visual feedback, mobile ergonomics, trust/transparency, and backlog items; implemented `useLocalStorage.ts` (`useSyncExternalStore`, SSR-safe), `ImpactSummaryBar.tsx`, `OnboardingCard`, Zod-validated URL share parameters (`Share` / `Share this view`), `See methodology →` link in `VerdictBanner.tsx`, meter change pulse (`meter-flash` + `@media print` in `globals.css`), sticky `Header.tsx`, and impact tags in `ToggleGroup.tsx`.
- What I had to correct (include real bugs/failures): Replaced `useEffect`-based `setState` and `eslint-disable-next-line` in `useLocalStorage.ts` / `page.tsx` with `useSyncExternalStore`, added `aria-hidden="true"` to impact tags inside `ToggleGroup` radio buttons so accessible names stay clean, and kept Header action button labels accessible.

### 2026-11-26 — Human-First Rework (NL Day Planner, ICS Reminder & Vision Room Audit)
- Asked: Implement the approved two-commit rework strategy: (1) "Tell Me Your Day" natural-language planner + static examples + `.ics` calendar reminder + `/api/analyze` throttling, and (2) "Check My Room" Gemini Vision photo audit with browser-side `<canvas>` compression and 2 bundled sample photos.
- Agent produced: Added `PlanDay*` & `RoomCheck*` Zod schemas (`src/shared/schemas.ts`), `src/data/planday-examples.ts`, `src/server/planday.ts`, `src/app/api/plan-day/route.ts`, `src/hooks/usePlanDay.ts`, `src/lib/icsGenerator.ts`, `DayPlannerInput.tsx`, `GamePlanCard.tsx`, throttled `useAnalyze.ts` + explicit `"Explain this plan"` button in `CausalCard.tsx`, `src/lib/imageCompressor.ts`, `src/data/room-samples.ts`, `public/room-samples/*.jpg`, `src/server/roomCheck.ts`, `src/app/api/room-check/route.ts`, `RoomCheckDrawer.tsx`, and expanded `aiRoutes.test.ts` + `ui.test.tsx`.
- What I had to correct (include real bugs/failures): Kept `gameplan.bullets` and Vision `bottlenecks`/`fix` strictly guarded by `guardNumbers()` with `[]` invented stats, and ensured `.ics` `DTSTART` uses `simulation.summary.bestHour` from the deterministic engine.

### 2026-11-26 — Post-Rework UI/DOM Audit & Polish
- Asked: Audit the reworked UI/DOM for visual/UX bugs and bad impressions, and fix them cleanly alongside the real sample room photos.
- Agent produced: Scoped sticky header to `sm:sticky` so `375px` mobile viewports are not blocked while scrolling (`Header.tsx`), replaced misleading total-reduction `%` under Smart Timing with `Active · Shifted to HH:00` (`ToggleGroup.tsx`), added `stale` tracking in `useAnalyze.ts` + inline `"Settings updated"` banner & highlighted `Explain this plan` button in `CausalCard.tsx`, improved `RoomCheckDrawer.tsx` sample fallback handling and file input reset, and verified with `ui.test.tsx`.
- What I had to correct (include real bugs/failures): Caught that `sticky top-0` on mobile consumed ~260 px of vertical screen space and that Smart Timing displayed total combined reduction `%` rather than its own effect.

## Key lessons
1. Locking the physics engine (`docs/ENGINE_SPEC.md`) and hand-computed fixtures (`F1–F11`) before touching UI or Gemini prevented silent formula drift and made `simulateDay()` deterministic in `< 1 ms`.
2. Domain-aware numeric guarding (`guardNumbers()` stripping `PM2.5`, `N95`, `CO2e`, `₹500` before digit checking) eliminates false rejections while catching hallucinated percentages or clock times.
3. Static ES imports for fallback JSONs (`src/server/fallback.ts`), `revalidate: 900` with rounded coordinates, and `vitest-axe` automated checks catch real deployment and accessibility issues before submission.
