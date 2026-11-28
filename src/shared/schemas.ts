import { z } from 'zod';

const num = z.number().finite();
const nullableNum = num.nullable();

export const HourSchema = z.object({
  time: z.string(), // local ISO "2026-11-25T14:00"
  pm25: nullableNum,
  pm10: nullableNum,
  no2: nullableNum,
  o3: nullableNum.optional(),
  co: nullableNum.optional(),
  so2: nullableNum.optional(),
  usAqi: nullableNum.optional(),
});

export const FingerprintSchema = z.object({
  ratio: nullableNum, // mean PM2.5/PM10 over window
  regime: z.enum(['combustion', 'mixed', 'dust', 'unknown']),
  no2Level: z.enum(['low', 'moderate', 'high', 'unknown']),
});

export const AirQualityResponseSchema = z.object({
  location: z.object({
    lat: num,
    lon: num,
    name: z.string().max(80).optional(),
    timezone: z.string(),
  }),
  source: z.object({
    name: z.literal('Open-Meteo Air Quality (CAMS model)'),
    kind: z.literal('modeled'),
    fetchedAt: z.string(),
    isFallback: z.boolean(),
    snapshotDate: z.string().optional(),
  }),
  hours: z.array(HourSchema).min(24).max(72),
  fingerprint: FingerprintSchema,
});

export const HouseholdProfileSchema = z.object({
  sensitive: z.enum(['none', 'child', 'elder', 'respiratory', 'multiple']),
  roomSize: z.enum(['small', 'medium', 'large']),
  cooking: z.enum(['gas_no_exhaust', 'gas_exhaust', 'induction']),
  commuteKm: z.union([z.literal(5), z.literal(10), z.literal(20)]),
});

export const TogglesSchema = z.object({
  travel: z.enum(['solo_car', 'carpool', 'metro_walk']),
  smartTiming: z.boolean(),
  indoor: z.enum(['none', 'seal_exhaust', 'diy_box', 'hepa']),
  households: z.union([z.literal(1), z.literal(25), z.literal(100), z.literal(200)]),
  customAiringHour: z.number().int().min(6).max(22).optional(),
  customCommuteHour: z.number().int().min(5).max(22).optional(),
});

export const EngineSummarySchema = z.object({
  baselinePctWho: num.min(0).max(5000),
  adjustedPctWho: num.min(0).max(5000),
  cigAvoided: num.min(0).max(50),
  bestHour: z.number().int().min(0).max(23),
  bestHourLabel: z.enum(['safe_window', 'least_bad', 'clean_day']),
  co2eKg: num.min(0).max(1e6),
  noxG: num.min(0).max(1e7),
});

export const AnalyzeQuestionSchema = z.enum([
  'overview',
  'why_not_plants',
  'budget_sealing',
  'sensitive_member',
  'commute_mask',
  'cooking_impact',
]);

export const AnalyzeRequestSchema = z.object({
  cityKey: z.string().regex(/^[a-z0-9_-]{1,40}$/),
  question: AnalyzeQuestionSchema.default('overview'),
  profile: HouseholdProfileSchema,
  toggles: TogglesSchema,
  regime: FingerprintSchema.shape.regime,
  no2Level: FingerprintSchema.shape.no2Level,
  engine: EngineSummarySchema,
});

export const AnalyzeResponseSchema = z.object({
  headlineReason: z.string().max(280),
  tradeoffs: z.array(z.string().max(220)).max(3),
  nextMove: z.string().max(220),
  caveat: z.string().max(220),
  source: z.enum(['gemini', 'template']),
});

