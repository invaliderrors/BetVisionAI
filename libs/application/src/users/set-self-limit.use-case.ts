// libs/application/src/users/set-self-limit.use-case.ts
// Apply responsible-gambling self-limits (SPEC §8/§19). Setting `selfExcludeUntil` flips
// the account to SELF_EXCLUDED (blocks login). Audited as a security-relevant action.
import {
  Result,
  ok,
  err,
  DomainError,
  DomainErrorCode,
} from '@betvision/shared';
import {
  type UserRepositoryPort,
  type ClockPort,
  type AuditLogPort,
  type SelfLimits,
  type UserId,
} from '@betvision/domain';
import type { UserProfileDto } from '@betvision/contracts';
import { toUserProfileDto } from './user-profile.mapper';

export interface SetSelfLimitCommand {
  readonly userId: UserId;
  readonly limits: SelfLimits;
}

export class SetSelfLimitUseCase {
  constructor(
    private readonly users: UserRepositoryPort,
    private readonly clock: ClockPort,
    private readonly audit: AuditLogPort,
  ) {}

  async execute(
    command: SetSelfLimitCommand,
  ): Promise<Result<UserProfileDto, DomainError>> {
    if (!hasAnyLimit(command.limits)) {
      return err(DomainError.of(DomainErrorCode.SELF_LIMIT_EMPTY));
    }

    const user = await this.users.findById(command.userId);
    if (!user) return err(DomainError.of(DomainErrorCode.USER_NOT_FOUND));

    user.applySelfLimits(command.limits);
    await this.users.update(user);

    await this.audit.record({
      actorId: user.id,
      action: 'user.self_limit_set',
      entity: 'User',
      entityId: user.id,
      metadata: {
        selfExcluded: command.limits.selfExcludeUntil !== undefined,
      },
      occurredAt: this.clock.now(),
    });

    return ok(toUserProfileDto(user));
  }
}

function hasAnyLimit(limits: SelfLimits): boolean {
  return (
    limits.dailyDepositLimit !== undefined ||
    limits.dailyLossLimit !== undefined ||
    limits.dailyStakeLimit !== undefined ||
    limits.sessionTimeLimitMinutes !== undefined ||
    limits.selfExcludeUntil !== undefined
  );
}
