// libs/application/src/users/export-user-data.use-case.ts
// GDPR data-subject export (SPEC §19). Returns the user's own profile data and audits the
// request. (Related aggregates — watchlist, predictions — are folded in as they land.)
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
  type UserId,
} from '@betvision/domain';
import type { UserDataExportDto } from '@betvision/contracts';
import { toUserProfileDto } from './user-profile.mapper';

export interface ExportUserDataCommand {
  readonly userId: UserId;
}

export class ExportUserDataUseCase {
  constructor(
    private readonly users: UserRepositoryPort,
    private readonly clock: ClockPort,
    private readonly audit: AuditLogPort,
  ) {}

  async execute(
    command: ExportUserDataCommand,
  ): Promise<Result<UserDataExportDto, DomainError>> {
    const user = await this.users.findById(command.userId);
    if (!user) return err(DomainError.of(DomainErrorCode.USER_NOT_FOUND));

    const exportedAt = this.clock.now();
    await this.audit.record({
      actorId: user.id,
      action: 'user.data_exported',
      entity: 'User',
      entityId: user.id,
      occurredAt: exportedAt,
    });

    return ok({ profile: toUserProfileDto(user), exportedAt });
  }
}
