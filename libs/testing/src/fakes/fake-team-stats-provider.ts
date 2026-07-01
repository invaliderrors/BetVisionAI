// libs/testing/src/fakes/fake-team-stats-provider.ts
import type {
  TeamStatsProviderPort,
  TeamStatsDto,
  Provenanced,
  TeamId,
  StatsScope,
} from '@betvision/domain';
import { provenanced } from './provenance';

const PROVIDER = 'fake-team-stats';

/** Deterministic team stats; overridable per teamId via `seed`. */
export class FakeTeamStatsProvider implements TeamStatsProviderPort {
  private readonly byTeam = new Map<string, TeamStatsDto>();
  readonly calls: Array<{ teamId: TeamId; scope: StatsScope }> = [];

  seed(teamId: TeamId, stats: TeamStatsDto): this {
    this.byTeam.set(teamId, stats);
    return this;
  }

  async getTeamStats(teamId: TeamId, scope: StatsScope): Promise<Provenanced<TeamStatsDto>> {
    this.calls.push({ teamId, scope });
    const stats: TeamStatsDto = this.byTeam.get(teamId) ?? {
      teamId,
      avgGoalsFor: 1.5,
      avgGoalsAgainst: 1.1,
      avgXgFor: 1.4,
      avgXgAgainst: 1.2,
      avgCornersFor: 5.2,
      avgCornersAgainst: 4.8,
      avgCardsFor: 1.8,
      avgCardsAgainst: 2.0,
      cleanSheets: 4,
    };
    return provenanced(PROVIDER, stats);
  }
}
