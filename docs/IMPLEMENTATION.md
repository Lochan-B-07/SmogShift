# Exposure Budget & Causal What-If Simulator
## End-to-End Implementation Specification (Antigravity + Vercel Ready)

**Challenge:** PromptWars Virtual, Challenge 6 (Urban Air Quality Assistant)
**Builder:** Solo | **IDE:** Google Antigravity | **Hosting:** Vercel (Next.js Native)
**Convention:** Items tagged **[verify]** must be confirmed on first run against live APIs/docs. Never assume.

---

## 0. How to use this document

1. Put this file at `docs/IMPLEMENTATION.md` in the repo. Put §6 at the repo root as `AGENTS.md`. Put §8 at `docs/ENGINE_SPEC.md`.
2. Work through the milestones in §19 in order. Open one Antigravity Planning Mode session per milestone and paste the matching prompt from §20.
3. Do not let the agent invent or alter formulas. The physics and emission engine is locked in §8 with hand-verified fixtures. Agents implement it; you verify it.
4. Maintain `PROMPT_LOG.md` (template in §22) from Day 1 for Stage 3 validation.

---

## 1. Product definition

**One-line pitch:** A mobile-first smog simulator that turns live hourly $\text{PM}_{2.5}$ forecasts into a personal exposure curve. Flip three everyday choices and watch the curve, the health meter, and your neighborhood's emissions change instantly—paired with a grounded Gemini causal explainer and interactive quick-question chips.

**Why it is not "an AQI dashboard":** The interaction is the product. Toggles recompute exposure in the browser in milliseconds using a documented indoor/outdoor mass-balance model. Gemini strictly explains causal trade-offs and answers household-specific questions—never computing or inventing numbers.

### 1.1 Challenge 6 traceability (copy into `README.md`)

| Challenge 6 requirement | Feature | Primary source files |
|---|---|---|
| Personalized recommendations (location, household, lifestyle) | Household profile drawer (enums), city/geolocation, profile-aware Gemini card + quick-question chips | `src/components/ProfileDrawer.tsx`, `src/components/CausalCard.tsx`, `src/server/gemini.ts` |
| Low-emission daily routines | Travel toggle (solo car / carpool / metro+walk), smart timing toggle, RWA scale slider | `src/engine/emissions.ts`, `src/components/ToggleGroup.tsx` |
| Indoor air quality hacks | Indoor defense toggle (seal+exhaust / DIY box / HEPA), CADR/ACH drawer, cooking profile | `src/engine/indoorModel.ts`, `src/engine/cadr.ts` |
| Real-time data integration | Open-Meteo Air Quality hourly (live, modeled), server proxy with Next.js Data Cache and labeled static fallback | `src/server/openMeteo.ts`, `src/app/api/air-quality/route.ts` |
| User-friendly location interaction | City chips, debounced search, "Use my location" button | `src/components/Header/*` |
| Justification of action | Grounded CausalCard + 3 interactive question chips, assumptions modal, methodology in README | `src/components/CausalCard.tsx`, `docs/ENGINE_SPEC.md` |

---

## 2. Scope

**In v1**
- Open-Meteo Air Quality (hourly, modeled) and Open-Meteo Geocoding
- 3 toggles, interactive bending exposure curve, 2 plain-language meters, RWA scale slider
- Gemini causal card (`gemini-3.5-flash-lite`) + 3 clickable enum quick-question chips, numeric guard, and deterministic fallback templates
- Drawers: Household Profile, Room CADR/ACH, Family/RWA Brief (EN and HI)
- Accessible chart data table, per-IP rate limiting, caching, static ES-imported fallback snapshots, CI, Vercel deploy

**Out of v1:** Ground-station data (OpenAQ/WAQI), boundary-layer height, photo upload, user accounts, database, in-vehicle exposure modeling, breathing-rate dose modeling, $\text{CO}_2$ ventilation modeling, nonce CSP middleware.

**Cut order if behind:** Ground-station stretch $\rightarrow$ URL-state sharing $\rightarrow$ optional Gemini sentence in RWA brief.
**Never cut:** Live Vercel URL, engine tests, chart data table, fallbacks, rate limiting, `guardNumbers()` tests.

---

## 3. Tech stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 App Router, TypeScript `strict` | Native Vercel build (no Docker / no `output: 'standalone'`) |
| Runtime | Node 22 LTS | Match in Vercel Project Settings and CI |
| Styling | Tailwind CSS | Mobile-first (375 px baseline) |
| UI primitives | Radix UI (Dialog, ToggleGroup, Slider, Tooltip) | Focus trap and keyboard navigation |
| Chart | Recharts, dynamically imported with `ssr: false` | Always paired with an accessible data table |
| Validation | Zod, shared contracts in `shared/schemas.ts` | Client and server import the same file |
| AI | `@google/genai`, model from `GEMINI_MODEL` env var | Default: `gemini-3.5-flash-lite` (GA, low-latency JSON) |
| Data | Open-Meteo Air Quality + Geocoding | Free non-commercial tier; CC BY 4.0 attribution required |
| Testing | Vitest, React Testing Library, `vitest-axe` | Unit, API fallback, guard, and a11y tests |
| Lint/format | ESLint 9 flat config (`eslint .`), Prettier | Zero warnings (`next lint` was removed in Next.js 16) |
| Hosting | Vercel (Region: `bom1` Mumbai if configurable) | Env vars stored in Vercel Dashboard |

---

## 4. Repository structure

