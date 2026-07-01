// libs/application/src/matches/get-match-detail.use-case.ts
// Load the canonical match detail (teams + competition + stats + referee) by id.
import { Result, ok, err, DomainError, DomainErrorCode } from '@betvision/shared';
import type { MatchRepositoryPort, MatchId } from '@betvision/domain';
import type { MatchDetailDto } from '@betvision/contracts';
import { toMatchDetailDto } from './match.mapper';

export interface GetMatchDetailCommand {
  readonly matchId: MatchId;
}

export class GetMatchDetailUseCase {
  constructor(private readonly matches: MatchRepositoryPort) {}

  async execute(
    command: GetMatchDetailCommand,
  ): Promise<Result<MatchDetailDto, DomainError>> {
    const view = await this.matches.findDetailById(command.matchId);
    if (!view) return err(DomainError.of(DomainErrorCode.MATCH_NOT_FOUND));
    return ok(toMatchDetailDto(view));
  }
}
