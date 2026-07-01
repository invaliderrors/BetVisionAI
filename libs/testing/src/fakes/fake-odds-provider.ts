// libs/testing/src/fakes/fake-odds-provider.ts
import type {
  OddsProviderPort,
  OddsQuery,
  OddsSnapshotDto,
  Provenanced,
} from '@betvision/domain';
import { provenanced } from './provenance';

const PROVIDER = 'fake-odds-provider';

export class FakeOddsProvider implements OddsProviderPort {
  private odds: OddsSnapshotDto[] = [];
  readonly queries: OddsQuery[] = [];

  seed(odds: OddsSnapshotDto[]): this {
    this.odds = odds;
    return this;
  }

  async getOdds(query: OddsQuery): Promise<Provenanced<OddsSnapshotDto[]>> {
    this.queries.push(query);
    return provenanced(PROVIDER, this.odds);
  }
}
