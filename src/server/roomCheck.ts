import { Type } from '@google/genai';
import {
  RoomCheckResponseSchema,
  type RoomCheckRequest,
  type RoomCheckResponse,
} from '@/shared/schemas';
import { callGeminiStructured, getCandidateGeminiModels } from './gemini';
import { guardNumbers } from './guard';
import { consumeGeminiDailyQuota } from './rateLimit';

const ROOM_CHECK_SYSTEM = `You are an Indian indoor air-quality auditor inspecting a household room photo.
Identify practical PM2.5 and ventilation bottlenecks visible in the photo (e.g., gas stove without exhaust fan, visible window/door gaps, relying on potted plants instead of a filter, lack of purifier).
Rules:
1. Return 1 to 3 short \`bottlenecks\` bullets.
2. Return ONE cheapest practical \`fix\` (e.g., under-door draft stopper, kitchen exhaust habit, or DIY box-fan filter).
3. Map \`mappedIndoor\` to the best matching simulator setting: 'none' | 'seal_exhaust' | 'diy_box' | 'hepa'.
4. Return 1 to 4 \`detectedHazards\` items, each with:
   - \`id\`: one of 'unvented_gas_stove' | 'unsealed_door_gap' | 'potted_plants_myth' | 'indoor_smoke_source' | 'blocked_cross_vent'
   - \`label\`: short hazard title (strictly ZERO digits, no currency numbers)
   - \`fixAction\`: short actionable fix (strictly ZERO digits, no currency numbers)
   - \`costTier\`: 'free_0' | 'under_500' | 'diy_2500' | 'hepa_12000'
5. NEVER invent statistics, percentages, currency amounts, or ug/m3 numbers in any text field.
6. Output JSON only.`;

const ROOM_CHECK_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    bottlenecks: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    fix: { type: Type.STRING },
    mappedIndoor: { type: Type.STRING },
    detectedHazards: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          label: { type: Type.STRING },
          fixAction: { type: Type.STRING },
          costTier: { type: Type.STRING },
        },
        required: ['id', 'label', 'fixAction', 'costTier'],
      },
    },
  },
  required: ['bottlenecks', 'fix', 'mappedIndoor', 'detectedHazards'],
};

const VisionPayloadSchema = RoomCheckResponseSchema.omit({ source: true });

export interface RoomCheckDependencies {
  readonly generateText?: (
    req: RoomCheckRequest,
    signal: AbortSignal,
    model?: string,
  ) => Promise<string | undefined>;
}

function buildRoomCheckFallback(): RoomCheckResponse {
  return {
    bottlenecks: [
      'Unsealed door or window gaps let outdoor PM2.5 leak indoors continuously.',
      'Gas cooking without an active exhaust fan creates sharp indoor particle spikes.',
      'Indoor plants add greenery but do not meaningfully clear fine PM2.5.',
    ],
    fix: 'Seal visible window/door gaps with foam tape (~INR 300) and turn on kitchen exhaust while cooking.',
    mappedIndoor: 'seal_exhaust',
    detectedHazards: [
      {
        id: 'unsealed_door_gap',
        label: 'Unsealed door or window gap',
        fixAction: 'Seal visible gaps with foam weatherstrip tape',
        costTier: 'under_500',
      },
      {
        id: 'unvented_gas_stove',
        label: 'Gas cooking without active exhaust',
        fixAction: 'Run kitchen exhaust fan while cooking',
        costTier: 'free_0',
      },
      {
        id: 'potted_plants_myth',
        label: 'Indoor plants relied on for air cleaning',
        fixAction: 'Use draft sealing or a DIY box-fan filter instead',
        costTier: 'diy_2500',
      },
    ],
    source: 'template',
  };
}

export async function analyzeRoomPhoto(
  req: RoomCheckRequest,
  deps?: RoomCheckDependencies,
): Promise<RoomCheckResponse> {
  const hasCustomGenerator = typeof deps?.generateText === 'function';
  if (!hasCustomGenerator && !process.env.GEMINI_API_KEY) {
    return buildRoomCheckFallback();
  }

  if (!consumeGeminiDailyQuota()) {
    return buildRoomCheckFallback();
  }

  const cleanBase64 = req.imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
  const candidateModels = getCandidateGeminiModels();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    for (const model of candidateModels) {
      if (controller.signal.aborted) break;

      try {
        const rawText = hasCustomGenerator
          ? await deps.generateText!(req, controller.signal, model)
          : await callGeminiStructured({
              systemInstruction: ROOM_CHECK_SYSTEM,
              contents: [
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: cleanBase64,
                  },
                },
                {
                  text: `Inspect this room photo from ${req.cityKey} for indoor PM2.5 bottlenecks and return JSON.`,
                },
              ],
              responseSchema: ROOM_CHECK_SCHEMA,
              signal: controller.signal,
              model,
              temperature: 0.2,
            });

        if (!rawText) continue;

        const json: unknown = JSON.parse(rawText);
        const parsed = VisionPayloadSchema.safeParse(json);
        if (!parsed.success) continue;

        const safeBottlenecks = parsed.data.bottlenecks.every((b) => guardNumbers(b, [], []));
        const safeFix = guardNumbers(parsed.data.fix, [], []);
        const safeHazards = parsed.data.detectedHazards.every(
          (h) => guardNumbers(h.label, [], []) && guardNumbers(h.fixAction, [], []),
        );
        if (!safeBottlenecks || !safeFix || !safeHazards) continue;

        return {
          ...parsed.data,
          source: 'gemini_vision',
        };
      } catch {
        if (controller.signal.aborted) break;
      }
    }

    return buildRoomCheckFallback();
  } finally {
    clearTimeout(timeoutId);
  }
}
