'use client';

import type { ReactElement } from 'react';
import type { AnalyzeQuestion, AnalyzeResponse } from '@/shared/schemas';

export interface CausalCardProps {
  readonly question: AnalyzeQuestion;
  readonly analysis: AnalyzeResponse | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly onSelectQuestion: (q: AnalyzeQuestion) => void;
}

const QUESTION_CHIPS: readonly { readonly value: AnalyzeQuestion; readonly label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'why_not_plants', label: 'Why not indoor plants?' },
  { value: 'budget_sealing', label: 'Under-₹500 sealing tips' },
  { value: 'sensitive_member', label: 'Kids & elders today' },
];

export function CausalCard({
  question,
  analysis,
  loading,
  error,
  onSelectQuestion,
}: CausalCardProps): ReactElement {
  return (
    <section
      aria-live="polite"
      aria-label="Causal explanation and household Q&A"
      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-900">Why these choices work</h2>
        {analysis ? (
          <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-800">
            {analysis.source === 'template' ? 'Rule-based explanation' : 'Gemini causal summary'}
          </span>
        ) : null}
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
              className={`rounded-full px-3 py-1 text-xs font-semibold transition focus:outline-2 focus:outline-offset-2 focus:outline-teal-800 ${
                active
                  ? 'bg-teal-800 text-white'
                  : 'border border-zinc-300 bg-zinc-50 text-zinc-800 hover:bg-zinc-100'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {loading && !analysis ? (
        <p className="mt-3 text-xs text-zinc-700">Generating causal explanation...</p>
      ) : error && !analysis ? (
        <p className="mt-3 text-xs text-amber-900">{error}</p>
      ) : analysis ? (
        <div className={`mt-3 space-y-2 ${loading ? 'opacity-70' : ''}`}>
          <p className="text-sm font-medium text-zinc-900">{analysis.headlineReason}</p>
          <ul className="list-disc space-y-1 pl-5 text-xs text-zinc-800">
            {analysis.tradeoffs.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="text-xs font-semibold text-teal-900">Next move: {analysis.nextMove}</p>
          <p className="text-xs text-zinc-600">{analysis.caveat}</p>
        </div>
      ) : null}
    </section>
  );
}
