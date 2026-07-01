// libs/domain/src/ports/team-stats-provider.port.ts
import type { Provenanced, TeamId, StatsScope } from './shared.dto';

export interface TeamStatsDto {
  readonly teamId: TeamId;
  readonly avgGoalsFor: number;
  readonly avgGoalsAgainst: number;
  readonly avgXgFor: number;
  readonly avgXgAgainst: number;
  readonly avgCornersFor: number;
  readonly avgCornersAgainst: number;
  readonly avgCardsFor: number;
  readonly avgCardsAgainst: number;
  readonly cleanSheets: number;
}

export interface TeamStatsProviderPort {
  getTeamStats(teamId: TeamId, scope: StatsScope): Promise<Provenanced<TeamStatsDto>>;
}
