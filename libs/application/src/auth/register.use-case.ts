// libs/application/src/auth/register.use-case.ts
// Create an account. Enforces the compliance gates (age + terms), validates credentials
// (Email VO + PasswordPolicy — defense in depth over the zod contract), hashes the password
// via the port, assigns the default `user` role, and audits the signup. Duplicate emails
// return a GENERIC error (no account enumeration, SPEC §19).
import {
  Result,
  ok,
  err,
  DomainError,
  DomainErrorCode,
  InvariantViolationError,
} from '@betvision/shared';
import {
  User,
  Email,
  PasswordHash,
  PasswordPolicy,
  RoleName,
  type UserRepositoryPort,
  type PasswordHasherPort,
  type ClockPort,
  type IdGeneratorPort,
  type AuditLogPort,
  type Locale,
  type UserId,
  type IsoDateTime,
} from '@betvision/domain';
import type { UserProfileDto } from '@betvision/contracts';
import { toUserProfileDto } from '../users/user-profile.mapper';

export interface RegisterCommand {
  readonly email: string;
  readonly password: string;
  readonly locale: Locale;
  readonly ageConfirmed: boolean;
  readonly acceptedTerms: boolean;
}

export class RegisterUseCase {
  constructor(
    private readonly users: UserRepositoryPort,
    private readonly hasher: PasswordHasherPort,
    private readonly clock: ClockPort,
    private readonly ids: IdGeneratorPort,
    private readonly audit: AuditLogPort,
  ) {}

  async execute(
    command: RegisterCommand,
  ): Promise<Result<UserProfileDto, DomainError>> {
    if (command.ageConfirmed !== true) {
      return err(DomainError.of(DomainErrorCode.AGE_NOT_CONFIRMED));
    }
    if (command.acceptedTerms !== true) {
      return err(DomainError.of(DomainErrorCode.TERMS_NOT_ACCEPTED));
    }

    const emailResult = Email.create(command.email);
    if (!emailResult.ok) return emailResult;
    const email = emailResult.value;

    const policyError = PasswordPolicy.validate(command.password);
    if (policyError) return err(policyError);

    // Generic failure on duplicate — do not reveal that the address is already taken.
    if (await this.users.existsByEmail(email.value)) {
      return err(DomainError.of(DomainErrorCode.REGISTRATION_FAILED));
    }

    const role = await this.users.findRoleByName(RoleName.User);
    if (!role) {
      throw new InvariantViolationError(
        'Default "user" role is not seeded; cannot register accounts',
      );
    }

    const digest = await this.hasher.hash(command.password);
    const hashResult = PasswordHash.create(digest);
    if (!hashResult.ok) return hashResult;

    const now = this.clock.now();
    const userResult = User.register({
      id: this.ids.newId() as UserId,
      email,
      passwordHash: hashResult.value,
      role,
      locale: command.locale,
      ageConfirmedAt: now,
      createdAt: now,
    });
    if (!userResult.ok) return userResult;
    const user = userResult.value;

    await this.users.create(user);
    await this.audit.record({
      actorId: user.id,
      action: 'user.registered',
      entity: 'User',
      entityId: user.id,
      metadata: { role: user.roleName, locale: user.locale },
      occurredAt: now as IsoDateTime,
    });

    return ok(toUserProfileDto(user));
  }
}
