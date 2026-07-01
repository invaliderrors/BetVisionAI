// libs/infrastructure/src/prediction/predictions.module.ts
// Phase-10 + Phase-11 composition. Binds the statistical model to PREDICTION_MODEL (swap seam for
// a future Python model-service) and the Prediction / PredictionResult / Recommendation
// repositories to their domain port tokens, then provides ready-to-use use cases:
//   - RunPredictionUseCase (Phase 10: score + persist objective probabilities)
//   - DetectValueBetsUseCase (Phase 11: odds + RiskAppetite → gated, staked recommendations)
//   - GetPredictionUseCase (Phase 11: read model for GET /predictions/:id)
//
// The pure domain services (ValueCalculator / KellyStakeService / RiskProfileService) have no IO,
// so they are constructed inline in the value-betting factory rather than via DI tokens.
// Relies on the @Global PrismaModule (PrismaService, ODDS_REPOSITORY) + FeaturesModule
// (ComputeFeaturesUseCase, PredictionInput repo) + AuthInfraModule (ID_GENERATOR).
import { Module } from '@nestjs/common';
import {
  PREDICTION_MODEL,
  PREDICTION_REPOSITORY,
  PREDICTION_RESULT_REPOSITORY,
  PREDICTION_INPUT_REPOSITORY,
  RECOMMENDATION_REPOSITORY,
  ODDS_REPOSITORY,
  ID_GENERATOR,
  DefaultValueCalculator,
  DefaultKellyStakeService,
  DefaultRiskProfileService,
  type PredictionModelPort,
  type PredictionRepositoryPort,
  type PredictionResultRepositoryPort,
  type PredictionInputRepositoryPort,
  type RecommendationRepositoryPort,
  type OddsRepositoryPort,
  type IdGeneratorPort,
} from '@betvision/domain';
import {
  ComputeFeaturesUseCase,
  RunPredictionUseCase,
  DetectValueBetsUseCase,
  GetPredictionUseCase,
} from '@betvision/application';
import { PrismaService } from '../prisma/prisma.service';
import { FeaturesModule } from '../features/features.module';
import { PrismaPredictionRepository } from '../persistence/repositories/prisma-prediction.repository';
import { PrismaPredictionResultRepository } from '../persistence/repositories/prisma-prediction-result.repository';
import { PrismaRecommendationRepository } from '../persistence/repositories/prisma-recommendation.repository';
import { StatisticalPredictionModel } from './statistical-prediction-model';

@Module({
  imports: [FeaturesModule],
  providers: [
    {
      provide: PREDICTION_MODEL,
      useFactory: () => new StatisticalPredictionModel(),
    },
    {
      provide: PREDICTION_REPOSITORY,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => new PrismaPredictionRepository(prisma),
    },
    {
      provide: PREDICTION_RESULT_REPOSITORY,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => new PrismaPredictionResultRepository(prisma),
    },
    {
      provide: RECOMMENDATION_REPOSITORY,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => new PrismaRecommendationRepository(prisma),
    },
    {
      provide: RunPredictionUseCase,
      inject: [
        ComputeFeaturesUseCase,
        PREDICTION_MODEL,
        PREDICTION_REPOSITORY,
        PREDICTION_RESULT_REPOSITORY,
        PREDICTION_INPUT_REPOSITORY,
        ID_GENERATOR,
      ],
      useFactory: (
        computeFeatures: ComputeFeaturesUseCase,
        model: PredictionModelPort,
        predictions: PredictionRepositoryPort,
        predictionResults: PredictionResultRepositoryPort,
        predictionInputs: PredictionInputRepositoryPort,
        ids: IdGeneratorPort,
      ) =>
        new RunPredictionUseCase({
          computeFeatures,
          model,
          predictions,
          predictionResults,
          predictionInputs,
          ids,
        }),
    },
    {
      provide: DetectValueBetsUseCase,
      inject: [
        PREDICTION_REPOSITORY,
        PREDICTION_RESULT_REPOSITORY,
        ODDS_REPOSITORY,
        RECOMMENDATION_REPOSITORY,
      ],
      useFactory: (
        predictions: PredictionRepositoryPort,
        predictionResults: PredictionResultRepositoryPort,
        odds: OddsRepositoryPort,
        recommendations: RecommendationRepositoryPort,
      ) =>
        new DetectValueBetsUseCase({
          predictions,
          predictionResults,
          odds,
          recommendations,
          riskProfiles: new DefaultRiskProfileService(),
          valueCalculator: new DefaultValueCalculator(),
          kelly: new DefaultKellyStakeService(),
        }),
    },
    {
      provide: GetPredictionUseCase,
      inject: [PREDICTION_REPOSITORY, PREDICTION_RESULT_REPOSITORY, RECOMMENDATION_REPOSITORY],
      useFactory: (
        predictions: PredictionRepositoryPort,
        predictionResults: PredictionResultRepositoryPort,
        recommendations: RecommendationRepositoryPort,
      ) => new GetPredictionUseCase({ predictions, predictionResults, recommendations }),
    },
  ],
  exports: [
    PREDICTION_MODEL,
    PREDICTION_REPOSITORY,
    PREDICTION_RESULT_REPOSITORY,
    RECOMMENDATION_REPOSITORY,
    RunPredictionUseCase,
    DetectValueBetsUseCase,
    GetPredictionUseCase,
  ],
})
export class PredictionsModule {}
