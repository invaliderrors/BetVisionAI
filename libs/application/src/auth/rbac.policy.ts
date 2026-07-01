// libs/application/src/auth/rbac.policy.ts
// Framework-free RBAC policy helpers used at the use-case boundary (and by the API guards,
// which are the composition root). Return a DomainError code (never a localized string) so
// authorization failures flow through the same i18n envelope as everything else.
import { DomainError, DomainErrorCode } from '@betvision/shared';
import { type Role, roleHasPermission, roleIsOneOf } from '@betvision/domain';
import type { AuthenticatedActor } from './authenticated-actor';

/** Assert the actor's role name is one of `allowed`. Returns null when authorized. */
export function requireRole(
  actor: Pick<AuthenticatedActor, 'role'>,
  allowed: ReadonlyArray<string>,
): DomainError | null {
  return allowed.includes(actor.role)
    ? null
    : DomainError.of(DomainErrorCode.FORBIDDEN, {
        required: allowed.join(','),
        actual: actor.role,
      });
}

/** Assert a resolved Role holds a specific permission grant. */
export function requirePermission(
  role: Role,
  permission: string,
): DomainError | null {
  return roleHasPermission(role, permission)
    ? null
    : DomainError.of(DomainErrorCode.FORBIDDEN, { permission });
}

/** Assert a resolved Role is among the allowed role names. */
export function requireRoleName(
  role: Role,
  allowed: ReadonlyArray<Role['name']>,
): DomainError | null {
  return roleIsOneOf(role, allowed)
    ? null
    : DomainError.of(DomainErrorCode.FORBIDDEN, { actual: role.name });
}
