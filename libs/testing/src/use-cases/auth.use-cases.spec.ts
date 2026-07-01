// libs/testing/src/use-cases/auth.use-cases.spec.ts
// Auth flows wired against the shared libs/testing fakes (zero IO). This layer is the only
// one allowed to depend on BOTH @betvision/application and the fakes.
import {
  RegisterUseCase,
  LoginUseCase,
  RefreshTokenUseCase,
  LogoutUseCase,
  ForgotPasswordUseCase,
  ResetPasswordUseCase,
  type AuthTokensConfig,
} from '@betvision/application';
import { RoleName, type Role } from '@betvision/domain';
import { DomainErrorCode } from '@betvision/shared';
import { FakeUserRepository } from '../fakes/fake-user-repository';
import { FakePasswordHasher } from '../fakes/fake-password-hasher';
import { FakeTokenService } from '../fakes/fake-token-service';
import { FakeRefreshTokenStore } from '../fakes/fake-refresh-token-store';
import { FakeClockPort } from '../fakes/fake-clock.port';
import { FakeIdGeneratorPort } from '../fakes/fake-id-generator.port';
import { FakeAuditLog } from '../fakes/fake-audit-log';
import { FakeCache } from '../fakes/fake-cache';
import { FakeNotificationPort } from '../fakes/fake-notification.port';

const ROLE: Role = {
  id: 'role-user',
  name: RoleName.User,
  permissions: ['match:read'],
};
const CONFIG: AuthTokensConfig = {
  accessTtlSeconds: 900,
  refreshTtlSeconds: 604800,
  resetTokenTtlSeconds: 900,
};
const EMAIL = 'player@example.com';
const PASSWORD = 'Str0ng!Passw0rd';

function makeHarness() {
  const users = new FakeUserRepository().seedRole(ROLE);
  const hasher = new FakePasswordHasher();
  const tokens = new FakeTokenService();
  const refreshStore = new FakeRefreshTokenStore();
  const clock = new FakeClockPort();
  const ids = new FakeIdGeneratorPort();
  const audit = new FakeAuditLog();
  const cache = new FakeCache();
  const notifications = new FakeNotificationPort();

  return {
    users,
    refreshStore,
    audit,
    cache,
    notifications,
    register: new RegisterUseCase(users, hasher, clock, ids, audit),
    login: new LoginUseCase(
      users,
      hasher,
      tokens,
      refreshStore,
      ids,
      clock,
      audit,
      CONFIG,
    ),
    refresh: new RefreshTokenUseCase(
      users,
      tokens,
      refreshStore,
      ids,
      clock,
      audit,
      CONFIG,
    ),
    logout: new LogoutUseCase(tokens, refreshStore, clock, audit),
    forgot: new ForgotPasswordUseCase(
      users,
      cache,
      notifications,
      ids,
      clock,
      audit,
      CONFIG,
    ),
    reset: new ResetPasswordUseCase(
      users,
      hasher,
      cache,
      refreshStore,
      clock,
      audit,
    ),
  };
}

const validRegister = {
  email: EMAIL,
  password: PASSWORD,
  locale: 'en' as const,
  ageConfirmed: true,
  acceptedTerms: true,
};

describe('RegisterUseCase', () => {
  it('registers a new active account', async () => {
    const h = makeHarness();
    const result = await h.register.execute(validRegister);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.email).toBe(EMAIL);
      expect(result.value.role).toBe('user');
      expect(result.value.status).toBe('active');
    }
  });

  it('rejects when the age gate is not confirmed', async () => {
    const h = makeHarness();
    const result = await h.register.execute({
      ...validRegister,
      ageConfirmed: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(DomainErrorCode.AGE_NOT_CONFIRMED);
    }
  });

  it('rejects when terms are not accepted', async () => {
    const h = makeHarness();
    const result = await h.register.execute({
      ...validRegister,
      acceptedTerms: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(DomainErrorCode.TERMS_NOT_ACCEPTED);
    }
  });

  it('returns a GENERIC error on a duplicate email (no enumeration)', async () => {
    const h = makeHarness();
    await h.register.execute(validRegister);
    const dup = await h.register.execute(validRegister);
    expect(dup.ok).toBe(false);
    if (!dup.ok) {
      expect(dup.error.code).toBe(DomainErrorCode.REGISTRATION_FAILED);
    }
  });
});

