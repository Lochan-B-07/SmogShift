'use client';

import { useEffect, useState, type ReactElement } from 'react';
import { formatClockHour } from '@/lib/formatters';
import {
  BriefResponseSchema,
  type BriefRequest,
  type EngineSummary,
  type HouseholdProfile,
  type Toggles,
} from '@/shared/schemas';
import { DrawerShell } from './DrawerShell';

export interface BriefDrawerProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly cityName: string;
  readonly profile: HouseholdProfile;
  readonly toggles: Toggles;
  readonly engine: EngineSummary;
}

function sanitizeCityName(raw: string): string {
  const cleaned = raw
    .replace(/[^a-zA-Z0-9\p{L} ,.'-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return (cleaned || 'Your location').slice(0, 60);
}

export function BriefDrawer({
  open,
  onOpenChange,
  cityName,
  profile,
  toggles,
  engine,
}: BriefDrawerProps): ReactElement {
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [briefText, setBriefText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    let active = true;

    async function loadBrief(): Promise<void> {
      setLoading(true);
      setError(null);
      setCopied(false);

      const payload: BriefRequest = {
        lang,
        cityName: sanitizeCityName(cityName),
        profile,
        toggles,
        engine,
        bestHourClock: formatClockHour(engine.bestHour),
      };

      try {
        const res = await fetch('/api/brief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: unknown = await res.json();
        const parsed = BriefResponseSchema.parse(json);
        if (active) {
          setBriefText(parsed.text);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (active) {
          setError('Unable to generate brief right now.');
          setLoading(false);
        }
      }
    }

    void loadBrief();
    return () => {
      active = false;
      controller.abort();
    };
  }, [open, lang, cityName, profile, toggles, engine]);

  async function handleCopy(): Promise<void> {
    if (!briefText || typeof navigator === 'undefined' || !navigator.clipboard) return;
    await navigator.clipboard.writeText(briefText);
    setCopied(true);
  }

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Family / RWA Shareable Brief"
      description="Deterministic summary built strictly from your active choices and engine outputs."
    >
      <div className="space-y-3 text-xs">
        <div className="flex gap-2" role="group" aria-label="Brief language">
          <button
            type="button"
            aria-pressed={lang === 'en'}
            onClick={() => setLang('en')}
            className={`rounded-lg px-3 py-1.5 font-semibold focus:outline-2 focus:outline-offset-2 focus:outline-teal-800 ${
              lang === 'en'
                ? 'bg-teal-800 text-white'
                : 'border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100'
            }`}
          >
            English
          </button>
          <button
            type="button"
            aria-pressed={lang === 'hi'}
            onClick={() => setLang('hi')}
            className={`rounded-lg px-3 py-1.5 font-semibold focus:outline-2 focus:outline-offset-2 focus:outline-teal-800 ${
              lang === 'hi'
                ? 'bg-teal-800 text-white'
                : 'border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100'
            }`}
          >
            हिन्दी (Hindi)
          </button>
        </div>

        {loading ? (
          <p className="text-zinc-700">Building brief...</p>
        ) : error ? (
          <p className="text-red-800">{error}</p>
        ) : (
          <pre
            lang={lang}
            className="whitespace-pre-wrap rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-sans text-xs leading-relaxed text-zinc-900"
          >
            {briefText}
          </pre>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleCopy()}
            disabled={!briefText}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 font-semibold text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 focus:outline-2 focus:outline-offset-2 focus:outline-teal-800"
          >
            {copied ? 'Copied!' : 'Copy text'}
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(briefText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg bg-teal-800 px-3 py-1.5 font-semibold text-white hover:bg-teal-900 focus:outline-2 focus:outline-offset-2 focus:outline-teal-800"
          >
            Share on WhatsApp
          </a>
        </div>
      </div>
    </DrawerShell>
  );
}
