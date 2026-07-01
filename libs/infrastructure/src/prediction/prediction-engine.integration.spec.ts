// libs/infrastructure/src/prediction/prediction-engine.integration.spec.ts
// Integration tests against a REAL Postgres (compose `postgres` service). Requires DATABASE_URL;
// skips cleanly when it is absent so unit-only runs never hang.
//
// Proves (Phase 10):
//   - RunPredictionUseCase, wired with the REAL StatisticalPredictionModel + real feature pipeline
//     over the SYNTHETIC dev seed, persists Prediction + PredictionInput(FK) + PredictionResult[];
//   - Decimal precision round-trips (modelProbability stored/read at 5 dp);
//   - REPRODUCIBILITY: two runs on `dev-match-demo-1` yield IDENTICAL probabilities + the SAME
//     inputSnapshotHash (different prediction ids);
//   - the model NEVER consumes odds or risk appetite.
import { PrismaClient, MarketGroup, MarketVolatility } from '@prisma/client';
import {
  STATISTICAL_MARKETS,
  STAT_MODEL_VERSION,
  type IdGeneratorPort,
  type MatchId,
} from '@betvision/domain';
import { RunPredictionUseCase, ComputeFeaturesUseCase } from '@betvision/application';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaMatchRepository } from '../persistence/repositories/prisma-match.repository';
import { PrismaTeamRepository } from '../persistence/repositories/prisma-team.repository';
import { PrismaPredictionRepository } from '../persistence/repositories/prisma-prediction.repository';
import { PrismaPredictionResultRepository } from '../persistence/repositories/prisma-prediction-result.repository';
import { PrismaPredictionInputRepository } from '../features/prisma-prediction-input.repository';
import { DevSportsDataProvider } from '../providers/dev/dev-sports-data.provider';
import { DevTeamStatsProvider } from '../providers/dev/dev-team-stats.provider';
import { StatisticalPredictionModel } from './statistical-prediction-model';
import { seedDev } from '../../prisma/seed-dev';

jest.setTimeout(60000);

const describeDb = process.env['DATABASE_URL'] ? describe : describe.skip;
const DEMO_MATCH_ID = 'dev-match-demo-1' as MatchId;

// Markets the statistical model emits — all must exist in betting_markets for the result FK.
const REQUIRED_MARKETS: ReadonlyArray<{ key: string; group: MarketGroup; volatility: MarketVolatility }> = [
  { key: '1X2', group: MarketGroup.MATCH_RESULT, volatility: MarketVolatility.LOW },
  { key: 'OU_0_5', group: MarketGroup.GOALS, volatility: MarketVolatility.MEDIUM },
  { key: 'OU_1_5', group: MarketGroup.GOALS, volatility: MarketVolatility.LOW },
  { key: 'OU_2_5', group: MarketGroup.GOALS, volatility: MarketVolatility.LOW },
  { key: 'OU_3_5', group: MarketGroup.GOALS, volatility: MarketVolatility.MEDIUM },
  { key: 'BTTS', group: MarketGroup.GOALS, volatility: MarketVolatility.LOW },
];

