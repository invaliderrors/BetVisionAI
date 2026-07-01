// libs/infrastructure/src/providers/dev/dev-player-stats.provider.ts
// SYNTHETIC DEV adapter for PlayerStatsProviderPort. Deterministic per (playerId, season) —
// NOT real data (provenance DEV_SYNTHETIC).
import { Injectable } from '@nestjs/common';
import type {
  PlayerStatsProviderPort,
  PlayerStatsDto,
  Provenanced,
  PlayerId,
  SeasonId,
} from '@betvision/domain';
import { devProvenanced, makeRng, between, intBetween } from './dev-synthetic';

@Injectable()
export class DevPlayerStatsProvider implements PlayerStatsProviderPort {
  async getPlayerStats(
    playerId: PlayerId,
    season: SeasonId,
  ): Promise<Provenanced<PlayerStatsDto>> {
    const rng = makeRng(`playerstats|${playerId}|${season}`);
    const apps = intBetween(rng, 5, 34);
    const stats: PlayerStatsDto = {
      playerId,
      apps,
      minutes: apps * intBetween(rng, 45, 90),
      goals: intBetween(rng, 0, 18),
      assists: intBetween(rng, 0, 12),
      xg: between(rng, 0, 16, 2),
      xa: between(rng, 0, 10, 2),
      yellow: intBetween(rng, 0, 8),
      red: intBetween(rng, 0, 1),
    };
    return devProvenanced(stats);
  }
}
