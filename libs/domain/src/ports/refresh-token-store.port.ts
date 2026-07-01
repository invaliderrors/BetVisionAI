// libs/domain/src/ports/refresh-token-store.port.ts
// Outbound port backing refresh-token ROTATION + REUSE DETECTION (SPEC §19).
//
// Model: each login opens a token "family" (a chain of rotated tokens). The store tracks
// the CURRENT valid jti per family. On refresh the use case compares the presented jti
// against `getCurrentJti(familyId)`:
//   - equal            -> legitimate rotation: `rotate` to a fresh jti.
//   - different/missing -> a superseded (already-rotated) token was replayed = REUSE.
//                          The use case calls `revokeFamily` so the whole chain dies.
// Redis TTLs mean expired families self-evict. Implemented in infrastructure.
import type { UserId } from './shared.dto';

export interface RefreshTokenStorePort {
  /** Open a new family with its first current jti (called on login). */
  startFamily(params: {
    readonly userId: UserId;
    readonly familyId: string;
    readonly jti: string;
    readonly ttlSeconds: number;
  }): Promise<void>;
  /** The currently-valid jti for a family, or `null` if the family is unknown/revoked. */
  getCurrentJti(familyId: string): Promise<string | null>;
  /** Advance the family's current jti (legitimate rotation on refresh). */
  rotate(params: {
    readonly userId: UserId;
    readonly familyId: string;
    readonly newJti: string;
    readonly ttlSeconds: number;
  }): Promise<void>;
  /** Kill an entire family (logout, or reuse-detection revocation). */
  revokeFamily(familyId: string): Promise<void>;
  /** Kill every family for a user (e.g. after a password reset). */
  revokeAllForUser(userId: UserId): Promise<void>;
}
