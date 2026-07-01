// apps/api/src/auth/auth.e2e.spec.ts
// End-to-end auth + users integration against a REAL Postgres (the compose `postgres`
// service). Redis-backed ports (refresh store, cache, notifications) are overridden with the
// libs/testing fakes so the suite needs only Postgres. Skips cleanly when DATABASE_URL is
// absent (unit-only runs never hang). Proves: register->login->refresh->protected route,
// the RBAC authz matrix, the age/terms gate, and EN vs ES localization of an auth error.
import 'reflect-metadata';
import {
  Controller,
  Get,
  Module,
  UseGuards,
  VersioningType,
  type INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import {
  CACHE,
  NOTIFICATION,
  REFRESH_TOKEN_STORE,
  TOKEN_SERVICE,
  type TokenServicePort,
  type UserId,
} from '@betvision/domain';
import {
  FakeCache,
  FakeNotificationPort,
  FakeRefreshTokenStore,
} from '@betvision/testing';
import { AppModule } from '../app/app.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';

// Test secrets/env must exist before ConfigModule.loadConfig() runs (at module compile).
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? 'test_access_secret_0123456789abcdef';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'test_refresh_secret_0123456789abcdef_diff';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

/** Admin-only diagnostic route to exercise the RBAC authz matrix (JwtAuthGuard + RolesGuard). */
@Controller({ path: 'diag-admin', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
class DiagAdminController {
  @Get()
  @Roles('admin')
  adminOnly(): { ok: true } {
    return { ok: true };
  }
}

@Module({
  controllers: [DiagAdminController],
  providers: [JwtAuthGuard, RolesGuard],
})
class DiagAdminModule {}

const describeDb = process.env['DATABASE_URL'] ? describe : describe.skip;
const V1 = '/api/v1';
const PASSWORD = 'Str0ng!Passw0rd';

describeDb('Auth + Users (e2e, real Postgres)', () => {
  let app: INestApplication;
  let adminToken: string;

  const uniqueEmail = (): string =>
    `phase5-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, DiagAdminModule],
    })
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

    // Mint an admin access token directly (no admin account needed for the RBAC matrix).
    const tokens = app.get<TokenServicePort>(TOKEN_SERVICE);
    adminToken = await tokens.issueAccessToken({
      userId: 'admin-e2e' as UserId,
      email: 'admin@example.com',
      role: 'admin',
      locale: 'en',
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('runs the full flow: register -> login -> access /users/me -> refresh -> access again', async () => {
    const email = uniqueEmail();
    const agent = request.agent(app.getHttpServer());

    const register = await agent
      .post(`${V1}/auth/register`)
      .send({ email, password: PASSWORD, locale: 'en', ageConfirmed: true, acceptedTerms: true });
    expect(register.status).toBe(201);
    expect(register.body.data.email).toBe(email);
    expect(register.body.data.role).toBe('user');
    expect(register.body.data.status).toBe('active');

    const login = await agent
      .post(`${V1}/auth/login`)
      .send({ email, password: PASSWORD });
    expect(login.status).toBe(200);
    const accessToken: string = login.body.data.accessToken;
    expect(accessToken.length).toBeGreaterThan(0);
    expect(login.body.data.user.email).toBe(email);
    // Refresh token is delivered ONLY as an httpOnly cookie, never in the body.
    expect(JSON.stringify(login.body)).not.toContain('refresh_token');
    const setCookie = login.headers['set-cookie'];
    expect(String(setCookie)).toContain('refresh_token=');
    expect(String(setCookie)).toContain('HttpOnly');

    const me = await agent
      .get(`${V1}/users/me`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(email);

    // Refresh using the httpOnly cookie held by the agent.
    const refreshed = await agent.post(`${V1}/auth/refresh`).send();
    expect(refreshed.status).toBe(200);
    const newAccess: string = refreshed.body.data.accessToken;
    expect(newAccess.length).toBeGreaterThan(0);

    const meAgain = await agent
      .get(`${V1}/users/me`)
      .set('Authorization', `Bearer ${newAccess}`);
    expect(meAgain.status).toBe(200);
  });

  it('rejects /users/me without a token (401)', async () => {
    const res = await request(app.getHttpServer()).get(`${V1}/users/me`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('errors.unauthorized');
  });

  it('enforces the RBAC authz matrix on an admin-only route', async () => {
    // 1) no token -> 401
    const anon = await request(app.getHttpServer()).get(`${V1}/diag-admin`);
    expect(anon.status).toBe(401);

    // 2) user-role token -> 403 (localized domain.auth.forbidden)
    const email = uniqueEmail();
    const agent = request.agent(app.getHttpServer());
    await agent
      .post(`${V1}/auth/register`)
      .send({ email, password: PASSWORD, locale: 'en', ageConfirmed: true, acceptedTerms: true });
    const login = await agent
      .post(`${V1}/auth/login`)
      .send({ email, password: PASSWORD });
    const userToken: string = login.body.data.accessToken;
    const forbidden = await request(app.getHttpServer())
      .get(`${V1}/diag-admin`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe('domain.auth.forbidden');

    // 3) admin-role token -> 200
    const allowed = await request(app.getHttpServer())
      .get(`${V1}/diag-admin`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body.data.ok).toBe(true);
  });

  it('blocks registration without age confirmation or accepted terms', async () => {
    const noAge = await request(app.getHttpServer())
      .post(`${V1}/auth/register`)
      .send({ email: uniqueEmail(), password: PASSWORD, locale: 'en', ageConfirmed: false, acceptedTerms: true });
    expect(noAge.status).toBe(400);

    const noTerms = await request(app.getHttpServer())
      .post(`${V1}/auth/register`)
      .send({ email: uniqueEmail(), password: PASSWORD, locale: 'en', ageConfirmed: true, acceptedTerms: false });
    expect(noTerms.status).toBe(400);
  });

  it('returns a GENERIC error on duplicate registration (no enumeration)', async () => {
    const email = uniqueEmail();
    const body = { email, password: PASSWORD, locale: 'en', ageConfirmed: true, acceptedTerms: true };
    await request(app.getHttpServer()).post(`${V1}/auth/register`).send(body);
    const dup = await request(app.getHttpServer())
      .post(`${V1}/auth/register`)
      .send(body);
    expect(dup.status).toBe(400);
    expect(dup.body.error.code).toBe('domain.auth.registration_failed');
  });

  it('localizes the SAME auth error EN vs ES (invalid credentials)', async () => {
    const email = uniqueEmail();
    await request(app.getHttpServer())
      .post(`${V1}/auth/register`)
      .send({ email, password: PASSWORD, locale: 'en', ageConfirmed: true, acceptedTerms: true });

    const en = await request(app.getHttpServer())
      .post(`${V1}/auth/login`)
      .set('Accept-Language', 'en')
      .send({ email, password: 'Wr0ng!Passw0rd' });
    const es = await request(app.getHttpServer())
      .post(`${V1}/auth/login`)
      .set('Accept-Language', 'es')
      .send({ email, password: 'Wr0ng!Passw0rd' });

    expect(en.status).toBe(401);
    expect(es.status).toBe(401);
    // Same stable code, different localized prose (no leak of which field was wrong).
    expect(en.body.error.code).toBe('domain.auth.invalid_credentials');
    expect(es.body.error.code).toBe('domain.auth.invalid_credentials');
    expect(en.body.error.message).toBe('Invalid email or password.');
    expect(es.body.error.message).toBe('Correo electrónico o contraseña no válidos.');
    expect(en.body.error.message).not.toBe(es.body.error.message);

    // Surface the proof in the test output.
    console.log(
      `\n[AUTH i18n PROOF] code=${en.body.error.code}\n  EN: ${en.body.error.message}\n  ES: ${es.body.error.message}\n`,
    );
  });
});
