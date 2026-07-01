// libs/testing/src/mothers/match.mother.ts
// Object mothers for the Teams & Matches feature: the fleshed-out Match aggregate, the
// Team/Competition/Season entities, and the read-model projections used by the resolver.
import {
  Match,
  Team,
  Competition,
  Season,
  type CreateMatchProps,
  type TeamProps,
  type CompetitionProps,
  type SeasonProps,
  type MatchId,
  type TeamId,
  type CompetitionId,
  type SeasonId,
  type TeamRef,
  type CompetitionRef,
  type MatchCandidate,
  type MatchDetailView,
  type TeamSearchResult,
} from '@betvision/domain';
import { unwrap } from '@betvision/shared';

// --- aggregates / entities ---------------------------------------------------------
export const aMatchProps = (over: Partial<CreateMatchProps> = {}): CreateMatchProps => ({
  id: 'match-1' as MatchId,
  competitionId: 'comp-laliga' as CompetitionId,
  seasonId: 'season-2526' as SeasonId,
  homeTeamId: 'team-rma' as TeamId,
  awayTeamId: 'team-fcb' as TeamId,
  kickoffUtc: '2026-01-02T20:00:00.000Z',
  ...over,
});

export const aMatch = (over: Partial<CreateMatchProps> = {}): Match =>
  unwrap(Match.create(aMatchProps(over)));

export const aTeamProps = (over: Partial<TeamProps> = {}): TeamProps => ({
  id: 'team-rma' as TeamId,
  name: 'Real Madrid',
  shortName: 'RMA',
  country: 'Spain',
  crestUrl: null,
  eloRating: 2000,
  ...over,
});

export const aTeam = (over: Partial<TeamProps> = {}): Team =>
  unwrap(Team.create(aTeamProps(over)));

export const aCompetitionProps = (
  over: Partial<CompetitionProps> = {},
): CompetitionProps => ({
  id: 'comp-laliga' as CompetitionId,
  name: 'La Liga',
  country: 'Spain',
  type: 'league',
  tier: 1,
  ...over,
});

export const aCompetition = (over: Partial<CompetitionProps> = {}): Competition =>
  unwrap(Competition.create(aCompetitionProps(over)));

export const aSeasonProps = (over: Partial<SeasonProps> = {}): SeasonProps => ({
  id: 'season-2526' as SeasonId,
  competitionId: 'comp-laliga' as CompetitionId,
  label: '2025/26',
  startDate: null,
  endDate: null,
  ...over,
});

export const aSeason = (over: Partial<SeasonProps> = {}): Season =>
  unwrap(Season.create(aSeasonProps(over)));

// --- read models -------------------------------------------------------------------
export const aTeamRef = (over: Partial<TeamRef> = {}): TeamRef => ({
  id: 'team-rma' as TeamId,
  name: 'Real Madrid',
  shortName: 'RMA',
  crestUrl: null,
  ...over,
});

export const aCompetitionRef = (over: Partial<CompetitionRef> = {}): CompetitionRef => ({
  id: 'comp-laliga' as CompetitionId,
  name: 'La Liga',
  country: 'Spain',
  ...over,
});

export const aTeamSearchResult = (
  team: Team,
  score: number,
): TeamSearchResult => ({ team, score });

export const aMatchCandidate = (over: Partial<MatchCandidate> = {}): MatchCandidate => ({
  matchId: 'match-1' as MatchId,
  home: aTeamRef(),
  away: aTeamRef({ id: 'team-fcb' as TeamId, name: 'Barcelona', shortName: 'FCB' }),
  competition: aCompetitionRef(),
  kickoffUtc: '2026-01-02T20:00:00.000Z',
  status: 'scheduled',
  ...over,
});

export const aMatchDetailView = (
  over: Partial<MatchDetailView> = {},
): MatchDetailView => ({
  matchId: 'match-1' as MatchId,
  home: aTeamRef(),
  away: aTeamRef({ id: 'team-fcb' as TeamId, name: 'Barcelona', shortName: 'FCB' }),
  competition: aCompetitionRef(),
  seasonId: 'season-2526' as SeasonId,
  seasonLabel: '2025/26',
  kickoffUtc: '2026-01-02T20:00:00.000Z',
  status: 'scheduled',
  venue: 'Santiago Bernabéu',
  round: '17',
  importance: null,
  referee: null,
  stats: null,
  ...over,
});
