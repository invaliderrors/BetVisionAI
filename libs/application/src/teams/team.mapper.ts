// libs/application/src/teams/team.mapper.ts
// Domain (entities + read models) -> contract DTO translation for teams. Pure functions.
import type { Team, TeamRef, TeamStatsView } from '@betvision/domain';
import type {
  TeamRef as TeamRefDto,
  TeamDetailDto,
  TeamStatsDto,
  TeamStatsRowDto,
} from '@betvision/contracts';

export function toTeamRefDto(ref: TeamRef): TeamRefDto {
  return {
    id: ref.id,
    name: ref.name,
    shortName: ref.shortName,
    crestUrl: ref.crestUrl,
  };
}

export function toTeamDetailDto(team: Team): TeamDetailDto {
  return {
    id: team.id,
    name: team.name,
    shortName: team.shortName,
    country: team.country,
    crestUrl: team.crestUrl,
    eloRating: team.eloRating,
  };
}

function toTeamStatsRowDto(stats: TeamStatsView): TeamStatsRowDto {
  return {
    seasonId: stats.seasonId,
    venue: stats.venue,
    window: stats.window,
    avgGoalsFor: stats.avgGoalsFor,
    avgGoalsAgainst: stats.avgGoalsAgainst,
    avgXgFor: stats.avgXgFor,
    avgXgAgainst: stats.avgXgAgainst,
    cleanSheets: stats.cleanSheets,
    form: stats.form,
    computedAt: stats.computedAt,
  };
}

export function toTeamStatsDto(teamId: string, stats: TeamStatsView[]): TeamStatsDto {
  return { teamId, stats: stats.map(toTeamStatsRowDto) };
}
