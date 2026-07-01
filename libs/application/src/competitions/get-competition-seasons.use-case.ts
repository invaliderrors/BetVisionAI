// libs/application/src/competitions/get-competition-seasons.use-case.ts
// List a competition's seasons (GET /competitions/:id/seasons). 404s an unknown competition.
import { Result, ok, err, DomainError, DomainErrorCode } from '@betvision/shared';
import type { CompetitionRepositoryPort, CompetitionId } from '@betvision/domain';
import type { SeasonListResponse } from '@betvision/contracts';
import { toSeasonDto } from './competition.mapper';

export interface GetCompetitionSeasonsCommand {
  readonly competitionId: CompetitionId;
}

export class GetCompetitionSeasonsUseCase {
  constructor(private readonly competitions: CompetitionRepositoryPort) {}

  async execute(
    command: GetCompetitionSeasonsCommand,
  ): Promise<Result<SeasonListResponse, DomainError>> {
    const competition = await this.competitions.findById(command.competitionId);
    if (!competition) {
      return err(DomainError.of(DomainErrorCode.COMPETITION_NOT_FOUND));
    }
    const seasons = await this.competitions.findSeasons(command.competitionId);
    return ok({
      competitionId: command.competitionId,
      seasons: seasons.map(toSeasonDto),
    });
  }
}
