// libs/domain/src/reports/analysis-report.ts
// Phase 12 — the immutable, bilingual AI analysis report. It is assembled AROUND the persisted
// numbers (Phase 10/11): the LLM only writes prose, so every numeric field here is copied verbatim
// from the PredictionResult / Recommendation records. The SAME prediction re-rendered in the other
// language keeps byte-identical numbers — only the prose sections change.
import type { MarketKey } from '../value-objects/market';
import type { ConfidenceLevel, RiskLevel } from '../value-objects/levels';
import type { SourceRef } from '../ports/llm-explanation.port';
import type { Locale, MatchId, PredictionId, ReportId, IsoDateTime } from '../ports/shared.dto';
import type { RiskBucket } from '../value-objects/risk-appetite';

/**
 * One market/selection line in a report. Numbers come straight from the persisted records; the
 * `rationaleCode` is an i18n CODE (localized client-side, mirroring the predictions contract) —
 * never a localized string here.
 */
export interface ReportSelectionView {
  readonly market: MarketKey;
  readonly selection: string;
  readonly modelProbability: number; // 0..1, verbatim
  readonly impliedProbability: number | null;
  readonly edge: number | null;
  readonly expectedValue: number | null;
  readonly suggestedStakePct: number | null; // bankroll fraction (0..1)
  readonly confidence: ConfidenceLevel;
  readonly risk: RiskLevel;
  /** i18n RecommendationRationale code ('' for objective, non-recommended results). */
  readonly rationaleCode: string;
  readonly isBestBet: boolean;
}

/**
 * The structured report sections. Prose fields (summary/recentForm/reasoning/marketRationale,
 * risks/keyVariables) are LLM- or template-authored in the report language; the selection lists
 * and keyDataPoints are assembled from the persisted numbers by the use case (LLM-free), so the
 * guardrail-checked prose can never be the source of a number.
 */
export interface AnalysisReportContent {
  readonly summary: string;
  readonly recentForm: string;
  readonly keyDataPoints: ReadonlyArray<string>;
  readonly risks: ReadonlyArray<string>;
  readonly keyVariables: ReadonlyArray<string>;
  readonly reasoning: string;
  readonly marketRationale: string;
  readonly predictions: ReadonlyArray<ReportSelectionView>;
  readonly recommendedMarkets: ReadonlyArray<ReportSelectionView>;
  readonly bestBet: ReportSelectionView | null;
  readonly alternatives: ReadonlyArray<ReportSelectionView>;
  readonly confidence: ConfidenceLevel | null;
  readonly risk: RiskLevel | null;
  readonly responsibleGamblingWarning: string;
}

/** The immutable persisted/cached report aggregate (maps onto the `analysis_reports` table). */
export interface AnalysisReportRecord {
  readonly id: ReportId;
  readonly matchId: MatchId;
  readonly predictionId: PredictionId;
  readonly language: Locale;
  readonly content: AnalysisReportContent;
  /** Model version that produced the numbers (from the Prediction run). */
  readonly modelVersion: string;
  /** A short, representative narrative string (persisted to the `narrative` column). */
  readonly narrative: string;
  readonly sources: ReadonlyArray<SourceRef>;
  /** RiskAppetite provenance: the slider value + resolved bucket that produced the recommendations. */
  readonly riskAppetite: number;
  readonly riskBucket: RiskBucket;
  readonly generatedAt: IsoDateTime;
}
