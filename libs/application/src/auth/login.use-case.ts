// libs/application/src/auth/login.use-case.ts
// Authenticate credentials and mint an access token + a rotating refresh-token family.
// All credential failures return the SAME generic code (INVALID_CREDENTIALS) so the API
// never leaks whether the email or the password was wrong (SPEC §19).
import {
  Result,
  ok,
  err,
  DomainError,
  DomainErrorCode,
} from '@betvision/shared';
import {
  Email,
  type UserRepositoryPort,
  type PasswordHasherPort,
  type TokenServicePort,
  type RefreshTokenStorePort,
  type ClockPort,
  type IdGeneratorPort,
  type AuditLogPort,
} from '@betvision/domain';
import type { AuthResponse } from '@betvision/contracts';
import type { AuthTokensConfig } from './auth-tokens.config';

export interface LoginCommand {
  readonly email: string;
  readonly password: string;
}

export interface LoginResult {
  readonly auth: AuthResponse;
  /** Raw refresh token — the controller sets this as an httpOnly cookie, never in the body. */
  readonly refreshToken: string;
  readonly refreshMaxAgeSeconds: number;
}

export class LoginUseCase {
  constructor(
    private readonly users: UserRepositoryPort,
    private readonly hasher: PasswordHasherPort,
    private readonly tokens: TokenServicePort,
    private readonly refreshStore: RefreshTokenStorePort,
    private readonly ids: IdGeneratorPort,
    private readonly clock: ClockPort,
    private readonly audit: AuditLogPort,
    private readonly config: AuthTokensConfig,
  ) {}

  async execute(
    command: LoginCommand,
  ): Promise<Result<LoginResult, DomainError>> {
    const invalid = err(DomainError.of(DomainErrorCode.INVALID_CREDENTIALS));

    const emailResult = Email.create(command.email);
    if (!emailResult.ok) return invalid;

    const user = await this.users.findByEmail(emailResult.value.value);
    if (!user) return invalid;

    const matches = await this.hasher.verify(
      user.passwordHash.value,
      command.password,
    );
    if (!matches) return invalid;

    if (!user.canLogin) {
      return err(DomainError.of(DomainErrorCode.ACCOUNT_NOT_ACTIVE));
    }

    const familyId = this.ids.newId();
    const jti = this.ids.newId();

    const accessToken = await this.tokens.issueAccessToken({
      userId: user.id,
      email: user.email.value,
      role: user.roleName,
      locale: user.locale,
    });
    const refresh = await this.tokens.issueRefreshToken({
      userId: user.id,
      familyId,
      jti,
    });
    await this.refreshStore.startFamily({
      userId: user.id,
      familyId,
      jti,
      ttlSeconds: this.config.refreshTtlSeconds,
    });

    await this.audit.record({
      actorId: user.id,
      action: 'user.login',
      entity: 'User',
      entityId: user.id,
      metadata: { familyId },
      occurredAt: this.clock.now(),
    });

    return ok({
      auth: {
        accessToken,
        expiresInSeconds: this.config.accessTtlSeconds,
        user: {
          id: user.id,
          email: user.email.value,
          role: user.roleName,
          locale: user.locale,
        },
      },
      refreshToken: refresh.token,
      refreshMaxAgeSeconds: this.config.refreshTtlSeconds,
    });
  }
}
