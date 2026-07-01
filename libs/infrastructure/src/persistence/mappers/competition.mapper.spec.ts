// Pure unit tests for the competition mapper — no DB. Proves the CompetitionType enum bridge
// and Season Date -> ISO normalization.
import { CompetitionType as PrismaCompetitionType } from '@prisma/client';
import {
  toDomainCompetition,
  toDomainSeason,
  type CompetitionRow,
  type SeasonRow,
} from './competition.mapper';

describe('competition.mapper', () => {
  it('toDomainCompetition bridges the CompetitionType enum', () => {
    const row: CompetitionRow = {
      id: 'c1',
      name: 'UEFA Champions League',
      country: null,
      type: PrismaCompetitionType.UCL,
      tier: 1,
    };
    const competition = toDomainCompetition(row);
    expect(competition.type).toBe('ucl');
    expect(competition.toRef()).toEqual({
      id: 'c1',
      name: 'UEFA Champions League',
      country: null,
    });
  });

  it('toDomainSeason normalizes optional dates to ISO strings', () => {
    const row: SeasonRow = {
      id: 's1',
      competitionId: 'c1',
      label: '2025/26',
      startDate: new Date('2025-08-01T00:00:00.000Z'),
      endDate: null,
    };
    const season = toDomainSeason(row);
    expect(season.label).toBe('2025/26');
    expect(season.startDate).toBe('2025-08-01T00:00:00.000Z');
    expect(season.endDate).toBeNull();
  });
});