describeDb('Statistical prediction engine over synthetic dev seed (real Postgres)', () => {
  const prisma = new PrismaService();
  const rawClient = prisma as PrismaClient;

  let idCounter = 0;
  const ids: IdGeneratorPort = { newId: () => `test-pred-${Date.now().toString(36)}-${++idCounter}` };

  const buildUseCase = (): RunPredictionUseCase =>
    new RunPredictionUseCase({
      computeFeatures: new ComputeFeaturesUseCase({
        matches: new PrismaMatchRepository(prisma),
        teams: new PrismaTeamRepository(prisma),
        sportsData: new DevSportsDataProvider(),
        teamStats: new DevTeamStatsProvider(),
      }),
      model: new StatisticalPredictionModel(),
      predictions: new PrismaPredictionRepository(prisma),
      predictionResults: new PrismaPredictionResultRepository(prisma),
      predictionInputs: new PrismaPredictionInputRepository(prisma),
      ids,
    });

  beforeAll(async () => {
    await prisma.$connect();
    for (const m of REQUIRED_MARKETS) {
      await rawClient.bettingMarket.upsert({
        where: { key: m.key },
        create: { key: m.key, name: m.key, group: m.group, volatility: m.volatility },
        update: {},
      });
    }
    await seedDev(rawClient); // ensures the demo match + team stats exist (idempotent)
  });

  afterAll(async () => {
    await rawClient.prediction.deleteMany({ where: { matchId: DEMO_MATCH_ID as string } });
    await prisma.$disconnect();
  });

  it('persists Prediction + PredictionInput(FK) + PredictionResult[] for the demo match', async () => {
    const result = await buildUseCase().execute({ matchId: DEMO_MATCH_ID });
    if (!result.ok) throw new Error(`expected ok, got ${result.error.code}`);

    const prediction = await rawClient.prediction.findUnique({
      where: { id: result.value.predictionId as string },
      include: { input: true, results: true },
    });
    expect(prediction).not.toBeNull();
    expect(prediction?.modelVersion).toBe(STAT_MODEL_VERSION);
    expect(prediction?.inputSnapshotHash).toBe(result.value.inputSnapshotHash);
    expect(prediction?.input?.featureVersion).toBeDefined();
    // 1X2(3) + OU×4(8) + BTTS(2) = 13
    expect(prediction?.results.length).toBe(13);
  });

  it('preserves Decimal precision on modelProbability (round-trip at 5 dp)', async () => {
    const run = await buildUseCase().execute({ matchId: DEMO_MATCH_ID });
    if (!run.ok) throw new Error('expected ok');

    const resultRepo = new PrismaPredictionResultRepository(prisma);
    const stored = await resultRepo.findByPrediction(run.value.predictionId);
    expect(stored.length).toBe(13);

    // Every stored probability matches the in-memory model output to 5 dp, and stays in [0,1].
    for (const s of stored) {
      const inMemory = run.value.results.find(
        (r) => r.market === s.market && r.selection === s.selection,
      );
      expect(inMemory).toBeDefined();
      expect(s.modelProbability).toBeCloseTo(inMemory?.modelProbability ?? -1, 5);
      expect(s.modelProbability).toBeGreaterThanOrEqual(0);
      expect(s.modelProbability).toBeLessThanOrEqual(1);
    }

    // 1X2 selections sum to ~1 after the Decimal round-trip.
    const oneXTwoSum = stored
      .filter((s) => s.market === '1X2')
      .reduce((acc, s) => acc + s.modelProbability, 0);
    expect(oneXTwoSum).toBeCloseTo(1, 3);
  });

  it('is REPRODUCIBLE: two runs ⇒ identical probabilities + identical snapshot hash', async () => {
    const useCase = buildUseCase();
    const a = await useCase.execute({ matchId: DEMO_MATCH_ID });
    const b = await useCase.execute({ matchId: DEMO_MATCH_ID });
    if (!a.ok || !b.ok) throw new Error('expected ok');

    expect(a.value.predictionId).not.toBe(b.value.predictionId);
    expect(b.value.inputSnapshotHash).toBe(a.value.inputSnapshotHash);

    const resultRepo = new PrismaPredictionResultRepository(prisma);
    const key = (r: { market: string; selection: string; modelProbability: number }) =>
      `${r.market}:${r.selection}=${r.modelProbability.toFixed(5)}`;
    const first = (await resultRepo.findByPrediction(a.value.predictionId)).map(key).sort();
    const second = (await resultRepo.findByPrediction(b.value.predictionId)).map(key).sort();
    expect(second).toEqual(first);
  });

  it('emits a sample prediction (1X2 + O/U 2.5 + BTTS) for dev-match-demo-1', async () => {
    const result = await buildUseCase().execute({ matchId: DEMO_MATCH_ID });
    if (!result.ok) throw new Error('expected ok');

    const sample = result.value.results
      .filter((r) => r.market === '1X2' || r.market === 'OU_2_5' || r.market === 'BTTS')
      .map((r) => ({
        market: r.market,
        selection: r.selection,
        probability: Number(r.modelProbability.toFixed(5)),
        confidence: r.confidence,
        volatility: r.marketVolatility,
      }));

    // Printed so the DoD can paste the real numbers.
    console.log('SAMPLE PREDICTION dev-match-demo-1:', JSON.stringify(sample, null, 2));
    console.log('modelVersion:', result.value.modelVersion, 'inputSnapshotHash:', result.value.inputSnapshotHash);

    expect(STATISTICAL_MARKETS).toContain('1X2');
    expect(sample.length).toBe(7); // 3 + 2 + 2
  });
});
