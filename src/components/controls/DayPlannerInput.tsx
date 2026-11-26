'use client';

import { useState, type KeyboardEvent, type ReactElement, type RefObject } from 'react';
import { PLANDAY_EXAMPLES, type PlanDayExample } from '@/data/planday-examples';

export interface DayPlannerInputProps {
  readonly loading: boolean;
  readonly error: string | null;
  readonly textareaRef?: RefObject<HTMLTextAreaElement | null>;
  readonly onSubmitText: (text: string) => void;
  readonly onSelectExample: (example: PlanDayExample) => void;
}

const MAX_CHARS = 400;

export function DayPlannerInput({
  loading,
  error,
  textareaRef,
  onSubmitText,
  onSelectExample,
}: DayPlannerInputProps): ReactElement {
  const [text, setText] = useState<string>('');

  function handleSubmit(): void {
    if (loading || text.trim().length < 5) return;
    onSubmitText(text);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>): void {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <section
      aria-label="Tell me your day planner"
      className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50/80 via-white to-white p-4 shadow-sm dark:border-teal-900/70 dark:from-teal-950/40 dark:via-zinc-900 dark:to-zinc-900"
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
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
              Tell me your day
            </h2>
            <p className="text-[11px] text-zinc-700 dark:text-zinc-300">
              Describe your commute, cooking, or family in English or Hinglish — we&apos;ll map it
              to the simulator.
            </p>
          </div>
        </div>
        <span className="rounded-full border border-teal-300 bg-teal-100/80 px-2.5 py-0.5 text-[11px] font-semibold text-teal-950 dark:border-teal-700 dark:bg-teal-900/70 dark:text-teal-100">
          Gemini AI Planner
        </span>
      </div>

      <div className="mt-3">
        <label htmlFor="day-planner-input" className="sr-only">
          Describe your daily schedule
        </label>
        <textarea
          ref={textareaRef}
          id="day-planner-input"
          rows={2}
          maxLength={MAX_CHARS}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g., Dropping my 7-year-old to school on a scooter at 7:30, cooking lunch on gas, want to walk at 6 PM. No purifier."
          className="w-full resize-none rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-500 focus:border-teal-700 focus:outline-2 focus:outline-teal-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400"
        />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Example daily schedules">
          <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">Try:</span>
          {PLANDAY_EXAMPLES.map((example) => (
            <button
              key={example.id}
              type="button"
              onClick={() => {
                setText(example.prompt);
                onSelectExample(example);
              }}
              className="rounded-full border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-800 transition hover:bg-teal-50 focus:outline-2 focus:outline-offset-1 focus:outline-teal-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              {example.shortLabel}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
            {text.length}/{MAX_CHARS}
          </span>
          <button
            type="button"
            disabled={loading || text.trim().length < 5}
            aria-busy={loading}
            onClick={handleSubmit}
            className="rounded-lg bg-teal-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-teal-900 focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            {loading ? 'Planning...' : 'Build my plan →'}
          </button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-xs font-medium text-amber-900 dark:text-amber-300">
          {error}
        </p>
      ) : null}
    </section>
  );
}
