// libs/application/src/auth/auth-tokens.config.ts
// TTLs the auth use cases need to size token lifetimes + refresh-store expiry. Bound in the
// API composition root from the validated AppConfig (JWT_ACCESS_TTL / JWT_REFRESH_TTL).
export interface AuthTokensConfig {
  readonly accessTtlSeconds: number;
  readonly refreshTtlSeconds: number;
  /** TTL for a password-reset token (seconds). */
  readonly resetTokenTtlSeconds: number;
}

/** DI token for {@link AuthTokensConfig}. */
export const AUTH_TOKENS_CONFIG = Symbol('AuthTokensConfig');
