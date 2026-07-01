// libs/domain/src/ports/feature-store.port.ts
import type { MatchId } from './shared.dto';

/** Opaque, reproducible feature vector keyed by fixture + feature-set version. */
export interface FeatureVector {
  readonly matchId: MatchId;
  readonly version: string;
  readonly features: Readonly<Record<string, number>>;
  readonly snapshotHash: string;
}

export interface FeatureStorePort {
  get(matchId: MatchId, version: string): Promise<FeatureVector | null>;
  put(vector: FeatureVector): Promise<void>;
}
