// libs/infrastructure/src/prediction/statistical-prediction-model.ts
// Phase 10 — the StatisticalPredictionModel adapter: the infrastructure binding of
// PredictionModelPort. It composes the PURE domain services (Elo + Poisson/Dixon-Coles +
// calibration) via StatisticalPredictionService and exposes them behind the clean port
// (score(FeatureVector, markets) → probabilities). NO odds, NO risk appetite ever enter here.
//
// This is the swap seam: a future Python model-service adapter can implement the SAME port and be
// bound to the PREDICTION_MODEL token instead — the application layer never changes.
import { Injectable } from '@nestjs/common';
import {
  StatisticalPredictionService,
  DefaultEloRatingService,
  DefaultPoissonGoalModel,
  IdentityCalibrationMap,
  type PredictionModelPort,
  type ModelScoreRequest,
  type ModelScoreResult,
  type CalibrationMap,
  type StatisticalModelConfig,
} from '@betvision/domain';

@Injectable()
export class StatisticalPredictionModel implements PredictionModelPort {
  private readonly service: StatisticalPredictionService;

  constructor(calibration: CalibrationMap = new IdentityCalibrationMap(), config: StatisticalModelConfig = {}) {
    this.service = new StatisticalPredictionService(
      new DefaultEloRatingService(),
      new DefaultPoissonGoalModel(),
      calibration,
      config,
    );
  }

  async score(request: ModelScoreRequest): Promise<ModelScoreResult> {
    // Pure + synchronous under the hood; wrapped in a Promise to satisfy the async port.
    return this.service.score(request.features, request.markets);
  }
}
