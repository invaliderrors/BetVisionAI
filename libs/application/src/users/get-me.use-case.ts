// libs/application/src/users/get-me.use-case.ts
// Return the authenticated user's own profile.
import {
  Result,
  ok,
  err,
  DomainError,
  DomainErrorCode,
} from '@betvision/shared';
import { type UserRepositoryPort, type UserId } from '@betvision/domain';
import type { UserProfileDto } from '@betvision/contracts';
import { toUserProfileDto } from './user-profile.mapper';

export interface GetMeCommand {
  readonly userId: UserId;
}

export class GetMeUseCase {
  constructor(private readonly users: UserRepositoryPort) {}

  async execute(
    command: GetMeCommand,
  ): Promise<Result<UserProfileDto, DomainError>> {
    const user = await this.users.findById(command.userId);
    if (!user) return err(DomainError.of(DomainErrorCode.USER_NOT_FOUND));
    return ok(toUserProfileDto(user));
  }
}
