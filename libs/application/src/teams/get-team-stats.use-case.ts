// libs/application/src/teams/get-team-stats.use-case.ts
// Load a team's rolling stats (GET /teams/:id/stats). The stats array may be empty until
// the feature/ingestion jobs populate it — a typed stub that still 404s an unknown team.
import { Result, ok, err, DomainError, DomainErrorCode } from '@betvision/shared';
import type { TeamRepositoryPort, TeamId } from '@betvision/domain';
import type { TeamStatsDto } from '@betvision/contracts';
import { toTeamStatsDto } from './team.mapper';

export interface GetTeamStatsCommand {
  readonly teamId: TeamId;
}

export class GetTeamStatsUseCase {
  constructor(private readonly teams: TeamRepositoryPort) {}

  async execute(
    command: GetTeamStatsCommand,
  ): Promise<Result<TeamStatsDto, DomainError>> {
    const team = await this.teams.findById(command.teamId);
    if (!team) return err(DomainError.of(DomainErrorCode.TEAM_NOT_FOUND));
    const stats = await this.teams.findStats(command.teamId);
    return ok(toTeamStatsDto(command.teamId, stats));
  }
}
