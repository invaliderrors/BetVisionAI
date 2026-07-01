// apps/api/src/reports/report-response.mapper.ts
// Maps the domain AnalysisReportRecord onto the wire AnalysisReportDto (zod-typed). Pure shape
// translation: the domain uses string enums (nominal), the contract uses literal unions, so the
// enum bridges live here. Numbers are copied verbatim — the mapper never derives one.
import {
  ConfidenceLevel,
  RiskLevel,
  RiskBucket,
  type AnalysisReportRecord,
  type ReportSelectionView,
} from '@betvision/domain';
import type {
  AnalysisReportDto,
  ReportSelectionDto,
  MarketKeyDto,
} from '@betvision/contracts';

const CONFIDENCE_DTO: Readonly<Record<ConfidenceLevel, 'low' | 'medium' | 'high'>> = {
  [ConfidenceLevel.Low]: 'low',
  [ConfidenceLevel.Medium]: 'medium',
  [ConfidenceLevel.High]: 'high',
};
const RISK_DTO: Readonly<Record<RiskLevel, 'low' | 'medium' | 'high'>> = {
  [RiskLevel.Low]: 'low',
  [RiskLevel.Medium]: 'medium',
  [RiskLevel.High]: 'high',
};
const BUCKET_DTO: Readonly<Record<RiskBucket, 'conservative' | 'balanced' | 'aggressive'>> = {
  [RiskBucket.Conservative]: 'conservative',
  [RiskBucket.Balanced]: 'balanced',
  [RiskBucket.Aggressive]: 'aggressive',
};

function selectionDto(v: ReportSelectionView): ReportSelectionDto {
  return {
    market: v.market as MarketKeyDto,
    selection: v.selection,
    modelProbability: v.modelProbability,
    impliedProbability: v.impliedProbability,
    edge: v.edge,
    expectedValue: v.expectedValue,
    suggestedStakePct: v.suggestedStakePct,
    confidence: CONFIDENCE_DTO[v.confidence],
    risk: RISK_DTO[v.risk],
    rationaleCode: v.rationaleCode,
    isBestBet: v.isBestBet,
  };
}

export function toAnalysisReportDto(record: AnalysisReportRecord): AnalysisReportDto {
  const c = record.content;
  return {
    id: record.id as string,
    predictionId: record.predictionId as string,
    matchId: record.matchId as string,
    language: record.language,
    summary: c.summary,
    recentForm: c.recentForm,
    keyDataPoints: [...c.keyDataPoints],
    risks: [...c.risks],
    keyVariables: [...c.keyVariables],
    reasoning: c.reasoning,
    marketRationale: c.marketRationale,
    responsibleGamblingWarning: c.responsibleGamblingWarning,
    predictions: c.predictions.map(selectionDto),
    recommendedMarkets: c.recommendedMarkets.map(selectionDto),
    bestBet: c.bestBet ? selectionDto(c.bestBet) : null,
    alternatives: c.alternatives.map(selectionDto),
    confidence: c.confidence ? CONFIDENCE_DTO[c.confidence] : null,
    risk: c.risk ? RISK_DTO[c.risk] : null,
    sources: record.sources.map((s) => ({
      label: s.label,
      provider: s.provider,
      ...(s.url !== undefined ? { url: s.url } : {}),
    })),
    riskAppetite: record.riskAppetite,
    riskBucket: BUCKET_DTO[record.riskBucket],
    generatedAt: record.generatedAt,
    modelVersion: record.modelVersion,
  };
}
