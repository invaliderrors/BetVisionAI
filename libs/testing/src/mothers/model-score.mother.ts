// libs/testing/src/mothers/model-score.mother.ts
import {
  ConfidenceLevel,
  RiskLevel,
  StatisticalPredictionService,
  STATISTICAL_MARKETS,
  type MarketKey,
  type MarketProbabilityDto,
  type ModelScoreResult,
  type ModelScoreRequest,
  type PredictionModelPort,
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

/**
 * A REAL, deterministic PredictionModelPort backed by the pure domain statistical service — the
 * same math the infrastructure adapter composes. Lets use-case tests exercise the true model
 * (reproducible outputs) without depending on libs/infrastructure.
 */
export class DomainStatisticalModel implements PredictionModelPort {
  private readonly service = new StatisticalPredictionService();
  async score(request: ModelScoreRequest): Promise<ModelScoreResult> {
    return this.service.score(request.features, request.markets);
  }
}

/** Expected model output for a given FeatureVector input (inputs → expected outputs mother). */
export const aStatisticalModelScore = (
  features: FeatureVector,
  markets: ReadonlyArray<MarketKey> = STATISTICAL_MARKETS,
): ModelScoreResult => new StatisticalPredictionService().score(features, markets);
