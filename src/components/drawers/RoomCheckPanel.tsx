'use client';

import Image from 'next/image';
import { useId, useMemo, useState, type ChangeEvent, type ReactElement } from 'react';
import { ROOM_SAMPLES, type RoomSample } from '@/data/room-samples';
import { evaluateRoomHazards } from '@/engine/roomHazards';
import { describeIndoorDefense } from '@/lib/formatters';
import { compressImageToBase64 } from '@/lib/imageCompressor';
import {
  RoomCheckResponseSchema,
  type CostTier,
  type HouseholdProfile,
  type Hour,
  type RoomCheckResponse,
  type RoomHazardId,
  type Toggles,
} from '@/shared/schemas';

export interface RoomCheckPanelProps {
  readonly cityKey: string;
  readonly hours?: readonly Hour[];
  readonly profile?: HouseholdProfile;
  readonly toggles?: Toggles;
  readonly onApplyIndoor: (indoor: Toggles['indoor']) => void;
  readonly onApplyFixes?: (nextProfile: HouseholdProfile, nextToggles: Toggles) => void;
  readonly onAfterApply?: () => void;
}

function formatCostTierLabel(tier: CostTier): string {
  switch (tier) {
    case 'free_0':
      return '₹0';
    case 'under_500':
      return 'Under ₹500';
    case 'diy_2500':
      return '~₹2,500';
    case 'hepa_12000':
      return '₹12,000+';
  }
}

function sourceBadgeLabel(source: RoomCheckResponse['source']): string {
  switch (source) {
    case 'gemini_vision':
      return 'Powered by Gemini Vision';
    case 'sample':
      return 'Sample audit';
    case 'template':
      return 'Rule-based fallback';
  }
}

