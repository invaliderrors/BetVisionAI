// libs/domain/src/ports/prediction-repository.port.ts
// Outbound port for the immutable Prediction run (SPEC §9 / Phase 10). Maps 1:1 onto the
// `predictions` table. A Prediction records WHICH model version scored WHICH match against WHICH
// feature snapshot (`inputSnapshotHash`) — the reproducibility anchor (NFR §4).
import type { MatchId, PredictionId, UserId } from './shared.dto';

export interface PredictionRecord {
  readonly id: PredictionId;
  readonly matchId: MatchId;
  /** Statistical/ML model version, e.g. 'stat-v1'. */
  readonly modelVersion: string;
  /** Hash of the exact feature vector scored — reproducibility. */
  readonly inputSnapshotHash: string;
  /** Optional requesting user (analyst-triggered runs). */
  readonly requestedById?: UserId;
}

export interface PredictionRepositoryPort {
  /** Persist a new prediction run. Idempotent upsert by id. */
  save(record: PredictionRecord): Promise<void>;
  findById(id: PredictionId): Promise<PredictionRecord | null>;
}
