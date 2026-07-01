// libs/contracts/src/lib/analyze.ts
// "Analyze any free-text fixture" contracts (zod). POST /analyze takes a free-text query
// ("Portugal vs Spain"), researches it with Claude (web search) to ESTIMATE the quantitative
// inputs, then runs the SAME statistical pipeline and returns a bilingual, risk-graded betting
// recommendation. Every response carries an explicit AI-ESTIMATED-inputs disclaimer + provenance
// LLM_RESEARCH — it is NOT a licensed feed and is never presented as guaranteed data.
import { z } from 'zod';
import { localeSchema } from './common';
import { riskAppetiteSchema, predictionResponseDtoSchema } from './predictions';
import { analysisReportDtoSchema, sourceRefDtoSchema } from './reports';

/** POST /analyze — analyze a free-text fixture at a chosen risk appetite, in a language. */
export const analyzeFixtureRequestSchema = z.object({
  /** Free-text fixture, e.g. "Portugal vs Spain". */
  query: z.string().trim().min(1, { message: 'query is required' }),
  /** 0..100 slider. Omitted ⇒ 33 (conservative default). NEVER affects model probabilities. */
  riskAppetite: riskAppetiteSchema.default(33),
  /** Report + disclaimer language. Omitted ⇒ 'en'. */
  language: localeSchema.default('en'),
});
export type AnalyzeFixtureRequest = z.infer<typeof analyzeFixtureRequestSchema>;

/** The teams/competition resolved from the free-text query (AI-ESTIMATED). */
export const resolvedFixtureDtoSchema = z.object({
  home: z.object({ name: z.string(), country: z.string().nullable() }),
  away: z.object({ name: z.string(), country: z.string().nullable() }),
  competition: z.string().nullable(),
  kickoffUtc: z.string().nullable(),
});
export type ResolvedFixtureDto = z.infer<typeof resolvedFixtureDtoSchema>;

/**
 * POST /analyze response. Reuses the existing prediction + report DTOs verbatim (the numbers are
 * produced by the same statistical pipeline), plus the resolved fixture, the cited research
 * sources, and the mandatory AI-ESTIMATED-inputs disclaimer + provenance.
 */
export const analyzeFixtureResponseDtoSchema = z.object({
  query: z.string(),
  resolvedFixture: resolvedFixtureDtoSchema,
  /** Objective model probabilities + risk-shaped recommendations (same shape as POST /predictions). */
  prediction: predictionResponseDtoSchema,
  /** The bilingual AI analysis report (numbers verbatim; only prose is language-specific). */
  report: analysisReportDtoSchema,
  /** Cited sources the AI grounded its estimates in (provider LLM_RESEARCH). */
  sources: sourceRefDtoSchema.array(),
  /** Human-readable AI-ESTIMATED-inputs + responsible-gambling disclaimer (in `language`). */
  disclaimer: z.string(),
  /** Always true here — the quantitative inputs were ESTIMATED by AI, not sourced from a feed. */
  aiEstimatedInputs: z.literal(true),
  /** Provenance stamp on every research-sourced input. Always 'LLM_RESEARCH'. */
  provenance: z.literal('LLM_RESEARCH'),
});
export type AnalyzeFixtureResponseDto = z.infer<typeof analyzeFixtureResponseDtoSchema>;
