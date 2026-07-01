// libs/application/src/users/delete-account.use-case.ts
// GDPR erasure (SPEC §19): soft-delete (tombstone) the account, revoke all sessions, audit.
import {
  Result,
  ok,
  err,
  DomainError,
  DomainErrorCode,
} from '@betvision/shared';
import {
  type UserRepositoryPort,
  type RefreshTokenStorePort,
  type ClockPort,
  type AuditLogPort,
  type UserId,
} from '@betvision/domain';

export interface DeleteAccountCommand {
  readonly userId: UserId;
}

export class DeleteAccountUseCase {
  constructor(
    private readonly users: UserRepositoryPort,
    private readonly refreshStore: RefreshTokenStorePort,
    private readonly clock: ClockPort,
    private readonly audit: AuditLogPort,
  ) {}

  async execute(
    command: DeleteAccountCommand,
  ): Promise<Result<null, DomainError>> {
    const user = await this.users.findById(command.userId);
    if (!user) return err(DomainError.of(DomainErrorCode.USER_NOT_FOUND));

    const now = this.clock.now();
    user.markDeleted(now);
    await this.users.update(user);
    await this.refreshStore.revokeAllForUser(user.id);

    await this.audit.record({
      actorId: user.id,
      action: 'user.deleted',
      entity: 'User',
      entityId: user.id,
      occurredAt: now,
    });

    return ok(null);
  }
}
