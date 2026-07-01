// libs/testing/src/fakes/fake-odds-repository.ts
import type {
  OddsRepositoryPort,
  OddsSnapshotRecord,
  MatchId,
  MarketKey,
} from '@betvision/domain';

/** In-memory, append-only odds time-series. */
export class FakeOddsRepository implements OddsRepositoryPort {
  readonly snapshots: OddsSnapshotRecord[] = [];

  async findLatest(matchId: MatchId, markets?: MarketKey[]): Promise<OddsSnapshotRecord[]> {
    const rows = this.snapshots.filter(
      (s) => s.matchId === matchId && (!markets || markets.includes(s.market)),
    );
    const latest = new Map<string, OddsSnapshotRecord>();
    for (const row of rows) {
      const key = `${row.market}|${row.selection}`;
      const prev = latest.get(key);
      if (!prev || row.capturedAt > prev.capturedAt) latest.set(key, row);
    }
    return [...latest.values()];
  }

  async findMovement(
    matchId: MatchId,
    market: MarketKey,
    selection: string,
  ): Promise<OddsSnapshotRecord[]> {
    return this.snapshots
      .filter((s) => s.matchId === matchId && s.market === market && s.selection === selection)
      .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  }

  async saveSnapshots(snapshots: ReadonlyArray<OddsSnapshotRecord>): Promise<void> {
    this.snapshots.push(...snapshots);
  }
}
