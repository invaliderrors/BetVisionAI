// libs/testing/src/fakes/fake-prediction-input-repository.ts
import type {
  PredictionInputRepositoryPort,
  PredictionInputRecord,
} from '@betvision/domain';

/** In-memory PredictionInputRepositoryPort; records every save (idempotent by predictionId). */
export class FakePredictionInputRepository implements PredictionInputRepositoryPort {
  readonly saved: PredictionInputRecord[] = [];
  private readonly byPrediction = new Map<string, PredictionInputRecord>();

  async save(record: PredictionInputRecord): Promise<void> {
    this.saved.push(record);
    this.byPrediction.set(record.predictionId, record);
  }

  get(predictionId: string): PredictionInputRecord | null {
    return this.byPrediction.get(predictionId) ?? null;
  }
}
