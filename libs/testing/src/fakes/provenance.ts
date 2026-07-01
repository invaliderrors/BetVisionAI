// libs/testing/src/fakes/provenance.ts
import type { DataProvenance, Provenanced } from '@betvision/domain';

/** Deterministic provenance stamp for fake provider payloads. */
export const fakeProvenance = (provider: string): DataProvenance => ({
  provider,
  fetchedAt: '2026-01-01T00:00:00.000Z',
  payloadHash: `hash-${provider}`,
  ageMinutes: 0,
});

export const provenanced = <T>(provider: string, data: T): Provenanced<T> => ({
  data,
  provenance: fakeProvenance(provider),
});
