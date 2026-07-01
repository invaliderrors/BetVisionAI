// apps/api/src/matches/matches.controller.ts
// Match endpoints under /api/v1/matches: free-text fixture resolution (ranked candidates)
// and canonical match detail. Authenticated (JwtAuthGuard); reuses the shared zod contracts
// + the {data,error} envelope. The static `search` route is declared before `:id`.
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  ResolveFixtureUseCase,
  GetMatchDetailUseCase,
} from '@betvision/application';
import type { CompetitionId, MatchId } from '@betvision/domain';
import {
  matchSearchQuerySchema,
  type MatchSearchQuery,
  type MatchSearchResponse,
  type MatchDetailDto,
} from '@betvision/contracts';
import { ZodValidationPipe } from '../common/http/zod-validation.pipe';
import { unwrap } from '../common/result/unwrap';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('matches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'matches', version: '1' })
export class MatchesController {
  constructor(
    private readonly resolveFixture: ResolveFixtureUseCase,
    private readonly getMatchDetail: GetMatchDetailUseCase,
  ) {}

  @Get('search')
  async search(
    @Query(new ZodValidationPipe(matchSearchQuerySchema)) query: MatchSearchQuery,
  ): Promise<MatchSearchResponse> {
    return unwrap(
      await this.resolveFixture.execute({
        query: query.q,
        competitionId: query.competitionId as CompetitionId | undefined,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        limit: query.limit,
      }),
    );
  }

  @Get(':id')
  async detail(@Param('id') id: string): Promise<MatchDetailDto> {
    return unwrap(await this.getMatchDetail.execute({ matchId: id as MatchId }));
  }
}
