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

## Key lessons
1.
2.
3.
