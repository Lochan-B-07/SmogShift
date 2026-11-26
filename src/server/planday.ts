import { Type } from '@google/genai';
import {
  PlanDayExtractedSchema,
  type HouseholdProfile,
  type PlanDayRequest,
  type PlanDayResponse,
  type Toggles,
} from '@/shared/schemas';
import { callGeminiStructured, getCandidateGeminiModels } from './gemini';
import { guardNumbers } from './guard';
import { consumeGeminiDailyQuota } from './rateLimit';

const PLANDAY_SYSTEM_INSTRUCTION = `You translate a resident's daily routine in an Indian city (English or Hinglish) into structured simulator settings and a 3-bullet game plan.
Rules:
1. Extract ONLY the structured enum fields from the user's text:
   - profile.sensitive: 'none' | 'child' | 'elder' | 'respiratory' | 'multiple'
   - profile.roomSize: 'small' | 'medium' | 'large'
   - profile.cooking: 'gas_no_exhaust' | 'gas_exhaust' | 'induction'
   - profile.commuteKm: 5 | 10 | 20 (pick nearest)
   - toggles.travel: 'solo_car' | 'carpool' | 'metro_walk'
   - toggles.smartTiming: boolean (true if they mention outdoor walk/errand/airing/school run)
   - toggles.indoor: 'none' | 'seal_exhaust' | 'diy_box' | 'hepa'
   - toggles.households: 1 | 25 | 100 | 200 (default 25)
   - activityShiftHour: integer 6..22 or null
2. \`understoodAs\`: short confirmation summary of what you extracted (e.g. "Child at home · Gas stove (no exhaust) · Solo commute").
3. \`gameplan.bullets\`: 2 to 3 concise, practical bullets tailored to their routine.
4. NEVER invent percentages, ug/m3 values, or statistics. Prefer words ("cleanest afternoon window") over digits.
5. Output JSON only.`;

const PLANDAY_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    profile: {
      type: Type.OBJECT,
      properties: {
        sensitive: { type: Type.STRING },
        roomSize: { type: Type.STRING },
        cooking: { type: Type.STRING },
        commuteKm: { type: Type.NUMBER },
      },
      required: ['sensitive', 'roomSize', 'cooking', 'commuteKm'],
    },
    toggles: {
      type: Type.OBJECT,
      properties: {
        travel: { type: Type.STRING },
        smartTiming: { type: Type.BOOLEAN },
        indoor: { type: Type.STRING },
        households: { type: Type.NUMBER },
      },
      required: ['travel', 'smartTiming', 'indoor', 'households'],
    },
    activityShiftHour: { type: Type.NUMBER, nullable: true },
    gameplan: {
      type: Type.OBJECT,
      properties: {
        bullets: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: ['bullets'],
    },
    understoodAs: { type: Type.STRING },
  },
  required: ['profile', 'toggles', 'activityShiftHour', 'gameplan', 'understoodAs'],
};

export interface PlanDayDependencies {
  readonly generateText?: (
    req: PlanDayRequest,
    signal: AbortSignal,
    model?: string,
  ) => Promise<string | undefined>;
}

