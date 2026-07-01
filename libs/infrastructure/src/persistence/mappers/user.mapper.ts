// libs/infrastructure/src/persistence/mappers/user.mapper.ts
// Persistence <-> domain translation for the User aggregate + Role. Pure functions; Prisma
// types stay INSIDE this layer. Enum bridges are explicit (no `as`) so a schema/enum drift
// is a compile error rather than a silent runtime mismatch.
import {
  Prisma,
  Language,
  UserStatus as PrismaUserStatus,
  RoleName as PrismaRoleName,
} from '@prisma/client';
import { InvariantViolationError } from '@betvision/shared';
import {
  User,
  Email,
  PasswordHash,
  UserStatus,
  RoleName,
  type Role,
  type SelfLimits,
  type UserId,
  type Locale,
  type IsoDateTime,
} from '@betvision/domain';

/** Relations the mapper needs to rebuild a domain User (role name + permissions). */
export const userInclude = { role: true } satisfies Prisma.UserInclude;
export type PersistedUser = Prisma.UserGetPayload<{
  include: typeof userInclude;
}>;
type PersistedRole = Prisma.RoleGetPayload<Record<string, never>>;

const LANGUAGE_TO_LOCALE: Record<Language, Locale> = {
  [Language.EN]: 'en',
  [Language.ES]: 'es',
};
export const LOCALE_TO_LANGUAGE: Record<Locale, Language> = {
  en: Language.EN,
  es: Language.ES,
};

const STATUS_TO_DOMAIN: Record<PrismaUserStatus, UserStatus> = {
  [PrismaUserStatus.PENDING_VERIFICATION]: UserStatus.PendingVerification,
  [PrismaUserStatus.ACTIVE]: UserStatus.Active,
  [PrismaUserStatus.SUSPENDED]: UserStatus.Suspended,
  [PrismaUserStatus.SELF_EXCLUDED]: UserStatus.SelfExcluded,
  [PrismaUserStatus.DELETED]: UserStatus.Deleted,
};
export const STATUS_TO_PRISMA: Record<UserStatus, PrismaUserStatus> = {
  [UserStatus.PendingVerification]: PrismaUserStatus.PENDING_VERIFICATION,
  [UserStatus.Active]: PrismaUserStatus.ACTIVE,
  [UserStatus.Suspended]: PrismaUserStatus.SUSPENDED,
  [UserStatus.SelfExcluded]: PrismaUserStatus.SELF_EXCLUDED,
  [UserStatus.Deleted]: PrismaUserStatus.DELETED,
};

const ROLE_NAME_TO_DOMAIN: Record<PrismaRoleName, RoleName> = {
  [PrismaRoleName.USER]: RoleName.User,
  [PrismaRoleName.ANALYST]: RoleName.Analyst,
  [PrismaRoleName.ADMIN]: RoleName.Admin,
};
export const ROLE_NAME_TO_PRISMA: Record<RoleName, PrismaRoleName> = {
  [RoleName.User]: PrismaRoleName.USER,
  [RoleName.Analyst]: PrismaRoleName.ANALYST,
  [RoleName.Admin]: PrismaRoleName.ADMIN,
};

export function toDomainRole(row: PersistedRole): Role {
  return {
    id: row.id,
    name: ROLE_NAME_TO_DOMAIN[row.name],
    permissions: row.permissions,
  };
}

/** Persisted user row (+ role) -> domain User aggregate. */
export function toDomainUser(row: PersistedUser): User {
  const email = Email.create(row.email);
  const passwordHash = PasswordHash.create(row.passwordHash);
  if (!email.ok || !passwordHash.ok) {
    throw new InvariantViolationError(`Corrupt persisted user ${row.id}`);
  }
  return User.fromPersistence({
    id: row.id as UserId,
    email: email.value,
    passwordHash: passwordHash.value,
    role: toDomainRole(row.role),
    locale: LANGUAGE_TO_LOCALE[row.locale],
    status: STATUS_TO_DOMAIN[row.status],
    ageConfirmedAt: toIso(row.ageConfirmedAt),
    selfLimits: (row.selfLimitJson as SelfLimits | null) ?? null,
    settings: (row.settings as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt.toISOString(),
    deletedAt: toIso(row.deletedAt),
  });
}

function toIso(date: Date | null): IsoDateTime | null {
  return date ? date.toISOString() : null;
}

/** JSON write helper: a plain object value, or the DB-null sentinel when clearing. */
export function toInputJson(
  value: object | null,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value ? (value as unknown as Prisma.InputJsonValue) : Prisma.JsonNull;
}
