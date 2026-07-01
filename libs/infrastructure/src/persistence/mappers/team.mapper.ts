// libs/infrastructure/src/persistence/mappers/team.mapper.ts
// Persistence <-> domain translation for the Team aggregate + TeamStats read model. Pure.
import { StatVenue } from '@prisma/client';
import {
  Team,
  type TeamId,
  type SeasonId,
  type IsoDateTime,
  type Venue,
  type TeamStatsView,
} from '@betvision/domain';

/** Minimal structural row (satisfied by a Prisma Team row AND the trigram `$queryRaw` row). */
export interface TeamRow {
  readonly id: string;
  readonly name: string;
  readonly shortName: string | null;
  readonly country: string | null;
  readonly crestUrl: string | null;
  readonly eloRating: number | null;
}

export function toDomainTeam(row: TeamRow): Team {
  return Team.fromPersistence({
    id: row.id as TeamId,
    name: row.name,
    shortName: row.shortName,
    country: row.country,
    crestUrl: row.crestUrl,
    eloRating: row.eloRating,
  });
}

const VENUE_TO_DOMAIN: Record<StatVenue, Venue> = {
  [StatVenue.HOME]: 'home',
  [StatVenue.AWAY]: 'away',
  [StatVenue.ALL]: 'all',
};

/** Structural row for a TeamStats projection (satisfied by a Prisma TeamStats row). */
export interface TeamStatsRow {
  readonly seasonId: string;
  readonly venue: StatVenue;
  readonly window: number;
  readonly avgGoalsFor: number | null;
  readonly avgGoalsAgainst: number | null;
  readonly avgXgFor: number | null;
  readonly avgXgAgainst: number | null;
  readonly cleanSheets: number | null;
  readonly form: string | null;
  readonly computedAt: Date;
}

export function toTeamStatsView(row: TeamStatsRow): TeamStatsView {
  return {
    seasonId: row.seasonId as SeasonId,
    venue: VENUE_TO_DOMAIN[row.venue],
    window: row.window,
    avgGoalsFor: row.avgGoalsFor,
    avgGoalsAgainst: row.avgGoalsAgainst,
    avgXgFor: row.avgXgFor,
    avgXgAgainst: row.avgXgAgainst,
    cleanSheets: row.cleanSheets,
    form: row.form,
    computedAt: row.computedAt.toISOString() as IsoDateTime,
  };
}
