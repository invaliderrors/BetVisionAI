// libs/testing/src/fakes/fake-match-repository.ts
import type {
  MatchRepositoryPort,
  MatchSearchQuery,
  MatchCandidate,
  Match,
  MatchId,
} from '@betvision/domain';

/** In-memory match repository seeded via `save`; `search` returns seeded candidates. */
export class FakeMatchRepository implements MatchRepositoryPort {
  private readonly byId = new Map<string, Match>();
  private candidates: MatchCandidate[] = [];
  readonly searchQueries: MatchSearchQuery[] = [];

  seedCandidates(candidates: MatchCandidate[]): this {
    this.candidates = candidates;
    return this;
  }

  async findById(id: MatchId): Promise<Match | null> {
    return this.byId.get(id) ?? null;
  }

  async search(query: MatchSearchQuery): Promise<MatchCandidate[]> {
    this.searchQueries.push(query);
    return this.candidates;
  }

  async save(match: Match): Promise<void> {
    this.byId.set(match.id, match);
  }
}
