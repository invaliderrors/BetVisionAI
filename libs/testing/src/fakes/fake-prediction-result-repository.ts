// libs/testing/src/fakes/fake-prediction-result-repository.ts
import type {
  PredictionResultRepositoryPort,
  PredictionResultRecord,
  PredictionId,
} from '@betvision/domain';

/**
 * In-memory PredictionResultRepositoryPort. Upserts by the natural key
 * (predictionId, market, selection) so re-saving a result (e.g. value fields added by
 * DetectValueBets) UPDATES the row rather than duplicating it — matching the Prisma adapter.
 */
export class FakePredictionResultRepository implements PredictionResultRepositoryPort {
  readonly saved: PredictionResultRecord[] = [];

  async saveMany(records: ReadonlyArray<PredictionResultRecord>): Promise<void> {
    for (const record of records) {
      const i = this.saved.findIndex(
        (r) =>
          r.predictionId === record.predictionId &&
          r.market === record.market &&
          r.selection === record.selection,
      );
      if (i >= 0) this.saved[i] = record;
      else this.saved.push(record);
    }
  }

  async findByPrediction(predictionId: PredictionId): Promise<PredictionResultRecord[]> {
    return this.saved.filter((r) => r.predictionId === predictionId);
  }
}
