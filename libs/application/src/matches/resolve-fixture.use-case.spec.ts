// Inline fakes implementing the domain ports keep this lib's tests dependency-free
// (application → domain/contracts/shared only). The shared libs/testing fakes exercise this
// same use case from libs/testing (which is allowed to depend on application).
import { ResolveFixtureUseCase } from './resolve-fixture.use-case';
import {
  Team,
  type TeamRepositoryPort,
  type MatchRepositoryPort,
  type MatchByTeamsQuery,
  type TeamSearchResult,
  type TeamStatsView,
  type MatchCandidate,
  type MatchDetailView,
  type Match,
  type TeamRef,
  type CompetitionRef,
  type TeamId,
  type MatchId,
  type CompetitionId,
} from '@betvision/domain';
import { DomainErrorCode, unwrap } from '@betvision/shared';

class InlineTeamRepo implements TeamRepositoryPort {
  private readonly results = new Map<string, TeamSearchResult[]>();

  seed(query: string, results: TeamSearchResult[]): this {
    this.results.set(query.trim().toLowerCase(), results);
    return this;
  }

  async findById(): Promise<Team | null> {
    return null;
  }
  async searchByName(name: string): Promise<TeamSearchResult[]> {
    return this.results.get(name.trim().toLowerCase()) ?? [];
  }
  async findStats(): Promise<TeamStatsView[]> {
    return [];
  }
}

class InlineMatchRepo implements MatchRepositoryPort {
  candidates: MatchCandidate[] = [];
  readonly queries: MatchByTeamsQuery[] = [];

  async findById(): Promise<Match | null> {
    return null;
  }
  async findDetailById(): Promise<MatchDetailView | null> {
    return null;
  }
  async findByTeams(query: MatchByTeamsQuery): Promise<MatchCandidate[]> {
    this.queries.push(query);
    return this.candidates;
  }
  async save(): Promise<void> {
    /* no-op */
  }
}

const team = (id: string, name: string): Team =>
  unwrap(
    Team.create({
      id: id as TeamId,
      name,
      shortName: null,
      country: null,
      crestUrl: null,
      eloRating: null,
    }),
  );

const ref = (id: string, name: string): TeamRef => ({
  id: id as TeamId,
  name,
  shortName: null,
  crestUrl: null,
});

const competition: CompetitionRef = {
  id: 'c1' as CompetitionId,
  name: 'La Liga',
  country: 'Spain',
};

const candidate = (
  matchId: string,
  home: TeamRef,
  away: TeamRef,
): MatchCandidate => ({
  matchId: matchId as MatchId,
  home,
  away,
  competition,
  kickoffUtc: '2026-01-02T20:00:00.000Z',
  status: 'scheduled',
});

