// libs/application/src/features/compute-features.use-case.spec.ts
// Authoritative Phase-9 tests: determinism, the as-of-kickoff LEAKAGE cutoff, caching and
// PredictionInput persistence. Uses LOCAL inline fakes (application may NOT depend on
// @betvision/testing), so this suite runs inside the `test` target for `application`.
import { ComputeFeaturesUseCase, type ComputeFeaturesDeps } from './compute-features.use-case';
import {
  FEATURE_VERSION,
  Match,
  type FeatureVector,
  type FeatureStorePort,
  type PredictionInputRecord,
  type PredictionInputRepositoryPort,
  type MatchRepositoryPort,
  type TeamRepositoryPort,
  type TeamSearchResult,
  type TeamStatsView,
  type TeamStatsProviderPort,
  type TeamStatsDto,
  type SportsDataProviderPort,
  type FixtureDto,
  type TeamFormDto,
  type H2HDto,
  type Provenanced,
  type MatchId,
  type TeamId,
  type CompetitionId,
  type SeasonId,
  type PredictionId,
  type IsoDateTime,
} from '@betvision/domain';
import { unwrap, DomainErrorCode } from '@betvision/shared';

const MATCH_ID = 'm1' as MatchId;
const HOME = 'th' as TeamId;
const AWAY = 'ta' as TeamId;
const KICKOFF = '2026-02-01T20:00:00.000Z' as IsoDateTime;

const prov = <T>(data: T): Provenanced<T> => ({
  data,
  provenance: { provider: 'test', fetchedAt: '2026-01-01T00:00:00.000Z', payloadHash: 'h' },
});

const aMatch = (kickoff: IsoDateTime = KICKOFF): Match =>
  unwrap(
    Match.create({
      id: MATCH_ID,
      competitionId: 'c1' as CompetitionId,
      seasonId: 's1' as SeasonId,
      homeTeamId: HOME,
      awayTeamId: AWAY,
      kickoffUtc: kickoff,
    }),
  );

// --- minimal inline port fakes ---------------------------------------------------------------
class StubMatchRepo implements MatchRepositoryPort {
  constructor(private readonly match: Match | null) {}
  async findById(): Promise<Match | null> {
    return this.match;
  }
  async findDetailById() {
    return null;
  }
  async findByTeams() {
    return [];
  }
  async save(): Promise<void> {
    /* not used */
  }
}

class StubTeamRepo implements TeamRepositoryPort {
  private statsByTeam = new Map<string, TeamStatsView[]>();
  seedStats(teamId: TeamId, views: TeamStatsView[]): this {
    this.statsByTeam.set(teamId, views);
    return this;
  }
  async findById() {
    return null;
  }
  async searchByName(): Promise<TeamSearchResult[]> {
    return [];
  }
  async findStats(id: TeamId): Promise<TeamStatsView[]> {
    return this.statsByTeam.get(id) ?? [];
  }
}

class StubTeamStatsProvider implements TeamStatsProviderPort {
  calls = 0;
  async getTeamStats(teamId: TeamId): Promise<Provenanced<TeamStatsDto>> {
    this.calls++;
    return prov<TeamStatsDto>({
      teamId,
      avgGoalsFor: 1.4,
      avgGoalsAgainst: 1.2,
      avgXgFor: 1.3,
      avgXgAgainst: 1.25,
      avgCornersFor: 5.0,
      avgCornersAgainst: 4.5,
      avgCardsFor: 1.9,
      avgCardsAgainst: 2.1,
      cleanSheets: 4,
    });
  }
}

