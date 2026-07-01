// libs/application/src/auth/logout.use-case.ts
// Revoke the presented refresh-token family. Idempotent: an absent/invalid token still
// succeeds (nothing to revoke) so logout never errors.
import { Result, ok, DomainError } from '@betvision/shared';
import {
  type TokenServicePort,
  type RefreshTokenStorePort,
  type ClockPort,
  type AuditLogPort,
  type UserId,
} from '@betvision/domain';

export interface LogoutCommand {
  readonly refreshToken: string | undefined;
  readonly actorId?: UserId | null;
}

export class LogoutUseCase {
  constructor(
    private readonly tokens: TokenServicePort,
    private readonly refreshStore: RefreshTokenStorePort,
    private readonly clock: ClockPort,
    private readonly audit: AuditLogPort,
  ) {}

  async execute(command: LogoutCommand): Promise<Result<null, DomainError>> {
    if (command.refreshToken) {
      const claims = await this.tokens.verifyRefreshToken(command.refreshToken);
      if (claims) {
        await this.refreshStore.revokeFamily(claims.familyId);
        await this.audit.record({
          actorId: claims.userId,
          action: 'user.logout',
          entity: 'RefreshTokenFamily',
          entityId: claims.familyId,
          occurredAt: this.clock.now(),
        });
      }
    }
    return ok(null);
  }
}
