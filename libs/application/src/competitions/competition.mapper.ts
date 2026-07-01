// libs/application/src/competitions/competition.mapper.ts
// Domain (entities + read models) -> contract DTO translation for competitions/seasons.
import type { Competition, CompetitionRef, Season } from '@betvision/domain';
import type {
  CompetitionRef as CompetitionRefDto,
  CompetitionDto,
  SeasonDto,
} from '@betvision/contracts';

export function toCompetitionRefDto(ref: CompetitionRef): CompetitionRefDto {
  return { id: ref.id, name: ref.name, country: ref.country };
}

export function toCompetitionDto(competition: Competition): CompetitionDto {
  return {
    id: competition.id,
    name: competition.name,
    country: competition.country,
    type: competition.type,
    tier: competition.tier,
  };
}

export function toSeasonDto(season: Season): SeasonDto {
  return {
    id: season.id,
    competitionId: season.competitionId,
    label: season.label,
    startDate: season.startDate,
    endDate: season.endDate,
  };
}
