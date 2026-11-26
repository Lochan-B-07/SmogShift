import { formatClockHour } from './formatters';

export interface IcsEvent {
  readonly title: string;
  readonly description: string;
  readonly startHour: number;
  readonly durationMinutes: number;
  readonly cityName: string;
}

function pad2(n: number): string {
  return String(Math.trunc(n)).padStart(2, '0');
}

function formatIcsDateTime(date: Date, hour: number, minute: number): string {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}${m}${d}T${pad2(hour)}${pad2(minute)}00`;
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export function buildIcsText(event: IcsEvent, now: Date = new Date()): string {
  const startHour = ((Math.trunc(event.startHour) % 24) + 24) % 24;
  const totalEndMinutes = startHour * 60 + Math.max(15, Math.min(180, event.durationMinutes));
  const endHour = Math.floor(totalEndMinutes / 60) % 24;
  const endMinute = totalEndMinutes % 60;

  const startStr = formatIcsDateTime(now, startHour, 0);
  const endStr = formatIcsDateTime(now, endHour, endMinute);
  const stampStr = formatIcsDateTime(now, now.getHours(), now.getMinutes());

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SmogShift//Air Quality Planner//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:smogshift-${startStr}-${startHour}@smogshift.app`,
    `DTSTAMP:${stampStr}`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    `SUMMARY:${escapeIcsText(event.title)} (${formatClockHour(startHour)})`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    `LOCATION:${escapeIcsText(event.cityName)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return `${lines.join('\r\n')}\r\n`;
}

export function downloadIcs(event: IcsEvent): void {
  if (typeof window === 'undefined' || typeof Blob === 'undefined') return;
  const text = buildIcsText(event);
  const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'smogshift-reminder.ics';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
