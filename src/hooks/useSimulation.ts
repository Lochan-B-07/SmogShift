'use client';

import { useMemo } from 'react';
import { simulateDay, type SimulationResult } from '@/engine';
import type { AirQualityResponse, HouseholdProfile, Toggles } from '@/shared/schemas';

function getCurrentLocalIsoPrefix(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? '00';
    const hour = get('hour') === '24' ? '00' : get('hour');
    return `${get('year')}-${get('month')}-${get('day')}T${hour}:00`;
  } catch {
    return '';
  }
}

export function useSimulation(
  airQuality: AirQualityResponse | null,
  profile: HouseholdProfile,
  toggles: Toggles,
): SimulationResult | null {
  return useMemo(() => {
    if (!airQuality) return null;
    const prefix = getCurrentLocalIsoPrefix(airQuality.location.timezone);
    return simulateDay(airQuality.hours, profile, toggles, prefix || undefined);
  }, [airQuality, profile, toggles]);
}
