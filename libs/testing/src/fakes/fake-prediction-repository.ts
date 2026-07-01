// libs/testing/src/fakes/fake-prediction-repository.ts
import type {
  PredictionRepositoryPort,
  PredictionRecord,
  PredictionId,
} from '@betvision/domain';

/** In-memory PredictionRepositoryPort; records every save (idempotent upsert by id). */
export class FakePredictionRepository implements PredictionRepositoryPort {
  readonly saved: PredictionRecord[] = [];
  private readonly byId = new Map<string, PredictionRecord>();

  async save(record: PredictionRecord): Promise<void> {
    this.saved.push(record);
    this.byId.set(record.id, record);
  }

  async findById(id: PredictionId): Promise<PredictionRecord | null> {
    return this.byId.get(id) ?? null;
  }
}
