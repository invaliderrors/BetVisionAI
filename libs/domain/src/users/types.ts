// libs/domain/src/users/types.ts
// Account-related enums and small structural types. Framework-free; the persistence
// mapper (infrastructure) translates between these and the Prisma enums.

/** Lifecycle status of an account (mirrors the persistence UserStatus enum). */
export enum UserStatus {
  PendingVerification = 'pending_verification',
  Active = 'active',
  Suspended = 'suspended',
  SelfExcluded = 'self_excluded', // responsible-gambling self-exclusion
  Deleted = 'deleted', // GDPR soft-delete tombstone
}

/** Canonical role names (SPEC §9: user | analyst | admin). Lowercase = wire/RBAC form. */
export enum RoleName {
  User = 'user',
  Analyst = 'analyst',
  Admin = 'admin',
}

/** A role and its permission grants. Small + cacheable (SPEC §9). */
export interface Role {
  readonly id: string;
  readonly name: RoleName;
  readonly permissions: ReadonlyArray<string>;
}

/**
 * Responsible-gambling self-imposed limits (SPEC §8). All fields optional; a request
 * sets one or more. Monetary limits are major-unit amounts; time limit is minutes.
 * `selfExcludeUntil` is an ISO-8601 UTC instant that flips the account to SELF_EXCLUDED.
 */
export interface SelfLimits {
  readonly dailyDepositLimit?: number;
  readonly dailyLossLimit?: number;
  readonly dailyStakeLimit?: number;
  readonly sessionTimeLimitMinutes?: number;
  readonly selfExcludeUntil?: string;
}
