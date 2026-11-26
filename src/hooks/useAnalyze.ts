'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AnalyzeResponseSchema,
  type AnalyzeQuestion,
  type AnalyzeRequest,
  type AnalyzeResponse,
  type EngineSummary,
  type Fingerprint,
  type HouseholdProfile,
  type Toggles,
} from '@/shared/schemas';

export interface UseAnalyzeParams {
  readonly enabled: boolean;
  readonly cityKey: string;
  readonly question: AnalyzeQuestion;
  readonly profile: HouseholdProfile;
  readonly toggles: Toggles;
  readonly fingerprint: Fingerprint | null;
  readonly engine: EngineSummary | null;
  readonly explicitTrigger?: number;
}

export interface UseAnalyzeResult {
  readonly analysis: AnalyzeResponse | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly stale: boolean;
}

function buildSnapshotKey(
  cityKey: string,
  question: AnalyzeQuestion,
  profile: HouseholdProfile,
  toggles: Toggles,
): string {
  return `${cityKey}:${question}:${JSON.stringify(profile)}:${JSON.stringify(toggles)}`;
}

export function useAnalyze(params: UseAnalyzeParams): UseAnalyzeResult {
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [fetchedKey, setFetchedKey] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const lastAutoKeyRef = useRef<string>('');
  const triggerCount = params.explicitTrigger ?? 0;

  const currentSnapshotKey = buildSnapshotKey(
    params.cityKey,
    params.question,
    params.profile,
    params.toggles,
  );

  useEffect(() => {
    if (!params.enabled || !params.fingerprint || !params.engine) {
      return;
    }

    const autoKey = `${params.cityKey}:${params.question}:${triggerCount}`;
    if (lastAutoKeyRef.current === autoKey) {
      return;
    }
    lastAutoKeyRef.current = autoKey;

    const controller = new AbortController();
    let active = true;

    const payload: AnalyzeRequest = {
      cityKey: params.cityKey,
      question: params.question,
      profile: params.profile,
      toggles: params.toggles,
      regime: params.fingerprint.regime,
      no2Level: params.fingerprint.no2Level,
      engine: params.engine,
    };
    const snapshotForFetch = buildSnapshotKey(
      params.cityKey,
      params.question,
      params.profile,
      params.toggles,
    );

    async function run(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json: unknown = await res.json();
        const parsed = AnalyzeResponseSchema.parse(json);
        if (active) {
          setAnalysis(parsed);
          setFetchedKey(snapshotForFetch);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (active) {
          setError('Unable to fetch explanation right now.');
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    params.enabled,
    params.cityKey,
    params.question,
    params.profile,
    params.toggles,
    params.fingerprint,
    params.engine,
    triggerCount,
  ]);

  const stale = Boolean(analysis) && !loading && fetchedKey !== currentSnapshotKey;

  return { analysis, loading, error, stale };
}