describe('LoginUseCase', () => {
  it('issues tokens for valid credentials and opens a refresh family', async () => {
    const h = makeHarness();
    await h.register.execute(validRegister);
    const result = await h.login.execute({ email: EMAIL, password: PASSWORD });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.auth.accessToken.length).toBeGreaterThan(0);
      expect(result.value.refreshToken.length).toBeGreaterThan(0);
      expect(h.refreshStore.families.size).toBe(1);
    }
  });

  it('returns a GENERIC error for a wrong password (no leak)', async () => {
    const h = makeHarness();
    await h.register.execute(validRegister);
    const result = await h.login.execute({ email: EMAIL, password: 'Wr0ng!Passw0rd' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(DomainErrorCode.INVALID_CREDENTIALS);
    }
  });

  it('returns the SAME generic error for an unknown email', async () => {
    const h = makeHarness();
    const result = await h.login.execute({
      email: 'nobody@example.com',
      password: PASSWORD,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(DomainErrorCode.INVALID_CREDENTIALS);
    }
  });
});

describe('RefreshTokenUseCase — rotation + reuse detection', () => {
  it('rotates the refresh token on each use', async () => {
    const h = makeHarness();
    await h.register.execute(validRegister);
    const login = await h.login.execute({ email: EMAIL, password: PASSWORD });
    if (!login.ok) throw new Error('login failed');

    const first = await h.refresh.execute({
      refreshToken: login.value.refreshToken,
    });
    expect(first.ok).toBe(true);
    if (first.ok) {
      // A brand-new refresh token is minted (different from the one presented).
      expect(first.value.refreshToken).not.toBe(login.value.refreshToken);
    }
  });

  it('detects reuse of a superseded token and REVOKES the whole family', async () => {
    const h = makeHarness();
    await h.register.execute(validRegister);
    const login = await h.login.execute({ email: EMAIL, password: PASSWORD });
    if (!login.ok) throw new Error('login failed');
    const originalToken = login.value.refreshToken;

    // Legit rotation: originalToken -> rotatedToken.
    const rotated = await h.refresh.execute({ refreshToken: originalToken });
    if (!rotated.ok) throw new Error('rotation failed');
    const familyCount = h.refreshStore.families.size;
    expect(familyCount).toBe(1);

    // Replay the now-superseded original token => reuse detected.
    const replay = await h.refresh.execute({ refreshToken: originalToken });
    expect(replay.ok).toBe(false);
    if (!replay.ok) {
      expect(replay.error.code).toBe(DomainErrorCode.INVALID_REFRESH_TOKEN);
    }

    // The entire family is now revoked: even the freshly-rotated token is dead.
    expect(h.refreshStore.families.size).toBe(0);
    const afterRevoke = await h.refresh.execute({
      refreshToken: rotated.value.refreshToken,
    });
    expect(afterRevoke.ok).toBe(false);
  });

  it('logout revokes the family so its tokens can no longer refresh', async () => {
    const h = makeHarness();
    await h.register.execute(validRegister);
    const login = await h.login.execute({ email: EMAIL, password: PASSWORD });
    if (!login.ok) throw new Error('login failed');

    await h.logout.execute({ refreshToken: login.value.refreshToken });
    expect(h.refreshStore.families.size).toBe(0);

    const afterLogout = await h.refresh.execute({
      refreshToken: login.value.refreshToken,
    });
    expect(afterLogout.ok).toBe(false);
  });
});

describe('Forgot/Reset password', () => {
  it('delivers a reset token and lets the user reset (revoking sessions)', async () => {
    const h = makeHarness();
    await h.register.execute(validRegister);
    const login = await h.login.execute({ email: EMAIL, password: PASSWORD });
    if (!login.ok) throw new Error('login failed');

    const forgot = await h.forgot.execute({ email: EMAIL });
    expect(forgot.ok).toBe(true);
    // Token is delivered via the notification outbox (never returned in the response).
    expect(h.notifications.outbox).toHaveLength(1);
    const token = String(h.notifications.outbox[0].params['token']);
    expect(token.length).toBeGreaterThan(0);

    const reset = await h.reset.execute({ token, password: 'N3w!Passw0rd12' });
    expect(reset.ok).toBe(true);

    // Old sessions are revoked; old password no longer works, new one does.
    expect(h.refreshStore.families.size).toBe(0);
    const oldLogin = await h.login.execute({ email: EMAIL, password: PASSWORD });
    expect(oldLogin.ok).toBe(false);
    const newLogin = await h.login.execute({
      email: EMAIL,
      password: 'N3w!Passw0rd12',
    });
    expect(newLogin.ok).toBe(true);
  });

  it('answers generically for an unknown email (no enumeration, no outbox)', async () => {
    const h = makeHarness();
    const forgot = await h.forgot.execute({ email: 'nobody@example.com' });
    expect(forgot.ok).toBe(true);
    expect(h.notifications.outbox).toHaveLength(0);
  });

  it('rejects an invalid reset token', async () => {
    const h = makeHarness();
    const reset = await h.reset.execute({
      token: 'bogus',
      password: 'N3w!Passw0rd12',
    });
    expect(reset.ok).toBe(false);
    if (!reset.ok) {
      expect(reset.error.code).toBe(DomainErrorCode.INVALID_RESET_TOKEN);
    }
  });
});
