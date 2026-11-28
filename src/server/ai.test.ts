import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AnalyzeQuestion, AnalyzeRequest } from '@/shared/schemas';
import { buildTemplateAnalysis } from './analyzeTemplates';
import { buildBrief } from './briefTemplates';
import {
  buildAnalyzeCacheKey,
  clearAnalyzeCacheForTest,
  getCachedAnalysis,
  setCachedAnalysis,
} from './cache';
import { generateCausalAnalysis } from './gemini';
import { guardAnalyzeResponseFields, guardNumbers } from './guard';
import { generatePlanDay } from './planday';
import { resetRateLimitsForTest } from './rateLimit';
import { analyzeRoomPhoto } from './roomCheck';

const SAMPLE_REQ: AnalyzeRequest = {
  cityKey: 'delhi',
  question: 'overview',
  profile: {
    sensitive: 'child',
    roomSize: 'medium',
    cooking: 'gas_no_exhaust',
    commuteKm: 10,
  },
  toggles: {
    travel: 'carpool',
    smartTiming: true,
    indoor: 'hepa',
    households: 25,
  },
  regime: 'combustion',
  no2Level: 'moderate',
  engine: {
    baselinePctWho: 420,
    adjustedPctWho: 180,
    cigAvoided: 1.64,
    bestHour: 14,
    bestHourLabel: 'safe_window',
    co2eKg: 43.3,
    noxG: 26.7,
  },
};

describe('Domain-aware numeric guard (guardNumbers)', () => {
  it('allows whitelisted domain tokens like PM2.5, N95, CO2e, 24-hour, and INR 500', () => {
    const text =
      'Fine PM2.5 and PM10 with NO2, SO2, O3, and CO2e matter over 24-hours. Use an N95 or N99 mask and INR 500 or ₹500 weatherstripping.';
    expect(guardNumbers(text, [], ['14:00'])).toBe(true);
  });

  it('allows supplied engine numbers and allowed clock times', () => {
    expect(guardNumbers('Your best window is 14:00 with 180% of WHO.', [180], ['14:00'])).toBe(
      true,
    );
  });

  it('rejects invented percentages, stray numbers, and non-allowlisted clock times', () => {
    expect(guardNumbers('This cuts smog by 47% today.', [180], ['14:00'])).toBe(false);
    expect(guardNumbers('Open windows at 09:30 instead.', [180], ['14:00'])).toBe(false);
  });

  it('normalizes Devanagari digits and rejects non-allowlisted Devanagari numbers', () => {
    expect(guardNumbers('इससे प्रदूषण ४७ प्रतिशत कम होगा।', [180], ['14:00'])).toBe(false);
    expect(guardNumbers('लाभ १८० है।', [180], ['14:00'])).toBe(true);
  });
});

