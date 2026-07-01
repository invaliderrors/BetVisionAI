// apps/api/src/competitions/competitions.controller.ts
// Competition endpoints under /api/v1/competitions: list the catalog + a competition's
// seasons. Authenticated (JwtAuthGuard); reuses the {data,error} envelope.
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  ListCompetitionsUseCase,
  GetCompetitionSeasonsUseCase,
} from '@betvision/application';
import type { CompetitionId } from '@betvision/domain';
import type {
  CompetitionListResponse,
  SeasonListResponse,
} from '@betvision/contracts';
import { unwrap } from '../common/result/unwrap';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('competitions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'competitions', version: '1' })
export class CompetitionsController {
  constructor(
    private readonly listCompetitions: ListCompetitionsUseCase,
    private readonly getSeasons: GetCompetitionSeasonsUseCase,
  ) {}

  @Get()
  async list(): Promise<CompetitionListResponse> {
    return unwrap(await this.listCompetitions.execute());
  }

  @Get(':id/seasons')
  async seasons(@Param('id') id: string): Promise<SeasonListResponse> {
    return unwrap(
      await this.getSeasons.execute({ competitionId: id as CompetitionId }),
    );
  }
}
