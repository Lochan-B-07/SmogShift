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
