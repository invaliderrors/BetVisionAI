// libs/domain/src/users/entities/user.entity.ts
// User aggregate root. Holds identity + credentials (as VOs) + account lifecycle. The
// aggregate NEVER touches plaintext passwords (only a PasswordHash VO) and NEVER produces
// localized strings (failures are DomainError codes). Age/terms are request-level policy
// enforced by the use case; the aggregate defends the ageConfirmedAt invariant in depth.
import {
  Result,
  ok,
  err,
  DomainError,
  DomainErrorCode,
} from '@betvision/shared';
import { AggregateRoot } from '../../base/entity';
import type { UserId, Locale, IsoDateTime } from '../../ports/shared.dto';
import type { Email } from '../../value-objects/email';
import type { PasswordHash } from '../../value-objects/password-hash';
import { UserStatus, type Role, type SelfLimits } from '../types';

export interface UserProps {
  readonly id: UserId;
  readonly email: Email;
  readonly passwordHash: PasswordHash;
  readonly role: Role;
  readonly locale: Locale;
  readonly status: UserStatus;
  readonly ageConfirmedAt: IsoDateTime | null;
  readonly selfLimits: SelfLimits | null;
  readonly settings: Readonly<Record<string, unknown>> | null;
  readonly createdAt: IsoDateTime;
  readonly deletedAt: IsoDateTime | null;
}

/** Inputs required to register a brand-new account. */
export interface RegisterUserProps {
  readonly id: UserId;
  readonly email: Email;
  readonly passwordHash: PasswordHash;
  readonly role: Role;
  readonly locale: Locale;
  /** Timestamp of the age confirmation. MUST be present (the age gate). */
  readonly ageConfirmedAt: IsoDateTime;
  readonly createdAt: IsoDateTime;
}

export class User extends AggregateRoot<UserId> {
  private _email: Email;
  private _passwordHash: PasswordHash;
  private _role: Role;
  private _locale: Locale;
  private _status: UserStatus;
  private _ageConfirmedAt: IsoDateTime | null;
  private _selfLimits: SelfLimits | null;
  private _settings: Readonly<Record<string, unknown>> | null;
  private readonly _createdAt: IsoDateTime;
  private _deletedAt: IsoDateTime | null;

  private constructor(props: UserProps) {
    super(props.id);
    this._email = props.email;
    this._passwordHash = props.passwordHash;
    this._role = props.role;
    this._locale = props.locale;
    this._status = props.status;
    this._ageConfirmedAt = props.ageConfirmedAt;
    this._selfLimits = props.selfLimits;
    this._settings = props.settings;
    this._createdAt = props.createdAt;
    this._deletedAt = props.deletedAt;
  }

  /**
   * Register a new, ACTIVE account. v1 does not gate login behind email verification, so
   * a freshly-registered user is immediately usable (verification is a later phase). The
   * age gate is enforced here in depth: a missing `ageConfirmedAt` is rejected.
   */
  static register(props: RegisterUserProps): Result<User, DomainError> {
    if (!props.ageConfirmedAt) {
      return err(DomainError.of(DomainErrorCode.AGE_NOT_CONFIRMED));
    }
    return ok(
      new User({
        ...props,
        status: UserStatus.Active,
        selfLimits: null,
        settings: null,
        deletedAt: null,
      }),
    );
  }

  /** Rehydrate an already-persisted (and therefore valid) user. No re-validation. */
  static fromPersistence(props: UserProps): User {
    return new User(props);
  }

  // --- getters -------------------------------------------------------------
  get email(): Email {
    return this._email;
  }
  get passwordHash(): PasswordHash {
    return this._passwordHash;
  }
  get role(): Role {
    return this._role;
  }
  get roleName(): Role['name'] {
    return this._role.name;
  }
  get locale(): Locale {
    return this._locale;
  }
  get status(): UserStatus {
    return this._status;
  }
  get ageConfirmedAt(): IsoDateTime | null {
    return this._ageConfirmedAt;
  }
  get selfLimits(): SelfLimits | null {
    return this._selfLimits;
  }
  get settings(): Readonly<Record<string, unknown>> | null {
    return this._settings;
  }
  get createdAt(): IsoDateTime {
    return this._createdAt;
  }
  get deletedAt(): IsoDateTime | null {
    return this._deletedAt;
  }

  /** Only ACTIVE accounts may authenticate (suspended/self-excluded/deleted cannot). */
  get canLogin(): boolean {
    return this._status === UserStatus.Active;
  }

  // --- behavior ------------------------------------------------------------
  changeLocale(locale: Locale): void {
    this._locale = locale;
  }

  updateSettings(settings: Readonly<Record<string, unknown>>): void {
    this._settings = { ...(this._settings ?? {}), ...settings };
  }

  changePasswordHash(hash: PasswordHash): void {
    this._passwordHash = hash;
  }

  /**
   * Apply responsible-gambling self-limits. When `selfExcludeUntil` is present the account
   * is flipped to SELF_EXCLUDED (blocks login) as a first-class RG control (SPEC §19).
   */
  applySelfLimits(limits: SelfLimits): void {
    this._selfLimits = { ...(this._selfLimits ?? {}), ...limits };
    if (limits.selfExcludeUntil) {
      this._status = UserStatus.SelfExcluded;
    }
  }

  /** GDPR soft-delete: tombstone the account (SPEC §19 data-subject erasure). */
  markDeleted(at: IsoDateTime): void {
    this._status = UserStatus.Deleted;
    this._deletedAt = at;
  }
}
