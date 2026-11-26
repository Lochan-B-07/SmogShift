'use client';

import type { ReactElement } from 'react';
import { describeIndoorDefense, describeSensitiveGroup } from '@/lib/formatters';
import type {
  AnalyzeQuestion,
  AnalyzeResponse,
  Fingerprint,
  HouseholdProfile,
  Toggles,
} from '@/shared/schemas';

export interface CausalCardProps {
  readonly question: AnalyzeQuestion;
  readonly analysis: AnalyzeResponse | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly stale?: boolean;
  readonly regime: Fingerprint['regime'];
  readonly profile: HouseholdProfile;
  readonly toggles: Toggles;
  readonly onSelectQuestion: (q: AnalyzeQuestion) => void;
  readonly onExplainPlan?: () => void;
}

const QUESTION_CHIPS: readonly { readonly value: AnalyzeQuestion; readonly label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'why_not_plants', label: 'Why not indoor plants?' },
  { value: 'budget_sealing', label: 'Under-₹500 sealing tips' },
  { value: 'sensitive_member', label: 'Kids & elders today' },
  { value: 'commute_mask', label: 'Best commute & mask plan' },
  { value: 'cooking_impact', label: 'Cooking fumes & exhaust' },
];

export function CausalCard({
  question,
  analysis,
  loading,
  error,
  stale = false,
  regime,
  profile,
  toggles,
  onSelectQuestion,
  onExplainPlan,
}: CausalCardProps): ReactElement {
  return (
    <section
      aria-live="polite"
      aria-label="AI Causal Advisor and household Q&A"
      className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50/70 via-white to-white p-4 shadow-sm dark:border-teal-900/70 dark:from-teal-950/40 dark:via-zinc-900 dark:to-zinc-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-teal-800 text-white dark:bg-teal-600"
          >
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current">
              <path d="M10 2a.75.75 0 0 1 .72.54l1.06 3.7 3.7 1.06a.75.75 0 0 1 0 1.44l-3.7 1.06-1.06 3.7a.75.75 0 0 1-1.44 0l-1.06-3.7-3.7-1.06a.75.75 0 0 1 0-1.44l3.7-1.06 1.06-3.7A.75.75 0 0 1 10 2Z" />
            </svg>
          </span>
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">AI Causal Advisor</h2>
            <p className="text-[11px] text-zinc-700 dark:text-zinc-300">
              Grounded in {regime} regime · {describeSensitiveGroup(profile.sensitive)} ·{' '}
              {describeIndoorDefense(toggles.indoor)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading && analysis ? (
            <span className="text-xs font-medium text-teal-800 dark:text-teal-300" role="status">
              Updating...
            </span>
          ) : null}
          {onExplainPlan ? (
            <button
              type="button"
              onClick={onExplainPlan}
              disabled={loading}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 disabled:opacity-50 ${
                stale
                  ? 'bg-teal-800 text-white hover:bg-teal-900 dark:bg-teal-600 dark:hover:bg-teal-500'
                  : 'border border-teal-700 bg-white text-teal-900 hover:bg-teal-50 dark:border-teal-600 dark:bg-zinc-800 dark:text-teal-200 dark:hover:bg-zinc-700'
              }`}
            >
              Explain this plan
            </button>
          ) : null}
          {analysis ? (
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                analysis.source === 'gemini'
                  ? 'border-teal-300 bg-teal-100/80 text-teal-950 dark:border-teal-700 dark:bg-teal-900/70 dark:text-teal-100'
                  : 'border-zinc-300 bg-zinc-100 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
              }`}
            >
              {analysis.source === 'gemini' ? 'Powered by Gemini' : 'Rule-based explanation'}
            </span>
          ) : null}
        </div>
      </div>

      <div role="group" aria-label="Ask a follow-up question" className="mt-3 flex flex-wrap gap-2">
        {QUESTION_CHIPS.map((chip) => {
          const active = chip.value === question;
          return (
            <button
              key={chip.value}
              type="button"
              aria-pressed={active}
              onClick={() => onSelectQuestion(chip.value)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 ${
                active
                  ? 'bg-teal-800 text-white shadow-xs dark:bg-teal-600'
                  : 'border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {stale ? (
        <p
          role="status"
          className="mt-2.5 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-1.5 text-xs font-medium text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        >
          Settings updated — click &ldquo;Explain this plan&rdquo; to refresh the AI explanation for
          your new choices.
        </p>
      ) : null}

      {loading && !analysis ? (
        <p className="mt-3 text-xs text-zinc-700 dark:text-zinc-300">
          Generating causal explanation...
        </p>
      ) : error && !analysis ? (
        <p className="mt-3 text-xs text-amber-900 dark:text-amber-300">{error}</p>
      ) : analysis ? (
        <div className={`mt-3.5 space-y-2.5 ${loading ? 'opacity-70' : ''}`}>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {analysis.headlineReason}
          </p>
          <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-zinc-800 dark:text-zinc-200">
            {analysis.tradeoffs.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="rounded-lg border-l-4 border-teal-700 bg-teal-50/80 px-3 py-2 text-xs font-semibold text-teal-950 dark:border-teal-400 dark:bg-teal-950/50 dark:text-teal-100">
            Recommended next move: {analysis.nextMove}
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">{analysis.caveat}</p>
        </div>
      ) : null}
    </section>
  );
}
