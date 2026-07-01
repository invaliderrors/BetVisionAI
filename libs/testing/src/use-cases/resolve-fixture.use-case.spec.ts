// Proves the Phase-6 ResolveFixtureUseCase runs against the SHARED libs/testing fakes with
// zero IO. `libs/testing` is the only layer allowed to depend on BOTH `@betvision/application`
// and its own fakes, so this cross-layer wiring test lives here (no boundary violation).
import { ResolveFixtureUseCase } from '@betvision/application';
import type { TeamId } from '@betvision/domain';
import { FakeTeamRepository } from '../fakes/fake-team-repository';
import { FakeMatchRepository } from '../fakes/fake-match-repository';
import { aTeam, aTeamSearchResult, aMatchCandidate } from '../mothers/match.mother';

const barca = aTeam({ id: 'team-fcb' as TeamId, name: 'Barcelona', shortName: 'FCB' });

describe('ResolveFixtureUseCase wired with libs/testing fakes', () => {
  it('resolves an exact fixture to a single high-confidence candidate', async () => {
    const teams = new FakeTeamRepository()
      .seedSearch('Real Madrid', [aTeamSearchResult(aTeam(), 0.95)])
      .seedSearch('Barcelona', [aTeamSearchResult(barca, 0.9)]);
    const matches = new FakeMatchRepository().seedCandidates([aMatchCandidate()]);

    const result = await new ResolveFixtureUseCase(teams, matches).execute({
      query: 'Real Madrid vs Barcelona',
    });

    if (!result.ok) throw new Error('expected ok');
    expect(result.value.candidates).toHaveLength(1);
    expect(result.value.candidates[0].matchId).toBe('match-1');
    expect(result.value.candidates[0].confidence).toBeCloseTo(0.925, 4);
    expect(teams.searchQueries).toEqual(['Real Madrid', 'Barcelona']);
  });

  it('returns NO_MATCH with suggestions when nothing clears the confidence floor', async () => {
    const teams = new FakeTeamRepository()
      .seedSearch('Real Madrid', [aTeamSearchResult(aTeam(), 0.2)])
      .seedSearch('Barcelona', [aTeamSearchResult(barca, 0.2)]);
    const matches = new FakeMatchRepository().seedCandidates([aMatchCandidate()]);

    const result = await new ResolveFixtureUseCase(teams, matches).execute({
      query: 'Real Madrid vs Barcelona',
    });

    if (!result.ok) throw new Error('expected ok');
    expect(result.value.candidates).toEqual([]);
    expect(result.value.suggestions).toEqual(
      expect.arrayContaining(['Real Madrid', 'Barcelona']),
    );
  });
});