```text
/
├─ AGENTS.md
├─ PROMPT_LOG.md
├─ README.md
├─ docs/
│  ├─ IMPLEMENTATION.md          # this file
│  └─ ENGINE_SPEC.md             # §8, source of truth for physics
├─ .github/workflows/ci.yml
├─ .env.example
├─ .gitignore
├─ eslint.config.mjs             # ESLint 9 flat config + no-restricted-imports
├─ next.config.ts
├─ package.json / package-lock.json
├─ src/
│  ├─ data/fallback/             # real captured Open-Meteo JSON (ES-imported, never fs.readFileSync)
│  │  ├─ delhi.json
│  │  ├─ lucknow.json
│  │  ├─ mumbai.json
│  │  └─ bengaluru.json
│  ├─ shared/
│  │  └─ schemas.ts              # Zod contracts + inferred types
│  ├─ engine/                    # PURE functions, zero I/O, zero imports from server/ or components/
│  │  ├─ constants.ts
│  │  ├─ category.ts             # CPCB PM2.5 bands -> label/icon
│  │  ├─ fingerprint.ts          # PM2.5/PM10 + NO2 regime
│  │  ├─ indoorModel.ts          # mass-balance step
│  │  ├─ routine.ts              # default routine + smart timing
│  │  ├─ ventilationWindow.ts    # best-hour logic
│  │  ├─ exposure.ts             # simulate day, meters
│  │  ├─ emissions.ts
│  │  ├─ cadr.ts
│  │  └─ index.ts
│  ├─ server/
│  │  ├─ cache.ts                # in-memory TTL LRU (for analyze + burst cache)
│  │  ├─ rateLimit.ts            # per-IP token bucket + global daily cap
│  │  ├─ openMeteo.ts            # fetch (with next.revalidate) + parse + normalize
│  │  ├─ fallback.ts             # static ES imports + nearest snapshot by haversine
│  │  ├─ gemini.ts               # call + schema + timeout + fallback
│  │  ├─ guard.ts                # domain-aware numeric guard
│  │  ├─ analyzeTemplates.ts     # deterministic causal-card fallback (all regimes & chips)
│  │  └─ briefTemplates.ts       # deterministic EN/HI brief
│  ├─ app/
│  │  ├─ layout.tsx, page.tsx, globals.css
│  │  └─ api/{air-quality,geocode,analyze,brief,health}/route.ts
│  ├─ components/                # see §13
│  ├─ hooks/                     # useAirQuality, useSimulation, useAnalyze, useUrlState
│  └─ lib/                       # formatters, city presets
├─ scripts/
│  └─ capture-fallback.ts        # M1 data spike + snapshot capture
└─ (tests colocated as *.test.ts / *.test.tsx)
```

**Dependency rule (enforce with ESLint `no-restricted-imports`):** `src/engine/` imports only `src/shared/` and itself. `src/components/` never imports `src/server/`. Only `src/server/` and `src/app/api/` read `process.env`.

---

## 5. Project bootstrap (commands)

```bash
# 1. FIRST: protect secrets before any commit
printf ".env*\n!.env.example\nnode_modules\n.next\n.vercel\ncoverage\n" > .gitignore

# 2. Scaffold Next.js App Router (TypeScript + Tailwind + ESLint + src/)
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# 3. Dependencies
npm i zod recharts @google/genai @radix-ui/react-dialog @radix-ui/react-toggle-group @radix-ui/react-slider @radix-ui/react-tooltip
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event vitest-axe prettier tsx

# 4. package.json scripts (Next.js 16 uses eslint directly, NOT next lint)
#   "lint": "eslint ."
#   "typecheck": "tsc --noEmit"
#   "test": "vitest run"
#   "build": "next build"
#   "capture": "tsx scripts/capture-fallback.ts"
```

Commit `package-lock.json` and set `"engines": { "node": ">=22" }` in `package.json`.

---

## 6. `AGENTS.md` (copy to repo root verbatim)

```markdown
# AGENTS.md: standing rules for every agent session

## Project
Next.js 16 (App Router, TS strict, deployed on Vercel) air-quality what-if simulator. Read docs/IMPLEMENTATION.md and docs/ENGINE_SPEC.md before planning. They are the source of truth.

## Hard rules
1. SECRETS: Never commit secrets. Never read process.env outside src/server/ or src/app/api/. Never call Gemini or any external API from client components. .env* is gitignored; .env.example lists variable names only.
2. INPUTS: Every API route validates input with Zod schemas in src/shared/schemas.ts. All inputs reaching Gemini are enums or bounded numbers—zero free text. Enforce request-body size caps and per-IP rate limiting on every /api route.
3. MATH ISOLATION: All exposure, ventilation-window, CADR/ACH, fingerprint, and emission math lives in pure functions in src/engine/. Gemini never computes or invents numbers. Do not alter any constant or formula without updating docs/ENGINE_SPEC.md and its fixtures. Never "fix" a failing engine test by changing expected values unless I confirm the fixture was wrong.
4. VERCEL SAFETY: Never use fs.readFileSync for runtime fallback JSON—use static ES imports from src/data/fallback/. Always export `maxDuration = 15` on /api/analyze.
5. NO GATE CHEATING: Never disable ESLint rules, add eslint-disable, use @ts-ignore/@ts-expect-error to dodge real errors, skip/delete/weaken failing tests, or loosen tsconfig. If a gate fails, fix the cause or stop and report.
6. ACCESSIBILITY: Never convey severity by color alone; always pair color with text label, icon, and number. Every chart has an adjacent data table. All controls are keyboard-operable with visible focus. Dynamic meters use aria-live="polite". Target 4.5:1 text contrast.
7. HONESTY: Label Open-Meteo data "Modeled forecast". Label fallback data "Offline snapshot, not live". Constants carry a citation or the tag "assumption".
8. VERIFICATION GATE: Before marking any milestone done, run and pass: npm run lint, npm run typecheck, npm test, npm run build. Paste the exact output.
9. SCOPE: Do not add features, dependencies, or files outside the current milestone. Ask before adding any dependency.
10. ARTIFACTS: Save each Implementation Plan and Walkthrough, and append a dated entry to PROMPT_LOG.md describing what was asked, what was produced, and what had to be corrected.

## Style
Small modules, named exports, no default exports except Next pages/routes, explicit return types on exported functions, no `any`.
```

---

## 7. Data contracts: `src/shared/schemas.ts`

