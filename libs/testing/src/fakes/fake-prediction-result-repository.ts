// libs/testing/src/fakes/fake-prediction-result-repository.ts
import type {
  PredictionResultRepositoryPort,
  PredictionResultRecord,
  PredictionId,
} from '@betvision/domain';

/** In-memory PredictionResultRepositoryPort; accumulates every saved result. */
export class FakePredictionResultRepository implements PredictionResultRepositoryPort {
  readonly saved: PredictionResultRecord[] = [];

  async saveMany(records: ReadonlyArray<PredictionResultRecord>): Promise<void> {
    this.saved.push(...records);
  }

  async findByPrediction(predictionId: PredictionId): Promise<PredictionResultRecord[]> {
    return this.saved.filter((r) => r.predictionId === predictionId);
  }
}
