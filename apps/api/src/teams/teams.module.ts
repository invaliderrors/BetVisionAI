// apps/api/src/teams/teams.module.ts
// Composition root for the teams feature: binds the search/detail/stats use cases to the
// TeamRepositoryPort token (provided globally by PrismaModule).
import { Module } from '@nestjs/common';
import { TEAM_REPOSITORY, type TeamRepositoryPort } from '@betvision/domain';
import {
  SearchTeamsUseCase,
  GetTeamDetailUseCase,
  GetTeamStatsUseCase,
} from '@betvision/application';
import { TeamsController } from './teams.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Module({
  controllers: [TeamsController],
  providers: [
    JwtAuthGuard,
    {
      provide: SearchTeamsUseCase,
      inject: [TEAM_REPOSITORY],
      useFactory: (teams: TeamRepositoryPort) => new SearchTeamsUseCase(teams),
    },
    {
      provide: GetTeamDetailUseCase,
      inject: [TEAM_REPOSITORY],
      useFactory: (teams: TeamRepositoryPort) => new GetTeamDetailUseCase(teams),
    },
    {
      provide: GetTeamStatsUseCase,
      inject: [TEAM_REPOSITORY],
      useFactory: (teams: TeamRepositoryPort) => new GetTeamStatsUseCase(teams),
    },
  ],
})
export class TeamsModule {}
