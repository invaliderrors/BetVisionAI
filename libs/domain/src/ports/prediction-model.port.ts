// libs/domain/src/ports/prediction-model.port.ts
import type { MatchId } from './shared.dto';
import type { MarketKey } from '../value-objects/market';
import type { FeatureVector } from './feature-store.port';
import type { ConfidenceLevel, RiskLevel } from '../value-objects/levels';

/**
 * THE ONLY PRODUCER OF PROBABILITIES. Input is a feature vector — NOT odds, NOT riskAppetite.
 * Output probabilities are plain numbers in [0,1] (wrapped into Probability VOs by the caller).
 * `marketVolatility` is the model's intrinsic variance for the market (drives risk gating).
 */
export interface ModelScoreRequest {
  readonly matchId: MatchId;
  readonly features: FeatureVector;
  readonly markets: ReadonlyArray<MarketKey>;
}

export interface MarketProbabilityDto {
  readonly market: MarketKey;
  readonly selection: string;
  readonly modelProbability: number; // [0,1]
  readonly confidence: ConfidenceLevel;
  readonly marketVolatility: RiskLevel;
}

export interface ModelScoreResult {
  readonly modelVersion: string;
  readonly inputSnapshotHash: string;
  readonly probabilities: ReadonlyArray<MarketProbabilityDto>;
}

export interface PredictionModelPort {
  score(request: ModelScoreRequest): Promise<ModelScoreResult>;
}