```ts
import { z } from 'zod';

const num = z.number().finite();
const nullableNum = num.nullable();

export const HourSchema = z.object({
  time: z.string(),                 // local ISO "2026-11-25T14:00"
  pm25: nullableNum,
  pm10: nullableNum,
  no2: nullableNum,
  o3: nullableNum.optional(),
  co: nullableNum.optional(),
  so2: nullableNum.optional(),
  usAqi: nullableNum.optional(),
});

export const FingerprintSchema = z.object({
  ratio: nullableNum,               // mean PM2.5/PM10 over window
  regime: z.enum(['combustion', 'mixed', 'dust', 'unknown']),
  no2Level: z.enum(['low', 'moderate', 'high', 'unknown']),
});

export const AirQualityResponseSchema = z.object({
  location: z.object({
    lat: num,
    lon: num,
    name: z.string().max(80).optional(),
    timezone: z.string(),
  }),
  source: z.object({
    name: z.literal('Open-Meteo Air Quality (CAMS model)'),
    kind: z.literal('modeled'),
    fetchedAt: z.string(),
    isFallback: z.boolean(),
    snapshotDate: z.string().optional(),
  }),
  hours: z.array(HourSchema).min(24).max(72),
  fingerprint: FingerprintSchema,
});

export const HouseholdProfileSchema = z.object({
  sensitive: z.enum(['none', 'child', 'elder', 'respiratory', 'multiple']),
  roomSize: z.enum(['small', 'medium', 'large']),
  cooking: z.enum(['gas_no_exhaust', 'gas_exhaust', 'induction']),
  commuteKm: z.union([z.literal(5), z.literal(10), z.literal(20)]),
});

export const TogglesSchema = z.object({
  travel: z.enum(['solo_car', 'carpool', 'metro_walk']),
  smartTiming: z.boolean(),
  indoor: z.enum(['none', 'seal_exhaust', 'diy_box', 'hepa']),
  households: z.union([z.literal(1), z.literal(25), z.literal(100), z.literal(200)]),
});

export const EngineSummarySchema = z.object({
  baselinePctWho: num.min(0).max(5000),
  adjustedPctWho: num.min(0).max(5000),
  cigAvoided: num.min(0).max(50),
  bestHour: z.number().int().min(0).max(23),
  bestHourLabel: z.enum(['safe_window', 'least_bad', 'clean_day']),
  co2eKg: num.min(0).max(1e6),
  noxG: num.min(0).max(1e7),
});

export const AnalyzeQuestionSchema = z.enum([
  'overview',
  'why_not_plants',
  'budget_sealing',
  'sensitive_member',
]);

export const AnalyzeRequestSchema = z.object({
  cityKey: z.string().regex(/^[a-z0-9_-]{1,40}$/),
  question: AnalyzeQuestionSchema.default('overview'),
  profile: HouseholdProfileSchema,
  toggles: TogglesSchema,
  regime: FingerprintSchema.shape.regime,
  no2Level: FingerprintSchema.shape.no2Level,
  engine: EngineSummarySchema,
});

export const AnalyzeResponseSchema = z.object({
  headlineReason: z.string().max(280),
  tradeoffs: z.array(z.string().max(220)).max(3),
  nextMove: z.string().max(220),
  caveat: z.string().max(220),
  source: z.enum(['gemini', 'template']),
});

export const BriefRequestSchema = z.object({
  lang: z.enum(['en', 'hi']),
  cityName: z.string().regex(/^[\p{L}\p{N} ,.'-]{1,60}$/u),
  profile: HouseholdProfileSchema,
  toggles: TogglesSchema,
  engine: EngineSummarySchema,
  bestHourClock: z.string().regex(/^\d{2}:\d{2}$/),
});

export const BriefResponseSchema = z.object({
  text: z.string().max(1200),
  lang: z.enum(['en', 'hi']),
});

export type Hour = z.infer<typeof HourSchema>;
export type Fingerprint = z.infer<typeof FingerprintSchema>;
export type AirQualityResponse = z.infer<typeof AirQualityResponseSchema>;
export type HouseholdProfile = z.infer<typeof HouseholdProfileSchema>;
export type Toggles = z.infer<typeof TogglesSchema>;
export type EngineSummary = z.infer<typeof EngineSummarySchema>;
export type AnalyzeQuestion = z.infer<typeof AnalyzeQuestionSchema>;
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;
```

`cityName` in `BriefRequestSchema` is regex-restricted and used **only** inside the deterministic brief template—never in a Gemini prompt.

---

## 8. Engine specification (`docs/ENGINE_SPEC.md`)

### 8.1 Window and time handling
- Request Open-Meteo with `timezone=auto`, so `time` strings are local to the location.
- Build a **rolling 24-hour window** starting at the current local hour from the 48-hour response.
- Linearly interpolate isolated null hours. If $>3$ consecutive hours are null, return `{ ok: false, reason: 'insufficient_data' }` and show an error state.
- Map each hour's activity using its local hour-of-day (`0–23`).

### 8.2 Default routine (local clock)

| Hour | Activity | Exposure uses |
|---|---|---|
| 07 | Flexible outdoor hour (errand / school drop / walk); home airing | $C_{\text{out}}$ |
| 08, 20 | Cooking (indoors) | $C_{\text{in}}$ |
| 09 | Commute out | $C_{\text{out}}$ |
| 18 | Commute back | $C_{\text{out}}$ |
| All others | At home, indoors | $C_{\text{in}}$ |

State visibly in UI: *"Assumes non-commute hours are spent at home; workplace/school indoor air is not modeled."*

### 8.3 Indoor mass balance (exact per-hour step)

$$q = \frac{\text{CADR}}{V} \quad [\text{h}^{-1}], \qquad a = \lambda + k + q$$

$$C_{\text{ss}} = \frac{P \cdot \lambda \cdot C_{\text{out}} + S / V}{a} \quad [\mu\text{g/m}^3]$$

$$C_{\text{in}}[h+1] = C_{\text{ss}} + \left(C_{\text{in}}[h] - C_{\text{ss}}\right) \cdot e^{-a}$$

- $S$ is the indoor cooking source in $\mu\text{g/h}$, nonzero only during cooking hours (`08`, `20`).
- During the airing hour, $\lambda = \lambda_{\text{airing}}$. Otherwise $\lambda = \lambda_{\text{closed}}$ (or $\lambda_{\text{sealed}}$ when `indoor = 'seal_exhaust'`).
- Initial $C_{\text{in}}[0]$ equals steady state of hour 0 with $S = 0$.

### 8.4 Hand-computed fixtures (`src/engine/__fixtures__/`)

Shared parameters: $P = 0.9$, $k = 0.3\text{ h}^{-1}$, $V = 45\text{ m}^3$.

