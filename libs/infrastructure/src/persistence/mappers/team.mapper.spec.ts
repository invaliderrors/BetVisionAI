// Pure unit tests for the team mapper — no DB, no framework. Proves persistence -> domain
// translation for the Team aggregate + the TeamStats projection (enum bridge + Date -> ISO).
import { StatVenue } from '@prisma/client';
import {
  toDomainTeam,
  toTeamStatsView,
  type TeamRow,
  type TeamStatsRow,
} from './team.mapper';

describe('team.mapper', () => {
  it('toDomainTeam maps a row to a Team aggregate', () => {
    const row: TeamRow = {
      id: 't1',
      name: 'Real Madrid',
      shortName: 'RMA',
      country: 'Spain',
      crestUrl: null,
      eloRating: 2000,
    };
    const team = toDomainTeam(row);
    expect(team.id).toBe('t1');
    expect(team.name).toBe('Real Madrid');
    expect(team.eloRating).toBe(2000);
    expect(team.toRef()).toEqual({
      id: 't1',
      name: 'Real Madrid',
      shortName: 'RMA',
      crestUrl: null,
    });
  });

  it('toTeamStatsView bridges the StatVenue enum and normalizes computedAt to ISO', () => {
    const row: TeamStatsRow = {
      seasonId: 's1',
      venue: StatVenue.HOME,
      window: 5,
      avgGoalsFor: 2.1,
      avgGoalsAgainst: 0.8,
      avgXgFor: 1.9,
      avgXgAgainst: 0.7,
      cleanSheets: 3,
      form: 'WWDWL',
      computedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const view = toTeamStatsView(row);
    expect(view.venue).toBe('home');
    expect(view.window).toBe(5);
    expect(view.computedAt).toBe('2026-01-01T00:00:00.000Z');
  });
});
