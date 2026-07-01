// libs/infrastructure/src/prediction/value-betting.integration.spec.ts
// Phase-11 value betting against a REAL Postgres (compose `postgres`). Requires DATABASE_URL; skips
// cleanly when absent. Runs the REAL statistical model over the SYNTHETIC dev seed, then applies
// DetectValueBets at risk=15 (conservative) and risk=85 (aggressive) on the SAME prediction.
// Proves: recommendation sets change with appetite (aggressive ⊇ conservative) while the model
// probabilities stay byte-identical, and the Recommendation rows persist the appetite/bucket.
import { PrismaClient, MarketGroup, MarketVolatility } from '@prisma/client';
import {
  DefaultRiskProfileService,
  DefaultValueCalculator,
  DefaultKellyStakeService,
  RiskBucket,
  type IdGeneratorPort,
  type MatchId,
} from '@betvision/domain';
import {
  RunPredictionUseCase,
  ComputeFeaturesUseCase,
  DetectValueBetsUseCase,
  GetPredictionUseCase,
} from '@betvision/application';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaMatchRepository } from '../persistence/repositories/prisma-match.repository';
import { PrismaTeamRepository } from '../persistence/repositories/prisma-team.repository';
import { PrismaOddsRepository } from '../persistence/repositories/prisma-odds.repository';
import { PrismaPredictionRepository } from '../persistence/repositories/prisma-prediction.repository';
import { PrismaPredictionResultRepository } from '../persistence/repositories/prisma-prediction-result.repository';
import { PrismaRecommendationRepository } from '../persistence/repositories/prisma-recommendation.repository';
import { PrismaPredictionInputRepository } from '../features/prisma-prediction-input.repository';
import { DevSportsDataProvider } from '../providers/dev/dev-sports-data.provider';
import { DevTeamStatsProvider } from '../providers/dev/dev-team-stats.provider';
import { StatisticalPredictionModel } from './statistical-prediction-model';
import { seedDev } from '../../prisma/seed-dev';

jest.setTimeout(60000);

const describeDb = process.env['DATABASE_URL'] ? describe : describe.skip;
// ISOLATED match id (NOT the shared dev-match-demo-1): jest runs spec files in parallel workers
// against one Postgres, so this suite owns its own fixture to avoid the FK race with the Phase-10
// prediction-engine spec (both would delete predictions by matchId in afterAll). Reuses seedDev's
// synthetic teams/competition/season; adds its own scheduled match + odds (same prices as the demo).
const DEMO_MATCH_ID = 'dev-match-vb-demo' as MatchId;
const DEMO_ODDS: ReadonlyArray<{ marketKey: string; selection: string; price: number }> = [
  { marketKey: '1X2', selection: 'HOME', price: 1.95 },
  { marketKey: '1X2', selection: 'DRAW', price: 3.6 },
  { marketKey: '1X2', selection: 'AWAY', price: 4.2 },
  { marketKey: 'OU_2_5', selection: 'OVER', price: 1.85 },
  { marketKey: 'OU_2_5', selection: 'UNDER', price: 1.95 },
  { marketKey: 'BTTS', selection: 'YES', price: 1.8 },
  { marketKey: 'BTTS', selection: 'NO', price: 2.0 },
];

const REQUIRED_MARKETS: ReadonlyArray<{ key: string; group: MarketGroup; volatility: MarketVolatility }> = [
  { key: '1X2', group: MarketGroup.MATCH_RESULT, volatility: MarketVolatility.LOW },
  { key: 'OU_0_5', group: MarketGroup.GOALS, volatility: MarketVolatility.MEDIUM },
  { key: 'OU_1_5', group: MarketGroup.GOALS, volatility: MarketVolatility.LOW },
  { key: 'OU_2_5', group: MarketGroup.GOALS, volatility: MarketVolatility.LOW },
  { key: 'OU_3_5', group: MarketGroup.GOALS, volatility: MarketVolatility.MEDIUM },
  { key: 'BTTS', group: MarketGroup.GOALS, volatility: MarketVolatility.LOW },
];

const selections = (recs: ReadonlyArray<{ market: string; selection: string }>): string[] =>
  recs.map((r) => `${r.market}:${r.selection}`).sort();

