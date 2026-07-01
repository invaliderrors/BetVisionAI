// apps/api/src/reports/reports.e2e.spec.ts
// End-to-end AI reports against a REAL Postgres (compose `postgres`). Redis-backed ports are
// overridden with libs/testing fakes so the suite needs only Postgres. Skips cleanly when
// DATABASE_URL is absent.
//
// HEADLINE (Phase 12): for the seeded dev-match-demo-1 prediction, POST /predictions/:id/report in
// EN and ES returns BYTE-IDENTICAL numbers with different-language prose, the responsible-gambling
// warning, cited sources and the risk bucket that produced the recommendations. GET /reports/:id is
// immutable. Runs in LLM_MODE=dev (deterministic TemplateLlmAdapter — no API key, no network).
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
process.env.LLM_MODE = process.env.LLM_MODE ?? 'dev';
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

interface SelectionNumbers {
  readonly market: string;
  readonly selection: string;
  readonly modelProbability: number;
  readonly impliedProbability: number | null;
  readonly edge: number | null;
  readonly expectedValue: number | null;
  readonly suggestedStakePct: number | null;
}
const numbers = (rows: ReadonlyArray<SelectionNumbers>): string =>
  JSON.stringify(
    [...rows]
      .sort((a, b) => `${a.market}${a.selection}`.localeCompare(`${b.market}${b.selection}`))
      .map((r) => ({
        k: `${r.market}:${r.selection}`,
        modelProbability: r.modelProbability,
        impliedProbability: r.impliedProbability,
        edge: r.edge,
        expectedValue: r.expectedValue,
        suggestedStakePct: r.suggestedStakePct,
      })),
  );

describeDb('Reports (e2e, real Postgres)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let predictionId: string;

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
    for (const m of REQUIRED_MARKETS) {
      await rawClient.bettingMarket.upsert({
        where: { key: m.key },
        create: { key: m.key, name: m.key, group: m.group, volatility: m.volatility },
        update: {},
      });
    }

    const email = `reports-${Date.now().toString(36)}@example.com`;
    const agent = request.agent(app.getHttpServer());
    await agent
      .post(`${V1}/auth/register`)
      .send({ email, password: PASSWORD, locale: 'en', ageConfirmed: true, acceptedTerms: true });
    const login = await agent.post(`${V1}/auth/login`).send({ email, password: PASSWORD });
    accessToken = login.body.data.accessToken;

    // Produce a prediction + aggressive recommendation set to report on.
    const created = await request(app.getHttpServer())
      .post(`${V1}/predictions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ matchId: DEMO_MATCH_ID, riskAppetite: 85 });
    predictionId = created.body.data.predictionId as string;
  });

  afterAll(async () => {
    const rawClient = prisma as unknown as PrismaClient;
    await rawClient.analysisReport.deleteMany({ where: { matchId: DEMO_MATCH_ID } });
    await rawClient.prediction.deleteMany({ where: { matchId: DEMO_MATCH_ID } });
    await app?.close();
  });

  it('requires authentication (401)', async () => {
    const res = await request(app.getHttpServer()).post(
      `${V1}/predictions/${predictionId}/report?language=en`,
    );
    expect(res.status).toBe(401);
  });

  it('generates EN and ES reports with identical numbers + different prose, and stores bucket/sources', async () => {
    const gen = (language: string) =>
      request(app.getHttpServer())
        .post(`${V1}/predictions/${predictionId}/report?language=${language}`)
        .set('Authorization', `Bearer ${accessToken}`);

    const en = await gen('en');
    const es = await gen('es');
    expect(en.status).toBe(201);
    expect(es.status).toBe(201);

    const enBody = en.body.data;
    const esBody = es.body.data;

    // Byte-identical numbers across languages.
    expect(numbers(esBody.recommendedMarkets)).toBe(numbers(enBody.recommendedMarkets));
    expect(numbers(esBody.predictions)).toBe(numbers(enBody.predictions));

    // Different-language prose.
    expect(enBody.language).toBe('en');
    expect(esBody.language).toBe('es');
    expect(enBody.summary).not.toBe(esBody.summary);

    // RiskAppetite/bucket provenance + cited sources + RG warning.
    expect(enBody.riskAppetite).toBe(85);
    expect(enBody.riskBucket).toBe('aggressive');
    expect(enBody.sources.length).toBeGreaterThan(0);
    expect(enBody.responsibleGamblingWarning).toMatch(/responsibl/i);
    expect(esBody.responsibleGamblingWarning).toMatch(/responsab/i);
    expect(enBody.modelVersion).toBeTruthy();

    console.log(
      '\n[GENERATED REPORT — dev-match-demo-1 @ risk 85 (aggressive), LLM_MODE=dev]',
      '\n  identical numbers EN==ES:',
      numbers(esBody.recommendedMarkets) === numbers(enBody.recommendedMarkets),
    );
    console.log('\n[EN REPORT]', JSON.stringify(enBody, null, 2));
    console.log('\n[ES SUMMARY]', esBody.summary);
  });

  it('GET /reports/:id returns the assembled report and is immutable across reads', async () => {
    const created = await request(app.getHttpServer())
      .post(`${V1}/predictions/${predictionId}/report?language=en`)
      .set('Authorization', `Bearer ${accessToken}`);
    const reportId = created.body.data.id as string;

    const first = await request(app.getHttpServer())
      .get(`${V1}/reports/${reportId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    const second = await request(app.getHttpServer())
      .get(`${V1}/reports/${reportId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(first.status).toBe(200);
    expect(first.body.data.id).toBe(reportId);
    expect(first.body.data.predictionId).toBe(predictionId);
    // Immutable: identical body on repeat reads.
    expect(JSON.stringify(second.body.data)).toBe(JSON.stringify(first.body.data));
  });

  it('GET /reports/:id returns 404 for an unknown id', async () => {
    const res = await request(app.getHttpServer())
      .get(`${V1}/reports/does-not-exist`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('domain.report.not_found');
  });
});
