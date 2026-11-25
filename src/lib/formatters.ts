import type { EngineSummary, HouseholdProfile, Toggles } from '@/shared/schemas';

export function formatClockHour(hour: number): string {
  const normalized = ((Math.trunc(hour) % 24) + 24) % 24;
  return `${String(normalized).padStart(2, '0')}:00`;
}

export function formatIsoClock(isoTime: string): string {
  const match = /T(\d{2}:\d{2})/.exec(isoTime);
  return match ? match[1] : isoTime;
}

export function formatWhoPercent(pctWho: number): string {
  if (pctWho > 300) {
    const multiple = (pctWho / 100).toFixed(1);
    return `${multiple}× the guideline (${Math.round(pctWho)}%)`;
  }
  return `${Math.round(pctWho)}% of WHO guideline`;
}

export function formatMinutesAgo(fetchedAtIso: string, nowMs: number = Date.now()): string {
  const fetchedMs = Date.parse(fetchedAtIso);
  if (Number.isNaN(fetchedMs)) return 'just now';
  const diffMin = Math.max(0, Math.round((nowMs - fetchedMs) / 60_000));
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  return `${diffHr}h ago`;
}

export function describeBestWindowLabel(
  label: EngineSummary['bestHourLabel'],
  bestHour: number,
): string {
  const clock = formatClockHour(bestHour);
  switch (label) {
    case 'clean_day':
      return `Clean air day — best airing hour is ${clock}.`;
    case 'safe_window':
      return `Best airing & outdoor window: ${clock} (meets CPCB 24-h threshold).`;
    case 'least_bad':
      return `No safe window today. Least-bad hour is ${clock}.`;
  }
}

export function describeActivity(activity: string): string {
  switch (activity) {
    case 'airing_outdoor':
      return 'Outdoor errand & airing';
    case 'cooking':
      return 'Cooking (indoors)';
    case 'commute':
      return 'Commute (outdoors)';
    default:
      return 'At home (indoors)';
  }
}

export function describeTravelMode(travel: Toggles['travel']): string {
  switch (travel) {
    case 'solo_car':
      return 'Solo petrol car';
    case 'carpool':
      return '3-person carpool';
    case 'metro_walk':
      return 'Metro + walk';
  }
}

export function describeIndoorDefense(indoor: Toggles['indoor']): string {
  switch (indoor) {
    case 'none':
      return 'No indoor intervention';
    case 'seal_exhaust':
      return 'Seal drafts + kitchen exhaust';
    case 'diy_box':
      return 'DIY Corsi-Rosenthal box (200 m³/h)';
    case 'hepa':
      return 'HEPA purifier (250 m³/h)';
  }
}

export function describeSensitiveGroup(sensitive: HouseholdProfile['sensitive']): string {
  switch (sensitive) {
    case 'none':
      return 'General adult household';
    case 'child':
      return 'Young children';
    case 'elder':
      return 'Older adults';
    case 'respiratory':
      return 'Asthma / respiratory sensitivity';
    case 'multiple':
      return 'Children, elders & respiratory sensitivity';
  }
}
