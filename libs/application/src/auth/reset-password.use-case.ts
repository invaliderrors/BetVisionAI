// libs/application/src/auth/reset-password.use-case.ts
// Complete a password reset: validate the new password policy, exchange the single-use
// token for a user id, re-hash + persist, consume the token, and revoke ALL refresh
// families for the user (every existing session is invalidated).
import {
  Result,
  ok,
  err,
  DomainError,
  DomainErrorCode,
} from '@betvision/shared';
import {
  PasswordHash,
  PasswordPolicy,
  type UserRepositoryPort,
  type PasswordHasherPort,
  type CachePort,
  type RefreshTokenStorePort,
  type ClockPort,
  type AuditLogPort,
  type UserId,
} from '@betvision/domain';
import { resetCacheKey } from './forgot-password.use-case';

export interface ResetPasswordCommand {
  readonly token: string;
  readonly password: string;
}

export class ResetPasswordUseCase {
  constructor(
    private readonly users: UserRepositoryPort,
    private readonly hasher: PasswordHasherPort,
    private readonly cache: CachePort,
    private readonly refreshStore: RefreshTokenStorePort,
    private readonly clock: ClockPort,
    private readonly audit: AuditLogPort,
  ) {}

  async execute(
    command: ResetPasswordCommand,
  ): Promise<Result<null, DomainError>> {
    const policyError = PasswordPolicy.validate(command.password);
    if (policyError) return err(policyError);

    const key = resetCacheKey(command.token);
    const userId = await this.cache.get<UserId>(key);
    if (!userId) {
      return err(DomainError.of(DomainErrorCode.INVALID_RESET_TOKEN));
    }

    const user = await this.users.findById(userId);
    if (!user) {
      await this.cache.delete(key);
      return err(DomainError.of(DomainErrorCode.INVALID_RESET_TOKEN));
    }

    const digest = await this.hasher.hash(command.password);
    const hashResult = PasswordHash.create(digest);
    if (!hashResult.ok) return hashResult;

    user.changePasswordHash(hashResult.value);
    await this.users.update(user);
    await this.cache.delete(key);
    await this.refreshStore.revokeAllForUser(user.id);

    await this.audit.record({
      actorId: user.id,
      action: 'user.password_reset',
      entity: 'User',
      entityId: user.id,
      occurredAt: this.clock.now(),
    });

    return ok(null);
  }
}
