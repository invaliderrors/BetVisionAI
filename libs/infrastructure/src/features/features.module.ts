// libs/infrastructure/src/features/features.module.ts
// Phase-9 composition: binds the FeatureStore (Redis) + PredictionInput repository (Prisma) to
// their domain port tokens, and provides a ready-to-use ComputeFeaturesUseCase wired to the
// repository + provider ports. Relies on the @Global ConfigModule / RedisModule / PrismaModule /
// DevProvidersModule already being loaded by the composition root (api/worker).
import { Module } from '@nestjs/common';
import type { Redis } from 'ioredis';
import {
  FEATURE_STORE,
  PREDICTION_INPUT_REPOSITORY,
  SPORTS_DATA_PROVIDER,
  TEAM_STATS_PROVIDER,
  MATCH_REPOSITORY,
  TEAM_REPOSITORY,
  type FeatureStorePort,
  type PredictionInputRepositoryPort,
  type SportsDataProviderPort,
  type TeamStatsProviderPort,
  type MatchRepositoryPort,
  type TeamRepositoryPort,
} from '@betvision/domain';
import { ComputeFeaturesUseCase } from '@betvision/application';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { PrismaService } from '../prisma/prisma.service';
import { RedisFeatureStore } from './redis-feature-store';
import { PrismaPredictionInputRepository } from './prisma-prediction-input.repository';

@Module({
  providers: [
    {
      provide: FEATURE_STORE,
      inject: [REDIS_CLIENT],
      useFactory: (redis: Redis) => new RedisFeatureStore(redis),
    },
    {
      provide: PREDICTION_INPUT_REPOSITORY,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => new PrismaPredictionInputRepository(prisma),
    },
    {
      provide: ComputeFeaturesUseCase,
      inject: [
        MATCH_REPOSITORY,
        TEAM_REPOSITORY,
        SPORTS_DATA_PROVIDER,
        TEAM_STATS_PROVIDER,
        FEATURE_STORE,
        PREDICTION_INPUT_REPOSITORY,
      ],
      useFactory: (
        matches: MatchRepositoryPort,
        teams: TeamRepositoryPort,
        sportsData: SportsDataProviderPort,
        teamStats: TeamStatsProviderPort,
        featureStore: FeatureStorePort,
        predictionInputs: PredictionInputRepositoryPort,
      ) =>
        new ComputeFeaturesUseCase({
          matches,
          teams,
          sportsData,
          teamStats,
          featureStore,
          predictionInputs,
        }),
    },
  ],
  exports: [FEATURE_STORE, PREDICTION_INPUT_REPOSITORY, ComputeFeaturesUseCase],
})
export class FeaturesModule {}
