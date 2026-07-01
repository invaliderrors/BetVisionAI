// libs/testing/src/fakes/fake-feature-store.ts
import type { FeatureStorePort, FeatureVector, MatchId } from '@betvision/domain';

/** In-memory feature store keyed by (matchId, version). */
export class FakeFeatureStore implements FeatureStorePort {
  private readonly store = new Map<string, FeatureVector>();

  private key(matchId: MatchId, version: string): string {
    return `${matchId}@${version}`;
  }

  async get(matchId: MatchId, version: string): Promise<FeatureVector | null> {
    return this.store.get(this.key(matchId, version)) ?? null;
  }

  async put(vector: FeatureVector): Promise<void> {
    this.store.set(this.key(vector.matchId, vector.version), vector);
  }
}
