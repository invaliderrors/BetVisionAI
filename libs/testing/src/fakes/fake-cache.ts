// libs/testing/src/fakes/fake-cache.ts
import type { CachePort } from '@betvision/domain';

/** In-memory cache (ignores TTL expiry; records sets for assertions). */
export class FakeCache implements CachePort {
  private readonly store = new Map<string, unknown>();
  readonly sets: Array<{ key: string; value: unknown; ttlSeconds?: number }> = [];

  async get<T>(key: string): Promise<T | null> {
    return this.store.has(key) ? (this.store.get(key) as T) : null;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    this.store.set(key, value);
    this.sets.push({ key, value, ttlSeconds });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}
