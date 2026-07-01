// libs/application/src/predictions/run-prediction.use-case.ts
// Phase 10 — RunPredictionUseCase. Orchestrates the first Statistical Prediction Engine end to
// end for a fixture:
//   features (ComputeFeaturesUseCase) → score (PredictionModelPort) → persist
//   Prediction + PredictionInput(FK, exact vector) + PredictionResult[] (one per market/selection).
//
// REPRODUCIBILITY (SPEC NFR §4): the Prediction stores `modelVersion` + `inputSnapshotHash`
// (= the feature vector hash). Running the same fixture again with the same feature version yields
// IDENTICAL probabilities and the SAME snapshot hash (the model is a pure function of features).
//
// PRODUCT GUARDRAIL: probabilities come ONLY from the model (features in). This use case never
// touches odds or risk appetite — that is Phase 11 (value betting + gating).
import { Result, ok, err, DomainError, DomainErrorCode } from '@betvision/shared';
import {
  isStatisticalMarket,
  STATISTICAL_MARKETS,
  type PredictionModelPort,
  type PredictionRepositoryPort,
  type PredictionResultRepositoryPort,
  type PredictionInputRepositoryPort,
  type PredictionResultRecord,
  type IdGeneratorPort,
  type MarketProbabilityDto,
  type MatchId,
  type PredictionId,
  type UserId,
  type MarketKey,
} from '@betvision/domain';
import { ComputeFeaturesUseCase } from '../features/compute-features.use-case';

export interface RunPredictionCommand {
  readonly matchId: MatchId;
  /** Markets to score. Defaults to the full statistical set (1X2, O/U 0.5–3.5, BTTS). */
  readonly markets?: ReadonlyArray<MarketKey>;
  /** Optional requesting user (analyst-triggered runs). */
  readonly requestedById?: UserId;
}

export interface RunPredictionResult {
  readonly predictionId: PredictionId;
  readonly matchId: MatchId;
  readonly modelVersion: string;
  readonly inputSnapshotHash: string;
  readonly results: ReadonlyArray<MarketProbabilityDto>;
}

export interface RunPredictionDeps {
  readonly computeFeatures: ComputeFeaturesUseCase;
  readonly model: PredictionModelPort;
  readonly predictions: PredictionRepositoryPort;
  readonly predictionResults: PredictionResultRepositoryPort;
  readonly predictionInputs: PredictionInputRepositoryPort;
  readonly ids: IdGeneratorPort;
}

export class RunPredictionUseCase {
  constructor(private readonly deps: RunPredictionDeps) {}

  async execute(command: RunPredictionCommand): Promise<Result<RunPredictionResult, DomainError>> {
    const markets = command.markets ?? STATISTICAL_MARKETS;

    // Guard: the statistical model only produces a fixed market set (SPEC §13). Reject early
    // rather than silently dropping unknown markets.
    const unsupported = markets.find((m) => !isStatisticalMarket(m));
    if (unsupported) {
      return err(DomainError.of(DomainErrorCode.MARKET_NOT_SUPPORTED, { market: unsupported }));
    }

    // 1) Build (or cache-hit) the reproducible feature vector. Match-not-found bubbles up here.
    const features = await this.deps.computeFeatures.execute({ matchId: command.matchId });
    if (!features.ok) return err(features.error);
    const vector = features.value;

    // 2) Score from features ONLY (no odds, no risk appetite).
    const scored = await this.deps.model.score({
      matchId: command.matchId,
      features: vector,
      markets,
    });

    // 3) Persist in FK order: Prediction → PredictionInput (1:1) → PredictionResult[].
    const predictionId = this.deps.ids.newId() as PredictionId;
    await this.deps.predictions.save({
      id: predictionId,
      matchId: command.matchId,
      modelVersion: scored.modelVersion,
      inputSnapshotHash: scored.inputSnapshotHash,
      requestedById: command.requestedById,
    });

    await this.deps.predictionInputs.save({
      predictionId,
      featureVersion: vector.version,
      vector,
    });

    const results: PredictionResultRecord[] = scored.probabilities.map((p) => ({
      predictionId,
      market: p.market,
      selection: p.selection,
      modelProbability: p.modelProbability,
      confidence: p.confidence,
      risk: p.marketVolatility,
    }));
    await this.deps.predictionResults.saveMany(results);

    return ok({
      predictionId,
      matchId: command.matchId,
      modelVersion: scored.modelVersion,
      inputSnapshotHash: scored.inputSnapshotHash,
      results: scored.probabilities,
    });
  }
}
