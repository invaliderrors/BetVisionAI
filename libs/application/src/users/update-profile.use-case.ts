// libs/application/src/users/update-profile.use-case.ts
// Update the authenticated user's locale and/or free-form settings. Audited.
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
  type Locale,
  type UserId,
} from '@betvision/domain';
import type { UserProfileDto } from '@betvision/contracts';
import { toUserProfileDto } from './user-profile.mapper';

export interface UpdateProfileCommand {
  readonly userId: UserId;
  readonly locale?: Locale;
  readonly settings?: Readonly<Record<string, unknown>>;
}

export class UpdateProfileUseCase {
  constructor(
    private readonly users: UserRepositoryPort,
    private readonly clock: ClockPort,
    private readonly audit: AuditLogPort,
  ) {}

  async execute(
    command: UpdateProfileCommand,
  ): Promise<Result<UserProfileDto, DomainError>> {
    const user = await this.users.findById(command.userId);
    if (!user) return err(DomainError.of(DomainErrorCode.USER_NOT_FOUND));

    if (command.locale !== undefined) user.changeLocale(command.locale);
    if (command.settings !== undefined) user.updateSettings(command.settings);

    await this.users.update(user);
    await this.audit.record({
      actorId: user.id,
      action: 'user.profile_updated',
      entity: 'User',
      entityId: user.id,
      metadata: {
        localeChanged: command.locale !== undefined,
        settingsChanged: command.settings !== undefined,
      },
      occurredAt: this.clock.now(),
    });

    return ok(toUserProfileDto(user));
  }
}
