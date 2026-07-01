// Contract tests: prove the match/team/competition response shapes validate against their
// zod schemas (Phase 6 DoD: "Contract tests validate responses against zod schemas").
import {
  matchSearchResponseSchema,
  matchDetailDtoSchema,
  matchSearchQuerySchema,
} from './matches';
import { teamSearchResponseSchema, teamStatsDtoSchema } from './teams';
import { competitionListResponseSchema, seasonListResponseSchema } from './competitions';

describe('match contracts', () => {
  it('accepts a ranked MatchSearchResponse', () => {
    const parsed = matchSearchResponseSchema.safeParse({
      query: 'Real Madrid vs Barcelona',
      candidates: [
        {
          matchId: 'm1',
          home: { id: 't1', name: 'Real Madrid', shortName: 'RMA', crestUrl: null },
          away: { id: 't2', name: 'Barcelona', shortName: 'FCB', crestUrl: null },
          competition: { id: 'c1', name: 'La Liga', country: 'Spain' },
          kickoffUtc: '2026-01-02T20:00:00.000Z',
          status: 'scheduled',
          confidence: 0.92,
        },
      ],
      suggestions: [],
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts an empty NO_MATCH response with suggestions', () => {
    const parsed = matchSearchResponseSchema.safeParse({
      query: 'nonsense',
      candidates: [],
      suggestions: ['Real Madrid', 'Barcelona'],
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects a confidence outside [0,1]', () => {
    const parsed = matchSearchResponseSchema.safeParse({
      query: 'x',
      candidates: [
        {
          matchId: 'm1',
          home: { id: 't1', name: 'A', shortName: null, crestUrl: null },
          away: { id: 't2', name: 'B', shortName: null, crestUrl: null },
          competition: { id: 'c1', name: 'C', country: null },
          kickoffUtc: '2026-01-02T20:00:00.000Z',
          status: 'scheduled',
          confidence: 1.5,
        },
      ],
      suggestions: [],
    });
    expect(parsed.success).toBe(false);
  });

  it('requires a non-empty q on the search query', () => {
    expect(matchSearchQuerySchema.safeParse({ q: '' }).success).toBe(false);
    expect(matchSearchQuerySchema.safeParse({ q: 'Real Madrid' }).success).toBe(true);
  });

  it('validates a full MatchDetailDto with the odds-summary placeholder', () => {
    const parsed = matchDetailDtoSchema.safeParse({
      id: 'm1',
      home: { id: 't1', name: 'Real Madrid', shortName: 'RMA', crestUrl: null },
      away: { id: 't2', name: 'Barcelona', shortName: 'FCB', crestUrl: null },
      competition: { id: 'c1', name: 'La Liga', country: 'Spain' },
      seasonId: 's1',
      seasonLabel: '2025/26',
      kickoffUtc: '2026-01-02T20:00:00.000Z',
      status: 'finished',
      venue: 'Bernabéu',
      round: '17',
      importance: null,
      referee: { id: 'r1', name: 'Mateu Lahoz' },
      stats: null,
      oddsSummary: { available: false },
    });
    expect(parsed.success).toBe(true);
  });
});

describe('team + competition contracts', () => {
  it('accepts a TeamSearchResponse', () => {
    expect(
      teamSearchResponseSchema.safeParse({
        query: 'Madrid',
        teams: [{ id: 't1', name: 'Real Madrid', shortName: 'RMA', crestUrl: null }],
      }).success,
    ).toBe(true);
  });

  it('accepts an empty TeamStatsDto (typed stub)', () => {
    expect(teamStatsDtoSchema.safeParse({ teamId: 't1', stats: [] }).success).toBe(true);
  });

  it('accepts competition + season list responses', () => {
    expect(
      competitionListResponseSchema.safeParse({
        competitions: [{ id: 'c1', name: 'La Liga', country: 'Spain', type: 'league', tier: 1 }],
      }).success,
    ).toBe(true);
    expect(
      seasonListResponseSchema.safeParse({
        competitionId: 'c1',
        seasons: [
          { id: 's1', competitionId: 'c1', label: '2025/26', startDate: null, endDate: null },
        ],
      }).success,
    ).toBe(true);
  });
});
