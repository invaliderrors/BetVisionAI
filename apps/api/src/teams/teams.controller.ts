// apps/api/src/teams/teams.controller.ts
// Team endpoints under /api/v1/teams: fuzzy search, detail, and rolling stats. Authenticated
// (JwtAuthGuard); reuses the shared zod contracts + the {data,error} envelope.
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  SearchTeamsUseCase,
  GetTeamDetailUseCase,
  GetTeamStatsUseCase,
} from '@betvision/application';
import type { TeamId } from '@betvision/domain';
import {
  teamSearchQuerySchema,
  type TeamSearchQuery,
  type TeamSearchResponse,
  type TeamDetailDto,
  type TeamStatsDto,
} from '@betvision/contracts';
import { ZodValidationPipe } from '../common/http/zod-validation.pipe';
import { unwrap } from '../common/result/unwrap';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'teams', version: '1' })
export class TeamsController {
  constructor(
    private readonly searchTeams: SearchTeamsUseCase,
    private readonly getTeamDetail: GetTeamDetailUseCase,
    private readonly getTeamStats: GetTeamStatsUseCase,
  ) {}

  @Get()
  async search(
    @Query(new ZodValidationPipe(teamSearchQuerySchema)) query: TeamSearchQuery,
  ): Promise<TeamSearchResponse> {
    return unwrap(
      await this.searchTeams.execute({ query: query.search, limit: query.limit }),
    );
  }

  @Get(':id')
  async detail(@Param('id') id: string): Promise<TeamDetailDto> {
    return unwrap(await this.getTeamDetail.execute({ teamId: id as TeamId }));
  }

  @Get(':id/stats')
  async stats(@Param('id') id: string): Promise<TeamStatsDto> {
    return unwrap(await this.getTeamStats.execute({ teamId: id as TeamId }));
  }
}
