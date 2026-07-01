// libs/testing/src/mothers/model-score.mother.ts
import {
  ConfidenceLevel,
  RiskLevel,
  type MarketKey,
  type MarketProbabilityDto,
  type ModelScoreResult,
  type FeatureVector,
  type MatchId,
} from '@betvision/domain';

export const aMarketProbability = (
  over: Partial<MarketProbabilityDto> = {},
): MarketProbabilityDto => ({
  market: '1X2' as MarketKey,
  selection: 'HOME',
  modelProbability: 0.55,
  confidence: ConfidenceLevel.High,
  marketVolatility: RiskLevel.Low,
  ...over,
});

export const aModelScoreResult = (over: Partial<ModelScoreResult> = {}): ModelScoreResult => ({
  modelVersion: 'test-model-1',
  inputSnapshotHash: 'snapshot-hash-1',
  probabilities: [aMarketProbability()],
  ...over,
});

export const aFeatureVector = (over: Partial<FeatureVector> = {}): FeatureVector => ({
  matchId: 'match-1' as MatchId,
  version: 'fv-1',
  features: { homeForm: 0.6, awayForm: 0.4 },
  snapshotHash: 'snapshot-hash-1',
  ...over,
});