| # | Scenario | Inputs | Expected |
|---|---|---|---|
| F1 | Closed room steady state | $C_{\text{out}}=200,\; \lambda=1.0,\; \text{CADR}=0,\; S=0$ | $a=1.3,\; C_{\text{ss}} = 180/1.3 \approx 138.46$ |
| F2 | HEPA steady state | Same, $\text{CADR}=250$ | $q \approx 5.5556,\; a \approx 6.8556,\; C_{\text{ss}} \approx 26.26$ |
| F3 | One-hour step from clean | F1 with $C_{\text{in}}[0]=0$ | $C_{\text{in}}[1] = 138.4615 \cdot (1 - e^{-1.3}) \approx 100.73$ |
| F4 | Cooking source only | $C_{\text{out}}=0,\; \lambda=1.0,\; \text{CADR}=0,\; S=2000$ | $C_{\text{ss}} = (2000/45)/1.3 \approx 34.19$ |
| F5 | Meters | $\text{mean24}=60$ | $\text{pctWHO}=400,\; \text{cigEq} \approx 2.727$ |
| F6 | Cigarettes avoided | Baseline mean $90$, adjusted mean $45$ | $45/22 \approx 2.045$ |
| F7 | Emissions (real cited EFs) | `households=10`, `commuteKm=10`, `travel='metro_walk'` ($130 \to 25\text{ g CO}_2\text{e}$, $0.08 \to 0\text{ g NO}_x$) | $\text{co2eKg} = 21.0\text{ kg/day},\; \text{noxG} = 16.0\text{ g/day}$ |
| F8 | Window selection | 24 values with unique minimum at hour 14 | `bestHour = 14` |
| F9 | Window, all hazardous | $\min(C_{\text{out}}) = 180$ | `label = 'least_bad'` |
| F10 | Window, clean | $\min(C_{\text{out}}) = 20,\; \max(C_{\text{out}}) = 28$ | `label = 'clean_day'` |
| F11 | Induction + `seal_exhaust` | `cooking='induction'` ($S=400$), `indoor='seal_exhaust'` | $S_{\text{effective}} = \min(400, 800) = 400$ (never worsens to $800$) |

Property tests: higher CADR never raises $C_{\text{in}}$; as $\lambda \to \infty$, $C_{\text{in}} \to P \cdot C_{\text{out}}$; with $S=0$ and $C_{\text{out}}=0$, $C_{\text{in}}$ decays monotonically toward $0$.

### 8.5 Personal exposure and meters

$$E[h] = \begin{cases} C_{\text{in}}[h] & \text{if indoors} \\ C_{\text{out}}[h] & \text{if outdoors} \end{cases}, \qquad \text{mean24} = \frac{1}{24}\sum_{h=0}^{23} E[h]$$

$$\text{pctWHO} = \frac{\text{mean24}}{15} \times 100, \qquad \text{cigEq} = \frac{\text{mean24}}{22}, \qquad \text{cigAvoided} = \max\left(0,\; \frac{\text{baselineMean} - \text{adjustedMean}}{22}\right)$$

- Display `"N× the guideline"` when $\text{pctWHO} > 300\%$.
- Visible note: *"Time-weighted exposure concentration, not a medical inhaled dose (breathing rate and activity intensity are not modeled)."*

### 8.6 Smart timing
- Search hours `06:00–22:00` for minimum $C_{\text{out}}$ (ties resolve to earliest hour).
- When `smartTiming` is on, both the flexible outdoor hour and the airing hour move to `bestHour`.
- Label: `clean_day` if $\max(C_{\text{out}}) \le 30\,\mu\text{g/m}^3$; else `safe_window` if $\min(C_{\text{out}}) \le 60\,\mu\text{g/m}^3$ (CPCB 24-hr standard); else `least_bad`.
- Display shading span: `bestHour` plus up to one adjacent hour within 15% of the minimum.
- Never hardcode clock hours; always derive strictly from the live hourly array.

### 8.7 Indoor toggle effects

| `indoor` | $\lambda_{\text{closed}}$ ($\text{h}^{-1}$) | CADR ($\text{m}^3/\text{h}$) | Effective cooking $S$ ($\mu\text{g/h}$) |
|---|---|---|---|
| `none` | `1.0` | `0` | `profileCookingS` |
| `seal_exhaust` | `0.6` | `0` | `Math.min(profileCookingS, 800)` |
| `diy_box` | `1.0` | `200` | `profileCookingS` |
| `hepa` | `1.0` | `250` | `profileCookingS` |

The CADR drawer additionally compares HEPA ($250\text{ m}^3/\text{h}$), DIY Corsi-Rosenthal box ($200\text{ m}^3/\text{h}$), and indoor potted plants ($\approx 0\text{ m}^3/\text{h}$, included explicitly for myth-busting).

### 8.8 Emissions (community meter)

$$\Delta = \text{households} \times 2\text{ trips/day} \times \text{commuteKm} \times (\text{EF}_{\text{solo}} - \text{EF}_{\text{mode}})$$

- `carpool`: $\text{EF}_{\text{mode}} = \text{EF}_{\text{solo}} / 3$ (assumed occupancy of 3, labeled as assumption).
- `metro_walk`: $\text{EF}_{\text{mode}}$ = electric metro per-passenger-km factor.
- Headline outputs: **kg $\text{CO}_2\text{e}$/day** and **g $\text{NO}_x$/day**.
- Footnote: *"Tailpipe $\text{PM}_{2.5}$ from a car swap is small compared with road dust and biomass burning, so we headline $\text{CO}_2\text{e}$ and $\text{NO}_x$. Travel toggles affect community emissions only; in-vehicle exposure is not modeled."*
- UI label: *"Illustrative scenario: if $N$ households in your society make this swap. Not a forecast of neighborhood air quality."*

### 8.9 Constants (`src/engine/constants.ts`)
Every constant exports `{ value, unit, source }`.

| Constant | Value | Source / Status |
|---|---|---|
| WHO 24-h $\text{PM}_{2.5}$ guideline | $15\,\mu\text{g/m}^3$ | WHO Global Air Quality Guidelines (2021) |
| CPCB 24-h $\text{PM}_{2.5}$ standard | $60\,\mu\text{g/m}^3$ | India NAAQS (CPCB) |
| Cigarette equivalence | $22\,\mu\text{g/m}^3$ per cig/day | Berkeley Earth heuristic (rough rule of thumb) |
| Penetration $P$ | $0.9$ | Assumption (typical range $0.7\text{–}1.0$) |
| Deposition $k$ | $0.3\text{ h}^{-1}$ | Assumption (typical range $0.1\text{–}0.5$) |
| $\lambda$ closed / sealed / airing | $1.0 / 0.6 / 5.0\text{ h}^{-1}$ | Assumption (Indian apartment leakage varies widely) |
| Room volume S / M / L | $30 / 45 / 70\text{ m}^3$ | Assumption (e.g., $10 \times 10\text{ ft}$ to $16 \times 15\text{ ft} \times 10\text{ ft}$) |
| CADR HEPA / DIY box / plants | $250 / 200 / 0\text{ m}^3/\text{h}$ | Typical mid-size HEPA; Corsi-Rosenthal box studies; plants negligible |
| Cooking $S$: gas no exhaust / gas exhaust / induction | $2000 / 800 / 400\,\mu\text{g/h}$ | Assumption (order-of-magnitude indoor cooking emission tiers) |
| Carpool occupancy | $3$ | Assumption |
| Petrol car ($<1400\text{ cc}$, solo) $\text{CO}_2\text{e}$ | $130\text{ g/km}$ | India GHG Program (WRI India / CII / TERI, 2015) |
| Petrol car (solo) $\text{NO}_x$ | $0.08\text{ g/km}$ | ARAI / CPCB BS-IV petrol passenger car benchmark |
| Metro rail (electric) $\text{CO}_2\text{e}$ | $25\text{ g/pkm}$ | Mumbai Metro LCA (ScienceDirect, 2024; conservative upper bound) |
| Metro rail (electric) local $\text{NO}_x$ | $0\text{ g/pkm}$ | Zero urban tailpipe $\text{NO}_x$ |

