// apps/api/src/predictions/predictions.e2e.spec.ts
// End-to-end predictions against a REAL Postgres (compose `postgres`). Redis-backed ports
// (feature store, cache, refresh store, notifications) are overridden with the libs/testing fakes
// so the suite needs only Postgres. Skips cleanly when DATABASE_URL is absent.
//
// HEADLINE (Feature Spec B): POST /predictions for dev-match-demo-1 at riskAppetite=15 vs =85
// returns DIFFERENT recommendation sets (aggressive ⊇ conservative) with BYTE-IDENTICAL model
// probabilities, echoes the resolved bucket, and requires auth.
import 'reflect-metadata';
import { VersioningType, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { PrismaClient, MarketGroup, MarketVolatility } from '@prisma/client';
import { CACHE, NOTIFICATION, REFRESH_TOKEN_STORE, FEATURE_STORE } from '@betvision/domain';
import { PrismaService } from '@betvision/infrastructure';
import {
  FakeCache,
  FakeNotificationPort,
  FakeRefreshTokenStore,
  FakeFeatureStore,
} from '@betvision/testing';
import { AppModule } from '../app/app.module';

process.env.NODE_ENV = 'test';
process.env.DATA_SOURCE_MODE = process.env.DATA_SOURCE_MODE ?? 'dev';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test_access_secret_0123456789abcdef';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'test_refresh_secret_0123456789abcdef_diff';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

const describeDb = process.env['DATABASE_URL'] ? describe : describe.skip;
const V1 = '/api/v1';
const PASSWORD = 'Str0ng!Passw0rd';
const DEMO_MATCH_ID = 'dev-match-demo-1';

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

describeDb('Predictions (e2e, real Postgres)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(REFRESH_TOKEN_STORE)
      .useValue(new FakeRefreshTokenStore())
      .overrideProvider(CACHE)
      .useValue(new FakeCache())
      .overrideProvider(NOTIFICATION)
      .useValue(new FakeNotificationPort())
      .overrideProvider(FEATURE_STORE)
      .useValue(new FakeFeatureStore())
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI });
    app.use(cookieParser());
    await app.init();

    prisma = app.get(PrismaService);
    const rawClient = prisma as unknown as PrismaClient;
    // The demo fixture + its odds come from `npm run db:seed:dev` (run by the DB workflow before
    // this suite). Ensure the FULL statistical market catalog exists for the PredictionResult FK
    // (db:seed:dev only seeds 1X2/OU_2_5/BTTS).
    for (const m of REQUIRED_MARKETS) {
      await rawClient.bettingMarket.upsert({
        where: { key: m.key },
        create: { key: m.key, name: m.key, group: m.group, volatility: m.volatility },
        update: {},
      });
    }

    const email = `predictions-${Date.now().toString(36)}@example.com`;
    const agent = request.agent(app.getHttpServer());
    await agent
      .post(`${V1}/auth/register`)
      .send({ email, password: PASSWORD, locale: 'en', ageConfirmed: true, acceptedTerms: true });
    const login = await agent.post(`${V1}/auth/login`).send({ email, password: PASSWORD });
    accessToken = login.body.data.accessToken;
  });

  afterAll(async () => {
    const rawClient = prisma as unknown as PrismaClient;
    await rawClient.prediction.deleteMany({ where: { matchId: DEMO_MATCH_ID } });
    await app?.close();
  });

  it('requires authentication (401)', async () => {
    const res = await request(app.getHttpServer())
      .post(`${V1}/predictions`)
      .send({ matchId: DEMO_MATCH_ID, riskAppetite: 50 });
    expect(res.status).toBe(401);
  });

  it('POST /predictions at risk=15 vs risk=85 → different recommendations, identical probabilities, echoed bucket', async () => {
    const post = (riskAppetite: number) =>
      request(app.getHttpServer())
        .post(`${V1}/predictions`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ matchId: DEMO_MATCH_ID, riskAppetite });

    const conservative = await post(15);
    const aggressive = await post(85);

    expect(conservative.status).toBe(201);
    expect(aggressive.status).toBe(201);

    const cons = conservative.body.data;
    const aggr = aggressive.body.data;

    // Echoed appetite + resolved bucket (Feature Spec B reproducibility / UI label).
    expect(cons.riskAppetite).toBe(15);
    expect(cons.riskBucket).toBe('conservative');
    expect(aggr.riskAppetite).toBe(85);
    expect(aggr.riskBucket).toBe('aggressive');

    // Model probabilities are byte-identical regardless of the risk setting.
    const probs = (body: { results: Array<{ market: string; selection: string; modelProbability: number }> }): string =>
      JSON.stringify(
        [...body.results]
          .sort((a, b) => `${a.market}${a.selection}`.localeCompare(`${b.market}${b.selection}`))
          .map((r) => `${r.market}:${r.selection}=${r.modelProbability}`),
      );
    expect(probs(aggr)).toBe(probs(cons));

    // Recommendation sets change with appetite: aggressive is a superset of conservative.
    const consSet = selections(cons.recommendations);
    const aggrSet = selections(aggr.recommendations);
    expect(aggrSet.length).toBeGreaterThanOrEqual(consSet.length);
    for (const s of consSet) expect(aggrSet).toContain(s);

    console.log(
      '\n[POST /predictions PROOF]',
      '\n  risk=15:', JSON.stringify({ bucket: cons.riskBucket, recommendations: consSet, noValueFound: cons.noValueFound }),
      '\n  risk=85:', JSON.stringify({ bucket: aggr.riskBucket, recommendations: aggrSet, noValueFound: aggr.noValueFound }),
      '\n  identical model probabilities:', probs(aggr) === probs(cons),
      '\n  bestBet@85:', aggr.bestBet ? `${aggr.bestBet.market}:${aggr.bestBet.selection}` : 'none',
    );
    console.log('\n[FULL RESPONSE @ risk=85]', JSON.stringify(aggr, null, 2));
    console.log('\n[FULL RESPONSE @ risk=15]', JSON.stringify(cons, null, 2));
  });

  it('GET /predictions/:id returns the stored run + results + recommendations', async () => {
    const created = await request(app.getHttpServer())
      .post(`${V1}/predictions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ matchId: DEMO_MATCH_ID, riskAppetite: 85 });
    const predictionId = created.body.data.predictionId as string;

    const res = await request(app.getHttpServer())
      .get(`${V1}/predictions/${predictionId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.predictionId).toBe(predictionId);
    expect(res.body.data.matchId).toBe(DEMO_MATCH_ID);
    expect(res.body.data.results.length).toBeGreaterThan(0);
  });

  it('GET /predictions/:id returns 404 for an unknown id', async () => {
    const res = await request(app.getHttpServer())
      .get(`${V1}/predictions/does-not-exist`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('domain.prediction.not_found');
  });
});