export const BriefRequestSchema = z.object({
  lang: z.enum(['en', 'hi']),
  cityName: z.string().regex(/^[\p{L}\p{N} ,.'-]{1,60}$/u),
  profile: HouseholdProfileSchema,
  toggles: TogglesSchema,
  engine: EngineSummarySchema,
  bestHourClock: z.string().regex(/^\d{2}:\d{2}$/),
});

export const BriefResponseSchema = z.object({
  text: z.string().max(1200),
  lang: z.enum(['en', 'hi']),
});

export const AirQualityQuerySchema = z.object({
  lat: z.string().trim().min(1).transform(Number).pipe(z.number().finite().min(-90).max(90)),
  lon: z.string().trim().min(1).transform(Number).pipe(z.number().finite().min(-180).max(180)),
  name: z.string().trim().min(1).max(80).optional(),
});

export const GeocodeQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[\p{L}\p{N} ,.'-]+$/u),
});

export const GeocodeResultSchema = z.object({
  name: z.string(),
  admin1: z.string().optional(),
  lat: num,
  lon: num,
});

export const GeocodeResponseSchema = z.object({
  results: z.array(GeocodeResultSchema).max(5),
});

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export const PlanDayRequestSchema = z.object({
  text: z.string().trim().min(5).max(400),
  cityKey: z.string().regex(/^[a-z0-9_-]{1,40}$/),
});

export const PlanDayExtractedSchema = z.object({
  profile: HouseholdProfileSchema,
  toggles: TogglesSchema,
  activityShiftHour: z.number().int().min(6).max(22).nullable(),
  customAiringHour: z.number().int().min(6).max(22).optional(),
  customCommuteHour: z.number().int().min(5).max(22).optional(),
  gameplan: z.object({
    bullets: z.array(z.string().min(1).max(220)).min(1).max(3),
  }),
  understoodAs: z.string().min(1).max(200),
});

export const PlanDayResponseSchema = PlanDayExtractedSchema.extend({
  source: z.enum(['gemini', 'static_example', 'template']),
});

export const RoomHazardIdSchema = z.enum([
  'unvented_gas_stove',
  'unsealed_door_gap',
  'potted_plants_myth',
  'indoor_smoke_source',
  'blocked_cross_vent',
]);

export const CostTierSchema = z.enum(['free_0', 'under_500', 'diy_2500', 'hepa_12000']);

export const DetectedHazardSchema = z.object({
  id: RoomHazardIdSchema,
  label: z.string().min(1).max(80),
  fixAction: z.string().min(1).max(120),
  costTier: CostTierSchema,
});

export const ExposureHitIdSchema = z.enum([
  'traffic_jam_45m',
  'closed_kitchen_smoke',
  'outdoor_errand_1h',
]);

export const RoomCheckRequestSchema = z.object({
  imageBase64: z.string().min(32).max(220_000),
  cityKey: z.string().regex(/^[a-z0-9_-]{1,40}$/),
});

export const RoomCheckResponseSchema = z.object({
  bottlenecks: z.array(z.string().min(1).max(180)).min(1).max(4),
  fix: z.string().min(1).max(200),
  mappedIndoor: TogglesSchema.shape.indoor,
  detectedHazards: z.array(DetectedHazardSchema).max(4),
  source: z.enum(['gemini_vision', 'sample', 'template']),
});

export type Hour = z.infer<typeof HourSchema>;
export type Fingerprint = z.infer<typeof FingerprintSchema>;
export type AirQualityResponse = z.infer<typeof AirQualityResponseSchema>;
export type HouseholdProfile = z.infer<typeof HouseholdProfileSchema>;
export type Toggles = z.infer<typeof TogglesSchema>;
export type EngineSummary = z.infer<typeof EngineSummarySchema>;
export type AnalyzeQuestion = z.infer<typeof AnalyzeQuestionSchema>;
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;
export type BriefRequest = z.infer<typeof BriefRequestSchema>;
export type BriefResponse = z.infer<typeof BriefResponseSchema>;
export type GeocodeResult = z.infer<typeof GeocodeResultSchema>;
export type GeocodeResponse = z.infer<typeof GeocodeResponseSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type PlanDayRequest = z.infer<typeof PlanDayRequestSchema>;
export type PlanDayExtracted = z.infer<typeof PlanDayExtractedSchema>;
export type PlanDayResponse = z.infer<typeof PlanDayResponseSchema>;
export type RoomCheckRequest = z.infer<typeof RoomCheckRequestSchema>;
export type RoomCheckResponse = z.infer<typeof RoomCheckResponseSchema>;
export type RoomHazardId = z.infer<typeof RoomHazardIdSchema>;
export type CostTier = z.infer<typeof CostTierSchema>;
export type DetectedHazard = z.infer<typeof DetectedHazardSchema>;
export type ExposureHitId = z.infer<typeof ExposureHitIdSchema>;
