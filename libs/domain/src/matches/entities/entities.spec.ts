import { Team } from './team.entity';
import { Competition } from './competition.entity';
import { Season } from './season.entity';
import { Player } from './player.entity';
import type {
  TeamId,
  CompetitionId,
  SeasonId,
  PlayerId,
} from '../../ports/shared.dto';
import { DomainErrorCode, isErr, unwrap } from '@betvision/shared';

describe('Team', () => {
  it('creates a valid team and exposes a ref projection', () => {
    const team = unwrap(
      Team.create({
        id: 't1' as TeamId,
        name: 'Real Madrid',
        shortName: 'RMA',
        country: 'Spain',
        crestUrl: null,
        eloRating: 2000,
      }),
    );
    expect(team.name).toBe('Real Madrid');
    expect(team.toRef()).toEqual({
      id: 't1',
      name: 'Real Madrid',
      shortName: 'RMA',
      crestUrl: null,
    });
  });

  it('rejects a blank name', () => {
    const result = Team.create({
      id: 't1' as TeamId,
      name: '  ',
      shortName: null,
      country: null,
      crestUrl: null,
      eloRating: null,
    });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error.code).toBe(DomainErrorCode.TEAM_NAME_REQUIRED);
  });
});

describe('Competition', () => {
  it('creates a valid competition and exposes a ref projection', () => {
    const competition = unwrap(
      Competition.create({
        id: 'c1' as CompetitionId,
        name: 'La Liga',
        country: 'Spain',
        type: 'league',
        tier: 1,
      }),
    );
    expect(competition.type).toBe('league');
    expect(competition.toRef()).toEqual({ id: 'c1', name: 'La Liga', country: 'Spain' });
  });

  it('rejects a blank name', () => {
    const result = Competition.create({
      id: 'c1' as CompetitionId,
      name: '',
      country: null,
      type: 'cup',
      tier: null,
    });
    if (isErr(result)) {
      expect(result.error.code).toBe(DomainErrorCode.COMPETITION_NAME_REQUIRED);
    } else {
      throw new Error('expected error');
    }
  });
});

describe('Season', () => {
  it('creates a valid season', () => {
    const season = unwrap(
      Season.create({
        id: 's1' as SeasonId,
        competitionId: 'c1' as CompetitionId,
        label: '2025/26',
        startDate: null,
        endDate: null,
      }),
    );
    expect(season.label).toBe('2025/26');
    expect(season.competitionId).toBe('c1');
  });

  it('rejects a blank label', () => {
    const result = Season.create({
      id: 's1' as SeasonId,
      competitionId: 'c1' as CompetitionId,
      label: '   ',
      startDate: null,
      endDate: null,
    });
    if (isErr(result)) {
      expect(result.error.code).toBe(DomainErrorCode.SEASON_LABEL_REQUIRED);
    } else {
      throw new Error('expected error');
    }
  });
});

describe('Player', () => {
  it('creates a valid player', () => {
    const player = unwrap(
      Player.create({
        id: 'p1' as PlayerId,
        teamId: 't1' as TeamId,
        name: 'Vinícius Júnior',
        position: 'FWD',
        nationality: 'Brazil',
      }),
    );
    expect(player.name).toBe('Vinícius Júnior');
    expect(player.teamId).toBe('t1');
  });

  it('rejects a blank name', () => {
    const result = Player.create({
      id: 'p1' as PlayerId,
      teamId: null,
      name: '',
      position: null,
      nationality: null,
    });
    if (isErr(result)) {
      expect(result.error.code).toBe(DomainErrorCode.PLAYER_NAME_REQUIRED);
    } else {
      throw new Error('expected error');
    }
  });
});
