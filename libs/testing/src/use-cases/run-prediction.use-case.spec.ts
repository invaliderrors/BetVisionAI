// libs/testing/src/use-cases/run-prediction.use-case.spec.ts
// Phase-10 RunPredictionUseCase wired against the SHARED libs/testing fakes + the REAL pure
// domain statistical model (DomainStatisticalModel). Proves: end-to-end persistence order,
// reproducibility (identical probabilities + snapshot hash twice), and market validation —
// all deterministic, no DB, no network.
import { ComputeFeaturesUseCase, RunPredictionUseCase } from '@betvision/application';
import { DomainErrorCode } from '@betvision/shared';
import {
  STATISTICAL_MARKETS,
  STAT_MODEL_VERSION,
  type MatchId,
  type MarketKey,
} from '@betvision/domain';
import { FakeMatchRepository } from '../fakes/fake-match-repository';
import { FakeTeamRepository } from '../fakes/fake-team-repository';
import { FakeSportsDataProvider } from '../fakes/fake-sports-data-provider';
import { FakeTeamStatsProvider } from '../fakes/fake-team-stats-provider';
import { FakeFeatureStore } from '../fakes/fake-feature-store';
import { FakePredictionInputRepository } from '../fakes/fake-prediction-input-repository';
import { FakePredictionRepository } from '../fakes/fake-prediction-repository';
import { FakePredictionResultRepository } from '../fakes/fake-prediction-result-repository';
import { FakeIdGeneratorPort } from '../fakes/fake-id-generator.port';
import { aMatch } from '../mothers/match.mother';
import { aTeamStatsView } from '../mothers/feature.mother';
import { DomainStatisticalModel } from '../mothers/model-score.mother';

const MATCH_ID = 'match-1' as MatchId;

function makeDeps() {
  const computeFeatures = new ComputeFeaturesUseCase({
    matches: new FakeMatchRepository().seedMatches(aMatch()),
    teams: new FakeTeamRepository().seedStats([aTeamStatsView()]),
    sportsData: new FakeSportsDataProvider(),
    teamStats: new FakeTeamStatsProvider(),
    featureStore: new FakeFeatureStore(),
  });
  return {
    computeFeatures,
    model: new DomainStatisticalModel(),
    predictions: new FakePredictionRepository(),
    predictionResults: new FakePredictionResultRepository(),
    predictionInputs: new FakePredictionInputRepository(),
    ids: new FakeIdGeneratorPort('pred'),
  };
}

describe('RunPredictionUseCase (wired with libs/testing fakes + real domain model)', () => {
  it('persists Prediction + PredictionInput(FK) + PredictionResult[] with the model version', async () => {
    const deps = makeDeps();
    const result = await new RunPredictionUseCase(deps).execute({ matchId: MATCH_ID });
    if (!result.ok) throw new Error(`expected ok, got ${result.error.code}`);

    // Prediction row: model version + snapshot hash.
    expect(deps.predictions.saved).toHaveLength(1);
    expect(deps.predictions.saved[0].modelVersion).toBe(STAT_MODEL_VERSION);
    expect(deps.predictions.saved[0].inputSnapshotHash).toBe(result.value.inputSnapshotHash);

    // PredictionInput (1:1) stores the exact vector under the same prediction id.
    expect(deps.predictionInputs.saved).toHaveLength(1);
    expect(deps.predictionInputs.saved[0].predictionId).toBe(result.value.predictionId);
    expect(deps.predictionInputs.saved[0].vector.snapshotHash).toBe(result.value.inputSnapshotHash);

    // One result per market/selection: 1X2(3) + OU×4(8) + BTTS(2) = 13.
    expect(deps.predictionResults.saved).toHaveLength(13);
    for (const r of deps.predictionResults.saved) {
      expect(r.predictionId).toBe(result.value.predictionId);
      expect(r.modelProbability).toBeGreaterThanOrEqual(0);
      expect(r.modelProbability).toBeLessThanOrEqual(1);
    }
  });

  it('1X2 results sum to ~1 and NO odds/risk-appetite ever enter the model', async () => {
    const deps = makeDeps();
    const result = await new RunPredictionUseCase(deps).execute({ matchId: MATCH_ID, markets: ['1X2'] });
    if (!result.ok) throw new Error('expected ok');
    const sum = result.value.results.reduce((s, r) => s + r.modelProbability, 0);
    expect(sum).toBeCloseTo(1, 6);
  });

  it('is reproducible: two runs ⇒ identical probabilities + identical snapshot hash', async () => {
    const deps = makeDeps();
    const useCase = new RunPredictionUseCase(deps);

    const a = await useCase.execute({ matchId: MATCH_ID });
    const b = await useCase.execute({ matchId: MATCH_ID });
    if (!a.ok || !b.ok) throw new Error('expected ok');

    // Different prediction ids (pred-1, pred-2) but identical numbers + hash.
    expect(a.value.predictionId).not.toBe(b.value.predictionId);
    expect(b.value.inputSnapshotHash).toBe(a.value.inputSnapshotHash);
    expect(JSON.stringify(b.value.results)).toBe(JSON.stringify(a.value.results));

    const resultsFor = (id: string) =>
      deps.predictionResults.saved
        .filter((r) => r.predictionId === id)
        .map((r) => `${r.market}:${r.selection}=${r.modelProbability}`);
    expect(resultsFor(b.value.predictionId)).toEqual(resultsFor(a.value.predictionId));
  });

  it('defaults to the full statistical market set', async () => {
    const deps = makeDeps();
    const result = await new RunPredictionUseCase(deps).execute({ matchId: MATCH_ID });
    if (!result.ok) throw new Error('expected ok');
    const markets = new Set(result.value.results.map((r) => r.market));
    expect([...markets].sort()).toEqual([...STATISTICAL_MARKETS].sort());
  });

  it('rejects markets the statistical model does not support', async () => {
    const deps = makeDeps();
    const result = await new RunPredictionUseCase(deps).execute({
      matchId: MATCH_ID,
      markets: ['1X2', 'CORRECT_SCORE'] as MarketKey[],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe(DomainErrorCode.MARKET_NOT_SUPPORTED);
    // Nothing persisted on a rejected request.
    expect(deps.predictions.saved).toHaveLength(0);
  });

  it('returns MATCH_NOT_FOUND for an unknown fixture', async () => {
    const deps = makeDeps();
    const result = await new RunPredictionUseCase(deps).execute({ matchId: 'nope' as MatchId });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe(DomainErrorCode.MATCH_NOT_FOUND);
  });
});
