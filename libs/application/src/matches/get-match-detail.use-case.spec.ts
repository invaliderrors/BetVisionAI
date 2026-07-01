import { GetMatchDetailUseCase } from './get-match-detail.use-case';
import {
  type MatchRepositoryPort,
  type MatchCandidate,
  type MatchDetailView,
  type Match,
  type MatchId,
  type TeamId,
  type CompetitionId,
  type SeasonId,
} from '@betvision/domain';
import { DomainErrorCode } from '@betvision/shared';

const view: MatchDetailView = {
  matchId: 'm1' as MatchId,
  home: { id: 't-rma' as TeamId, name: 'Real Madrid', shortName: 'RMA', crestUrl: null },
  away: { id: 't-fcb' as TeamId, name: 'Barcelona', shortName: 'FCB', crestUrl: null },
  competition: { id: 'c1' as CompetitionId, name: 'La Liga', country: 'Spain' },
  seasonId: 's1' as SeasonId,
  seasonLabel: '2025/26',
  kickoffUtc: '2026-01-02T20:00:00.000Z',
  status: 'scheduled',
  venue: 'Bernabéu',
  round: '17',
  importance: null,
  referee: null,
  stats: null,
};

class InlineMatchRepo implements MatchRepositoryPort {
  constructor(private readonly detail: MatchDetailView | null) {}
  async findById(): Promise<Match | null> {
    return null;
  }
  async findDetailById(): Promise<MatchDetailView | null> {
    return this.detail;
  }
  async findByTeams(): Promise<MatchCandidate[]> {
    return [];
  }
  async save(): Promise<void> {
    /* no-op */
  }
}

describe('GetMatchDetailUseCase', () => {
  it('maps the detail view to a DTO (with an odds-summary placeholder)', async () => {
    const result = await new GetMatchDetailUseCase(new InlineMatchRepo(view)).execute({
      matchId: 'm1' as MatchId,
    });

    if (!result.ok) throw new Error('expected ok');
    expect(result.value.id).toBe('m1');
    expect(result.value.home.name).toBe('Real Madrid');
    expect(result.value.competition.name).toBe('La Liga');
    expect(result.value.seasonLabel).toBe('2025/26');
    expect(result.value.oddsSummary).toEqual({ available: false });
  });

  it('returns MATCH_NOT_FOUND for an unknown id', async () => {
    const result = await new GetMatchDetailUseCase(new InlineMatchRepo(null)).execute({
      matchId: 'nope' as MatchId,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe(DomainErrorCode.MATCH_NOT_FOUND);
  });
});
