// libs/testing/src/fakes/fake-team-repository.ts
// In-memory TeamRepositoryPort for use-case tests. Fuzzy search is faked with per-query
// seeded results (keyed by the normalized term) so tests control the resolver's scores.
import type {
  TeamRepositoryPort,
  TeamSearchResult,
  TeamStatsView,
  Team,
  TeamId,
} from '@betvision/domain';

export class FakeTeamRepository implements TeamRepositoryPort {
  private readonly byId = new Map<string, Team>();
  private readonly resultsByQuery = new Map<string, TeamSearchResult[]>();
  private defaultResults: TeamSearchResult[] = [];
  private stats: TeamStatsView[] = [];
  readonly searchQueries: string[] = [];

  seedTeams(...teams: Team[]): this {
    for (const team of teams) this.byId.set(team.id, team);
    return this;
  }

  /** Seed the results returned when `searchByName` is called with `query` (case-insensitive). */
  seedSearch(query: string, results: TeamSearchResult[]): this {
    this.resultsByQuery.set(query.trim().toLowerCase(), results);
    return this;
  }

  /** Fallback results for any query without an explicit seed. */
  seedDefaultSearch(results: TeamSearchResult[]): this {
    this.defaultResults = results;
    return this;
  }

  seedStats(stats: TeamStatsView[]): this {
    this.stats = stats;
    return this;
  }

  async findById(id: TeamId): Promise<Team | null> {
    return this.byId.get(id) ?? null;
  }

  async searchByName(name: string, limit?: number): Promise<TeamSearchResult[]> {
    this.searchQueries.push(name);
    const results =
      this.resultsByQuery.get(name.trim().toLowerCase()) ?? this.defaultResults;
    return limit === undefined ? results : results.slice(0, limit);
  }

  async findStats(_id: TeamId): Promise<TeamStatsView[]> {
    return this.stats;
  }
}
