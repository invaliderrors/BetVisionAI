// libs/domain/src/matches/read-models.ts
// Query-side (read model) shapes for the Teams & Matches feature. These are plain,
// immutable projections returned by the repository ports for display/search — NOT
// aggregates (no behaviour, no identity equality). Aggregates (Match/Team/...) stay the
// write model; these serve the read side (fixture resolution + detail/search endpoints).
import type {
  TeamId,
  CompetitionId,
  SeasonId,
  RefereeId,
  MatchId,
  IsoDateTime,
  Venue,
} from '../ports/shared.dto';
import type { MatchStatus } from './match-status';

/** Minimal team projection embedded in candidates/detail (SPEC §16 `TeamRef`). */
export interface TeamRef {
  readonly id: TeamId;
  readonly name: string;
  readonly shortName: string | null;
  readonly crestUrl: string | null;
}

/** Minimal competition projection. */
export interface CompetitionRef {
  readonly id: CompetitionId;
  readonly name: string;
  readonly country: string | null;
}

/** Minimal referee projection (assigned official on a match). */
export interface RefereeRef {
  readonly id: RefereeId;
  readonly name: string;
}

/** Per-match historical fact projection (populated only once a match is finished). */
export interface MatchStatsView {
  readonly homeGoals: number | null;
  readonly awayGoals: number | null;
  readonly homeXg: number | null;
  readonly awayXg: number | null;
  readonly homeCorners: number | null;
  readonly awayCorners: number | null;
  readonly homeYellow: number | null;
  readonly awayYellow: number | null;
  readonly homeRed: number | null;
  readonly awayRed: number | null;
  readonly homePossession: number | null;
  readonly awayPossession: number | null;
}

/** Canonical match detail (GET /matches/:id): teams + competition + stats + referee. */
export interface MatchDetailView {
  readonly matchId: MatchId;
  readonly home: TeamRef;
  readonly away: TeamRef;
  readonly competition: CompetitionRef;
  readonly seasonId: SeasonId;
  readonly seasonLabel: string;
  readonly kickoffUtc: IsoDateTime;
  readonly status: MatchStatus;
  readonly venue: string | null;
  readonly round: string | null;
  readonly importance: number | null;
  readonly referee: RefereeRef | null;
  readonly stats: MatchStatsView | null;
}

/**
 * A single fixture that could match a free-text query. Confidence is assigned by the
 * resolver use case (from team-name similarity), NOT by the repository — the repo only
 * finds fixtures for a resolved set of team ids.
 */
export interface MatchCandidate {
  readonly matchId: MatchId;
  readonly home: TeamRef;
  readonly away: TeamRef;
  readonly competition: CompetitionRef;
  readonly kickoffUtc: IsoDateTime;
  readonly status: MatchStatus;
}

/** Rolling per-team-per-scope stats projection (GET /teams/:id/stats). */
export interface TeamStatsView {
  readonly seasonId: SeasonId;
  readonly venue: Venue;
  readonly window: number;
  readonly avgGoalsFor: number | null;
  readonly avgGoalsAgainst: number | null;
  readonly avgXgFor: number | null;
  readonly avgXgAgainst: number | null;
  readonly cleanSheets: number | null;
  readonly form: string | null;
  readonly computedAt: IsoDateTime;
}
