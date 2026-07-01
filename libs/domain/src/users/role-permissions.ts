// libs/domain/src/users/role-permissions.ts
// Pure RBAC predicate over a Role's permission grants. The admin wildcard '*' grants all.
// Used by the application RBAC policy helper and, indirectly, by API guards.
import type { Role } from './types';

const WILDCARD = '*';

/** True when the role holds the given permission (or the admin wildcard). */
export function roleHasPermission(role: Role, permission: string): boolean {
  return (
    role.permissions.includes(WILDCARD) || role.permissions.includes(permission)
  );
}

/** True when the role's name is in the allowed set. */
export function roleIsOneOf(
  role: Role,
  allowed: ReadonlyArray<Role['name']>,
): boolean {
  return allowed.includes(role.name);
}
