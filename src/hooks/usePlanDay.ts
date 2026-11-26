'use client';

import { useCallback, useRef, useState } from 'react';
import type { PlanDayExample } from '@/data/planday-examples';
import {
  PlanDayResponseSchema,
  type HouseholdProfile,
  type PlanDayResponse,
  type Toggles,
} from '@/shared/schemas';

export interface UsePlanDayParams {
  readonly onExtracted: (profile: HouseholdProfile, toggles: Toggles) => void;
}

export interface UsePlanDayResult {
  readonly result: PlanDayResponse | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly trigger: (text: string, cityKey: string) => Promise<void>;
  readonly applyExample: (example: PlanDayExample) => void;
  readonly reset: () => void;
}

export function usePlanDay({ onExtracted }: UsePlanDayParams): UsePlanDayResult {
  const [result, setResult] = useState<PlanDayResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const trigger = useCallback(
    async (text: string, cityKey: string): Promise<void> => {
      const trimmed = text.trim();
      if (trimmed.length < 5) {
        setError('Please enter at least 5 characters describing your day.');
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/plan-day', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed, cityKey }),
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json: unknown = await res.json();
        const parsed = PlanDayResponseSchema.parse(json);
        setResult(parsed);
        onExtracted(parsed.profile, parsed.toggles);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError('Unable to build your plan right now. You can still use the example chips or toggles.');
      } finally {
        setLoading(false);
      }
    },
    [onExtracted],
  );

  const applyExample = useCallback(
    (example: PlanDayExample): void => {
      abortRef.current?.abort();
      setError(null);
      setLoading(false);
      setResult(example.response);
      onExtracted(example.response.profile, example.response.toggles);
    },
    [onExtracted],
  );

  const reset = useCallback((): void => {
    abortRef.current?.abort();
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  return { result, loading, error, trigger, applyExample, reset };
}