export function RoomCheckPanel({
  cityKey,
  hours,
  profile,
  toggles,
  onApplyIndoor,
  onApplyFixes,
  onAfterApply,
}: RoomCheckPanelProps): ReactElement {
  const uploadId = useId();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RoomCheckResponse | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [checkedHazards, setCheckedHazards] = useState<readonly RoomHazardId[]>([]);

  function setNextResult(next: RoomCheckResponse): void {
    setResult(next);
    setCheckedHazards(next.detectedHazards.map((h) => h.id));
  }

  const hazardEval = useMemo(() => {
    if (!result || !hours || !profile || !toggles || result.detectedHazards.length === 0) {
      return null;
    }
    return evaluateRoomHazards(hours, profile, toggles, result.detectedHazards, checkedHazards);
  }, [result, hours, profile, toggles, checkedHazards]);

  function toggleHazard(id: RoomHazardId): void {
    setCheckedHazards((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  async function runVisionCheck(
    base64: string,
    fallback?: RoomCheckResponse,
  ): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/room-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, cityKey }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json: unknown = await res.json();
      const parsed = RoomCheckResponseSchema.parse(json);
      if (fallback && parsed.source === 'template') {
        setNextResult(fallback);
      } else {
        setNextResult(parsed);
      }
    } catch {
      if (fallback) {
        setNextResult(fallback);
      } else {
        setError(
          'Could not analyze the photo right now. Try one of the sample rooms or adjust Indoor Defense manually.',
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const base64 = await compressImageToBase64(file);
      setPreviewSrc(`data:image/jpeg;base64,${base64}`);
      await runVisionCheck(base64);
    } catch {
      setLoading(false);
      setError('Unable to read or compress this image. Please choose a JPEG or PNG photo.');
    }
  }

  async function handleSelectSample(sample: RoomSample): Promise<void> {
    setPreviewSrc(sample.imagePath);
    setError(null);
    setLoading(true);
    try {
      const imgRes = await fetch(sample.imagePath);
      if (!imgRes.ok) {
        setNextResult(sample.fallbackResponse);
        setLoading(false);
        return;
      }
      const blob = await imgRes.blob();
      const base64 = await compressImageToBase64(blob);
      await runVisionCheck(base64, sample.fallbackResponse);
    } catch {
      setNextResult(sample.fallbackResponse);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 text-xs">
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/60">
        <label
          htmlFor={uploadId}
          className="block font-semibold text-zinc-900 dark:text-zinc-100"
        >
          Upload a room, kitchen, or window photo
        </label>
        <input
          id={uploadId}
          type="file"
          accept="image/*"
          disabled={loading}
          onChange={(e) => void handleFileChange(e)}
          className="mt-2 block w-full text-xs text-zinc-700 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-800 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-teal-900 dark:text-zinc-300 dark:file:bg-teal-600"
        />
        <p className="mt-2 text-[11px] text-zinc-600 dark:text-zinc-400">
          Photos are resized in your browser (~100 KB) and never stored. Analyzed in memory only.
        </p>
      </div>

      <div>
        <p className="font-semibold text-zinc-800 dark:text-zinc-200">
          Or test with a sample room:
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ROOM_SAMPLES.map((sample) => (
            <button
              key={sample.id}
              type="button"
              disabled={loading}
              onClick={() => void handleSelectSample(sample)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 font-semibold text-zinc-800 transition hover:bg-teal-50 focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>

      {previewSrc ? (
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
          <Image
            src={previewSrc}
            alt="Selected room preview"
            width={640}
            height={400}
            unoptimized
            className="h-44 w-full object-cover"
          />
        </div>
      ) : null}

      {loading ? (
        <p role="status" className="font-medium text-teal-800 dark:text-teal-300">
          Analyzing room photo with Gemini Vision...
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="font-medium text-amber-900 dark:text-amber-300">
          {error}
        </p>
      ) : null}

      {result ? (
        <div
          aria-live="polite"
          className="space-y-3 rounded-xl border border-teal-200 bg-teal-50/70 p-3.5 dark:border-teal-800 dark:bg-teal-950/40"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-zinc-900 dark:text-zinc-50">
              Bottlenecks detected
            </span>
            <span className="rounded-full border border-teal-300 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-teal-950 dark:border-teal-700 dark:bg-zinc-900 dark:text-teal-200">
              {sourceBadgeLabel(result.source)}
            </span>
          </div>

          <ul className="list-disc space-y-1 pl-4 text-zinc-800 dark:text-zinc-200">
            {result.bottlenecks.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <div className="rounded-lg border-l-4 border-teal-700 bg-white px-3 py-2 text-zinc-900 dark:border-teal-400 dark:bg-zinc-900 dark:text-zinc-100">
            <span className="font-bold">Cheapest practical fix: </span>
            {result.fix}
          </div>

          {result.detectedHazards.length > 0 ? (
            <div className="space-y-2 rounded-xl border border-zinc-200 bg-white/90 p-3 dark:border-zinc-700 dark:bg-zinc-900/90">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-zinc-900 dark:text-zinc-50">
                  Hazard-to-Physics Checklist
                </span>
                {hazardEval && hazardEval.ok ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-950 dark:bg-emerald-950/70 dark:text-emerald-200">
                    -{hazardEval.totalSavedUgM3.toFixed(1)} µg/m³ ({hazardEval.projectedMeanUgM3.toFixed(1)} µg/m³)
                  </span>
                ) : null}
              </div>

              <div className="space-y-1.5">
                {result.detectedHazards.map((hazard) => {
                  const checked = checkedHazards.includes(hazard.id);
                  const priced = hazardEval?.ok
                    ? hazardEval.items.find((item) => item.hazard.id === hazard.id)
                    : undefined;
                  return (
                    <label
                      key={hazard.id}
                      className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-zinc-200 bg-zinc-50/70 p-2 hover:bg-teal-50/50 dark:border-zinc-700 dark:bg-zinc-800/60 dark:hover:bg-zinc-800"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleHazard(hazard.id)}
                        className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-teal-800 focus:ring-teal-700"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {hazard.label}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="rounded bg-zinc-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200">
                              {formatCostTierLabel(hazard.costTier)}
                            </span>
                            {priced ? (
                              <span className="font-bold text-teal-800 dark:text-teal-300">
                                {priced.deltaUgM3 > 0
                                  ? `-${priced.deltaUgM3.toFixed(1)} µg/m³`
                                  : '0 µg/m³'}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <p className="mt-0.5 text-[11px] text-zinc-700 dark:text-zinc-300">
                          {hazard.fixAction}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-zinc-700 dark:text-zinc-300">
              Suggested preset: <strong>{describeIndoorDefense(result.mappedIndoor)}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                if (hazardEval?.ok && onApplyFixes) {
                  onApplyFixes(hazardEval.recommendedProfile, hazardEval.recommendedToggles);
                } else {
                  onApplyIndoor(result.mappedIndoor);
                }
                onAfterApply?.();
              }}
              className="rounded-lg bg-teal-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-900 focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              {hazardEval?.ok && onApplyFixes
                ? 'Apply Selected Fixes to Simulator'
                : 'Apply to simulator'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
