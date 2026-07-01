// libs/contracts/src/lib/reports.ts
// Phase 12 — AI-generated analysis report contracts (zod). The report is EXPLAINABLE and bilingual
// but NEVER alters the numbers: every numeric field is copied verbatim from the persisted
// prediction/value records; only the prose sections change with `language`. Selection lines carry
// the i18n rationale CODE (localized client-side), mirroring the predictions contract.
import { z } from 'zod';
import { localeSchema } from './common';
import {
  marketKeySchema,
  confidenceLevelSchema,
  riskLevelSchema,
  riskBucketSchema,
  riskAppetiteSchema,
} from './predictions';

/** A cited source snippet reference (RAG). */
export const sourceRefDtoSchema = z.object({
  label: z.string(),
  provider: z.string(),
  url: z.string().optional(),
});
export type SourceRefDto = z.infer<typeof sourceRefDtoSchema>;

/** One market/selection line in a report (numbers verbatim; rationale CODE localized client-side). */
export const reportSelectionDtoSchema = z.object({
  market: marketKeySchema,
  selection: z.string(),
  modelProbability: z.number(),
  impliedProbability: z.number().nullable(),
  edge: z.number().nullable(),
  expectedValue: z.number().nullable(),
  suggestedStakePct: z.number().nullable(),
  confidence: confidenceLevelSchema,
  risk: riskLevelSchema,
  /** i18n RecommendationRationale code ('' for objective, non-recommended results). */
  rationaleCode: z.string(),
  isBestBet: z.boolean(),
});
export type ReportSelectionDto = z.infer<typeof reportSelectionDtoSchema>;

/** GET /reports/:id and POST /predictions/:id/report response body. */
export const analysisReportDtoSchema = z.object({
  id: z.string(),
  predictionId: z.string(),
  matchId: z.string(),
  language: localeSchema,
  // Prose sections (LLM- or template-authored in `language`).
  summary: z.string(),
  recentForm: z.string(),
  keyDataPoints: z.string().array(),
  risks: z.string().array(),
  keyVariables: z.string().array(),
  reasoning: z.string(),
  marketRationale: z.string(),
  responsibleGamblingWarning: z.string(),
  // Numeric sections (verbatim from persisted records).
  predictions: reportSelectionDtoSchema.array(),
  recommendedMarkets: reportSelectionDtoSchema.array(),
  bestBet: reportSelectionDtoSchema.nullable(),
  alternatives: reportSelectionDtoSchema.array(),
  confidence: confidenceLevelSchema.nullable(),
  risk: riskLevelSchema.nullable(),
  sources: sourceRefDtoSchema.array(),
  // RiskAppetite provenance + meta.
  riskAppetite: riskAppetiteSchema,
  riskBucket: riskBucketSchema,
  generatedAt: z.string(),
  modelVersion: z.string(),
});
export type AnalysisReportDto = z.infer<typeof analysisReportDtoSchema>;

/** Query param for (re)generating a report in a language (POST /predictions/:id/report). */
export const generateReportQuerySchema = z.object({
  language: localeSchema.default('en'),
});
export type GenerateReportQuery = z.infer<typeof generateReportQuerySchema>;
