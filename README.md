# SmogShift — Exposure Budget & Causal What-If Simulator

**Google PromptWars Virtual — Challenge 6 (Urban Air Quality Assistant)**

A mobile-first urban air-quality what-if simulator that turns live hourly $\text{PM}_{2.5}$ forecasts into a personal 24-hour exposure curve. Flip everyday household and commuting choices to see the exposure curve, health meter, and neighborhood emissions shift instantly—paired with a grounded Gemini causal explainer and interactive quick-question chips.

> **Status:** Milestone **M0 (Foundation)** complete. Live Vercel URL, 60-second demo video, and measured test/Lighthouse metrics will be added in **M4** and **M9** (see [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md)).

---

## Challenge 6 Traceability

| Challenge 6 Requirement | Planned Feature | Primary Target Modules |
|---|---|---|
| Personalized recommendations | Household profile drawer (enums), city/geolocation, profile-aware Gemini card & chips | `src/components/ProfileDrawer.tsx`, `src/components/CausalCard.tsx`, `src/server/gemini.ts` |
| Low-emission daily routines | Travel toggle (`solo_car` / `carpool` / `metro_walk`), smart timing toggle, RWA scale slider | `src/engine/emissions.ts`, `src/components/ToggleGroup.tsx` |
| Indoor air quality hacks | Indoor defense toggle (`seal_exhaust` / `diy_box` / `hepa`), CADR/ACH drawer, cooking profile | `src/engine/indoorModel.ts`, `src/engine/cadr.ts` |
| Real-time data integration | Open-Meteo Air Quality hourly (modeled) proxy with `revalidate: 900` & static fallback | `src/server/openMeteo.ts`, `src/app/api/air-quality/route.ts` |
| User-friendly location UX | City preset chips, debounced Indian city search, on-click browser geolocation | `src/components/Header/*`, `src/app/api/geocode/route.ts` |
| Justification of action | Grounded `CausalCard` + quick-question chips, assumptions modal, engine methodology | `src/components/CausalCard.tsx`, [docs/ENGINE_SPEC.md](docs/ENGINE_SPEC.md) |

---

## Architecture & Core Design

* **Deterministic Math vs. GenAI:** All exposure mass-balance, ventilation-window selection, CADR/ACH, pollution fingerprinting, and emission calculations live in pure TypeScript functions (`src/engine/`). Gemini (`gemini-3.5-flash-lite`) runs strictly server-side with enum/bounded-number inputs only—never computing or inventing numbers—protected by a domain-aware numeric guard (`guardNumbers()`) and deterministic template fallbacks.
* **Security & Vercel Readiness:** Secrets stay strictly server-side (`src/server/`, `src/app/api/`), inputs are validated via shared Zod schemas (`src/shared/schemas.ts`), API routes enforce body caps and per-IP rate limiting, fallback snapshots use static ES imports (no `fs.readFileSync`), and CI scans `.next/static` for leaked key patterns.
* **Accessibility (WCAG 2.1 AA):** Severity never relies on color alone (always paired with text label, icon, and number), charts pair with semantic data tables, dynamic meters use `aria-live="polite"`, and Radix UI primitives provide keyboard/focus support.

---

## Repository Structure

```text
/
├─ AGENTS.md                     # Standing rules and verification gates for AI sessions
├─ PROMPT_LOG.md                 # Stage 3 tool-usage & prompt-evolution log
├─ README.md
├─ docs/
│  ├─ COMPETITION_GUIDE.md       # PromptWars Virtual Challenge 6 rules & judging rubric
│  ├─ IMPLEMENTATION.md          # End-to-end architecture & M0–M10 milestone plan
│  └─ ENGINE_SPEC.md             # Locked physics, constants, and hand-verified fixtures (F1–F11)
├─ .github/workflows/ci.yml      # GitHub Actions: lint, typecheck, test, build, bundle secret scan
├─ .env.example                  # Required environment variable names (no secrets)
├─ eslint.config.mjs             # ESLint 9 flat config + import/env boundary rules
├─ next.config.ts                # Next.js 16 config + security headers
├─ vitest.config.mts             # Vitest + jsdom test runner config
└─ src/
   └─ app/                       # Next.js App Router entrypoints & M0 smoke test
```

*(Target modules `src/shared/`, `src/engine/`, `src/server/`, `src/data/fallback/`, `src/components/`, `src/hooks/`, and `scripts/` are added incrementally across Milestones M1–M8.)*

---

## Local Setup & Verification

**Requirements:** Node.js `>=22` and npm.

```bash
# 1. Install dependencies
npm ci

# 2. Configure local environment variables (optional until M5 Gemini integration)
cp .env.example .env.local

# 3. Run development server
npm run dev

# 4. Run full verification gate
npm run lint
npm run typecheck
npm test
npm run build
```

---

## Attribution

* **Air Quality & Geocoding Data:** [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0) — modeled CAMS forecast, labeled in-app as *"Modeled forecast"*.
* **Guidelines & Benchmarks:** WHO Global Air Quality Guidelines (2021), India NAAQS (CPCB), Berkeley Earth cigarette-equivalence heuristic, India GHG Program (WRI India / CII / TERI, 2015), ARAI / CPCB BS-IV, Mumbai Metro LCA (ScienceDirect, 2024).
