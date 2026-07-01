// libs/testing/src/fakes/fake-refresh-token-store.ts
// In-memory RefreshTokenStorePort tracking the current jti per family (and families per
// user) so rotation + reuse-detection can be asserted without Redis.
import type { RefreshTokenStorePort, UserId } from '@betvision/domain';

export class FakeRefreshTokenStore implements RefreshTokenStorePort {
  /** familyId -> current valid jti. Absence means the family is unknown/revoked. */
  readonly families = new Map<string, string>();
  private readonly userFamilies = new Map<string, Set<string>>();

  async startFamily(params: {
    userId: UserId;
    familyId: string;
    jti: string;
    ttlSeconds: number;
  }): Promise<void> {
    this.families.set(params.familyId, params.jti);
    const set = this.userFamilies.get(params.userId) ?? new Set<string>();
    set.add(params.familyId);
    this.userFamilies.set(params.userId, set);
  }

  async getCurrentJti(familyId: string): Promise<string | null> {
    return this.families.get(familyId) ?? null;
  }

  async rotate(params: {
    userId: UserId;
    familyId: string;
    newJti: string;
    ttlSeconds: number;
  }): Promise<void> {
    this.families.set(params.familyId, params.newJti);
  }

  async revokeFamily(familyId: string): Promise<void> {
    this.families.delete(familyId);
  }

  async revokeAllForUser(userId: UserId): Promise<void> {
    const set = this.userFamilies.get(userId);
    if (!set) return;
    for (const familyId of set) this.families.delete(familyId);
    set.clear();
  }

  /** Test helper: is this family still live? */
  hasFamily(familyId: string): boolean {
    return this.families.has(familyId);
  }
}
