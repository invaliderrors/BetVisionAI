// libs/contracts/src/lib/predictions.ts
// Prediction + value-betting contracts (zod). Phase 11: POST /predictions runs the model then
// applies the caller's RiskAppetite (Feature Spec B); the response echoes the appetite + resolved
// bucket so the UI can show "analyzed at risk 45/100 (balanced)" and reports reproduce exactly.
// Shared by apps/api (validation) and apps/web (typed client). Contracts depend on `shared` only,
// so the market/level vocabularies are mirrored here as the WIRE format (kept in sync with domain).
import { z } from 'zod';

/** MarketKey wire vocabulary — mirrors the domain `MarketKey` union (SPEC §9 catalog). */
export const marketKeySchema = z.enum([
  '1X2',
  'DOUBLE_CHANCE',
  'DNB',
  'OU_0_5',
  'OU_1_5',
  'OU_2_5',
  'OU_3_5',
  'BTTS',
  'AH',
  'CORNERS_OU',
  'TEAM_CORNERS',
  'CARDS_OU',
  'TEAM_CARDS',
  'HTFT',
  'ANYTIME_SCORER',
  'CORRECT_SCORE',
]);
export type MarketKeyDto = z.infer<typeof marketKeySchema>;

export const confidenceLevelSchema = z.enum(['low', 'medium', 'high']);
export const riskLevelSchema = z.enum(['low', 'medium', 'high']);
export const riskBucketSchema = z.enum(['conservative', 'balanced', 'aggressive']);
export type RiskBucketDto = z.infer<typeof riskBucketSchema>;

/** Slider value: integer 0..100, product default 33 (Feature Spec B). */
export const riskAppetiteSchema = z.number().int().min(0).max(100);

/** POST /predictions — run a prediction for a fixture and shape it by RiskAppetite. */
export const createPredictionRequestSchema = z.object({
  matchId: z.string().trim().min(1, { message: 'matchId is required' }),
  /** Markets to score; defaults to the statistical set when omitted. */
  markets: marketKeySchema.array().min(1).optional(),
  /** 0..100. Omitted ⇒ 33 (conservative default). NEVER affects model probabilities. */
  riskAppetite: riskAppetiteSchema.default(33),
});
export type CreatePredictionRequest = z.infer<typeof createPredictionRequestSchema>;

/** One market/selection: objective model probability + (when odds exist) the value math. */
export const predictionResultDtoSchema = z.object({
  market: marketKeySchema,
  selection: z.string(),
  modelProbability: z.number(),
  impliedProbability: z.number().nullable(),
  edge: z.number().nullable(),
  expectedValue: z.number().nullable(),
  suggestedStakePct: z.number().nullable(),
  confidence: confidenceLevelSchema,
  risk: riskLevelSchema,
});
export type PredictionResultDto = z.infer<typeof predictionResultDtoSchema>;

/** A selection that passed the RiskProfile gates (best bet or ranked alternative). */
export const recommendationDtoSchema = z.object({
  market: marketKeySchema,
  selection: z.string(),
  modelProbability: z.number().nullable(),
  impliedProbability: z.number().nullable(),
  oddsDecimal: z.number().nullable(),
  edge: z.number().nullable(),
  expectedValue: z.number().nullable(),
  riskAdjustedExpectedValue: z.number().nullable(),
  suggestedStakePct: z.number().nullable(),
  confidence: confidenceLevelSchema,
  risk: riskLevelSchema,
  /** i18n rationale CODE (localized client-side). */
  rationaleCode: z.string(),
  isBestBet: z.boolean(),
});
export type RecommendationDto = z.infer<typeof recommendationDtoSchema>;

/** POST /predictions response — echoes the RiskAppetite used + resolved bucket. */
export const predictionResponseDtoSchema = z.object({
  predictionId: z.string(),
  matchId: z.string(),
  modelVersion: z.string(),
  inputSnapshotHash: z.string(),
  riskAppetite: riskAppetiteSchema,
  riskBucket: riskBucketSchema,
  results: predictionResultDtoSchema.array(),
  recommendations: recommendationDtoSchema.array(),
  bestBet: recommendationDtoSchema.nullable(),
  /** True when nothing cleared the gates for this appetite — a feature, not a failure. */
  noValueFound: z.boolean(),
  /** i18n code hint shown when `noValueFound` (e.g. suggest a higher-risk setting). */
  hint: z.string().nullable(),
});
export type PredictionResponseDto = z.infer<typeof predictionResponseDtoSchema>;

/** GET /predictions/:id response — stored run + results + persisted recommendation set. */
export const predictionDetailDtoSchema = z.object({
  predictionId: z.string(),
  matchId: z.string(),
  modelVersion: z.string(),
  inputSnapshotHash: z.string(),
  /** Null until a value-detection pass has persisted a recommendation set. */
  riskAppetite: riskAppetiteSchema.nullable(),
  riskBucket: riskBucketSchema.nullable(),
  results: predictionResultDtoSchema.array(),
  recommendations: recommendationDtoSchema.array(),
  bestBet: recommendationDtoSchema.nullable(),
});
export type PredictionDetailDto = z.infer<typeof predictionDetailDtoSchema>;
