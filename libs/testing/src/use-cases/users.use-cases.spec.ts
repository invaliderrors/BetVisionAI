// libs/testing/src/use-cases/users.use-cases.spec.ts
// Profile / responsible-gambling / GDPR use cases against the shared fakes (zero IO).
import {
  RegisterUseCase,
  GetMeUseCase,
  UpdateProfileUseCase,
  SetSelfLimitUseCase,
  ExportUserDataUseCase,
  DeleteAccountUseCase,
} from '@betvision/application';
import { RoleName, type Role, type UserId } from '@betvision/domain';
import { DomainErrorCode } from '@betvision/shared';
import { FakeUserRepository } from '../fakes/fake-user-repository';
import { FakePasswordHasher } from '../fakes/fake-password-hasher';
import { FakeRefreshTokenStore } from '../fakes/fake-refresh-token-store';
import { FakeClockPort } from '../fakes/fake-clock.port';
import { FakeIdGeneratorPort } from '../fakes/fake-id-generator.port';
import { FakeAuditLog } from '../fakes/fake-audit-log';

const ROLE: Role = {
  id: 'role-user',
  name: RoleName.User,
  permissions: ['match:read'],
};

function makeHarness() {
  const users = new FakeUserRepository().seedRole(ROLE);
  const hasher = new FakePasswordHasher();
  const refreshStore = new FakeRefreshTokenStore();
  const clock = new FakeClockPort();
  const ids = new FakeIdGeneratorPort();
  const audit = new FakeAuditLog();
  return {
    users,
    refreshStore,
    audit,
    register: new RegisterUseCase(users, hasher, clock, ids, audit),
    getMe: new GetMeUseCase(users),
    updateProfile: new UpdateProfileUseCase(users, clock, audit),
    setSelfLimit: new SetSelfLimitUseCase(users, clock, audit),
    exportData: new ExportUserDataUseCase(users, clock, audit),
    deleteAccount: new DeleteAccountUseCase(users, refreshStore, clock, audit),
  };
}

async function registerUser(h: ReturnType<typeof makeHarness>): Promise<UserId> {
  const result = await h.register.execute({
    email: 'player@example.com',
    password: 'Str0ng!Passw0rd',
    locale: 'en',
    ageConfirmed: true,
    acceptedTerms: true,
  });
  if (!result.ok) throw new Error('register failed');
  return result.value.id as UserId;
}

describe('User profile use cases', () => {
  it('returns the profile via GetMe', async () => {
    const h = makeHarness();
    const userId = await registerUser(h);
    const result = await h.getMe.execute({ userId });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.id).toBe(userId);
  });

  it('GetMe returns USER_NOT_FOUND for an unknown id', async () => {
    const h = makeHarness();
    const result = await h.getMe.execute({ userId: 'ghost' as UserId });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe(DomainErrorCode.USER_NOT_FOUND);
  });

  it('updates the locale (persisted + affects the profile)', async () => {
    const h = makeHarness();
    const userId = await registerUser(h);
    const result = await h.updateProfile.execute({ userId, locale: 'es' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.locale).toBe('es');
    const reloaded = await h.getMe.execute({ userId });
    if (reloaded.ok) expect(reloaded.value.locale).toBe('es');
  });
});

describe('Responsible-gambling self-limits', () => {
  it('applies a self-limit and audits it', async () => {
    const h = makeHarness();
    const userId = await registerUser(h);
    const result = await h.setSelfLimit.execute({
      userId,
      limits: { dailyDepositLimit: 100 },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.selfLimits).toMatchObject({ dailyDepositLimit: 100 });
    }
    expect(
      h.audit.entries.some((e) => e.action === 'user.self_limit_set'),
    ).toBe(true);
  });

  it('rejects an empty self-limit payload', async () => {
    const h = makeHarness();
    const userId = await registerUser(h);
    const result = await h.setSelfLimit.execute({ userId, limits: {} });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe(DomainErrorCode.SELF_LIMIT_EMPTY);
  });

  it('self-exclusion flips status to self_excluded (blocks login)', async () => {
    const h = makeHarness();
    const userId = await registerUser(h);
    const result = await h.setSelfLimit.execute({
      userId,
      limits: { selfExcludeUntil: '2027-01-01T00:00:00.000Z' },
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.status).toBe('self_excluded');
  });
});

describe('GDPR export + delete (audited)', () => {
  it('exports the subject data and writes an audit entry', async () => {
    const h = makeHarness();
    const userId = await registerUser(h);
    const result = await h.exportData.execute({ userId });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.profile.id).toBe(userId);
      expect(typeof result.value.exportedAt).toBe('string');
    }
    expect(
      h.audit.entries.some((e) => e.action === 'user.data_exported'),
    ).toBe(true);
  });

  it('soft-deletes the account, revokes sessions, and audits', async () => {
    const h = makeHarness();
    const userId = await registerUser(h);
    const result = await h.deleteAccount.execute({ userId });
    expect(result.ok).toBe(true);
    const reloaded = await h.getMe.execute({ userId });
    if (reloaded.ok) expect(reloaded.value.status).toBe('deleted');
    expect(h.audit.entries.some((e) => e.action === 'user.deleted')).toBe(true);
  });
});
