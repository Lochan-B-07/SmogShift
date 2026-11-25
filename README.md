# SmogShift — Exposure Budget & Causal What-If Simulator

**Google PromptWars Virtual — Challenge 6 (Urban Air Quality Assistant)**

A mobile-first urban air-quality what-if simulator that turns live hourly $\text{PM}_{2.5}$ forecasts into a personal 24-hour exposure curve. Flip three everyday household and commuting choices to watch your exposure curve, WHO guideline meter, and society emissions change in milliseconds—paired with a grounded Gemini causal explainer and interactive quick-question chips.

* **Live Deployment:** https://smog-shift.vercel.app/
* **Demo Video (60s):** *(Add link after recording your mobile/desktop walkthrough)*

---

## Challenge 6 Traceability

| Challenge 6 Requirement | Feature | Primary Source Files |
|---|---|---|
| Personalized recommendations (location, household, lifestyle) | Household profile drawer (enums), city chips/search/geolocation, profile-aware Gemini card & quick-question chips | `src/components/drawers/ProfileDrawer.tsx`, `src/components/controls/CausalCard.tsx`, `src/server/gemini.ts` |
| Low-emission daily routines | Travel toggle (`solo_car` / `carpool` / `metro_walk`), Smart Timing toggle, RWA scale slider (`1 / 25 / 100 / 200`) | `src/engine/emissions.ts`, `src/components/controls/ToggleGroup.tsx`, `src/components/controls/MeterCards.tsx` |
| Indoor air quality hacks | Indoor defense toggle (`seal_exhaust` / `diy_box` / `hepa`), CADR/ACH comparison drawer, cooking profile | `src/engine/indoorModel.ts`, `src/engine/cadr.ts`, `src/components/drawers/CadrDrawer.tsx` |
| Real-time data integration | Open-Meteo Air Quality hourly (modeled) proxy with `revalidate: 900` and labeled static ES fallback | `src/server/openMeteo.ts`, `src/server/fallback.ts`, `src/app/api/air-quality/route.ts` |
| User-friendly location UX | Preset city chips, debounced Indian city search, on-click `"Use my location"` | `src/components/layout/Header.tsx`, `src/app/api/geocode/route.ts` |
| Justification of action | Grounded `CausalCard` + 4 enum quick-question chips, `AssumptionsModal`, `docs/ENGINE_SPEC.md` | `src/components/controls/CausalCard.tsx`, `src/components/drawers/AssumptionsModal.tsx`, `docs/ENGINE_SPEC.md` |

---

## Architecture & Data Flow

```mermaid
flowchart LR
  U["Mobile / Desktop Browser"] -->|GET /api/air-quality| AQ["Open-Meteo Proxy (revalidate: 900)"]
  AQ -->|Live 48h CAMS forecast| U
  AQ -->|Timeout / HTTP error| FB["Static ES Fallback (4 Indian cities)"]
  U -->|"< 1 ms pure TS simulation"| ENG["src/engine/* (Mass Balance + Emissions)"]
  U -->|POST /api/analyze (enums + summary only)| AN["Gemini 3.5 Flash-Lite + guardNumbers()"]
  AN -->|Pass numeric guard| U
  AN -->|Cap / Timeout / Guard reject| TPL["Deterministic Templates"]
```

1. **Data Layer:** The browser fetches a normalized 48-hour forecast via `/api/air-quality` (coordinates rounded to 2 decimal places before calling Open-Meteo, cached with `next: { revalidate: 900 }`, falling back to nearest ES-imported city snapshot on error).
2. **Client Simulation:** Pure TypeScript functions in `src/engine/` build the rolling 24-hour window in the location's local timezone and recompute indoor mass balance, best airing hour, WHO guideline percentage, and community emissions in `< 1 ms` on every toggle flip.
3. **Server GenAI Explainer:** `/api/analyze` (`maxDuration = 15`) accepts **only enums and bounded numbers** (zero free text), checks an in-memory 10-minute LRU cache, enforces per-IP rate limits and a daily quota, calls Gemini (`gemini-3.5-flash-lite`), and validates every response field with `guardNumbers()` before returning to the client.

---

## Deterministic Math vs. GenAI

