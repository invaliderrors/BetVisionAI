import { DomainErrorCode } from '@betvision/shared';
import { Email } from '../../value-objects/email';
import { PasswordHash } from '../../value-objects/password-hash';
import type { UserId, Locale, IsoDateTime } from '../../ports/shared.dto';
import { RoleName, UserStatus, type Role } from '../types';
import { roleHasPermission } from '../role-permissions';
import { User } from './user.entity';

const userRole: Role = {
  id: 'role-user',
  name: RoleName.User,
  permissions: ['match:read', 'watchlist:write'],
};
const adminRole: Role = { id: 'role-admin', name: RoleName.Admin, permissions: ['*'] };

function buildRegisterProps(overrides: Partial<{ ageConfirmedAt: IsoDateTime }> = {}) {
  const email = Email.create('player@example.com');
  const hash = PasswordHash.create('argon2id$fake');
  if (!email.ok || !hash.ok) throw new Error('fixture invalid');
  return {
    id: 'user-1' as UserId,
    email: email.value,
    passwordHash: hash.value,
    role: userRole,
    locale: 'en' as Locale,
    ageConfirmedAt: '2026-06-30T00:00:00.000Z' as IsoDateTime,
    createdAt: '2026-06-30T00:00:00.000Z' as IsoDateTime,
    ...overrides,
  };
}

describe('User aggregate', () => {
  it('registers an ACTIVE account that can log in', () => {
    const result = User.register(buildRegisterProps());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe(UserStatus.Active);
      expect(result.value.canLogin).toBe(true);
      expect(result.value.roleName).toBe(RoleName.User);
    }
  });

  it('rejects registration without a confirmed age (age gate, in depth)', () => {
    const result = User.register(
      buildRegisterProps({ ageConfirmedAt: '' as IsoDateTime }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(DomainErrorCode.AGE_NOT_CONFIRMED);
    }
  });

  it('changes locale', () => {
    const result = User.register(buildRegisterProps());
    if (!result.ok) throw new Error('unexpected');
    result.value.changeLocale('es');
    expect(result.value.locale).toBe('es');
  });

  it('flips to SELF_EXCLUDED (blocking login) when a self-exclusion is set', () => {
    const result = User.register(buildRegisterProps());
    if (!result.ok) throw new Error('unexpected');
    result.value.applySelfLimits({ selfExcludeUntil: '2027-01-01T00:00:00.000Z' });
    expect(result.value.status).toBe(UserStatus.SelfExcluded);
    expect(result.value.canLogin).toBe(false);
  });

  it('soft-deletes for GDPR erasure', () => {
    const result = User.register(buildRegisterProps());
    if (!result.ok) throw new Error('unexpected');
    result.value.markDeleted('2026-07-01T00:00:00.000Z' as IsoDateTime);
    expect(result.value.status).toBe(UserStatus.Deleted);
    expect(result.value.deletedAt).toBe('2026-07-01T00:00:00.000Z');
    expect(result.value.canLogin).toBe(false);
  });

  it('resolves RBAC permissions (admin wildcard grants all)', () => {
    expect(roleHasPermission(userRole, 'match:read')).toBe(true);
    expect(roleHasPermission(userRole, 'admin:users:write')).toBe(false);
    expect(roleHasPermission(adminRole, 'admin:users:write')).toBe(true);
  });
});
