// libs/testing/src/fakes/fake-match-repository.ts
// In-memory MatchRepositoryPort for use-case tests. `save`/`findById` round-trip the
// aggregate; detail + candidates are seeded independently so tests control the read side.
import type {
  MatchRepositoryPort,
  MatchByTeamsQuery,
  MatchCandidate,
  MatchDetailView,
  Match,
  MatchId,
} from '@betvision/domain';

export class FakeMatchRepository implements MatchRepositoryPort {
  private readonly byId = new Map<string, Match>();
  private readonly detailById = new Map<string, MatchDetailView>();
  private candidates: MatchCandidate[] = [];
  readonly byTeamsQueries: MatchByTeamsQuery[] = [];

  seedMatches(...matches: Match[]): this {
    for (const match of matches) this.byId.set(match.id, match);
    return this;
  }

  seedDetail(...views: MatchDetailView[]): this {
    for (const view of views) this.detailById.set(view.matchId, view);
    return this;
  }

  seedCandidates(candidates: MatchCandidate[]): this {
    this.candidates = candidates;
    return this;
  }

  async findById(id: MatchId): Promise<Match | null> {
    return this.byId.get(id) ?? null;
  }

  async findDetailById(id: MatchId): Promise<MatchDetailView | null> {
    return this.detailById.get(id) ?? null;
  }

  async findByTeams(query: MatchByTeamsQuery): Promise<MatchCandidate[]> {
    this.byTeamsQueries.push(query);
    return this.candidates;
  }

  async save(match: Match): Promise<void> {
    this.byId.set(match.id, match);
  }
}
