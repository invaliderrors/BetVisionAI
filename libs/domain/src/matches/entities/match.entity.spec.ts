import { Match, MatchProps } from './match.entity';
import type { MatchId, CompetitionId } from '../../ports/shared.dto';
import { unwrap } from '@betvision/shared';

const props = (over: Partial<MatchProps> = {}): MatchProps => ({
  id: 'm1' as MatchId,
  homeName: 'Real Madrid',
  awayName: 'Barcelona',
  competitionId: 'c1' as CompetitionId,
  competition: 'LaLiga',
  kickoffUtc: '2026-01-02T20:00:00.000Z',
  ...over,
});

describe('Match', () => {
  it('creates a valid match and exposes a canonical label', () => {
    const match = unwrap(Match.create(props()));
    expect(match.label).toBe('Real Madrid vs Barcelona');
    expect(match.competition).toBe('LaLiga');
    expect(match.id).toBe('m1');
  });

  it('rejects a blank home or away name', () => {
    expect(Match.create(props({ homeName: '  ' })).ok).toBe(false);
    expect(Match.create(props({ awayName: '' })).ok).toBe(false);
  });

  it('identity equality is by id', () => {
    const a = unwrap(Match.create(props({ id: 'same' as MatchId })));
    const b = unwrap(Match.create(props({ id: 'same' as MatchId, homeName: 'Other' })));
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