describe('Gemini causal analysis, guard fallback, and cache', () => {
  afterEach(() => {
    resetRateLimitsForTest();
    clearAnalyzeCacheForTest();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('returns source=gemini when output JSON passes schema and numeric guard', async () => {
    const res = await generateCausalAnalysis(SAMPLE_REQ, {
      generateText: async () =>
        JSON.stringify({
          headlineReason: 'Combustion PM2.5 dominates today, so HEPA filtration makes a big dent.',
          tradeoffs: [
            'Sealing and filtering indoors protects against fine smoke.',
            'Shifting airing to 14:00 avoids evening peaks.',
          ],
          nextMove: 'Keep the purifier running through the evening.',
          caveat: 'Consider checking with a doctor if symptoms appear.',
        }),
    });
    expect(res.source).toBe('gemini');
    expect(res.headlineReason).toContain('PM2.5');
  });

  it('falls back to template when Gemini invents numbers, returns malformed JSON, or times out', async () => {
    const invented = await generateCausalAnalysis(SAMPLE_REQ, {
      generateText: async () =>
        JSON.stringify({
          headlineReason: 'This reduces smog by 73% right away.',
          tradeoffs: ['Stay indoors.'],
          nextMove: 'Run purifier.',
          caveat: 'Not medical advice.',
        }),
    });
    expect(invented.source).toBe('template');

    const malformed = await generateCausalAnalysis(SAMPLE_REQ, {
      generateText: async () => '{not valid json',
    });
    expect(malformed.source).toBe('template');

    const failed = await generateCausalAnalysis(SAMPLE_REQ, {
      generateText: async () => {
        throw new DOMException('Aborted', 'AbortError');
      },
    });
    expect(failed.source).toBe('template');
  });

  it('falls back to template when daily Gemini cap is reached', async () => {
    vi.stubEnv('GEMINI_DAILY_CAP', '1');
    const generator = async (): Promise<string> =>
      JSON.stringify({
        headlineReason: 'PM2.5 clears best around 14:00.',
        tradeoffs: ['Keep doors shut.'],
        nextMove: 'Run HEPA.',
        caveat: 'Estimates only.',
      });

    const first = await generateCausalAnalysis(SAMPLE_REQ, { generateText: generator });
    const second = await generateCausalAnalysis(SAMPLE_REQ, { generateText: generator });
    expect(first.source).toBe('gemini');
    expect(second.source).toBe('template');
  });

  it('provides deterministic templates for all 6 question chips and clean_day', () => {
    const questions: AnalyzeQuestion[] = [
      'overview',
      'why_not_plants',
      'budget_sealing',
      'sensitive_member',
      'commute_mask',
      'cooking_impact',
    ];
    for (const q of questions) {
      const card = buildTemplateAnalysis({ ...SAMPLE_REQ, question: q });
      expect(card.source).toBe('template');
      expect(card.headlineReason.length).toBeGreaterThan(10);
      expect(card.tradeoffs.length).toBeGreaterThan(0);
    }

    const cleanCard = buildTemplateAnalysis({
      ...SAMPLE_REQ,
      engine: { ...SAMPLE_REQ.engine, bestHourLabel: 'clean_day' },
    });
    expect(cleanCard.headlineReason.toLowerCase()).toContain('clean');
  });

  it('falls back to secondary Gemini model when primary model fails with 503', async () => {
    const calls: string[] = [];
    const res = await generateCausalAnalysis(SAMPLE_REQ, {
      generateText: async (_req, _signal, model) => {
        calls.push(model ?? 'unknown');
        if (model === 'gemini-3.5-flash-lite') {
          throw new Error('503 UNAVAILABLE');
        }
        return JSON.stringify({
          headlineReason:
            'Combustion PM2.5 dominates today; active filtration keeps indoor air cleaner.',
          tradeoffs: ['Sealing drafts lowers outdoor leakage.'],
          nextMove: 'Keep HEPA active tonight.',
          caveat: 'Consider checking with a doctor if symptoms appear.',
        });
      },
    });
    expect(calls).toEqual(['gemini-3.5-flash-lite', 'gemini-3.5-flash']);
    expect(res.source).toBe('gemini');
  });

  it('guardAnalyzeResponseFields validates every field', () => {
    expect(
      guardAnalyzeResponseFields(
        {
          headlineReason: 'PM2.5 is high.',
          tradeoffs: ['N95 helps outdoors.', 'Avoid 99% false claims.'],
          nextMove: 'Air out at 14:00.',
          caveat: 'Not medical advice.',
        },
        [],
        ['14:00'],
      ),
    ).toBe(false);
  });

  it('caches and expires AnalyzeResponse entries by request hash', () => {
    const key = buildAnalyzeCacheKey(SAMPLE_REQ);
    const card = buildTemplateAnalysis(SAMPLE_REQ);
    setCachedAnalysis(key, card, 1000);
    expect(getCachedAnalysis(key, 2000)).toEqual(card);
    expect(getCachedAnalysis(key, 1000 + 10 * 60 * 1000 + 1)).toBeNull();
  });
});

describe('Deterministic EN/HI Family & RWA brief', () => {
  it('formats English and Hindi briefs with required engine facts', () => {
    const en = buildBrief({
      lang: 'en',
      cityName: 'Delhi NCR',
      profile: SAMPLE_REQ.profile,
      toggles: SAMPLE_REQ.toggles,
      engine: SAMPLE_REQ.engine,
      bestHourClock: '14:00',
    });
    expect(en.lang).toBe('en');
    expect(en.text).toContain('Delhi NCR');
    expect(en.text).toContain('14:00');
    expect(en.text).toContain('25 families');
    expect(en.text).toContain('Open-Meteo modeled forecast');

    const hi = buildBrief({
      lang: 'hi',
      cityName: 'Delhi NCR',
      profile: SAMPLE_REQ.profile,
      toggles: SAMPLE_REQ.toggles,
      engine: SAMPLE_REQ.engine,
      bestHourClock: '14:00',
    });
    expect(hi.lang).toBe('hi');
    expect(hi.text).toContain('14:00');
    expect(hi.text).toContain('Open-Meteo');
  });
});

describe('Plan-day and Room-check structured guardrails', () => {
  afterEach(() => {
    resetRateLimitsForTest();
    vi.unstubAllEnvs();
  });

  it('generatePlanDay extracts customAiringHour/customCommuteHour and rejects invented stats', async () => {
    const valid = await generatePlanDay(
      { text: 'Leave at 8 for school, air house at 10', cityKey: 'delhi' },
      {
        generateText: async () =>
          JSON.stringify({
            profile: SAMPLE_REQ.profile,
            toggles: { ...SAMPLE_REQ.toggles, customAiringHour: 10, customCommuteHour: 8 },
            activityShiftHour: null,
            customAiringHour: 10,
            customCommuteHour: 8,
            gameplan: {
              bullets: [
                'Keep morning school commute masked.',
                'Shift airing to the cleanest afternoon hour.',
              ],
            },
            understoodAs: 'School commute at 8 · Airing at 10',
          }),
      },
    );
    expect(valid.source).toBe('gemini');
    expect(valid.customAiringHour).toBe(10);
    expect(valid.customCommuteHour).toBe(8);
    expect(valid.toggles.customCommuteHour).toBe(8);

    const hallucinated = await generatePlanDay(
      { text: 'Leave at 8 for school', cityKey: 'delhi' },
      {
        generateText: async () =>
          JSON.stringify({
            profile: SAMPLE_REQ.profile,
            toggles: SAMPLE_REQ.toggles,
            activityShiftHour: null,
            gameplan: { bullets: ['This cuts pollution by ७५ percent today.'] },
            understoodAs: 'School commute',
          }),
      },
    );
    expect(hallucinated.source).toBe('template');
  });

  it('analyzeRoomPhoto returns detectedHazards and rejects digits inside hazard text', async () => {
    const valid = await analyzeRoomPhoto(
      { imageBase64: 'A'.repeat(64), cityKey: 'delhi' },
      {
        generateText: async () =>
          JSON.stringify({
            bottlenecks: ['Unsealed balcony door gap lets outdoor smog indoors.'],
            fix: 'Seal door gap with foam weatherstrip.',
            mappedIndoor: 'seal_exhaust',
            detectedHazards: [
              {
                id: 'unsealed_door_gap',
                label: 'Unsealed balcony door gap',
                fixAction: 'Install foam weatherstrip tape along frame',
                costTier: 'under_500',
              },
            ],
          }),
      },
    );
    expect(valid.source).toBe('gemini_vision');
    expect(valid.detectedHazards).toHaveLength(1);
    expect(valid.detectedHazards[0].costTier).toBe('under_500');

    const withDigits = await analyzeRoomPhoto(
      { imageBase64: 'A'.repeat(64), cityKey: 'delhi' },
      {
        generateText: async () =>
          JSON.stringify({
            bottlenecks: ['Unsealed door gap.'],
            fix: 'Seal door gap.',
            mappedIndoor: 'seal_exhaust',
            detectedHazards: [
              {
                id: 'unsealed_door_gap',
                label: 'Unsealed door gap costing ₹350',
                fixAction: 'Buy ₹350 tape',
                costTier: 'under_500',
              },
            ],
          }),
      },
    );
    expect(withDigits.source).toBe('template');
    expect(withDigits.detectedHazards.length).toBeGreaterThan(0);
  });
});