**Official CPCB $\text{PM}_{2.5}$ 24-hr category bands** (always render text + icon + number, never color alone):
`0–30` Good | `31–60` Satisfactory | `61–90` Moderately Polluted | `91–120` Poor | `121–250` Very Poor | `250+` Severe.

### 8.10 Fingerprint heuristic (label as heuristic)
- $\text{PM}_{2.5}/\text{PM}_{10} \ge 0.6 \to$ `combustion`; $0.4\text{–}0.6 \to$ `mixed`; $<0.4 \to$ `dust`; missing $\to$ `unknown`.
- $\text{NO}_2$: $<25$ `low`, $25\text{–}80$ `moderate`, $>80$ `high` ($\mu\text{g/m}^3$, aligned with CPCB 24-hr standard of $80\,\mu\text{g/m}^3$).
- Note in methodology that CAMS global modeled ratios (~45 km grid outside Europe) are indicative, not street-level measurements.

---

## 9. Data layer

### 9.1 Open-Meteo Air Quality request
```text
GET https://air-quality-api.open-meteo.com/v1/air-quality
  ?latitude={lat}&longitude={lon}
  &hourly=pm2_5,pm10,nitrogen_dioxide,ozone,carbon_monoxide,sulphur_dioxide,us_aqi
  &timezone=auto&forecast_days=2
```
- **Units:** All pollutant gases/particulates returned in $\mu\text{g/m}^3$; `us_aqi` dimensionless.
- **Terms & Limits:** Free for non-commercial use (10,000 calls/day, 600/min). Requires **CC BY 4.0** attribution (`Air quality data by Open-Meteo.com`) in footer and `README.md`.

### 9.2 Geocoding
```text
GET https://geocoding-api.open-meteo.com/v1/search?name={q}&count=5&language=en&countryCode=IN
```
Return `{ name, admin1, lat, lon }[]` only. Never forward raw upstream payloads to the client.

### 9.3 Caching on Vercel
- **Open-Meteo fetch:** Round `lat` and `lon` to 2 decimal places (`lat.toFixed(2)`) **before** calling upstream, and use Next.js Data Cache: `fetch(url, { next: { revalidate: 900 } })`. This persists across serverless invocations on Vercel.
- **Analyze cache (`src/server/cache.ts`):** In-memory TTL LRU (10 min, max 200 entries) keyed by hash of `AnalyzeRequest` for warm serverless instances. Document the per-instance limitation in `README.md`.

### 9.4 Fallback snapshots (Vercel-safe ES imports)
- `scripts/capture-fallback.ts` fetches Delhi, Lucknow, Mumbai, and Bengaluru and writes normalized JSON to `src/data/fallback/*.json` with `snapshotDate`.
- `src/server/fallback.ts` imports all four files via **static ES imports** (`import delhi from '@/data/fallback/delhi.json'`) so Vercel always bundles them cleanly without filesystem errors.
- On upstream timeout (5 s), HTTP error, or Zod failure, return the nearest snapshot by haversine distance with `source.isFallback = true`.

### 9.5 M1 Data spike decision rule
Inspect the 4 captured cities: variables present, nulls, min/max $\text{PM}_{2.5}$ over 24 h, and lowest hour. Compare one city against a public CPCB reading and record the gap for `README.md`.
- If $\max/\min \ge 1.5$ with a clear low hour: lead with both smart timing and indoor levers.
- If the curve is relatively flat: keep the exact same product, shift copy emphasis to indoor defense levers (sealing, exhaust, DIY/HEPA filtration), which bend the household curve regardless.

---

## 10. API routes

| Route | Validation | Behavior |
|---|---|---|
| `GET /api/air-quality?lat&lon` | `lat` `-90..90`, `lon` `-180..180` | Round to 2 dp $\to$ rate limit $\to$ fetch with `revalidate: 900` & 5 s timeout $\to$ normalize $\to$ fingerprint $\to$ ES fallback on error |
| `GET /api/geocode?q` | 2–60 chars, regex-limited | Rate limit $\to$ proxy Open-Meteo Geocoding (`countryCode=IN`), max 5 results |
| `POST /api/analyze` | `AnalyzeRequestSchema`, body $\le$ 4 KB | `export const maxDuration = 15;` Rate limit $\to$ LRU cache $\to$ Gemini (8 s timeout) $\to$ `guardNumbers` $\to$ template fallback |
| `POST /api/brief` | `BriefRequestSchema`, body $\le$ 4 KB | Rate limit $\to$ deterministic EN/HI template |
| `GET /api/health` | none | `{ ok: true }` for deploy smoke tests |

**Error format:** `{ error: { code, message } }` with HTTP `400` (invalid), `413` (oversize), `429` (rate-limited), `502` (upstream). Never leak stack traces or upstream URLs.

### 10.1 Rate limiting (`src/server/rateLimit.ts`)
- Per-IP token bucket using the first IP in `x-forwarded-for` (populated by Vercel).
- Limits: `/api/analyze` and `/api/brief` = 10/min per IP; `/api/air-quality` and `/api/geocode` = 60/min per IP.
- Global daily Gemini cap (`GEMINI_DAILY_CAP`, default 500). Once exceeded, serve deterministic templates with `source: 'template'`.

---

## 11. Gemini layer

### 11.1 Call settings
- Server-only via `@google/genai`.
- Model from `process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'`.
- `responseMimeType: 'application/json'` with `responseSchema` matching `AnalyzeResponseSchema` (minus `source`).
- Temperature `0.3`, 8 s abort timeout, zero slow retry loops (fail fast to deterministic template so Vercel never 504s).

