// libs/testing/src/fakes/fake-prediction-model.port.ts
import type {
  PredictionModelPort,
  ModelScoreRequest,
  ModelScoreResult,
} from '@betvision/domain';

/** Returns canned, deterministic probabilities; records every request for assertions. */
export class FakePredictionModelPort implements PredictionModelPort {
  readonly calls: ModelScoreRequest[] = [];
  private canned: ModelScoreResult | null = null;

  seed(result: ModelScoreResult): this {
    this.canned = result;
    return this;
  }

  async score(request: ModelScoreRequest): Promise<ModelScoreResult> {
    this.calls.push(request);
    if (!this.canned) throw new Error('FakePredictionModelPort not seeded');
    return this.canned;
  }
}
