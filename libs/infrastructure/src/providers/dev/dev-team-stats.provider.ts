// libs/infrastructure/src/providers/dev/dev-team-stats.provider.ts
// SYNTHETIC DEV adapter for TeamStatsProviderPort. Deterministic rolling averages seeded by
// (teamId, venue, window) — NOT real data (provenance DEV_SYNTHETIC).
import { Injectable } from '@nestjs/common';
import type {
  TeamStatsProviderPort,
  TeamStatsDto,
  Provenanced,
  TeamId,
  StatsScope,
} from '@betvision/domain';
import { devProvenanced, makeRng, between, intBetween } from './dev-synthetic';

@Injectable()
export class DevTeamStatsProvider implements TeamStatsProviderPort {
  async getTeamStats(teamId: TeamId, scope: StatsScope): Promise<Provenanced<TeamStatsDto>> {
    const rng = makeRng(`teamstats|${teamId}|${scope.venue ?? 'all'}|${scope.window ?? 5}`);
    const stats: TeamStatsDto = {
      teamId,
      avgGoalsFor: between(rng, 0.8, 2.6),
      avgGoalsAgainst: between(rng, 0.6, 2.2),
      avgXgFor: between(rng, 0.8, 2.4),
      avgXgAgainst: between(rng, 0.7, 2.1),
      avgCornersFor: between(rng, 3.5, 7.5),
      avgCornersAgainst: between(rng, 3.0, 6.5),
      avgCardsFor: between(rng, 1.0, 3.0),
      avgCardsAgainst: between(rng, 1.0, 3.0),
      cleanSheets: intBetween(rng, 0, 9),
    };
    return devProvenanced(stats);
  }
}
