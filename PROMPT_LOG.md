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

## Key lessons
1.
2.
3.
