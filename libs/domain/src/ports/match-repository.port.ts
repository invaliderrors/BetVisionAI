// libs/domain/src/ports/match-repository.port.ts
// Outbound port for Match persistence + the match read side (detail + candidate search).
// Exchanges ONLY domain types: the write model is the `Match` aggregate; the read side
// returns `MatchDetailView` / `MatchCandidate` projections. Prisma stays in the adapter.
import type { MatchId, TeamId, CompetitionId, IsoDateTime } from './shared.dto';
import type { Match } from '../matches/entities/match.entity';
import type { MatchDetailView, MatchCandidate } from '../matches/read-models';

/**
 * Find fixtures for a resolved set of team ids (produced by the fuzzy team search in the
 * resolver use case). Provide EITHER a home/away pair (matched in both orientations) OR a
 * single `anyTeamIds` set (fixtures where either side is one of the teams).
 */
export interface MatchByTeamsQuery {
  readonly homeTeamIds?: readonly TeamId[];
  readonly awayTeamIds?: readonly TeamId[];
  readonly anyTeamIds?: readonly TeamId[];
  readonly competitionId?: CompetitionId;
  readonly dateFrom?: IsoDateTime;
  readonly dateTo?: IsoDateTime;
  readonly limit?: number;
}

export interface MatchRepositoryPort {
  /** Load the write-model aggregate (ids only) — used by the write side + round-trips. */
  findById(id: MatchId): Promise<Match | null>;
  /** Load the read-model detail projection (teams + competition + stats + referee). */
  findDetailById(id: MatchId): Promise<MatchDetailView | null>;
  /** Find candidate fixtures for a resolved team set. Ranking/confidence is the caller's job. */
  findByTeams(query: MatchByTeamsQuery): Promise<MatchCandidate[]>;
  /** Upsert the fixture by id (all FKs are real ids on the aggregate — no name resolution). */
  save(match: Match): Promise<void>;
}
