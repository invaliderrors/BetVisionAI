// Pure unit tests for the match mapper — no DB. Proves the write-model aggregate rebuild
// (ids only, no team names), the ref helpers, and the MatchStatus enum bridge. The full
// detail/candidate projections are exercised end-to-end in the DB integration suite.
import { Prisma, MatchStatus as PrismaMatchStatus } from '@prisma/client';
import type { MatchStatus } from '@betvision/domain';
import {
  toDomainMatch,
  toTeamRef,
  toCompetitionRef,
  STATUS_TO_PRISMA,
} from './match.mapper';

type MatchRow = Prisma.MatchGetPayload<Record<string, never>>;

const matchRow = (over: Partial<MatchRow> = {}): MatchRow => ({
  id: 'm1',
  externalIds: {},
  competitionId: 'c1',
  seasonId: 's1',
  homeTeamId: 'home',
  awayTeamId: 'away',
  refereeId: null,
  kickoffUtc: new Date('2026-01-02T20:00:00.000Z'),
  venue: 'Bernabéu',
  status: PrismaMatchStatus.FINISHED,
  round: '17',
  importance: 0.9,
  weatherId: null,
  sourceId: null,
  fetchedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...over,
});

describe('match.mapper', () => {
  it('toDomainMatch rebuilds the aggregate from real ids (no names) + bridges status', () => {
    const match = toDomainMatch(matchRow());
    expect(match.id).toBe('m1');
    expect(match.homeTeamId).toBe('home');
    expect(match.awayTeamId).toBe('away');
    expect(match.competitionId).toBe('c1');
    expect(match.seasonId).toBe('s1');
    expect(match.status).toBe('finished');
    expect(match.venue).toBe('Bernabéu');
    expect(match.round).toBe('17');
    expect(match.importance).toBe(0.9);
    expect(match.kickoffUtc).toBe('2026-01-02T20:00:00.000Z');
  });

  it('toTeamRef / toCompetitionRef build the read-model projections', () => {
    expect(
      toTeamRef({ id: 't1', name: 'Real Madrid', shortName: 'RMA', crestUrl: null }),
    ).toEqual({ id: 't1', name: 'Real Madrid', shortName: 'RMA', crestUrl: null });
    expect(
      toCompetitionRef({ id: 'c1', name: 'La Liga', country: 'Spain' }),
    ).toEqual({ id: 'c1', name: 'La Liga', country: 'Spain' });
  });

  it('STATUS_TO_PRISMA covers every domain status', () => {
    const statuses: MatchStatus[] = [
      'scheduled',
      'live',
      'finished',
      'postponed',
      'cancelled',
      'abandoned',
    ];
    for (const status of statuses) {
      expect(STATUS_TO_PRISMA[status]).toBeDefined();
    }
    expect(STATUS_TO_PRISMA.scheduled).toBe(PrismaMatchStatus.SCHEDULED);
    expect(STATUS_TO_PRISMA.abandoned).toBe(PrismaMatchStatus.ABANDONED);
  });
});
