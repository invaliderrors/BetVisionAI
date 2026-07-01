// libs/testing/src/fakes/fake-token-service.ts
// TokenServicePort fake: encodes claims as JSON (no real signing) so tests can round-trip
// issue -> verify deterministically, including refresh (familyId, jti) for rotation tests.
import type {
  TokenServicePort,
  AccessTokenClaims,
  RefreshTokenClaims,
  IssuedRefreshToken,
  UserId,
} from '@betvision/domain';

export class FakeTokenService implements TokenServicePort {
  async issueAccessToken(claims: AccessTokenClaims): Promise<string> {
    return JSON.stringify({ typ: 'access', ...claims });
  }

  async issueRefreshToken(params: {
    userId: UserId;
    familyId: string;
    jti: string;
  }): Promise<IssuedRefreshToken> {
    const token = JSON.stringify({ typ: 'refresh', ...params });
    return {
      token,
      jti: params.jti,
      familyId: params.familyId,
      expiresAt: '2100-01-01T00:00:00.000Z',
    };
  }

  async verifyAccessToken(token: string): Promise<AccessTokenClaims | null> {
    const decoded = this.decode(token);
    if (!decoded || decoded['typ'] !== 'access') return null;
    return {
      userId: decoded['userId'] as UserId,
      email: String(decoded['email']),
      role: String(decoded['role']),
      locale: decoded['locale'] as AccessTokenClaims['locale'],
    };
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenClaims | null> {
    const decoded = this.decode(token);
    if (!decoded || decoded['typ'] !== 'refresh') return null;
    return {
      userId: decoded['userId'] as UserId,
      familyId: String(decoded['familyId']),
      jti: String(decoded['jti']),
    };
  }

  private decode(token: string): Record<string, unknown> | null {
    try {
      const parsed: unknown = JSON.parse(token);
      return typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
}
