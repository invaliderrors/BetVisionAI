// apps/api/src/predictions/prediction-response.mapper.ts
// Maps application use-case views onto the wire DTOs (zod-typed). Kept in the composition layer:
// the domain uses string enums (nominal), the contracts use literal unions, so the enum bridges
// live here rather than leaking either way. No business logic — pure shape translation.
import { ConfidenceLevel, RiskLevel, RiskBucket } from '@betvision/domain';
import type {
  RunPredictionResult,
  DetectValueBetsResult,
  ValuedResultView,
  GetPredictionResult,
  StoredResultView,
  StoredRecommendationView,
} from '@betvision/application';
import type { RecommendationView } from '@betvision/domain';
import type {
  PredictionResponseDto,
  PredictionDetailDto,
  PredictionResultDto,
  RecommendationDto,
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

function resultDto(r: ValuedResultView | StoredResultView): PredictionResultDto {
  return {
    market: r.market as MarketKeyDto,
    selection: r.selection,
    modelProbability: r.modelProbability,
    impliedProbability: r.impliedProbability,
    edge: r.edge,
    expectedValue: r.expectedValue,
    suggestedStakePct: r.suggestedStakePct,
    confidence: CONFIDENCE_DTO[r.confidence],
    risk: RISK_DTO[r.risk],
  };
}

function fromRecommendationView(r: RecommendationView): RecommendationDto {
  return {
    market: r.market as MarketKeyDto,
    selection: r.selection,
    modelProbability: r.modelProbability,
    impliedProbability: r.impliedProbability,
    oddsDecimal: r.oddsDecimal,
    edge: r.edge,
    expectedValue: r.expectedValue,
    riskAdjustedExpectedValue: r.riskAdjustedExpectedValue,
    suggestedStakePct: r.suggestedStakePct,
    confidence: CONFIDENCE_DTO[r.confidence],
    risk: RISK_DTO[r.risk],
    rationaleCode: r.rationale,
    isBestBet: r.isBestBet,
  };
}

function fromStoredRecommendation(r: StoredRecommendationView): RecommendationDto {
  return {
    market: r.market as MarketKeyDto,
    selection: r.selection,
    modelProbability: r.modelProbability,
    impliedProbability: r.impliedProbability,
    oddsDecimal: r.oddsDecimal,
    edge: r.edge,
    expectedValue: r.expectedValue,
    riskAdjustedExpectedValue: null,
    suggestedStakePct: r.suggestedStakePct,
    confidence: CONFIDENCE_DTO[r.confidence],
    risk: RISK_DTO[r.risk],
    rationaleCode: r.rationale,
    isBestBet: r.isBestBet,
  };
}

/** POST /predictions — run (objective) + value detection (risk-shaped) combined. */
export function toPredictionResponse(
  run: RunPredictionResult,
  detect: DetectValueBetsResult,
): PredictionResponseDto {
  return {
    predictionId: run.predictionId as string,
    matchId: run.matchId as string,
    modelVersion: run.modelVersion,
    inputSnapshotHash: run.inputSnapshotHash,
    riskAppetite: detect.riskAppetite,
    riskBucket: BUCKET_DTO[detect.riskBucket],
    results: detect.results.map(resultDto),
    recommendations: detect.recommendations.map(fromRecommendationView),
    bestBet: detect.bestBet ? fromRecommendationView(detect.bestBet) : null,
    noValueFound: detect.noValueFound,
    hint: detect.hintCode,
  };
}

/** GET /predictions/:id — stored run + results + persisted recommendation set. */
export function toPredictionDetail(get: GetPredictionResult): PredictionDetailDto {
  return {
    predictionId: get.predictionId as string,
    matchId: get.matchId as string,
    modelVersion: get.modelVersion,
    inputSnapshotHash: get.inputSnapshotHash,
    riskAppetite: get.riskAppetite,
    riskBucket: get.riskBucket ? BUCKET_DTO[get.riskBucket] : null,
    results: get.results.map(resultDto),
    recommendations: get.recommendations.map(fromStoredRecommendation),
    bestBet: get.bestBet ? fromStoredRecommendation(get.bestBet) : null,
  };
}
