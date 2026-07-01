// libs/application/src/auth/forgot-password.use-case.ts
// Start a password-reset flow. ALWAYS returns success (no account enumeration): if the
// email maps to a user, a single-use reset token is stashed in the cache (TTL) and handed
// to the NotificationPort for delivery; otherwise nothing happens but the caller can't tell.
import { Result, ok, DomainError } from '@betvision/shared';
import {
  Email,
  type UserRepositoryPort,
  type CachePort,
  type NotificationPort,
  type ClockPort,
  type IdGeneratorPort,
  type AuditLogPort,
} from '@betvision/domain';
import type { AuthTokensConfig } from './auth-tokens.config';

export interface ForgotPasswordCommand {
  readonly email: string;
}

/** Cache key namespace for reset tokens. */
export const resetCacheKey = (token: string): string => `pwreset:${token}`;

export class ForgotPasswordUseCase {
  constructor(
    private readonly users: UserRepositoryPort,
    private readonly cache: CachePort,
    private readonly notifications: NotificationPort,
    private readonly ids: IdGeneratorPort,
    private readonly clock: ClockPort,
    private readonly audit: AuditLogPort,
    private readonly config: AuthTokensConfig,
  ) {}

  async execute(
    command: ForgotPasswordCommand,
  ): Promise<Result<null, DomainError>> {
    const emailResult = Email.create(command.email);
    if (!emailResult.ok) return ok(null); // generic: never reveal invalid/unknown email

    const user = await this.users.findByEmail(emailResult.value.value);
    if (!user) return ok(null);

    const token = `${this.ids.newId()}.${this.ids.newId()}`;
    await this.cache.set(
      resetCacheKey(token),
      user.id,
      this.config.resetTokenTtlSeconds,
    );
    await this.notifications.send({
      to: user.id,
      channel: 'email',
      templateCode: 'auth.reset_password',
      params: { token },
      locale: user.locale,
    });
    await this.audit.record({
      actorId: user.id,
      action: 'user.forgot_password_requested',
      entity: 'User',
      entityId: user.id,
      occurredAt: this.clock.now(),
    });

    return ok(null);
  }
}