class StubSportsData implements SportsDataProviderPort {
  formCalls = 0;
  constructor(private readonly h2h: H2HDto = { meetings: [] }) {}
  async getFixture(): Promise<Provenanced<FixtureDto>> {
    return prov<FixtureDto>({
      externalId: 'fx',
      home: { externalId: 'h', name: 'H' },
      away: { externalId: 'a', name: 'A' },
      competition: 'C',
      kickoffUtc: KICKOFF,
    });
  }
  async getTeamForm(teamId: TeamId, last: number): Promise<Provenanced<TeamFormDto>> {
    this.formCalls++;
    return prov<TeamFormDto>({
      teamId,
      results: Array.from({ length: last }, (_, i) => (i % 2 === 0 ? 'W' : 'L')),
      goalsFor: Array.from({ length: last }, (_, i) => (i % 2) + 1),
      goalsAgainst: Array.from({ length: last }, () => 1),
    });
  }
  async getHeadToHead(): Promise<Provenanced<H2HDto>> {
    return prov(this.h2h);
  }
}

class InMemoryFeatureStore implements FeatureStorePort {
  puts = 0;
  private store = new Map<string, FeatureVector>();
  async get(matchId: MatchId, version: string): Promise<FeatureVector | null> {
    return this.store.get(`${matchId}@${version}`) ?? null;
  }
  async put(vector: FeatureVector): Promise<void> {
    this.puts++;
    this.store.set(`${vector.matchId}@${vector.version}`, vector);
  }
}

class StubPredictionInputRepo implements PredictionInputRepositoryPort {
  readonly saved: PredictionInputRecord[] = [];
  async save(record: PredictionInputRecord): Promise<void> {
    this.saved.push(record);
  }
}

const baseDeps = (over: Partial<ComputeFeaturesDeps> = {}): ComputeFeaturesDeps => ({
  matches: new StubMatchRepo(aMatch()),
  teams: new StubTeamRepo(),
  sportsData: new StubSportsData(),
  teamStats: new StubTeamStatsProvider(),
  ...over,
});

