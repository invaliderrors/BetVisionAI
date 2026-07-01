// libs/infrastructure/src/features/redis-feature-store.spec.ts
// Unit test for the Redis-backed FeatureStore using an in-memory ioredis stub (no live Redis).
import type { Redis } from 'ioredis';
import type { FeatureVector, MatchId } from '@betvision/domain';
import { RedisFeatureStore } from './redis-feature-store';

/** Minimal in-memory stand-in for the subset of ioredis the adapter uses. */
function fakeRedis(): { redis: Redis; store: Map<string, string> } {
  const store = new Map<string, string>();
  const redis = {
    get: async (key: string): Promise<string | null> => store.get(key) ?? null,
    set: async (key: string, value: string): Promise<'OK'> => {
      store.set(key, value);
      return 'OK';
    },
  } as unknown as Redis;
  return { redis, store };
}

const vector: FeatureVector = {
  matchId: 'match-1' as MatchId,
  version: 'fv1',
  features: { home_avg_goals_for: 1.6, away_avg_goals_for: 1.1 },
  snapshotHash: 'abc123def4567890',
};

describe('RedisFeatureStore', () => {
  it('returns null for a cache miss', async () => {
    const { redis } = fakeRedis();
    expect(await new RedisFeatureStore(redis).get('match-1' as MatchId, 'fv1')).toBeNull();
  });

  it('round-trips a vector keyed by (matchId, version)', async () => {
    const { redis, store } = fakeRedis();
    const featureStore = new RedisFeatureStore(redis);

    await featureStore.put(vector);
    expect(store.has('feat:match-1:fv1')).toBe(true);

    const loaded = await featureStore.get('match-1' as MatchId, 'fv1');
    expect(loaded).toEqual(vector);
  });

  it('does not cross versions', async () => {
    const { redis } = fakeRedis();
    const featureStore = new RedisFeatureStore(redis);
    await featureStore.put(vector);
    expect(await featureStore.get('match-1' as MatchId, 'fv2')).toBeNull();
  });

  it('tolerates corrupt cache entries (returns null)', async () => {
    const { redis, store } = fakeRedis();
    store.set('feat:match-1:fv1', '{not valid json');
    expect(await new RedisFeatureStore(redis).get('match-1' as MatchId, 'fv1')).toBeNull();
  });
});