function buildPlanDayFallback(req: PlanDayRequest): PlanDayResponse {
  const lower = req.text.toLowerCase();

  const sensitive: HouseholdProfile['sensitive'] =
    (lower.includes('kid') || lower.includes('child') || lower.includes('school')) &&
    (lower.includes('elder') || lower.includes('parent') || lower.includes('senior'))
      ? 'multiple'
      : lower.includes('asthma') || lower.includes('breath') || lower.includes('inhaler')
        ? 'respiratory'
        : lower.includes('elder') || lower.includes('parent') || lower.includes('grand')
          ? 'elder'
          : lower.includes('kid') || lower.includes('child') || lower.includes('school')
            ? 'child'
            : 'none';

  const cooking: HouseholdProfile['cooking'] = lower.includes('induction')
    ? 'induction'
    : lower.includes('exhaust') || lower.includes('chimney')
      ? 'gas_exhaust'
      : 'gas_no_exhaust';

  const travel: Toggles['travel'] =
    lower.includes('metro') || lower.includes('walk') || lower.includes('bus')
      ? 'metro_walk'
      : lower.includes('carpool') || lower.includes('pool')
        ? 'carpool'
        : 'solo_car';

  const indoor: Toggles['indoor'] = lower.includes('hepa')
    ? 'hepa'
    : lower.includes('diy') || lower.includes('box')
      ? 'diy_box'
      : lower.includes('seal') || lower.includes('exhaust')
        ? 'seal_exhaust'
        : 'none';

  const roomSize: HouseholdProfile['roomSize'] = lower.includes('small')
    ? 'small'
    : lower.includes('large') || lower.includes('hall')
      ? 'large'
      : 'medium';

  const profile: HouseholdProfile = {
    sensitive,
    roomSize,
    cooking,
    commuteKm: 10,
  };

  const toggles: Toggles = {
    travel,
    smartTiming: true,
    indoor,
    households: 25,
  };

  const bullets: string[] = [
    'Smart Timing has been enabled so window airing and outdoor errands align with the cleanest daytime hour.',
    cooking === 'gas_no_exhaust'
      ? 'Gas cooking without exhaust is a major indoor PM2.5 source — crack a kitchen vent while cooking, then seal up.'
      : 'Your cooking setup keeps indoor combustion spikes lower; keep doors closed during evening outdoor peaks.',
    indoor === 'none'
      ? 'Consider draft sealing or a DIY box-fan filter to cut indoor particle leakage during high-smog hours.'
      : 'Keep your active indoor defense running through the evening and overnight hours.',
  ];

  const understoodAs = `Sensitive: ${sensitive} · Cooking: ${cooking.replace(/_/g, ' ')} · Travel: ${travel.replace(/_/g, ' ')} · Indoor: ${indoor.replace(/_/g, ' ')}`;

  return {
    profile,
    toggles,
    activityShiftHour: null,
    gameplan: { bullets },
    understoodAs,
    source: 'template',
  };
}

export async function generatePlanDay(
  req: PlanDayRequest,
  deps?: PlanDayDependencies,
): Promise<PlanDayResponse> {
  const hasCustomGenerator = typeof deps?.generateText === 'function';
  if (!hasCustomGenerator && !process.env.GEMINI_API_KEY) {
    return buildPlanDayFallback(req);
  }

  if (!consumeGeminiDailyQuota()) {
    return buildPlanDayFallback(req);
  }

  const candidateModels = getCandidateGeminiModels();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  // Extract any numeric tokens from the user's own text so `understoodAs` may echo them safely,
  // while `gameplan.bullets` must not invent statistics.
  const userNumbers = (req.text.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);

  try {
    for (const model of candidateModels) {
      if (controller.signal.aborted) break;

      try {
        const rawText = hasCustomGenerator
          ? await deps.generateText!(req, controller.signal, model)
          : await callGeminiStructured({
              systemInstruction: PLANDAY_SYSTEM_INSTRUCTION,
              contents: JSON.stringify({ cityKey: req.cityKey, schedule: req.text }),
              responseSchema: PLANDAY_RESPONSE_SCHEMA,
              signal: controller.signal,
              model,
              temperature: 0.2,
            });

        if (!rawText) continue;

        const json: unknown = JSON.parse(rawText);
        const parsed = PlanDayExtractedSchema.safeParse(json);
        if (!parsed.success) continue;

        const bulletsSafe = parsed.data.gameplan.bullets.every((b) => guardNumbers(b, [], []));
        const understoodSafe = guardNumbers(parsed.data.understoodAs, userNumbers, []);
        if (!bulletsSafe || !understoodSafe) continue;

        return {
          ...parsed.data,
          source: 'gemini',
        };
      } catch {
        if (controller.signal.aborted) break;
      }
    }

    return buildPlanDayFallback(req);
  } finally {
    clearTimeout(timeoutId);
  }
}
