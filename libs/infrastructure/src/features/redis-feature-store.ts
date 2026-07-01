// libs/infrastructure/src/features/redis-feature-store.ts
// FeatureStorePort adapter over ioredis. Caches the reproducible feature vector by
// (matchId, featureVersion). Values are JSON-serialised; the vector already carries its own
// deterministic `snapshotHash` (computed in the domain), so no hashing happens here.
import type { Redis } from 'ioredis';
import type { FeatureStorePort, FeatureVector, MatchId } from '@betvision/domain';

/** Default TTL for cached vectors (7 days). Reproducible, so re-computation is always safe. */
const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60;

export class RedisFeatureStore implements FeatureStorePort {
  constructor(
    private readonly redis: Redis,
    private readonly ttlSeconds: number = DEFAULT_TTL_SECONDS,
  ) {}

  private key(matchId: MatchId, version: string): string {
    return `feat:${matchId}:${version}`;
  }

  async get(matchId: MatchId, version: string): Promise<FeatureVector | null> {
    const raw = await this.redis.get(this.key(matchId, version));
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as FeatureVector;
    } catch {
      return null;
    }
  }

  async put(vector: FeatureVector): Promise<void> {
    const raw = JSON.stringify(vector);
    await this.redis.set(this.key(vector.matchId, vector.version), raw, 'EX', this.ttlSeconds);
  }
}