### 11.2 System instruction (v3, final)
```text
You explain air-quality trade-offs for an Indian household. You are given today's
pollution regime, household profile, active toggles, a specific user question type,
and pre-computed numbers. Rules:
1. Never restate the supplied numbers as the main point; the user already sees them.
2. Tailor your answer to `question`:
   - overview: explain WHY the active choices work under today's regime (combustion vs dust vs mixed) and name ONE highest-leverage next move.
   - why_not_plants: explain plainly why potted indoor plants cannot clear winter PM2.5 compared to sealing drafts or HEPA/DIY box-fan filtration.
   - budget_sealing: give 2-3 practical zero/low-cost (under INR 500) indoor smog defense steps tailored to the user's cooking & room setup.
   - sensitive_member: explain practical precautions for the household's sensitive group today without giving medical diagnoses.
3. Do not invent any new statistics, percentages, or clock times not supplied in the input.
   Prefer words ("later this afternoon") over digits.
4. Do not give medical advice or diagnoses. At most once, in `caveat`, say "consider checking with a doctor."
5. Plain, warm, non-alarmist language. Max 3 short trade-off sentences. Output JSON only.
```

### 11.3 Domain-aware numeric guard (`src/server/guard.ts`)
Strips whitelisted air-quality tokens **before** scanning for stray numbers so valid mentions of `PM2.5`, `N95`, or `CO2e` never trigger false rejections:

```ts
const DOMAIN_TOKENS =
  /\b(?:PM2\.?5|PM10|NO2|SO2|O3|CO2e?|N95|N99|24-?h(?:our)?s?|INR\s?500|₹\s?500)\b/gi;

export function guardNumbers(
  text: string,
  allowed: number[],
  allowedClock: string[],
): boolean {
  let t = text;
  // 1. Normalize Devanagari digits to ASCII
  t = t.replace(/[०-९]/g, (d) => String('०१२३४५६७८९'.indexOf(d)));
  // 2. Strip whitelisted air-quality domain tokens
  t = t.replace(DOMAIN_TOKENS, ' ');
  // 3. Remove allowed clock times
  for (const c of allowedClock) {
    t = t.split(c).join(' ');
  }
  // 4. Verify every remaining number is in the allowlist
  const nums = t.match(/\d+(?:\.\d+)?/g) ?? [];
  return nums.every((n) => allowed.some((a) => Math.abs(a - parseFloat(n)) < 0.5));
}
```
Apply to every string field of Gemini's JSON response. Any failure discards the response and serves the matching deterministic template.

### 11.4 Template fallback (`src/server/analyzeTemplates.ts`)
Deterministic responses keyed by `question` $\times$ `regime` $\times$ `bestHourLabel` (covering `overview`, `why_not_plants`, `budget_sealing`, `sensitive_member`, plus `clean_day`). Ensures the UI **never** breaks even if Gemini is down or capped.

### 11.5 Client behavior (`useAnalyze`)
Debounce 600 ms on toggle changes (immediate on quick-question chip click). Abort stale requests with `AbortController`. Never block the deterministic meters or chart on Gemini.

---

## 12. Family / RWA Brief (`src/server/briefTemplates.ts`)

Fully deterministic, built strictly from engine outputs in **English (`en`)** and **Hindi (`hi`)**. Have a fluent Hindi reader review the Hindi template before submission.

```text
Smog brief — {city} ({date})
Cleanest hour to step out or air the house: {HH:MM} ({label}).
Household plan: {indoor line}; {travel line}.
If {N} families in our society do this: ~{co2eKg} kg CO2e and ~{noxG} g NOx avoided/day (illustrative).
Data: Open-Meteo modeled forecast (not a ground sensor).
```
UI includes a 1-click **Copy** button and a `https://wa.me/?text={encodeURIComponent(text)}` share button.

---

## 13. UI specification (mobile-first, 375 px baseline)

### 13.1 Layout order (top to bottom)
1. **Header:** City chips (`Delhi NCR` default, `Lucknow`, `Mumbai`, `Bengaluru`), debounced city search, `"Use my location"` button, data badge (`Modeled forecast · Open-Meteo · Updated Xm ago`).
2. **VerdictBanner (deterministic):** Single plain-language headline from engine output.
3. **ExposureChart:** Recharts line chart (dynamically imported, `ssr: false`) with 3 series distinguished by both **dash style and color** (Outdoor air, Baseline routine, Adjusted routine), WHO ($15$) and CPCB ($60$) reference lines with labels, and shaded best window.
4. **HourlyTable:** `<details>` directly below the chart containing a semantic `<table>` with `<caption>` and headers.
5. **Three Core Toggles** (visible by default): Travel, Smart timing, Indoor defense—each showing a 1-line scope note.
6. **Two MeterCards (`aria-live="polite"`):**
   - **Household:** `% of WHO 24-hour guideline` (`N× the guideline` when $>300\%$) + `cigarettes avoided (rough rule of thumb)` with tooltip.
   - **Community:** `kg CO₂e/day` and `g NOx/day` with **RWA Scale Slider** (`1 / 25 / 100 / 200` households) and *"illustrative scenario"* caption.
7. **CausalCard:** Gemini output + **3 clickable enum quick-question chips** (*"Why not indoor plants?"*, *"Under-₹500 sealing tips"*, *"Kids & elders today"*), plus `"Overview"` chip. Shows subtle `"Rule-based explanation"` badge when `source === 'template'`.
8. **Three Drawers (Radix Dialog, bottom sheet on mobile):** Household Profile, Room CADR/ACH Reality Check, Family/RWA Brief.
9. **Footer:** `"Assumptions & methodology"` modal link, Open-Meteo CC BY 4.0 attribution, `"Not medical advice."`

### 13.2 Required states
| State | Behavior |
|---|---|
| Initial load | Skeleton $\to$ Delhi NCR with default profile; zero typing, zero permission popups |
| Geolocation | Triggered only on button click; on denial, inline message + chips remain active |
| Location label | `"Your location (28.61, 77.21)"` (no reverse geocoding needed) |
| City not found | Inline message suggesting preset cities |
| Upstream down | Banner: `"Offline snapshot from {date}. Not live data."` |
| Gemini fail/cap | Deterministic template card with `"Rule-based explanation"` badge |
| Low AQI | Clean-day verdict; toggles still work with honest small deltas |
| No safe window | `"No safe window today. Least-bad hour is HH:MM."` |
| Insufficient data | Error panel with Retry button |

### 13.3 Accessibility checklist (WCAG 2.1 AA)
- Severity = text label + icon + number (never color alone).
- Chart wrapped with `role="img"` + dynamic `aria-label` summary + adjacent `HourlyTable`.
- Visible focus rings, skip link, semantic landmarks (`header`, `main`, `footer`).
- Radix primitives for dialogs, toggles, slider, and tooltips; `lang="hi"` on Hindi brief container.
- Verified 4.5:1 text contrast; `prefers-reduced-motion` respected.

