// libs/domain/src/ports/recommendation-repository.port.ts
// Outbound port for persisted Recommendations (SPEC §14 / Phase 11). Maps onto the
// `recommendations` table. A Recommendation stores the RiskAppetite + resolved bucket used, so a
// re-analysis at the same appetite reproduces exactly (Feature Spec B). The value math
// (edge/EV/stake) is NOT duplicated here — it lives on the linked PredictionResult (updated for
// transparency); a recommendation just points at the (market, selection) that passed the gates.
import type { PredictionId } from './shared.dto';
import type { MarketKey } from '../value-objects/market';
import type { ConfidenceLevel, RiskLevel } from '../value-objects/levels';
import type { RiskBucket } from '../value-objects/risk-appetite';
import type { RecommendationRationale } from '../recommendations/recommendation.entity';

export interface RecommendationRecord {
  readonly predictionId: PredictionId;
  readonly market: MarketKey;
  readonly selection: string;
  /** i18n rationale CODE (never a localized string). */
  readonly rationale: RecommendationRationale | string;
  readonly confidence: ConfidenceLevel;
  readonly risk: RiskLevel;
  readonly isBestBet: boolean;
  /** Risk Appetite provenance (0..100 slider value used) + resolved bucket. */
  readonly riskAppetite: number;
  readonly riskBucket: RiskBucket;
}

export interface RecommendationRepositoryPort {
  /**
   * Replace the recommendation set for one (prediction, riskAppetite) atomically — deletes the
   * previous set for that appetite then inserts `records`. Idempotent: re-analysing the same
   * fixture at the same appetite leaves a single, current set. An empty `records` array is valid
   * (an honest "no value found" clears any stale set).
   */
  replaceForPrediction(
    predictionId: PredictionId,
    riskAppetite: number,
    records: ReadonlyArray<RecommendationRecord>,
  ): Promise<void>;

  /** All recommendations for a prediction (best bet first). */
  findByPrediction(predictionId: PredictionId): Promise<RecommendationRecord[]>;
}
