// libs/infrastructure/src/auth/redis-refresh-token-store.ts
// RefreshTokenStorePort adapter over ioredis. One key per family holds the CURRENT valid
// jti (`rt:family:{id}` -> jti, with the refresh TTL); a per-user set (`rt:user:{id}`)
// tracks the family ids so a password reset / delete can revoke them all. Rotation is a
// single SET; reuse detection is decided by the use case comparing the presented jti to
// getCurrentJti(). Expired families self-evict via TTL.
import type { Redis } from 'ioredis';
import type { RefreshTokenStorePort, UserId } from '@betvision/domain';

const familyKey = (familyId: string): string => `rt:family:${familyId}`;
const userKey = (userId: string): string => `rt:user:${userId}`;

export class RedisRefreshTokenStore implements RefreshTokenStorePort {
  constructor(private readonly redis: Redis) {}

  async startFamily(params: {
    userId: UserId;
    familyId: string;
    jti: string;
    ttlSeconds: number;
  }): Promise<void> {
    await this.redis.set(
      familyKey(params.familyId),
      params.jti,
      'EX',
      params.ttlSeconds,
    );
    await this.redis.sadd(userKey(params.userId), params.familyId);
    await this.redis.expire(userKey(params.userId), params.ttlSeconds);
  }

  async getCurrentJti(familyId: string): Promise<string | null> {
    return this.redis.get(familyKey(familyId));
  }

  async rotate(params: {
    userId: UserId;
    familyId: string;
    newJti: string;
    ttlSeconds: number;
  }): Promise<void> {
    await this.redis.set(
      familyKey(params.familyId),
      params.newJti,
      'EX',
      params.ttlSeconds,
    );
    // Keep the user->families index alive for the same window.
    await this.redis.expire(userKey(params.userId), params.ttlSeconds);
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.redis.del(familyKey(familyId));
  }

  async revokeAllForUser(userId: UserId): Promise<void> {
    const families = await this.redis.smembers(userKey(userId));
    if (families.length > 0) {
      await this.redis.del(...families.map(familyKey));
    }
    await this.redis.del(userKey(userId));
  }
}
