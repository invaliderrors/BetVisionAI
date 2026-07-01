// libs/application/src/predictions/get-prediction.use-case.ts
// Phase 11 — read model for GET /predictions/:id. Assembles the immutable prediction run
// (Phase 10) + its per-selection value fields (Phase 11, stored on PredictionResult) + the latest
// persisted Recommendations (with their RiskAppetite/bucket provenance). Pure read; no scoring,
// no odds fetch — everything was computed and persisted by Run + DetectValueBets.
import { Result, ok, err, DomainError, DomainErrorCode } from '@betvision/shared';
import type {
  PredictionRepositoryPort,
  PredictionResultRepositoryPort,
  RecommendationRepositoryPort,
  PredictionResultRecord,
  RecommendationRecord,
  ConfidenceLevel,
  RiskLevel,
  RiskBucket,
  MarketKey,
  MatchId,
  PredictionId,
} from '@betvision/domain';

export interface GetPredictionQuery {
  readonly predictionId: PredictionId;
}

export interface StoredResultView {
  readonly market: MarketKey;
  readonly selection: string;
  readonly modelProbability: number;
  readonly impliedProbability: number | null;
  readonly edge: number | null;
  readonly expectedValue: number | null;
  readonly suggestedStakePct: number | null;
  readonly confidence: ConfidenceLevel;
  readonly risk: RiskLevel;
}

export interface StoredRecommendationView {
  readonly market: MarketKey;
  readonly selection: string;
  readonly modelProbability: number | null;
  readonly impliedProbability: number | null;
  readonly oddsDecimal: number | null;
  readonly edge: number | null;
  readonly expectedValue: number | null;
  readonly suggestedStakePct: number | null;
  readonly confidence: ConfidenceLevel;
  readonly risk: RiskLevel;
  readonly rationale: string;
  readonly isBestBet: boolean;
}

export interface GetPredictionResult {
  readonly predictionId: PredictionId;
  readonly matchId: MatchId;
  readonly modelVersion: string;
  readonly inputSnapshotHash: string;
  readonly results: ReadonlyArray<StoredResultView>;
  readonly recommendations: ReadonlyArray<StoredRecommendationView>;
  readonly bestBet: StoredRecommendationView | null;
  /** The RiskAppetite/bucket of the currently-persisted recommendation set (null if none). */
  readonly riskAppetite: number | null;
  readonly riskBucket: RiskBucket | null;
}

export interface GetPredictionDeps {
  readonly predictions: PredictionRepositoryPort;
  readonly predictionResults: PredictionResultRepositoryPort;
  readonly recommendations: RecommendationRepositoryPort;
}

export class GetPredictionUseCase {
  constructor(private readonly deps: GetPredictionDeps) {}

  async execute(query: GetPredictionQuery): Promise<Result<GetPredictionResult, DomainError>> {
    const prediction = await this.deps.predictions.findById(query.predictionId);
    if (!prediction) {
      return err(
        DomainError.of(DomainErrorCode.PREDICTION_NOT_FOUND, { predictionId: query.predictionId }),
      );
    }

    const results = await this.deps.predictionResults.findByPrediction(query.predictionId);
    const recommendations = await this.deps.recommendations.findByPrediction(query.predictionId);
    const resultByKey = new Map(results.map((r) => [`${r.market}|${r.selection}`, r]));

    const recViews = recommendations.map((rec) =>
      toRecommendationView(rec, resultByKey.get(`${rec.market}|${rec.selection}`)),
    );

    const appetite = recommendations[0]?.riskAppetite ?? null;
    const bucket = recommendations[0]?.riskBucket ?? null;

    return ok({
      predictionId: query.predictionId,
      matchId: prediction.matchId,
      modelVersion: prediction.modelVersion,
      inputSnapshotHash: prediction.inputSnapshotHash,
      results: results.map(toResultView),
      recommendations: recViews,
      bestBet: recViews.find((r) => r.isBestBet) ?? null,
      riskAppetite: appetite,
      riskBucket: bucket,
    });
  }
}

function toResultView(r: PredictionResultRecord): StoredResultView {
  return {
    market: r.market,
    selection: r.selection,
    modelProbability: r.modelProbability,
    impliedProbability: r.impliedProbability ?? null,
    edge: r.edge ?? null,
    expectedValue: r.expectedValue ?? null,
    suggestedStakePct: r.suggestedStakePct ?? null,
    confidence: r.confidence,
    risk: r.risk,
  };
}

/** Join a stored recommendation to its PredictionResult for the value math (odds are not stored). */
function toRecommendationView(
  rec: RecommendationRecord,
  result: PredictionResultRecord | undefined,
): StoredRecommendationView {
  return {
    market: rec.market,
    selection: rec.selection,
    modelProbability: result ? result.modelProbability : null,
    impliedProbability: result?.impliedProbability ?? null,
    oddsDecimal: null,
    edge: result?.edge ?? null,
    expectedValue: result?.expectedValue ?? null,
    suggestedStakePct: result?.suggestedStakePct ?? null,
    confidence: rec.confidence,
    risk: rec.risk,
    rationale: rec.rationale,
    isBestBet: rec.isBestBet,
  };
}