describe('ResolveFixtureUseCase', () => {
  it('resolves an exact fixture to a single HIGH-confidence candidate', async () => {
    const teams = new InlineTeamRepo()
      .seed('real madrid', [{ team: team('t-rma', 'Real Madrid'), score: 0.95 }])
      .seed('barcelona', [{ team: team('t-fcb', 'Barcelona'), score: 0.9 }]);
    const matches = new InlineMatchRepo();
    matches.candidates = [
      candidate('m1', ref('t-rma', 'Real Madrid'), ref('t-fcb', 'Barcelona')),
    ];

    const result = await new ResolveFixtureUseCase(teams, matches).execute({
      query: 'Real Madrid vs Barcelona',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.candidates).toHaveLength(1);
    expect(result.value.candidates[0].matchId).toBe('m1');
    expect(result.value.candidates[0].confidence).toBeCloseTo(0.925, 4);
    expect(result.value.candidates[0].confidence).toBeGreaterThan(0.8);
    expect(result.value.suggestions).toEqual([]);
    // The resolved team ids drove the fixture lookup (both orientations).
    expect(matches.queries[0].homeTeamIds).toEqual(['t-rma']);
    expect(matches.queries[0].awayTeamIds).toEqual(['t-fcb']);
  });

  it('returns MULTIPLE candidates ranked by confidence for an ambiguous query', async () => {
    const teams = new InlineTeamRepo()
      .seed('madrid', [
        { team: team('t-rma', 'Real Madrid'), score: 0.6 },
        { team: team('t-atm', 'Atlético Madrid'), score: 0.55 },
      ])
      .seed('barcelona', [{ team: team('t-fcb', 'Barcelona'), score: 0.9 }]);
    const matches = new InlineMatchRepo();
    // Seeded OUT of confidence order to prove the use case ranks them.
    matches.candidates = [
      candidate('m-atm', ref('t-atm', 'Atlético Madrid'), ref('t-fcb', 'Barcelona')),
      candidate('m-rma', ref('t-rma', 'Real Madrid'), ref('t-fcb', 'Barcelona')),
    ];

    const result = await new ResolveFixtureUseCase(teams, matches).execute({
      query: 'Madrid vs Barcelona',
    });

    if (!result.ok) throw new Error('expected ok');
    expect(result.value.candidates).toHaveLength(2);
    expect(result.value.candidates[0].matchId).toBe('m-rma'); // 0.75 > 0.725
    expect(result.value.candidates[0].confidence).toBeCloseTo(0.75, 4);
    expect(result.value.candidates[1].matchId).toBe('m-atm');
    expect(result.value.candidates[1].confidence).toBeCloseTo(0.725, 4);
    expect(result.value.candidates[0].confidence).toBeGreaterThan(
      result.value.candidates[1].confidence,
    );
  });

  it('returns NO_MATCH with team-name suggestions when nothing clears the confidence floor', async () => {
    const teams = new InlineTeamRepo()
      .seed('realish', [{ team: team('t-rma', 'Real Madrid'), score: 0.2 }])
      .seed('barish', [{ team: team('t-fcb', 'Barcelona'), score: 0.2 }]);
    const matches = new InlineMatchRepo();
    // A fixture IS found, but combined confidence (0.2) is below the 0.3 floor.
    matches.candidates = [
      candidate('m1', ref('t-rma', 'Real Madrid'), ref('t-fcb', 'Barcelona')),
    ];

    const result = await new ResolveFixtureUseCase(teams, matches).execute({
      query: 'realish vs barish',
    });

    if (!result.ok) throw new Error('expected ok');
    expect(result.value.candidates).toEqual([]);
    expect(result.value.suggestions).toEqual(
      expect.arrayContaining(['Real Madrid', 'Barcelona']),
    );
  });

  it('returns NO_MATCH with empty suggestions when no team resolves at all', async () => {
    const teams = new InlineTeamRepo(); // no seeds -> every search is empty
    const matches = new InlineMatchRepo();

    const result = await new ResolveFixtureUseCase(teams, matches).execute({
      query: 'qw:zx vs zzxyq',
    });

    if (!result.ok) throw new Error('expected ok');
    expect(result.value.candidates).toEqual([]);
    expect(result.value.suggestions).toEqual([]);
    // Never queried the match repo (no team ids to pair).
    expect(matches.queries).toHaveLength(0);
  });

  it.each(['vs', 'v', '-', 'x'])(
    'parses the "%s" separator and resolves the same fixture',
    async (separator) => {
      const teams = new InlineTeamRepo()
        .seed('real madrid', [{ team: team('t-rma', 'Real Madrid'), score: 0.95 }])
        .seed('barcelona', [{ team: team('t-fcb', 'Barcelona'), score: 0.9 }]);
      const matches = new InlineMatchRepo();
      matches.candidates = [
        candidate('m1', ref('t-rma', 'Real Madrid'), ref('t-fcb', 'Barcelona')),
      ];

      const result = await new ResolveFixtureUseCase(teams, matches).execute({
        query: `Real Madrid ${separator} Barcelona`,
      });

      if (!result.ok) throw new Error('expected ok');
      expect(result.value.candidates).toHaveLength(1);
      expect(result.value.candidates[0].matchId).toBe('m1');
    },
  );

  it('supports a single-team query (either side) via anyTeamIds', async () => {
    const teams = new InlineTeamRepo().seed('barcelona', [
      { team: team('t-fcb', 'Barcelona'), score: 0.92 },
    ]);
    const matches = new InlineMatchRepo();
    matches.candidates = [
      candidate('m1', ref('t-fcb', 'Barcelona'), ref('t-rma', 'Real Madrid')),
    ];

    const result = await new ResolveFixtureUseCase(teams, matches).execute({
      query: 'Barcelona',
    });

    if (!result.ok) throw new Error('expected ok');
    expect(result.value.candidates).toHaveLength(1);
    expect(result.value.candidates[0].confidence).toBeCloseTo(0.92, 4);
    expect(matches.queries[0].anyTeamIds).toEqual(['t-fcb']);
    expect(matches.queries[0].homeTeamIds).toBeUndefined();
  });

  it('rejects a blank query with FIXTURE_QUERY_EMPTY', async () => {
    const result = await new ResolveFixtureUseCase(
      new InlineTeamRepo(),
      new InlineMatchRepo(),
    ).execute({ query: '   ' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(DomainErrorCode.FIXTURE_QUERY_EMPTY);
    }
  });
});
