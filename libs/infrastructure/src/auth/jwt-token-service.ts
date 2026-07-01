// libs/infrastructure/src/auth/jwt-token-service.ts
// TokenServicePort adapter backed by `jsonwebtoken`. Access + refresh tokens are HS256-signed
// with SEPARATE secrets (from the validated AppConfig). Access tokens are short-lived and
// carry identity/role claims; refresh tokens carry the rotating (familyId, jti) pair. Verify
// returns null (never throws) on any invalid/expired/tampered token.
import * as jwt from 'jsonwebtoken';
import type {
  TokenServicePort,
  AccessTokenClaims,
  RefreshTokenClaims,
  IssuedRefreshToken,
  UserId,
  Locale,
} from '@betvision/domain';

const ACCESS_TYP = 'access';
const REFRESH_TYP = 'refresh';

export class JwtTokenService implements TokenServicePort {
  constructor(
    private readonly accessSecret: string,
    private readonly refreshSecret: string,
    private readonly accessTtlSeconds: number,
    private readonly refreshTtlSeconds: number,
  ) {}

  async issueAccessToken(claims: AccessTokenClaims): Promise<string> {
    return jwt.sign(
      {
        typ: ACCESS_TYP,
        email: claims.email,
        role: claims.role,
        locale: claims.locale,
      },
      this.accessSecret,
      { subject: claims.userId, expiresIn: this.accessTtlSeconds },
    );
  }

  async issueRefreshToken(params: {
    userId: UserId;
    familyId: string;
    jti: string;
  }): Promise<IssuedRefreshToken> {
    const token = jwt.sign(
      { typ: REFRESH_TYP, familyId: params.familyId },
      this.refreshSecret,
      {
        subject: params.userId,
        jwtid: params.jti,
        expiresIn: this.refreshTtlSeconds,
      },
    );
    const expiresAt = new Date(
      Date.now() + this.refreshTtlSeconds * 1000,
    ).toISOString();
    return {
      token,
      jti: params.jti,
      familyId: params.familyId,
      expiresAt,
    };
  }

  async verifyAccessToken(token: string): Promise<AccessTokenClaims | null> {
    const payload = this.verify(token, this.accessSecret);
    if (!payload || payload['typ'] !== ACCESS_TYP || !payload.sub) return null;
    return {
      userId: payload.sub as UserId,
      email: String(payload['email']),
      role: String(payload['role']),
      locale: payload['locale'] as Locale,
    };
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenClaims | null> {
    const payload = this.verify(token, this.refreshSecret);
    if (
      !payload ||
      payload['typ'] !== REFRESH_TYP ||
      !payload.sub ||
      !payload.jti ||
      typeof payload['familyId'] !== 'string'
    ) {
      return null;
    }
    return {
      userId: payload.sub as UserId,
      familyId: payload['familyId'],
      jti: payload.jti,
    };
  }

  private verify(token: string, secret: string): jwt.JwtPayload | null {
    try {
      const decoded = jwt.verify(token, secret);
      return typeof decoded === 'string' ? null : decoded;
    } catch {
      return null;
    }
  }
}
