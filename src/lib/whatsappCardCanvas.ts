import { getCpcbPm25Category } from '@/engine/category';
import { formatClockHour } from '@/lib/formatters';
import type { EngineSummary, Toggles } from '@/shared/schemas';

export interface WhatsAppCardInput {
  readonly lang: 'en' | 'hi';
  readonly cityName: string;
  readonly engine: EngineSummary;
  readonly adjustedMean24: number;
  readonly toggles: Toggles;
  readonly isFallback?: boolean;
}

export interface WhatsAppCardLines {
  readonly title: string;
  readonly subtitle: string;
  readonly bandLabel: string;
  readonly airingLine: string;
  readonly dropLine: string;
  readonly rwaLine: string;
  readonly footer: string;
}

/**
 * Pure helper that builds bilingual (EN/HI) card copy for the 1080x1080 WhatsApp PNG card.
 */
export function buildWhatsAppCardLines(input: WhatsAppCardInput): WhatsAppCardLines {
  const { lang, cityName, engine, adjustedMean24, toggles, isFallback = false } = input;
  const band = getCpcbPm25Category(adjustedMean24);
  const bestClock = formatClockHour(engine.bestHour);
  const dropPct =
    engine.baselinePctWho > 0
      ? Math.max(
          0,
          Math.round(((engine.baselinePctWho - engine.adjustedPctWho) / engine.baselinePctWho) * 100),
        )
      : 0;

  if (lang === 'hi') {
    return {
      title: `SmogShift · ${cityName}`,
      subtitle: 'दैनिक वायु गुणवत्ता कार्य योजना',
      bandLabel: `${band.label} · ${Math.round(adjustedMean24)} µg/m³`,
      airingLine: `सबसे साफ़ हवा का समय: ${bestClock}`,
      dropLine: `अनुमानित PM2.5 कमी: -${dropPct}% (${engine.cigAvoided.toFixed(1)} सिगरेट-समतुल्य कम)`,
      rwaLine: `${toggles.households} परिवार: ${engine.co2eKg.toFixed(1)} kg CO2e व ${engine.noxG.toFixed(1)} g NOx बचत`,
      footer: isFallback
        ? 'Offline snapshot · Not live data · SmogShift'
        : 'Modeled forecast · Open-Meteo (CC BY 4.0) · SmogShift',
    };
  }

  return {
    title: `SmogShift · ${cityName}`,
    subtitle: '24-Hour Household Air Quality Action Card',
    bandLabel: `${band.label} · ${Math.round(adjustedMean24)} µg/m³`,
    airingLine: `Cleanest airing window: ${bestClock}`,
    dropLine: `Exposure reduction: -${dropPct}% (${engine.cigAvoided.toFixed(1)} cig-eq avoided)`,
    rwaLine: `${toggles.households} households: ${engine.co2eKg.toFixed(1)} kg CO2e & ${engine.noxG.toFixed(1)} g NOx saved`,
    footer: isFallback
      ? 'Offline snapshot · Not live data · SmogShift'
      : 'Modeled forecast · Open-Meteo (CC BY 4.0) · SmogShift',
  };
}

/**
 * Renders a 1080x1080 dark-mode bilingual PNG infographic in the browser.
 * Returns null cleanly if 2D canvas context is unavailable (e.g. SSR or jsdom).
 */
export async function renderWhatsAppCardBlob(input: WhatsAppCardInput): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const lines = buildWhatsAppCardLines(input);

  // Dark gradient background
  const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
  grad.addColorStop(0, '#042f2e');
  grad.addColorStop(0.55, '#09090b');
  grad.addColorStop(1, '#18181b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1080, 1080);

  // Accent card border
  ctx.strokeStyle = '#14b8a6';
  ctx.lineWidth = 6;
  ctx.strokeRect(48, 48, 984, 984);

  // Header
  ctx.fillStyle = '#5eead4';
  ctx.font = 'bold 46px sans-serif';
  ctx.fillText(lines.title, 96, 150);

  ctx.fillStyle = '#d4d4d8';
  ctx.font = '28px sans-serif';
  ctx.fillText(lines.subtitle, 96, 200);

  // CPCB Band pill
  ctx.fillStyle = '#134e4a';
  ctx.fillRect(96, 250, 560, 74);
  ctx.fillStyle = '#f0fdfa';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText(lines.bandLabel, 124, 299);

  // Metric blocks
  ctx.fillStyle = '#27272a';
  ctx.fillRect(96, 370, 888, 130);
  ctx.fillStyle = '#99f6e4';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText(lines.airingLine, 128, 448);

  ctx.fillStyle = '#27272a';
  ctx.fillRect(96, 530, 888, 130);
  ctx.fillStyle = '#6ee7b7';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText(lines.dropLine, 128, 608);

  ctx.fillStyle = '#27272a';
  ctx.fillRect(96, 690, 888, 130);
  ctx.fillStyle = '#e4e4e7';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(lines.rwaLine, 128, 768);

  // Footer
  ctx.fillStyle = '#a1a1aa';
  ctx.font = '24px sans-serif';
  ctx.fillText(lines.footer, 96, 975);

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

export async function downloadWhatsAppCardPng(input: WhatsAppCardInput): Promise<boolean> {
  const blob = await renderWhatsAppCardBlob(input);
  if (!blob || typeof window === 'undefined') return false;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `smogshift-card-${input.lang}.png`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  return true;
}
