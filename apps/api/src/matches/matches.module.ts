// apps/api/src/matches/matches.module.ts
// Composition root for the matches feature: binds the resolve-fixture + match-detail use
// cases to the domain repository tokens (provided globally by PrismaModule).
import { Module } from '@nestjs/common';
import {
  TEAM_REPOSITORY,
  MATCH_REPOSITORY,
  type TeamRepositoryPort,
  type MatchRepositoryPort,
} from '@betvision/domain';
import {
  ResolveFixtureUseCase,
  GetMatchDetailUseCase,
} from '@betvision/application';
import { MatchesController } from './matches.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Module({
  controllers: [MatchesController],
  providers: [
    JwtAuthGuard,
    {
      provide: ResolveFixtureUseCase,
      inject: [TEAM_REPOSITORY, MATCH_REPOSITORY],
      useFactory: (teams: TeamRepositoryPort, matches: MatchRepositoryPort) =>
        new ResolveFixtureUseCase(teams, matches),
    },
    {
      provide: GetMatchDetailUseCase,
      inject: [MATCH_REPOSITORY],
      useFactory: (matches: MatchRepositoryPort) =>
        new GetMatchDetailUseCase(matches),
    },
  ],
})
export class MatchesModule {}
