// apps/api/src/competitions/competitions.module.ts
// Composition root for the competitions feature: binds the list + seasons use cases to the
// CompetitionRepositoryPort token (provided globally by PrismaModule).
import { Module } from '@nestjs/common';
import {
  COMPETITION_REPOSITORY,
  type CompetitionRepositoryPort,
} from '@betvision/domain';
import {
  ListCompetitionsUseCase,
  GetCompetitionSeasonsUseCase,
} from '@betvision/application';
import { CompetitionsController } from './competitions.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Module({
  controllers: [CompetitionsController],
  providers: [
    JwtAuthGuard,
    {
      provide: ListCompetitionsUseCase,
      inject: [COMPETITION_REPOSITORY],
      useFactory: (competitions: CompetitionRepositoryPort) =>
        new ListCompetitionsUseCase(competitions),
    },
    {
      provide: GetCompetitionSeasonsUseCase,
      inject: [COMPETITION_REPOSITORY],
      useFactory: (competitions: CompetitionRepositoryPort) =>
        new GetCompetitionSeasonsUseCase(competitions),
    },
  ],
})
export class CompetitionsModule {}
