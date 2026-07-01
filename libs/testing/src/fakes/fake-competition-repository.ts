// libs/testing/src/fakes/fake-competition-repository.ts
// In-memory CompetitionRepositoryPort for use-case tests.
import type {
  CompetitionRepositoryPort,
  Competition,
  Season,
  CompetitionId,
} from '@betvision/domain';

export class FakeCompetitionRepository implements CompetitionRepositoryPort {
  private readonly byId = new Map<string, Competition>();
  private competitions: Competition[] = [];
  private readonly seasonsByCompetition = new Map<string, Season[]>();

  seedCompetitions(...competitions: Competition[]): this {
    this.competitions = competitions;
    for (const competition of competitions) this.byId.set(competition.id, competition);
    return this;
  }

  seedSeasons(competitionId: CompetitionId, seasons: Season[]): this {
    this.seasonsByCompetition.set(competitionId, seasons);
    return this;
  }

  async findById(id: CompetitionId): Promise<Competition | null> {
    return this.byId.get(id) ?? null;
  }

  async list(): Promise<Competition[]> {
    return this.competitions;
  }

  async findSeasons(competitionId: CompetitionId): Promise<Season[]> {
    return this.seasonsByCompetition.get(competitionId) ?? [];
  }
}