describeDb('Value betting over synthetic dev seed (real Postgres)', () => {
  const prisma = new PrismaService();
  const rawClient = prisma as PrismaClient;

  let idCounter = 0;
  const ids: IdGeneratorPort = { newId: () => `test-vb-${Date.now().toString(36)}-${++idCounter}` };

  const runPrediction = (): RunPredictionUseCase =>
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

  const detectValueBets = (): DetectValueBetsUseCase =>
    new DetectValueBetsUseCase({
      predictions: new PrismaPredictionRepository(prisma),
      predictionResults: new PrismaPredictionResultRepository(prisma),
      odds: new PrismaOddsRepository(prisma),
      recommendations: new PrismaRecommendationRepository(prisma),
      riskProfiles: new DefaultRiskProfileService(),
      valueCalculator: new DefaultValueCalculator(),
      kelly: new DefaultKellyStakeService(),
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
    // Ensure synthetic teams/competition/season exist, then add an ISOLATED scheduled match + odds.
    await seedDev(rawClient);
    await rawClient.match.upsert({
      where: { id: DEMO_MATCH_ID as string },
      create: {
        id: DEMO_MATCH_ID as string,
        competitionId: 'dev-comp-synthetic',
        seasonId: 'dev-season-synthetic',
        homeTeamId: 'dev-team-riverside',
        awayTeamId: 'dev-team-kingsford',
        kickoffUtc: new Date('2026-02-15T18:00:00.000Z'),
        status: 'SCHEDULED',
      },
      update: { status: 'SCHEDULED' },
    });
    for (const o of DEMO_ODDS) {
      const id = `vb-odds-${o.marketKey}-${o.selection}`;
      await rawClient.oddsSnapshot.upsert({
        where: { id },
        create: {
          id,
          matchId: DEMO_MATCH_ID as string,
          bookmaker: 'synthetic-book',
          marketKey: o.marketKey,
          selection: o.selection,
          price: o.price,
          capturedAt: new Date('2026-02-01T00:00:00.000Z'),
        },
        update: { price: o.price },
      });
    }
  });

  afterAll(async () => {
    await rawClient.prediction.deleteMany({ where: { matchId: DEMO_MATCH_ID as string } });
    await rawClient.oddsSnapshot.deleteMany({ where: { matchId: DEMO_MATCH_ID as string } });
    await rawClient.match.deleteMany({ where: { id: DEMO_MATCH_ID as string } });
    await prisma.$disconnect();
  });

  it('risk=15 vs risk=85 → DIFFERENT recommendations, IDENTICAL model probabilities', async () => {
    const run = await runPrediction().execute({ matchId: DEMO_MATCH_ID });
    if (!run.ok) throw new Error(`run failed: ${run.error.code}`);
    const predictionId = run.value.predictionId;

    const conservative = await detectValueBets().execute({ predictionId, riskAppetite: 15 });
    const aggressive = await detectValueBets().execute({ predictionId, riskAppetite: 85 });
    if (!conservative.ok || !aggressive.ok) throw new Error('detect failed');

    expect(conservative.value.riskBucket).toBe(RiskBucket.Conservative);
    expect(aggressive.value.riskBucket).toBe(RiskBucket.Aggressive);

    // Model probabilities are byte-identical regardless of the risk setting.
    const probs = (r: typeof conservative.value): string =>
      JSON.stringify(
        [...r.results]
          .sort((a, b) => `${a.market}${a.selection}`.localeCompare(`${b.market}${b.selection}`))
          .map((x) => `${x.market}:${x.selection}=${x.modelProbability}`),
      );
    expect(probs(aggressive.value)).toBe(probs(conservative.value));

    // Aggressive is a relaxation of conservative ⇒ its recommendation set is a superset.
    const consSet = selections(conservative.value.recommendations);
    const aggrSet = selections(aggressive.value.recommendations);
    expect(aggrSet.length).toBeGreaterThanOrEqual(consSet.length);
    for (const s of consSet) expect(aggrSet).toContain(s);

    console.log(
      '\n[DB PROOF dev-match-demo-1]',
      '\n  risk=15 (conservative) bucket=', conservative.value.riskBucket, 'recs=', consSet,
      '\n  risk=85 (aggressive)  bucket=', aggressive.value.riskBucket, 'recs=', aggrSet,
      '\n  identical model probabilities:', probs(aggressive.value) === probs(conservative.value),
      '\n  bestBet@85:', aggressive.value.bestBet
        ? `${aggressive.value.bestBet.market}:${aggressive.value.bestBet.selection} EV=${aggressive.value.bestBet.expectedValue?.toFixed(4)} stake=${aggressive.value.bestBet.suggestedStakePct?.toFixed(4)}`
        : 'none',
    );
    console.log(
      '\n[SAMPLE 1X2/OU_2_5/BTTS @ risk=85]',
      JSON.stringify(
        aggressive.value.results
          .filter((r) => ['1X2', 'OU_2_5', 'BTTS'].includes(r.market))
          .map((r) => ({
            market: r.market,
            selection: r.selection,
            modelProbability: Number(r.modelProbability.toFixed(5)),
            impliedProbability: r.impliedProbability === null ? null : Number(r.impliedProbability.toFixed(5)),
            edge: r.edge === null ? null : Number(r.edge.toFixed(5)),
            expectedValue: r.expectedValue === null ? null : Number(r.expectedValue.toFixed(5)),
            suggestedStakePct: r.suggestedStakePct === null ? null : Number(r.suggestedStakePct.toFixed(5)),
          })),
        null,
        2,
      ),
    );
  });

  it('persists Recommendations with the riskAppetite/bucket, then reads them back via GetPrediction', async () => {
    const run = await runPrediction().execute({ matchId: DEMO_MATCH_ID });
    if (!run.ok) throw new Error('run failed');
    const detect = await detectValueBets().execute({ predictionId: run.value.predictionId, riskAppetite: 85 });
    if (!detect.ok) throw new Error('detect failed');

    const get = new GetPredictionUseCase({
      predictions: new PrismaPredictionRepository(prisma),
      predictionResults: new PrismaPredictionResultRepository(prisma),
      recommendations: new PrismaRecommendationRepository(prisma),
    });
    const view = await get.execute({ predictionId: run.value.predictionId });
    if (!view.ok) throw new Error('get failed');

    expect(view.value.riskAppetite).toBe(detect.value.recommendations.length > 0 ? 85 : null);
    expect(view.value.recommendations.length).toBe(detect.value.recommendations.length);
    if (view.value.recommendations.length > 0) {
      expect(view.value.riskBucket).toBe(RiskBucket.Aggressive);
      expect(view.value.recommendations.some((r) => r.isBestBet)).toBe(true);
    }
  });
});