---

## 14. Security checklist

- `.gitignore` committed first; `.env.example` has variable names only; `GEMINI_API_KEY` stored in Vercel Dashboard (never committed).
- CI grep over `.next/static` fails the build if any `AIza...` key pattern leaks into the client bundle.
- Enum-only Gemini inputs, 4 KB body cap, per-IP rate limiting, daily Gemini cap.
- `next.config.ts` headers (no brittle nonce CSP middleware):

```ts
import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=()' },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default nextConfig;
```

---

## 15. Environment variables (`.env.example`)

```text
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_DAILY_CAP=500
NEXT_PUBLIC_APP_NAME=Smog Simulator
```

---

## 16. Testing plan

| Area | Tests |
|---|---|
| Engine | Fixtures F1–F11; property tests (CADR monotonic, $\lambda \to \infty$, decay); null interpolation; $>3$ missing hours $\to$ `insufficient_data`; clean-day & all-hazardous labels; rolling 24-h window |
| Fingerprint/category | CPCB band edges, ratio thresholds, missing values |
| Guard (`guard.ts`) | Domain tokens (`PM2.5`, `N95`, `CO2e`, `24-hour`) **pass**; invented percentages/numbers **rejected**; Devanagari digits normalized; non-allowlisted clock times rejected |
| Rate limit & cache | 429 after burst; per-IP isolation; daily cap falls back to template; rounded coordinate keying |
| API routes | Live schema parse; timeout $\to$ ES fallback with `isFallback: true`; 400/413/429/502 error shapes; no stack leakage |
| UI & a11y | Toggle flip updates meter text; quick-question chip triggers fetch; keyboard nav on toggles/drawers; `vitest-axe` clean on main states; data table renders; fallback banner shows |
| Manual | Real phone on live Vercel URL; allow/deny geolocation; small town search; Lighthouse mobile |

---

## 17. CI (`.github/workflows/ci.yml`)

```yaml
name: ci
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
      - name: Secret scan of client bundle
        run: |
          if grep -rE "AIza[0-9A-Za-z_-]{20,}" .next/static; then
            echo "Key pattern found in client bundle"
            exit 1
          fi
```

---

## 18. Vercel deployment

1. Connect your GitHub repository to **Vercel** (Framework Preset: `Next.js`, Node.js Version: `22.x`).
2. Add Environment Variables in **Vercel Project Settings $\to$ Environment Variables**:
   - `GEMINI_API_KEY` (Secret)
   - `GEMINI_MODEL` = `gemini-3.5-flash-lite`
   - `GEMINI_DAILY_CAP` = `500`
   - `NEXT_PUBLIC_APP_NAME` = `Smog Simulator`
3. Every push to `main` triggers an automatic production build; PRs get instant preview URLs.
4. **Post-deploy smoke test (after M4 and every major milestone):**
   - `GET /api/health` returns `{ "ok": true }`
   - `GET /api/air-quality?lat=28.61&lon=77.21` returns live Open-Meteo hours
   - Open live URL on a mobile phone, flip a toggle, click a quick-question chip, and verify zero console errors.

---

## 19. Implementation milestones (ordered, M0–M10)

One Antigravity Planning Mode session per milestone. Do not advance until all four checks (`lint`, `typecheck`, `test`, `build`) pass.

| # | Milestone | Deliverables | Exit gate |
|---|---|---|---|
| **M0** | Foundation | Repo, `.gitignore`, `AGENTS.md`, docs, CI, `eslint.config.mjs` (flat config + import rules), `next.config.ts`, Vitest smoke test | CI green on skeleton |
| **M1** | Data spike | `scripts/capture-fallback.ts`, 4 snapshots in `src/data/fallback/`, variance & ground-truth notes | Findings logged in `PROMPT_LOG.md` |
| **M2** | Engine & fixtures | `src/shared/schemas.ts` + `src/engine/*` + Vitest tests for F1–F11 & property tests | All engine tests green |
| **M3** | Live data routes | `/api/air-quality` (with `revalidate: 900` + ES fallback), `/api/geocode`, `/api/health`, rate limiter | API & fallback tests green |
| **M4** | Vertical slice + Vercel deploy | Minimal page (city chips, ExposureChart + HourlyTable, 2 toggles, Household meter) deployed live to Vercel | Live Vercel URL works on phone |
| **M5** | Guarded AI & brief | `/api/analyze` (`maxDuration = 15`), `/api/brief`, `gemini.ts`, `guard.ts`, templates for all 4 question chips, `useAnalyze` | Guard, 429, 413, and fallback tests green |
| **M6** | Hero UI | VerdictBanner, full 3-series chart, 3 toggles, both meters, RWA Scale Slider, CausalCard + 3 quick-question chips, mobile layout | Clean at 375 px; zero console errors |
| **M7** | Drawers & a11y | Profile, CADR/ACH, Brief drawers, AssumptionsModal, all §13.2 edge states, geolocation, search, `vitest-axe` tests | `vitest-axe` clean; keyboard pass |
| **M8** | Hardening | Small towns, timeouts, malformed JSON, low AQI, no-window, Hindi review by fluent reader; optional URL state | All §16 & §13.2 cases pass |
| **M9** | Docs & Stage 3 proof | `README.md` (§21), `PROMPT_LOG.md` (§22), architecture diagram, manual 60 s demo recording, LinkedIn draft | Docs & video complete |
| **M10** | Release | Full live-URL verification of every button/drawer on desktop + phone, submit | Submitted |

---

## 20. Antigravity prompts (paste one per milestone)

**Session preamble (prepend to every milestone):**
```text
Read AGENTS.md, docs/IMPLEMENTATION.md, and docs/ENGINE_SPEC.md first. Work only on the
milestone below. Produce an Implementation Plan before coding. Do not add dependencies
without asking. Run npm run lint, npm run typecheck, npm test, and npm run build before
reporting done, and paste the output.
```

