'use client';

import { useEffect, useState, type ReactElement } from 'react';
import { useSpeechBrief } from '@/hooks/useSpeechBrief';
import { formatClockHour } from '@/lib/formatters';
import { downloadWhatsAppCardPng } from '@/lib/whatsappCardCanvas';
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
  readonly adjustedMean24?: number;
  readonly isFallback?: boolean;
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
  adjustedMean24,
  isFallback = false,
}: BriefDrawerProps): ReactElement {
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [briefText, setBriefText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [cardStatus, setCardStatus] = useState<string | null>(null);
  const { supported: speechSupported, speaking, speak, stop } = useSpeechBrief();

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    let active = true;

    async function loadBrief(): Promise<void> {
      setLoading(true);
      setError(null);
      setCopied('idle');

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
    if (!briefText) return;
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard) {
        setCopied('failed');
        return;
      }
      await navigator.clipboard.writeText(briefText);
      setCopied('copied');
      setTimeout(() => setCopied('idle'), 2500);
    } catch {
      setCopied('failed');
    }
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
            className={`rounded-lg px-3 py-1.5 font-semibold focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 ${
              lang === 'en'
                ? 'bg-teal-800 text-white dark:bg-teal-600'
                : 'border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            English
          </button>
          <button
            type="button"
            aria-pressed={lang === 'hi'}
            onClick={() => setLang('hi')}
            className={`rounded-lg px-3 py-1.5 font-semibold focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 ${
              lang === 'hi'
                ? 'bg-teal-800 text-white dark:bg-teal-600'
                : 'border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            हिन्दी (Hindi)
          </button>
        </div>

        {loading ? (
          <p className="text-zinc-700 dark:text-zinc-300">Building brief...</p>
        ) : error ? (
          <p className="text-red-800 dark:text-red-300">{error}</p>
        ) : (
          <pre
            lang={lang}
            className="whitespace-pre-wrap rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-sans text-xs leading-relaxed text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            {briefText}
          </pre>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleCopy()}
            disabled={!briefText}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 font-semibold text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            {copied === 'copied'
              ? 'Copied!'
              : copied === 'failed'
                ? 'Copy failed — select text above'
                : 'Copy text'}
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(briefText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg bg-teal-800 px-3 py-1.5 font-semibold text-white hover:bg-teal-900 focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            Share on WhatsApp
          </a>
          <button
            type="button"
            disabled={!briefText}
            onClick={() => {
              void downloadWhatsAppCardPng({
                lang,
                cityName: sanitizeCityName(cityName),
                engine,
                adjustedMean24: adjustedMean24 ?? (engine.adjustedPctWho / 100) * 15,
                toggles,
                isFallback,
              }).then((ok) => {
                setCardStatus(ok ? 'PNG card downloaded!' : 'PNG export unavailable in this browser.');
                setTimeout(() => setCardStatus(null), 2500);
              });
            }}
            className="rounded-lg border border-teal-700 bg-white px-3 py-1.5 font-semibold text-teal-900 hover:bg-teal-50 disabled:opacity-50 focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 dark:border-teal-500 dark:bg-zinc-800 dark:text-teal-200 dark:hover:bg-zinc-700"
          >
            Download WhatsApp Card (PNG)
          </button>
          {speechSupported ? (
            <button
              type="button"
              disabled={!briefText}
              onClick={() => (speaking ? stop() : speak(briefText, lang))}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 font-semibold text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
            >
              {speaking ? 'Stop' : 'Listen'}
            </button>
          ) : null}
        </div>
        {cardStatus ? (
          <p role="status" className="text-[11px] font-medium text-teal-800 dark:text-teal-300">
            {cardStatus}
          </p>
        ) : null}
      </div>
    </DrawerShell>
  );
}
