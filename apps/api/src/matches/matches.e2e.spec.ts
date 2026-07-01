// End-to-end matches integration against a REAL Postgres (the compose `postgres` service).
// Redis-backed ports (refresh store, cache, notifications) are overridden with the
// libs/testing fakes so the suite needs only Postgres. Skips cleanly when DATABASE_URL is
// absent. Proves: fixture resolution returns ranked candidates for "Real Madrid vs Barcelona",
// nonsense returns NO_MATCH (empty candidates), match detail resolves, and auth is required.
import 'reflect-metadata';
import { VersioningType, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import {
  CACHE,
  NOTIFICATION,
  REFRESH_TOKEN_STORE,
} from '@betvision/domain';
import { PrismaService } from '@betvision/infrastructure';
import {
  FakeCache,
  FakeNotificationPort,
  FakeRefreshTokenStore,
} from '@betvision/testing';
import { AppModule } from '../app/app.module';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? 'test_access_secret_0123456789abcdef';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'test_refresh_secret_0123456789abcdef_diff';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

const describeDb = process.env['DATABASE_URL'] ? describe : describe.skip;
const V1 = '/api/v1';
const PASSWORD = 'Str0ng!Passw0rd';

describeDb('Matches (e2e, real Postgres)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;

  const suffix = `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`;
  const competitionId = `e2e-comp-${suffix}`;
  const seasonId = `e2e-season-${suffix}`;
  const homeTeamId = `e2e-home-${suffix}`;
  const awayTeamId = `e2e-away-${suffix}`;
  const matchId = `e2e-match-${suffix}`;
  const homeName = `Real Madrid ${suffix}`;
  const awayName = `Barcelona ${suffix}`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(REFRESH_TOKEN_STORE)
      .useValue(new FakeRefreshTokenStore())
      .overrideProvider(CACHE)
      .useValue(new FakeCache())
      .overrideProvider(NOTIFICATION)
      .useValue(new FakeNotificationPort())
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI });
    app.use(cookieParser());
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.competition.create({ data: { id: competitionId, name: `E2E League ${suffix}` } });
    await prisma.season.create({ data: { id: seasonId, competitionId, label: '2025/26' } });
    await prisma.team.create({ data: { id: homeTeamId, name: homeName, shortName: 'RMA' } });
    await prisma.team.create({ data: { id: awayTeamId, name: awayName, shortName: 'FCB' } });
    await prisma.match.create({
      data: {
        id: matchId,
        competitionId,
        seasonId,
        homeTeamId,
        awayTeamId,
        kickoffUtc: new Date('2026-02-01T20:00:00.000Z'),
      },
    });

    // A real account to obtain an access token (all match endpoints require auth).
    const email = `matches-${suffix}@example.com`;
    const agent = request.agent(app.getHttpServer());
    await agent
      .post(`${V1}/auth/register`)
      .send({ email, password: PASSWORD, locale: 'en', ageConfirmed: true, acceptedTerms: true });
    const login = await agent.post(`${V1}/auth/login`).send({ email, password: PASSWORD });
    accessToken = login.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.match.deleteMany({ where: { id: matchId } });
    await prisma.team.deleteMany({ where: { id: { in: [homeTeamId, awayTeamId] } } });
    await prisma.season.deleteMany({ where: { id: seasonId } });
    await prisma.competition.deleteMany({ where: { id: competitionId } });
    await app?.close();
  });

  it('requires authentication for the search endpoint (401)', async () => {
    const res = await request(app.getHttpServer())
      .get(`${V1}/matches/search`)
      .query({ q: `${homeName} vs ${awayName}` });
    expect(res.status).toBe(401);
  });

  it('resolves "Real Madrid vs Barcelona" to ranked candidates with confidence', async () => {
    const res = await request(app.getHttpServer())
      .get(`${V1}/matches/search`)
      .query({ q: `${homeName} vs ${awayName}` })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const { candidates, suggestions } = res.body.data;
    expect(candidates.length).toBeGreaterThan(0);
    const top = candidates[0];
    expect(top.matchId).toBe(matchId);
    expect(top.home.name).toBe(homeName);
    expect(top.away.name).toBe(awayName);
    expect(top.confidence).toBeGreaterThan(0.3);
    expect(top.confidence).toBeLessThanOrEqual(1);
    expect(suggestions).toEqual([]);

    console.log(
      `\n[FIXTURE RESOLUTION PROOF] q="${homeName} vs ${awayName}"\n  top=${top.home.name} vs ${top.away.name} confidence=${top.confidence}\n`,
    );
  });

  it('returns NO_MATCH (empty candidates) for a nonsense query', async () => {
    const res = await request(app.getHttpServer())
      .get(`${V1}/matches/search`)
      .query({ q: 'zzxqwv vs qwzxvq' })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.candidates).toEqual([]);
  });

  it('returns canonical match detail by id', async () => {
    const res = await request(app.getHttpServer())
      .get(`${V1}/matches/${matchId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(matchId);
    expect(res.body.data.home.name).toBe(homeName);
    expect(res.body.data.competition.name).toBe(`E2E League ${suffix}`);
    expect(res.body.data.oddsSummary).toEqual({ available: false });
  });

  it('returns 404 MATCH_NOT_FOUND for an unknown match id', async () => {
    const res = await request(app.getHttpServer())
      .get(`${V1}/matches/does-not-exist-${suffix}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('domain.match.not_found');
  });
});
