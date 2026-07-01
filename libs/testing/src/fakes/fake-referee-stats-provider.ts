// libs/testing/src/fakes/fake-referee-stats-provider.ts
import type {
  RefereeStatsProviderPort,
  RefereeStatsDto,
  Provenanced,
  RefereeId,
  SeasonId,
} from '@betvision/domain';
import { provenanced } from './provenance';

const PROVIDER = 'fake-referee-stats';

export class FakeRefereeStatsProvider implements RefereeStatsProviderPort {
  private readonly byRef = new Map<string, RefereeStatsDto>();

  seed(refereeId: RefereeId, stats: RefereeStatsDto): this {
    this.byRef.set(refereeId, stats);
    return this;
  }

  async getRefereeStats(
    refereeId: RefereeId,
    season: SeasonId,
  ): Promise<Provenanced<RefereeStatsDto>> {
    void season;
    const stats: RefereeStatsDto = this.byRef.get(refereeId) ?? {
      refereeId,
      avgYellow: 3.6,
      avgRed: 0.2,
      avgFouls: 24.1,
      avgPenalties: 0.3,
      matches: 18,
      homeBias: 0.05,
    };
    return provenanced(PROVIDER, stats);
  }
}
