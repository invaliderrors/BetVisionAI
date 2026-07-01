import { Match, CreateMatchProps } from './match.entity';
import type {
  MatchId,
  TeamId,
  CompetitionId,
  SeasonId,
} from '../../ports/shared.dto';
import { DomainErrorCode, isErr, unwrap } from '@betvision/shared';

const props = (over: Partial<CreateMatchProps> = {}): CreateMatchProps => ({
  id: 'm1' as MatchId,
  competitionId: 'c1' as CompetitionId,
  seasonId: 's1' as SeasonId,
  homeTeamId: 'home' as TeamId,
  awayTeamId: 'away' as TeamId,
  kickoffUtc: '2026-01-02T20:00:00.000Z',
  ...over,
});

describe('Match', () => {
  it('creates a valid fixture carrying real team/season ids (no team names)', () => {
    const match = unwrap(Match.create(props()));
    expect(match.id).toBe('m1');
    expect(match.homeTeamId).toBe('home');
    expect(match.awayTeamId).toBe('away');
    expect(match.competitionId).toBe('c1');
    expect(match.seasonId).toBe('s1');
    expect(match.status).toBe('scheduled'); // defaults when omitted
    expect(match.venue).toBeNull();
    expect(match.round).toBeNull();
    expect(match.importance).toBeNull();
  });

  it('honours explicit status / venue / round / importance', () => {
    const match = unwrap(
      Match.create(
        props({ status: 'finished', venue: 'Bernabéu', round: '17', importance: 0.9 }),
      ),
    );
    expect(match.status).toBe('finished');
    expect(match.venue).toBe('Bernabéu');
    expect(match.round).toBe('17');
    expect(match.importance).toBe(0.9);
  });

  it('rejects a fixture where a team would play itself', () => {
    const result = Match.create(props({ homeTeamId: 'x' as TeamId, awayTeamId: 'x' as TeamId }));
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe(DomainErrorCode.MATCH_TEAMS_IDENTICAL);
    }
  });

  it('rehydrates from persistence without re-validation', () => {
    const match = Match.fromPersistence({
      id: 'm2' as MatchId,
      competitionId: 'c1' as CompetitionId,
      seasonId: 's1' as SeasonId,
      homeTeamId: 'home' as TeamId,
      awayTeamId: 'away' as TeamId,
      kickoffUtc: '2026-01-02T20:00:00.000Z',
      status: 'live',
      venue: null,
      round: null,
      importance: null,
    });
    expect(match.status).toBe('live');
  });

  it('identity equality is by id', () => {
    const a = unwrap(Match.create(props({ id: 'same' as MatchId })));
    const b = unwrap(Match.create(props({ id: 'same' as MatchId, venue: 'Other' })));
    const c = unwrap(Match.create(props({ id: 'different' as MatchId })));
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
    expect(a.equals(null)).toBe(false);
  });

  it('buffers and pulls domain events (empty by default)', () => {
    const match = unwrap(Match.create(props()));
    expect(match.domainEvents).toEqual([]);
    expect(match.pullDomainEvents()).toEqual([]);
  });
});
