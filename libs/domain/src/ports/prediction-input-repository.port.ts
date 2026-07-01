// libs/domain/src/ports/prediction-input-repository.port.ts
// Outbound port for persisting the EXACT feature vector used by a prediction (reproducibility,
// SPEC NFR §4). Maps 1:1 onto the `prediction_inputs` table. The record is keyed by the owning
// `predictionId`; the feature pipeline persists it once a Prediction exists (Phase 10 links them).
import type { PredictionId } from './shared.dto';
import type { FeatureVector } from './feature-store.port';

export interface PredictionInputRecord {
  readonly predictionId: PredictionId;
  readonly featureVersion: string;
  /** The exact engineered feature vector (features + snapshot hash) stored verbatim. */
  readonly vector: FeatureVector;
}

export interface PredictionInputRepositoryPort {
  /** Idempotent upsert by predictionId (1:1). */
  save(record: PredictionInputRecord): Promise<void>;
}
