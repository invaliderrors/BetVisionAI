// libs/testing/src/fakes/fake-recommendation-repository.ts
import type {
  RecommendationRepositoryPort,
  RecommendationRecord,
  PredictionId,
} from '@betvision/domain';

/** In-memory RecommendationRepositoryPort. `replaceForPrediction` mirrors the atomic swap. */
export class FakeRecommendationRepository implements RecommendationRepositoryPort {
  readonly saved: RecommendationRecord[] = [];

  async replaceForPrediction(
    predictionId: PredictionId,
    riskAppetite: number,
    records: ReadonlyArray<RecommendationRecord>,
  ): Promise<void> {
    for (let i = this.saved.length - 1; i >= 0; i--) {
      const r = this.saved[i];
      if (r.predictionId === predictionId && r.riskAppetite === riskAppetite) {
        this.saved.splice(i, 1);
      }
    }
    this.saved.push(...records);
  }

  async findByPrediction(predictionId: PredictionId): Promise<RecommendationRecord[]> {
    return this.saved
      .filter((r) => r.predictionId === predictionId)
      .sort((a, b) => Number(b.isBestBet) - Number(a.isBestBet));
  }
}
