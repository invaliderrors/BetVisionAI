// libs/infrastructure/src/providers/dev/dev-synthetic.ts
// =============================================================================================
//  SYNTHETIC DEV DATA — NOT REAL. NEVER PRESENT AS FACT.
// =============================================================================================
// Shared helpers for the Phase-7 DEV provider adapters. Every value they emit is DETERMINISTIC
// SYNTHETIC placeholder data (seeded by team/match/player id) — no network, fully reproducible.
// All payloads are stamped with provenance `provider = DEV_SYNTHETIC` so downstream consumers and
// the UI can clearly flag the data as non-factual (CLAUDE.md: "Do not invent real sports data").
import type { DataProvenance, Provenanced, IsoDateTime } from '@betvision/domain';

/** Canonical provenance/DataSource name for all synthetic dev data. */
export const DEV_SYNTHETIC = 'DEV_SYNTHETIC';

/** Fixed, pre-season fetch instant so provenance is deterministic and clearly historical. */
export const DEV_FETCHED_AT = '2025-07-01T00:00:00.000Z' as IsoDateTime;

/** FNV-1a (32-bit) hex — deterministic payload hashing, no node `crypto`. */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Deterministic PRNG factory (xmur3 seed -> mulberry32). Same seed string ALWAYS yields the same
 * stream of numbers in [0,1), so every synthetic output is stable and reproducible across runs.
 */
export function makeRng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = (Math.imul(h ^ (h >>> 16), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Round to `dp` decimal places (stable output for synthetic averages/prices). */
export const roundTo = (value: number, dp: number): number => {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
};

/** Uniform synthetic value in [min,max], rounded to `dp`. */
export const between = (rng: () => number, min: number, max: number, dp = 2): number =>
  roundTo(min + rng() * (max - min), dp);

/** Integer in [min,max]. */
export const intBetween = (rng: () => number, min: number, max: number): number =>
  Math.floor(min + rng() * (max - min + 1));

/** Deterministic provenance stamp marking data as SYNTHETIC (provider = DEV_SYNTHETIC). */
export function devProvenance(payload: unknown): DataProvenance {
  return {
    provider: DEV_SYNTHETIC,
    fetchedAt: DEV_FETCHED_AT,
    payloadHash: fnv1a(JSON.stringify(payload)),
    ageMinutes: 0,
  };
}

/** Wrap synthetic data with SYNTHETIC provenance. */
export function devProvenanced<T>(data: T): Provenanced<T> {
  return { data, provenance: devProvenance(data) };
}
