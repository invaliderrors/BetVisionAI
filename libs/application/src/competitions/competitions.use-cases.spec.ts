import { ListCompetitionsUseCase } from './list-competitions.use-case';
import { GetCompetitionSeasonsUseCase } from './get-competition-seasons.use-case';
import {
  Competition,
  Season,
  type CompetitionRepositoryPort,
  type CompetitionId,
  type SeasonId,
} from '@betvision/domain';
import { DomainErrorCode, unwrap } from '@betvision/shared';

const competition = unwrap(
  Competition.create({
    id: 'c1' as CompetitionId,
    name: 'La Liga',
    country: 'Spain',
    type: 'league',
    tier: 1,
  }),
);

const season = unwrap(
  Season.create({
    id: 's1' as SeasonId,
    competitionId: 'c1' as CompetitionId,
    label: '2025/26',
    startDate: null,
    endDate: null,
  }),
);

class InlineCompetitionRepo implements CompetitionRepositoryPort {
  constructor(
    private readonly competitions: Competition[],
    private readonly seasons: Season[],
  ) {}
  async findById(id: CompetitionId): Promise<Competition | null> {
    return this.competitions.find((c) => c.id === id) ?? null;
  }
  async list(): Promise<Competition[]> {
    return this.competitions;
  }
  async findSeasons(): Promise<Season[]> {
    return this.seasons;
  }
}

describe('ListCompetitionsUseCase', () => {
  it('maps the competition catalog to DTOs', async () => {
    const result = await new ListCompetitionsUseCase(
      new InlineCompetitionRepo([competition], []),
    ).execute();
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.competitions).toHaveLength(1);
    expect(result.value.competitions[0]).toMatchObject({ name: 'La Liga', type: 'league', tier: 1 });
  });
});

describe('GetCompetitionSeasonsUseCase', () => {
  it('lists seasons for a known competition', async () => {
    const result = await new GetCompetitionSeasonsUseCase(
      new InlineCompetitionRepo([competition], [season]),
    ).execute({ competitionId: 'c1' as CompetitionId });
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.competitionId).toBe('c1');
    expect(result.value.seasons[0]).toMatchObject({ label: '2025/26', competitionId: 'c1' });
  });

  it('returns COMPETITION_NOT_FOUND for an unknown competition', async () => {
    const result = await new GetCompetitionSeasonsUseCase(
      new InlineCompetitionRepo([], []),
    ).execute({ competitionId: 'nope' as CompetitionId });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe(DomainErrorCode.COMPETITION_NOT_FOUND);
  });
});
