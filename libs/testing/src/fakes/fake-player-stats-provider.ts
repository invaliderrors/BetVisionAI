// libs/testing/src/fakes/fake-player-stats-provider.ts
import type {
  PlayerStatsProviderPort,
  PlayerStatsDto,
  Provenanced,
  PlayerId,
  SeasonId,
} from '@betvision/domain';
import { provenanced } from './provenance';

const PROVIDER = 'fake-player-stats';

export class FakePlayerStatsProvider implements PlayerStatsProviderPort {
  private readonly byPlayer = new Map<string, PlayerStatsDto>();

  seed(playerId: PlayerId, stats: PlayerStatsDto): this {
    this.byPlayer.set(playerId, stats);
    return this;
  }

  async getPlayerStats(playerId: PlayerId, season: SeasonId): Promise<Provenanced<PlayerStatsDto>> {
    void season;
    const stats: PlayerStatsDto = this.byPlayer.get(playerId) ?? {
      playerId,
      apps: 20,
      minutes: 1650,
      goals: 8,
      assists: 4,
      xg: 7.3,
      xa: 3.9,
      yellow: 3,
      red: 0,
    };
    return provenanced(PROVIDER, stats);
  }
}
