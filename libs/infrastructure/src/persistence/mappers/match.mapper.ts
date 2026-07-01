// libs/infrastructure/src/persistence/mappers/match.mapper.ts
// Persistence <-> domain translation for the Match aggregate + its read models. Pure
// functions, no IO. Prisma types (Decimal / the MatchStatus enum) stay INSIDE this layer;
// outputs are the domain `Match` aggregate (ids only) and the read-model projections.
import { Prisma, MatchStatus as PrismaMatchStatus } from '@prisma/client';
import {
  Match,
  type MatchId,
  type TeamId,
  type CompetitionId,
  type SeasonId,
  type RefereeId,
  type IsoDateTime,
  type MatchStatus,
  type TeamRef,
  type CompetitionRef,
  type MatchStatsView,
  type MatchDetailView,
  type MatchCandidate,
} from '@betvision/domain';

// --- enum bridges (explicit; a schema/enum drift becomes a compile error) ----------
const STATUS_TO_DOMAIN: Record<PrismaMatchStatus, MatchStatus> = {
  [PrismaMatchStatus.SCHEDULED]: 'scheduled',
  [PrismaMatchStatus.LIVE]: 'live',
  [PrismaMatchStatus.FINISHED]: 'finished',
  [PrismaMatchStatus.POSTPONED]: 'postponed',
  [PrismaMatchStatus.CANCELLED]: 'cancelled',
  [PrismaMatchStatus.ABANDONED]: 'abandoned',
};
export const STATUS_TO_PRISMA: Record<MatchStatus, PrismaMatchStatus> = {
  scheduled: PrismaMatchStatus.SCHEDULED,
  live: PrismaMatchStatus.LIVE,
  finished: PrismaMatchStatus.FINISHED,
  postponed: PrismaMatchStatus.POSTPONED,
  cancelled: PrismaMatchStatus.CANCELLED,
  abandoned: PrismaMatchStatus.ABANDONED,
};

/** A bare Match row (no relations) — the write-model aggregate source. */
type MatchRow = Prisma.MatchGetPayload<Record<string, never>>;

/** Bare Match row -> domain Match aggregate (ids only; names are a read concern). */
export function toDomainMatch(row: MatchRow): Match {
  return Match.fromPersistence({
    id: row.id as MatchId,
    competitionId: row.competitionId as CompetitionId,
    seasonId: row.seasonId as SeasonId,
    homeTeamId: row.homeTeamId as TeamId,
    awayTeamId: row.awayTeamId as TeamId,
    kickoffUtc: row.kickoffUtc.toISOString() as IsoDateTime,
    status: STATUS_TO_DOMAIN[row.status],
    venue: row.venue,
    round: row.round,
    importance: row.importance,
  });
}

// --- read-model relation shapes ----------------------------------------------------
interface TeamRefRow {
  readonly id: string;
  readonly name: string;
  readonly shortName: string | null;
  readonly crestUrl: string | null;
}
interface CompetitionRefRow {
  readonly id: string;
  readonly name: string;
  readonly country: string | null;
}

export function toTeamRef(row: TeamRefRow): TeamRef {
  return { id: row.id as TeamId, name: row.name, shortName: row.shortName, crestUrl: row.crestUrl };
}

export function toCompetitionRef(row: CompetitionRefRow): CompetitionRef {
  return { id: row.id as CompetitionId, name: row.name, country: row.country };
}

function decimalToNumber(value: Prisma.Decimal | null): number | null {
  return value === null ? null : value.toNumber();
}

/** Relations needed to rebuild the full match detail read model. */
export const matchDetailInclude = {
  homeTeam: true,
  awayTeam: true,
  competition: true,
  season: true,
  referee: true,
  matchStats: true,
} satisfies Prisma.MatchInclude;

export type PersistedMatchDetail = Prisma.MatchGetPayload<{
  include: typeof matchDetailInclude;
}>;

function toMatchStatsView(
  stats: PersistedMatchDetail['matchStats'],
): MatchStatsView | null {
  if (!stats) return null;
  return {
    homeGoals: stats.homeGoals,
    awayGoals: stats.awayGoals,
    homeXg: decimalToNumber(stats.homeXg),
    awayXg: decimalToNumber(stats.awayXg),
    homeCorners: stats.homeCorners,
    awayCorners: stats.awayCorners,
    homeYellow: stats.homeYellow,
    awayYellow: stats.awayYellow,
    homeRed: stats.homeRed,
    awayRed: stats.awayRed,
    homePossession: decimalToNumber(stats.homePossession),
    awayPossession: decimalToNumber(stats.awayPossession),
  };
}

/** Match row (+ detail relations) -> domain MatchDetailView. */
export function toMatchDetailView(row: PersistedMatchDetail): MatchDetailView {
  return {
    matchId: row.id as MatchId,
    home: toTeamRef(row.homeTeam),
    away: toTeamRef(row.awayTeam),
    competition: toCompetitionRef(row.competition),
    seasonId: row.seasonId as SeasonId,
    seasonLabel: row.season.label,
    kickoffUtc: row.kickoffUtc.toISOString() as IsoDateTime,
    status: STATUS_TO_DOMAIN[row.status],
    venue: row.venue,
    round: row.round,
    importance: row.importance,
    referee: row.referee
      ? { id: row.referee.id as RefereeId, name: row.referee.name }
      : null,
    stats: toMatchStatsView(row.matchStats),
  };
}

/** Relations needed for a candidate projection (team refs + competition). */
export const matchCandidateInclude = {
  homeTeam: true,
  awayTeam: true,
  competition: true,
} satisfies Prisma.MatchInclude;

export type PersistedMatchCandidate = Prisma.MatchGetPayload<{
  include: typeof matchCandidateInclude;
}>;

/** Match row (+ candidate relations) -> domain MatchCandidate (no confidence yet). */
export function toMatchCandidate(row: PersistedMatchCandidate): MatchCandidate {
  return {
    matchId: row.id as MatchId,
    home: toTeamRef(row.homeTeam),
    away: toTeamRef(row.awayTeam),
    competition: toCompetitionRef(row.competition),
    kickoffUtc: row.kickoffUtc.toISOString() as IsoDateTime,
    status: STATUS_TO_DOMAIN[row.status],
  };
}
