// libs/infrastructure/src/persistence/mappers/competition.mapper.ts
// Persistence <-> domain translation for Competition + Season. Pure functions.
import { CompetitionType as PrismaCompetitionType } from '@prisma/client';
import {
  Competition,
  Season,
  type CompetitionId,
  type SeasonId,
  type IsoDateTime,
  type CompetitionType,
} from '@betvision/domain';

const TYPE_TO_DOMAIN: Record<PrismaCompetitionType, CompetitionType> = {
  [PrismaCompetitionType.LEAGUE]: 'league',
  [PrismaCompetitionType.CUP]: 'cup',
  [PrismaCompetitionType.UCL]: 'ucl',
  [PrismaCompetitionType.FRIENDLY]: 'friendly',
};

export interface CompetitionRow {
  readonly id: string;
  readonly name: string;
  readonly country: string | null;
  readonly type: PrismaCompetitionType;
  readonly tier: number | null;
}

export function toDomainCompetition(row: CompetitionRow): Competition {
  return Competition.fromPersistence({
    id: row.id as CompetitionId,
    name: row.name,
    country: row.country,
    type: TYPE_TO_DOMAIN[row.type],
    tier: row.tier,
  });
}

export interface SeasonRow {
  readonly id: string;
  readonly competitionId: string;
  readonly label: string;
  readonly startDate: Date | null;
  readonly endDate: Date | null;
}

function toIso(date: Date | null): IsoDateTime | null {
  return date ? (date.toISOString() as IsoDateTime) : null;
}

export function toDomainSeason(row: SeasonRow): Season {
  return Season.fromPersistence({
    id: row.id as SeasonId,
    competitionId: row.competitionId as CompetitionId,
    label: row.label,
    startDate: toIso(row.startDate),
    endDate: toIso(row.endDate),
  });
}
