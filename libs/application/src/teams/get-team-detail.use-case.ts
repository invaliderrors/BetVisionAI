// libs/application/src/teams/get-team-detail.use-case.ts
// Load a single team (GET /teams/:id).
import { Result, ok, err, DomainError, DomainErrorCode } from '@betvision/shared';
import type { TeamRepositoryPort, TeamId } from '@betvision/domain';
import type { TeamDetailDto } from '@betvision/contracts';
import { toTeamDetailDto } from './team.mapper';

export interface GetTeamDetailCommand {
  readonly teamId: TeamId;
}

export class GetTeamDetailUseCase {
  constructor(private readonly teams: TeamRepositoryPort) {}

  async execute(
    command: GetTeamDetailCommand,
  ): Promise<Result<TeamDetailDto, DomainError>> {
    const team = await this.teams.findById(command.teamId);
    if (!team) return err(DomainError.of(DomainErrorCode.TEAM_NOT_FOUND));
    return ok(toTeamDetailDto(team));
  }
}
