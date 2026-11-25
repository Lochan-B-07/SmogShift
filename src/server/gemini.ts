import { GoogleGenAI, Type } from '@google/genai';
import { formatClockHour } from '@/lib/formatters';
import { AnalyzeResponseSchema, type AnalyzeRequest, type AnalyzeResponse } from '@/shared/schemas';
import { buildTemplateAnalysis } from './analyzeTemplates';
import { guardAnalyzeResponseFields } from './guard';
import { consumeGeminiDailyQuota } from './rateLimit';

const SECONDARY_FALLBACK_MODEL = 'gemini-3.5-flash';

const SYSTEM_INSTRUCTION = `You explain air-quality trade-offs for an Indian household. You are given today's
pollution regime, household profile, active toggles, a specific user question type,
and pre-computed numbers. Rules:
1. Never restate the supplied numbers as the main point; the user already sees them.
2. Tailor your answer to \`question\`:
   - overview: explain WHY the active choices work under today's regime (combustion vs dust vs mixed) and name ONE highest-leverage next move.
   - why_not_plants: explain plainly why potted indoor plants cannot clear winter PM2.5 compared to sealing drafts or HEPA/DIY box-fan filtration.
   - budget_sealing: give practical zero/low-cost (under INR 500) indoor smog defense steps tailored to the user's cooking & room setup.
   - sensitive_member: explain practical precautions for the household's sensitive group today without giving medical diagnoses.
   - commute_mask: explain practical commuting & mask (N95) choices based on today's regime, NO2 level, travel mode, and cleanest hour.
   - cooking_impact: explain how the user's cooking setup interacts with indoor sealing/filtration and how to minimize kitchen PM2.5 spikes.
3. Do not invent any new statistics, percentages, or clock times not supplied in the input.
   Prefer words ("later this afternoon") over digits.
4. Do not give medical advice or diagnoses. At most once, in \`caveat\`, say "consider checking with a doctor."
5. Plain, warm, non-alarmist language. Max 3 short trade-off sentences. Output JSON only.`;

const GeminiPayloadSchema = AnalyzeResponseSchema.omit({ source: true });

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    headlineReason: { type: Type.STRING },
    tradeoffs: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    nextMove: { type: Type.STRING },
    caveat: { type: Type.STRING },
  },
  required: ['headlineReason', 'tradeoffs', 'nextMove', 'caveat'],
};

export interface GeminiDependencies {
  readonly generateText?: (
    req: AnalyzeRequest,
    signal: AbortSignal,
    model?: string,
  ) => Promise<string | undefined>;
}

async function callGeminiSdk(
  req: AnalyzeRequest,
  signal: AbortSignal,
  model: string,
): Promise<string | undefined> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return undefined;

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model,
    contents: JSON.stringify(req),
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.3,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      abortSignal: signal,
    },
  });

  return response.text;
}

export async function generateCausalAnalysis(
  req: AnalyzeRequest,
  deps?: GeminiDependencies,
): Promise<AnalyzeResponse> {
  const hasCustomGenerator = typeof deps?.generateText === 'function';
  if (!hasCustomGenerator && !process.env.GEMINI_API_KEY) {
    return buildTemplateAnalysis(req);
  }

  if (!consumeGeminiDailyQuota()) {
    return buildTemplateAnalysis(req);
  }

  const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const candidateModels =
    primaryModel === SECONDARY_FALLBACK_MODEL
      ? [primaryModel]
      : [primaryModel, SECONDARY_FALLBACK_MODEL];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  const allowedNumbers = [
    req.engine.baselinePctWho,
    req.engine.adjustedPctWho,
    req.engine.cigAvoided,
    req.engine.co2eKg,
    req.engine.noxG,
    req.engine.bestHour,
    req.profile.commuteKm,
    req.toggles.households,
  ];
  const allowedClock = [formatClockHour(req.engine.bestHour)];

  try {
    for (const model of candidateModels) {
      if (controller.signal.aborted) break;

      try {
        const rawText = hasCustomGenerator
          ? await deps.generateText!(req, controller.signal, model)
          : await callGeminiSdk(req, controller.signal, model);

        if (!rawText) continue;

        const json: unknown = JSON.parse(rawText);
        const parsed = GeminiPayloadSchema.safeParse(json);
        if (!parsed.success) continue;

        if (!guardAnalyzeResponseFields(parsed.data, allowedNumbers, allowedClock)) {
          continue;
        }

        return {
          ...parsed.data,
          source: 'gemini',
        };
      } catch {
        // Try secondary model on transient 503/network error before falling back
        if (controller.signal.aborted) break;
      }
    }

    return buildTemplateAnalysis(req);
  } finally {
    clearTimeout(timeoutId);
  }
}