- **M0:** `"Scaffold per IMPLEMENTATION.md §4–5, §14, and §17: Next.js 16 TypeScript app, eslint.config.mjs with no-restricted-imports enforcing §4, next.config.ts security headers, .github/workflows/ci.yml, and Vitest setup with one passing smoke test. No features."`
- **M1:** `"Write scripts/capture-fallback.ts calling Open-Meteo Air Quality for Delhi, Lucknow, Mumbai, and Bengaluru. Save normalized JSON to src/data/fallback/ with snapshotDate, and print per-city variables, null counts, 24-h PM2.5 min/max/ratio, and lowest hour. Do not invent data."`
- **M2:** `"Implement src/shared/schemas.ts (§7) and src/engine/* exactly per ENGINE_SPEC.md (§8), with Vitest tests covering fixtures F1–F11 and property tests. Do not alter constants or fixtures. If any fixture disagrees, stop and report."`
- **M3:** `"Implement src/server/openMeteo.ts (rounded coords + next.revalidate 900), fallback.ts (static ES imports from src/data/fallback/), rateLimit.ts, and /api/air-quality, /api/geocode, /api/health per §9–10. Add tests for rounded caching, timeout fallback, and error shapes."`
- **M4:** `"Build a minimal vertical slice page: city chips, ExposureChart (dynamic import, ssr:false) with HourlyTable, Travel and Indoor toggles, and Household meter wired to the client engine. Verify npm run build passes cleanly for Vercel deployment."`
- **M5:** `"Implement /api/analyze (with export const maxDuration = 15), /api/brief, gemini.ts (gemini-3.5-flash-lite), domain-aware guard.ts, analyzeTemplates.ts (covering all 4 question chips), briefTemplates.ts (EN/HI), and useAnalyze per §10–12. Add tests proving PM2.5/N95/CO2e pass the guard while invented numbers are rejected, plus malformed JSON, timeout, 429, and 413."`
- **M6:** `"Complete the mobile-first hero UI per §13.1 (items 1–7) using Radix primitives. Build VerdictBanner from engine output only, distinguish chart lines by dash style + color, and add the 3 clickable enum quick-question chips inside CausalCard."`
- **M7:** `"Implement ProfileDrawer, CadrDrawer, BriefDrawer, AssumptionsModal, all edge states in §13.2, and the WCAG 2.1 AA checklist in §13.3. Add vitest-axe tests for main UI states."`
- **M8:** `"Audit against §16 and §13.2 (small towns, denied geolocation, low AQI, upstream timeout, malformed Gemini JSON). List failing cases, fix them, and do not add new features."`
- **M9:** `"Generate README.md from §21 using exact file paths and real measured test/Lighthouse results. Do not claim any unmeasured metric."`

**Browser verification prompt (M6–M10):**
`"Open the live Vercel preview on a 375 px mobile viewport. Load Delhi NCR, flip each toggle, verify the curve and meters update, click each quick-question chip in CausalCard, open every drawer, deny geolocation, search a small town, and report any console errors with screenshots."`

---

## 21. README template (`README.md`)

1. **What it is:** Two crisp sentences + mobile/desktop screenshot.
2. **Live Vercel URL** + 60-second demo video link.
3. **Challenge 6 traceability table** (§1.1).
4. **Architecture:** Diagram + data-flow summary (*browser fetches 48 h forecast via server proxy, pure TS engine runs client-side in <1 ms, Gemini runs server-side with numeric guard*).
5. **Deterministic math vs. GenAI:** What code computes, what Gemini explains (overview + 3 quick-question chips), and how `guardNumbers()` + template fallback prevent hallucinations.
6. **Methodology & assumptions:** Constants table with citations, explicit *"What we don't model"* list, and CAMS modeled-data (~45 km grid) vs. CPCB ground-station note.
7. **Security & reliability:** Vercel env secrets, client-bundle secret scan, enum-only Gemini inputs, rate limits, `revalidate: 900` caching, ES-bundled fallback snapshots.
8. **Accessibility:** WCAG 2.1 AA measures and `vitest-axe` test results.
9. **Testing & Lighthouse:** Commands + real measured scores.
10. **Local setup:** `npm ci`, `.env.local`, `npm run dev`, `npm test`.
11. **Attribution:** Open-Meteo (CC BY 4.0), WHO (2021), CPCB, Berkeley Earth, India GHG Program (2015), ARAI/CPCB, Mumbai Metro LCA (2024).

---

## 22. `PROMPT_LOG.md` template (Stage 3 evidence)

```markdown
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
### YYYY-MM-DD — M<n>
- Asked:
- Agent produced:
- What I had to correct (include real bugs/failures):
- Artifacts kept: <plan / walkthrough / screenshot>

## Key lessons
1.
2.
3.
```

---

## 23. Risk register

| Risk | Detection | Response |
|---|---|---|
| Hourly curve is flat | M1 variance check | Keep product; emphasize indoor levers (sealing, exhaust, DIY/HEPA) |
| Modeled data differs from CPCB ground sensors | M1 manual spot-check | Show `"Modeled forecast"` badge and explain ~45 km CAMS grid in README |
| `guardNumbers()` false-rejects `PM2.5` / `N95` | M5 unit tests | Fixed via `DOMAIN_TOKENS` allowlist in §11.3 |
| Vercel drops fallback JSON files | M4 deploy test | Prevented by static ES imports in `src/server/fallback.ts` |
| Vercel 504 timeout on slow Gemini call | M5 load test | Prevented by `maxDuration = 15`, 8 s abort timeout, fast template fallback |
| Agent weakens ESLint/tests to pass gate | Milestone diff review | Reject per `AGENTS.md` rule 5 |
| Gemini quota exhausted by bots/judges | Daily cap logs | `GEMINI_DAILY_CAP` switches cleanly to deterministic templates |
| Hindi template reads awkwardly | M8 fluent-reader review | Edit static strings in `briefTemplates.ts` |

---

## 24. Definition of done (final checklist)

- [ ] Live Vercel URL loads Delhi NCR with verdict + bending curve in <15 s on a phone (zero login, zero typing)
- [ ] Every button, toggle, quick-question chip, and drawer works live with zero console errors
- [ ] Data badge says `"Modeled forecast"` (with Open-Meteo CC BY 4.0 attribution); offline fallback banner verified
- [ ] Engine tests match F1–F11; `guardNumbers()` passes `PM2.5`/`N95` and rejects invented numbers; API/429/413 tests pass
- [ ] `npm run lint`, `typecheck`, `test`, and `build` all pass in GitHub Actions CI
- [ ] Zero secrets in git history or `.next/static`
- [ ] `vitest-axe` clean; keyboard walkthrough passed; chart has adjacent `HourlyTable`
- [ ] All constants cited (including real Indian vehicle EFs—no F7 placeholders)
- [ ] Hindi brief reviewed by a fluent reader
- [ ] `README.md` and `PROMPT_LOG.md` finalized with real measured results and failures
- [ ] Manual 60-second demo recorded and LinkedIn Build-in-Public post published