describe('ComputeFeaturesUseCase', () => {
  it('returns MATCH_NOT_FOUND when the fixture is unknown', async () => {
    const result = await new ComputeFeaturesUseCase(
      baseDeps({ matches: new StubMatchRepo(null) }),
    ).execute({ matchId: MATCH_ID });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected err');
    expect(result.error.code).toBe(DomainErrorCode.MATCH_NOT_FOUND);
  });

  it('produces a versioned, hashed vector with every canonical feature key', async () => {
    const result = await new ComputeFeaturesUseCase(baseDeps()).execute({ matchId: MATCH_ID });
    const vector = unwrap(result);
    expect(vector.version).toBe(FEATURE_VERSION);
    expect(vector.snapshotHash).toMatch(/^[0-9a-f]{16}$/);
    expect(vector.features['home_avg_goals_for']).toBeDefined();
    expect(vector.features['h2h_matches']).toBeDefined();
  });

  it('is DETERMINISTIC: same (matchId, version) -> byte-identical vector + identical hash', async () => {
    const a = unwrap(await new ComputeFeaturesUseCase(baseDeps()).execute({ matchId: MATCH_ID }));
    const b = unwrap(await new ComputeFeaturesUseCase(baseDeps()).execute({ matchId: MATCH_ID }));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.snapshotHash).toBe(b.snapshotHash);
  });

  it('LEAKAGE: excludes a rolling-stats row dated >= kickoff (uses only pre-kickoff data)', async () => {
    const teams = new StubTeamRepo().seedStats(HOME, [
      // valid: computed BEFORE kickoff -> used
      statsView({ avgGoalsFor: 2.0, computedAt: '2026-01-15T00:00:00.000Z' }),
      // leaked: computed AT kickoff -> MUST be dropped
      statsView({ avgGoalsFor: 9.9, computedAt: KICKOFF }),
      // leaked: computed AFTER kickoff -> MUST be dropped
      statsView({ avgGoalsFor: 8.8, computedAt: '2026-03-01T00:00:00.000Z' }),
    ]);
    const vector = unwrap(
      await new ComputeFeaturesUseCase(baseDeps({ teams })).execute({ matchId: MATCH_ID }),
    );
    // 2.0 from the pre-kickoff row — never the 9.9/8.8 post-kickoff rows.
    expect(vector.features['home_avg_goals_for']).toBe(2.0);
  });

  it('LEAKAGE: falls back to the provider snapshot when EVERY DB row is post-kickoff', async () => {
    const teams = new StubTeamRepo().seedStats(HOME, [statsView({ avgGoalsFor: 9.9, computedAt: KICKOFF })]);
    const vector = unwrap(
      await new ComputeFeaturesUseCase(baseDeps({ teams })).execute({ matchId: MATCH_ID }),
    );
    // provider fallback value (1.4), NOT the leaked 9.9.
    expect(vector.features['home_avg_goals_for']).toBe(1.4);
  });

  it('LEAKAGE: excludes head-to-head meetings kicked off at/after the target kickoff', async () => {
    const sportsData = new StubSportsData({
      meetings: [
        { matchId: 'p1' as MatchId, kickoffUtc: '2025-05-01T00:00:00.000Z' as IsoDateTime, homeGoals: 2, awayGoals: 1 },
        { matchId: 'p2' as MatchId, kickoffUtc: KICKOFF, homeGoals: 5, awayGoals: 0 }, // == kickoff -> drop
        { matchId: 'p3' as MatchId, kickoffUtc: '2026-03-01T00:00:00.000Z' as IsoDateTime, homeGoals: 4, awayGoals: 4 }, // future -> drop
      ],
    });
    const vector = unwrap(
      await new ComputeFeaturesUseCase(baseDeps({ sportsData })).execute({ matchId: MATCH_ID }),
    );
    expect(vector.features['h2h_matches']).toBe(1);
    expect(vector.features['h2h_home_win_rate']).toBe(1); // the single 2-1 home win
  });

  it('caches by (matchId, version): 2nd run is served from cache with no extra provider calls', async () => {
    const featureStore = new InMemoryFeatureStore();
    const sportsData = new StubSportsData();
    const deps = baseDeps({ featureStore, sportsData });
    const useCase = new ComputeFeaturesUseCase(deps);

    const first = unwrap(await useCase.execute({ matchId: MATCH_ID }));
    const callsAfterFirst = sportsData.formCalls;
    const second = unwrap(await useCase.execute({ matchId: MATCH_ID }));

    expect(featureStore.puts).toBe(1); // stored once
    expect(sportsData.formCalls).toBe(callsAfterFirst); // no recompute
    expect(second.snapshotHash).toBe(first.snapshotHash);
  });

  it('persists a PredictionInput only when a predictionId is supplied', async () => {
    const predictionInputs = new StubPredictionInputRepo();
    const useCase = new ComputeFeaturesUseCase(baseDeps({ predictionInputs }));

    const noId = unwrap(await useCase.execute({ matchId: MATCH_ID }));
    expect(predictionInputs.saved).toHaveLength(0);

    const withId = unwrap(
      await useCase.execute({ matchId: MATCH_ID, predictionId: 'pred-1' as PredictionId }),
    );
    expect(predictionInputs.saved).toHaveLength(1);
    expect(predictionInputs.saved[0].predictionId).toBe('pred-1');
    expect(predictionInputs.saved[0].featureVersion).toBe(FEATURE_VERSION);
    expect(predictionInputs.saved[0].vector.snapshotHash).toBe(withId.snapshotHash);
    expect(noId.snapshotHash).toBe(withId.snapshotHash); // identical regardless of persistence
  });
});

function statsView(over: Partial<TeamStatsView>): TeamStatsView {
  return {
    seasonId: 's1' as SeasonId,
    venue: 'home',
    window: 5,
    avgGoalsFor: 1.5,
    avgGoalsAgainst: 1.0,
    avgXgFor: 1.4,
    avgXgAgainst: 1.1,
    cleanSheets: 5,
    form: 'WWDLW',
    computedAt: '2026-01-15T00:00:00.000Z' as IsoDateTime,
    ...over,
  };
}
