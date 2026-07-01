// libs/application/src/auth/refresh-token.use-case.ts
// Rotate a refresh token with REUSE DETECTION (SPEC §19):
//   - valid signature + jti == family's current jti  -> rotate to a fresh jti + tokens.
//   - jti != current (a superseded token replayed)    -> REUSE: revoke the WHOLE family.
//   - unknown/revoked family or bad signature         -> generic invalid.
import {
  Result,
  ok,
  err,
  DomainError,
  DomainErrorCode,
} from '@betvision/shared';
import {
  type UserRepositoryPort,
  type TokenServicePort,
  type RefreshTokenStorePort,
  type ClockPort,
  type IdGeneratorPort,
  type AuditLogPort,
} from '@betvision/domain';
import type { RefreshResponse } from '@betvision/contracts';
import type { AuthTokensConfig } from './auth-tokens.config';

export interface RefreshTokenCommand {
  readonly refreshToken: string | undefined;
}

export interface RefreshTokenResult {
  readonly auth: RefreshResponse;
  readonly refreshToken: string;
  readonly refreshMaxAgeSeconds: number;
}

export class RefreshTokenUseCase {
  constructor(
    private readonly users: UserRepositoryPort,
    private readonly tokens: TokenServicePort,
    private readonly refreshStore: RefreshTokenStorePort,
    private readonly ids: IdGeneratorPort,
    private readonly clock: ClockPort,
    private readonly audit: AuditLogPort,
    private readonly config: AuthTokensConfig,
  ) {}

  async execute(
    command: RefreshTokenCommand,
  ): Promise<Result<RefreshTokenResult, DomainError>> {
    const invalid = err(DomainError.of(DomainErrorCode.INVALID_REFRESH_TOKEN));

    if (!command.refreshToken) return invalid;
    const claims = await this.tokens.verifyRefreshToken(command.refreshToken);
    if (!claims) return invalid;

    const currentJti = await this.refreshStore.getCurrentJti(claims.familyId);
    if (currentJti === null) return invalid; // unknown or already-revoked family

    if (currentJti !== claims.jti) {
      // A previously-rotated (superseded) token was replayed -> reuse. Kill the family.
      await this.refreshStore.revokeFamily(claims.familyId);
      await this.audit.record({
        actorId: claims.userId,
        action: 'auth.refresh_reuse_detected',
        entity: 'RefreshTokenFamily',
        entityId: claims.familyId,
        metadata: { presentedJti: claims.jti },
        occurredAt: this.clock.now(),
      });
      return invalid;
    }

    const user = await this.users.findById(claims.userId);
    if (!user) {
      await this.refreshStore.revokeFamily(claims.familyId);
      return invalid;
    }
    if (!user.canLogin) {
      await this.refreshStore.revokeFamily(claims.familyId);
      return err(DomainError.of(DomainErrorCode.ACCOUNT_NOT_ACTIVE));
    }

    const newJti = this.ids.newId();
    await this.refreshStore.rotate({
      userId: user.id,
      familyId: claims.familyId,
      newJti,
      ttlSeconds: this.config.refreshTtlSeconds,
    });

    const accessToken = await this.tokens.issueAccessToken({
      userId: user.id,
      email: user.email.value,
      role: user.roleName,
      locale: user.locale,
    });
    const refresh = await this.tokens.issueRefreshToken({
      userId: user.id,
      familyId: claims.familyId,
      jti: newJti,
    });

    await this.audit.record({
      actorId: user.id,
      action: 'auth.token_refreshed',
      entity: 'RefreshTokenFamily',
      entityId: claims.familyId,
      occurredAt: this.clock.now(),
    });

    return ok({
      auth: {
        accessToken,
        expiresInSeconds: this.config.accessTtlSeconds,
      },
      refreshToken: refresh.token,
      refreshMaxAgeSeconds: this.config.refreshTtlSeconds,
    });
  }
}
