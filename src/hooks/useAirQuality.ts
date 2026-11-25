'use client';

import { useCallback, useEffect, useState } from 'react';
import { AirQualityResponseSchema, type AirQualityResponse } from '@/shared/schemas';

export interface ActiveLocation {
  readonly key: string;
  readonly name: string;
  readonly lat: number;
  readonly lon: number;
}

export interface UseAirQualityResult {
  readonly data: AirQualityResponse | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly retry: () => void;
}

export function useAirQuality(location: ActiveLocation): UseAirQualityResult {
  const [data, setData] = useState<AirQualityResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState<number>(0);

  const retry = useCallback((): void => {
    setReloadNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function load(): Promise<void> {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          lat: location.lat.toFixed(2),
          lon: location.lon.toFixed(2),
          name: location.name,
        });
        const res = await fetch(`/api/air-quality?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json: unknown = await res.json();
        const parsed = AirQualityResponseSchema.parse(json);
        if (active) {
          setData(parsed);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (active) {
          setError('Unable to load air-quality forecast right now. Please retry.');
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [location.lat, location.lon, location.name, reloadNonce]);

  return { data, loading, error, retry };
}
