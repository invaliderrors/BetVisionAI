// libs/domain/src/ports/prediction-result-repository.port.ts
// Outbound port for per-market/selection prediction outputs (SPEC §9 / Phase 10). Maps onto the
// `prediction_results` table. OBJECTIVE numbers only: the model probability plus its confidence
// and market volatility. Value-betting fields (implied/edge/EV/stake) are Phase-11 additions and
// stay optional here; risk-appetite GATING is computed per request and never stored on results.
import type { PredictionId } from './shared.dto';
import type { MarketKey } from '../value-objects/market';
import type { ConfidenceLevel, RiskLevel } from '../value-objects/levels';

export interface PredictionResultRecord {
  readonly predictionId: PredictionId;
  readonly market: MarketKey;
  readonly selection: string;
  /** Calibrated model probability in [0,1]. Persisted as Decimal for reproducible precision. */
  readonly modelProbability: number;
  readonly confidence: ConfidenceLevel;
  /** Intrinsic market volatility (drives risk gating). */
  readonly risk: RiskLevel;
  // --- Phase-11 value-betting fields (unset in Phase 10) ---
  readonly impliedProbability?: number;
  readonly edge?: number;
  readonly expectedValue?: number;
  readonly suggestedStakePct?: number;
}

export interface PredictionResultRepositoryPort {
  /** Persist all results for a prediction. Idempotent by (predictionId, market, selection). */
  saveMany(records: ReadonlyArray<PredictionResultRecord>): Promise<void>;
  findByPrediction(predictionId: PredictionId): Promise<PredictionResultRecord[]>;
}
