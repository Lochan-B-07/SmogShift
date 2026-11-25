import type { ReactElement } from 'react';

export default function Home(): ReactElement {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-wider text-zinc-500">
        PromptWars Virtual · Challenge 6
      </p>
      <h1 className="text-3xl font-bold tracking-tight">
        SmogShift — Exposure Budget &amp; Causal What-If Simulator
      </h1>
      <p className="text-base text-zinc-600 dark:text-zinc-400">
        Foundation (M0) ready. Live Open-Meteo data integration, exposure physics engine, and
        grounded Gemini explainer will be rolled out across Milestones M1–M8.
      </p>
    </main>
  );
}
