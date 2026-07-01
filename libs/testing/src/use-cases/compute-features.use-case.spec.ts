// libs/testing/src/use-cases/compute-features.use-case.spec.ts
// Wires the Phase-9 ComputeFeaturesUseCase against the SHARED libs/testing fakes + mothers.
// libs/testing is the only layer allowed to depend on BOTH @betvision/application and its fakes,
// so this cross-layer smoke test lives here (mirrors resolve-fixture.use-case.spec.ts).
import { ComputeFeaturesUseCase } from '@betvision/application';
import { FEATURE_VERSION, type MatchId, type PredictionId } from '@betvision/domain';
import { FakeMatchRepository } from '../fakes/fake-match-repository';
import { FakeTeamRepository } from '../fakes/fake-team-repository';
import { FakeSportsDataProvider } from '../fakes/fake-sports-data-provider';
import { FakeTeamStatsProvider } from '../fakes/fake-team-stats-provider';
import { FakeFeatureStore } from '../fakes/fake-feature-store';
import { FakePredictionInputRepository } from '../fakes/fake-prediction-input-repository';
import { aMatch } from '../mothers/match.mother';
import { aTeamStatsView } from '../mothers/feature.mother';

const deps = () => ({
  matches: new FakeMatchRepository().seedMatches(aMatch()),
  teams: new FakeTeamRepository().seedStats([aTeamStatsView()]),
  sportsData: new FakeSportsDataProvider(),
  teamStats: new FakeTeamStatsProvider(),
});

describe('ComputeFeaturesUseCase wired with libs/testing fakes', () => {
  it('computes a versioned, hashed vector from the fakes', async () => {
    const result = await new ComputeFeaturesUseCase(deps()).execute({
      matchId: 'match-1' as MatchId,
    });
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.version).toBe(FEATURE_VERSION);
    expect(result.value.snapshotHash).toMatch(/^[0-9a-f]{16}$/);
    expect(result.value.features['home_avg_goals_for']).toBeDefined();
  });

  it('is deterministic across independent runs (byte-identical + same hash)', async () => {
    const a = await new ComputeFeaturesUseCase(deps()).execute({ matchId: 'match-1' as MatchId });
    const b = await new ComputeFeaturesUseCase(deps()).execute({ matchId: 'match-1' as MatchId });
    if (!a.ok || !b.ok) throw new Error('expected ok');
    expect(JSON.stringify(a.value)).toBe(JSON.stringify(b.value));
    expect(a.value.snapshotHash).toBe(b.value.snapshotHash);
  });

  it('caches via FeatureStore and persists PredictionInput when a predictionId is given', async () => {
    const featureStore = new FakeFeatureStore();
    const predictionInputs = new FakePredictionInputRepository();
    const useCase = new ComputeFeaturesUseCase({ ...deps(), featureStore, predictionInputs });

    const first = await useCase.execute({
      matchId: 'match-1' as MatchId,
      predictionId: 'pred-1' as PredictionId,
    });
    if (!first.ok) throw new Error('expected ok');
    expect(await featureStore.get('match-1' as MatchId, FEATURE_VERSION)).not.toBeNull();
    expect(predictionInputs.saved).toHaveLength(1);
    expect(predictionInputs.saved[0].vector.snapshotHash).toBe(first.value.snapshotHash);

    // second call served from cache -> identical
    const second = await useCase.execute({ matchId: 'match-1' as MatchId });
    if (!second.ok) throw new Error('expected ok');
    expect(second.value.snapshotHash).toBe(first.value.snapshotHash);
  });
});
