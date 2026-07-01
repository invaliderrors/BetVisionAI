import { SearchTeamsUseCase } from './search-teams.use-case';
import { GetTeamDetailUseCase } from './get-team-detail.use-case';
import { GetTeamStatsUseCase } from './get-team-stats.use-case';
import {
  Team,
  type TeamRepositoryPort,
  type TeamSearchResult,
  type TeamStatsView,
  type TeamId,
  type SeasonId,
} from '@betvision/domain';
import { DomainErrorCode, unwrap } from '@betvision/shared';

const team = (id: string, name: string): Team =>
  unwrap(
    Team.create({
      id: id as TeamId,
      name,
      shortName: null,
      country: 'Spain',
      crestUrl: null,
      eloRating: 2000,
    }),
  );

class InlineTeamRepo implements TeamRepositoryPort {
  results: TeamSearchResult[] = [];
  stats: TeamStatsView[] = [];
  byId = new Map<string, Team>();

  async findById(id: TeamId): Promise<Team | null> {
    return this.byId.get(id) ?? null;
  }
  async searchByName(_name: string, limit?: number): Promise<TeamSearchResult[]> {
    return limit === undefined ? this.results : this.results.slice(0, limit);
  }
  async findStats(): Promise<TeamStatsView[]> {
    return this.stats;
  }
}

describe('SearchTeamsUseCase', () => {
  it('returns ranked TeamRefs for a search term', async () => {
    const repo = new InlineTeamRepo();
    repo.results = [
      { team: team('t-rma', 'Real Madrid'), score: 0.9 },
      { team: team('t-atm', 'Atlético Madrid'), score: 0.5 },
    ];
    const result = await new SearchTeamsUseCase(repo).execute({ query: 'Madrid' });

    if (!result.ok) throw new Error('expected ok');
    expect(result.value.teams.map((t) => t.name)).toEqual([
      'Real Madrid',
      'Atlético Madrid',
    ]);
  });

  it('returns an empty list for a blank query without hitting the repo', async () => {
    const result = await new SearchTeamsUseCase(new InlineTeamRepo()).execute({
      query: '  ',
    });
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.teams).toEqual([]);
  });
});

describe('GetTeamDetailUseCase', () => {
  it('maps a team entity to a detail DTO', async () => {
    const repo = new InlineTeamRepo();
    repo.byId.set('t-rma', team('t-rma', 'Real Madrid'));
    const result = await new GetTeamDetailUseCase(repo).execute({
      teamId: 't-rma' as TeamId,
    });
    if (!result.ok) throw new Error('expected ok');
    expect(result.value).toMatchObject({ id: 't-rma', name: 'Real Madrid', eloRating: 2000 });
  });

  it('returns TEAM_NOT_FOUND for an unknown id', async () => {
    const result = await new GetTeamDetailUseCase(new InlineTeamRepo()).execute({
      teamId: 'nope' as TeamId,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe(DomainErrorCode.TEAM_NOT_FOUND);
  });
});

describe('GetTeamStatsUseCase', () => {
  it('returns the available stats rows (empty is valid)', async () => {
    const repo = new InlineTeamRepo();
    repo.byId.set('t-rma', team('t-rma', 'Real Madrid'));
    repo.stats = [
      {
        seasonId: 's1' as SeasonId,
        venue: 'all',
        window: 5,
        avgGoalsFor: 2.1,
        avgGoalsAgainst: 0.8,
        avgXgFor: null,
        avgXgAgainst: null,
        cleanSheets: 3,
        form: 'WWDWL',
        computedAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    const result = await new GetTeamStatsUseCase(repo).execute({
      teamId: 't-rma' as TeamId,
    });
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.teamId).toBe('t-rma');
    expect(result.value.stats).toHaveLength(1);
    expect(result.value.stats[0]).toMatchObject({ venue: 'all', window: 5, form: 'WWDWL' });
  });

  it('returns TEAM_NOT_FOUND for an unknown id', async () => {
    const result = await new GetTeamStatsUseCase(new InlineTeamRepo()).execute({
      teamId: 'nope' as TeamId,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe(DomainErrorCode.TEAM_NOT_FOUND);
  });
});
