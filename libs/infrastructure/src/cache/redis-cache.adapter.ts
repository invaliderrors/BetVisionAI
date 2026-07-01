// libs/infrastructure/src/cache/redis-cache.adapter.ts
// CachePort adapter over ioredis (JSON-serialized values, optional TTL). Used for
// short-lived artifacts such as single-use password-reset tokens.
import type { Redis } from 'ioredis';
import type { CachePort } from '@betvision/domain';

export class RedisCacheAdapter implements CachePort {
  constructor(private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const raw = JSON.stringify(value);
    if (ttlSeconds !== undefined) {
      await this.redis.set(key, raw, 'EX', ttlSeconds);
    } else {
      await this.redis.set(key, raw);
    }
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