| Responsibility | Handled By | Why |
|---|---|---|
| Indoor/outdoor mass balance, `06:00–22:00` airing window, WHO `%`, cigarettes avoided, $\text{CO}_2\text{e}$ & $\text{NO}_x$ | `src/engine/*` (pure TypeScript) | Reproducible, sub-millisecond UI updates, verified against hand-computed fixtures `F1–F11` |
| Causal trade-off synthesis (`Overview`, `Why not indoor plants?`, `Under-₹500 sealing tips`, `Kids & elders today`) | `src/server/gemini.ts` + `src/server/guard.ts` | Natural-language reasoning grounded in regime (`combustion`/`mixed`/`dust`), profile, and active toggles; `guardNumbers()` rejects invented digits and falls back to `src/server/analyzeTemplates.ts` |
| Shareable English & Hindi Family/RWA Brief | `src/server/briefTemplates.ts` (`/api/brief`) | Deterministic bilingual output with 1-click Copy and WhatsApp share |

---

## Methodology, Constants & Limitations

Full formulas and fixtures `F1–F11` are documented in [docs/ENGINE_SPEC.md](docs/ENGINE_SPEC.md) and inside the app's **Assumptions & methodology** modal (`src/components/drawers/AssumptionsModal.tsx`).

* **What we explicitly do NOT model:** Workplace/school indoor air quality (non-commute hours assume home), in-vehicle cabin exposure, breathing-rate/exertion dose, medical diagnosis, or boundary-layer feedbacks from individual household travel choices.
* **Modeled data vs. ground sensors:** Open-Meteo provides Copernicus CAMS regional forecasts (~45 km grid outside Europe), labeled `"Modeled forecast"` in-app—not street-level CPCB sensor measurements. Offline snapshots are labeled `"Offline snapshot from {date}. Not live data."`

---

## Security & Reliability

* **Secret Isolation:** `GEMINI_API_KEY` is read exclusively in `src/server/gemini.ts`. ESLint enforces import boundaries (`src/engine/` pure; `src/components/` never imports `src/server/`; `process.env` disallowed outside `src/server/` and `src/app/api/`). CI scans `.next/static` for `AIza...` patterns.
* **Input & Abuse Controls:** Zod schemas (`src/shared/schemas.ts`) validate every API route; `/api/analyze` and `/api/brief` enforce a 4 KB body cap (`413`), `10/min` per-IP rate limiting (`429`), and `GEMINI_DAILY_CAP` (`500`/day default) before gracefully falling back to deterministic templates.
* **Vercel Safety:** Fallback city JSONs (`src/data/fallback/*.json`) use static ES imports in `src/server/fallback.ts` (never `fs.readFileSync`), and `/api/analyze` exports `maxDuration = 15`.

---

## Accessibility (WCAG 2.1 AA)

* Severity never relies on color alone (CPCB bands pair color, SVG icon, text label, and numeric range).
* Chart lines differ by both dash style and color, wrapped with `role="img"` + dynamic `aria-label` and paired with an adjacent `HourlyTable` (`<details>` + semantic `<table>`).
* Radix UI primitives (`Dialog`, `ToggleGroup`, `Slider`, `Tooltip`), skip link, `aria-live="polite"` meters, `lang="hi"` on Hindi brief text, and `prefers-reduced-motion` support.
* Audited with `vitest-axe` (`0` violations on main rendered state).

---

## Verification & Measured Test Results

| Check | Command | Measured Result |
|---|---|---|
| Linter | `npm run lint` | Passed (`0` errors, `0` warnings) |
| TypeScript | `npm run typecheck` | Passed (`tsc --noEmit`, `0` errors) |
| Unit, Guard, API & A11y Tests | `npm test` | Passed (`6` test files, `57` tests including fixtures `F1–F11`, `guardNumbers()`, rate limits, and `vitest-axe`) |
| Production Build | `npm run build` | Passed (Next.js `16.4.6` Turbopack) |
| Client Bundle Secret Scan | CI `grep` on `.next/static` | Clean (`0` leaked key patterns) |

*(Lighthouse mobile score to be recorded manually against `https://smog-shift.vercel.app/` before submission.)*

---

## Local Setup

**Requirements:** Node.js `>=22` and npm.

```bash
# 1. Install dependencies
npm ci

# 2. Configure environment variables
cp .env.example .env.local
# Set GEMINI_API_KEY in .env.local (optional; templates work without a key)

# 3. Start local dev server
npm run dev

# 4. Run full verification suite
npm run lint && npm run typecheck && npm test && npm run build
```

---

## Attribution

* **Air Quality & Geocoding Data:** [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0)
* **Guidelines & Emission Factors:** WHO Global Air Quality Guidelines (2021), India NAAQS (CPCB), Berkeley Earth cigarette-equivalence heuristic, India GHG Program (WRI India / CII / TERI, 2015), ARAI / CPCB BS-IV, Mumbai Metro LCA (ScienceDirect, 2024).
