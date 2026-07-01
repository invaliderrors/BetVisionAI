// libs/infrastructure/src/prediction/predictions.module.ts
// Phase-10 composition: binds the statistical model to PREDICTION_MODEL (swap seam for a future
// Python model-service) and the Prediction / PredictionResult repositories to their domain port
// tokens, then provides a ready-to-use RunPredictionUseCase wired to all collaborators.
//
// Relies on the @Global PrismaModule + FeaturesModule (ComputeFeaturesUseCase, FeatureStore,
// PredictionInput repo) already being loaded by the composition root (api/worker).
import { Module } from '@nestjs/common';
import {
  PREDICTION_MODEL,
  PREDICTION_REPOSITORY,
  PREDICTION_RESULT_REPOSITORY,
  PREDICTION_INPUT_REPOSITORY,
  ID_GENERATOR,
  type PredictionModelPort,
  type PredictionRepositoryPort,
  type PredictionResultRepositoryPort,
  type PredictionInputRepositoryPort,
  type IdGeneratorPort,
} from '@betvision/domain';
import { ComputeFeaturesUseCase, RunPredictionUseCase } from '@betvision/application';
import { PrismaService } from '../prisma/prisma.service';
import { FeaturesModule } from '../features/features.module';
import { PrismaPredictionRepository } from '../persistence/repositories/prisma-prediction.repository';
import { PrismaPredictionResultRepository } from '../persistence/repositories/prisma-prediction-result.repository';
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
  ],
  exports: [PREDICTION_MODEL, PREDICTION_REPOSITORY, PREDICTION_RESULT_REPOSITORY, RunPredictionUseCase],
})
export class PredictionsModule {}
