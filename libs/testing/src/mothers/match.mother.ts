// libs/testing/src/mothers/match.mother.ts
import { Match, type MatchProps, type MatchId, type CompetitionId } from '@betvision/domain';
import { unwrap } from '@betvision/shared';

export const aMatchProps = (over: Partial<MatchProps> = {}): MatchProps => ({
  id: 'match-1' as MatchId,
  homeName: 'Real Madrid',
  awayName: 'Barcelona',
  competitionId: 'comp-laliga' as CompetitionId,
  competition: 'LaLiga',
  kickoffUtc: '2026-01-02T20:00:00.000Z',
  ...over,
});

export const aMatch = (over: Partial<MatchProps> = {}): Match =>
  unwrap(Match.create(aMatchProps(over)));
