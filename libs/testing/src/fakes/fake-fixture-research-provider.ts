// libs/testing/src/fakes/fake-fixture-research-provider.ts
// Deterministic, network-free FixtureResearchPort for hermetic use-case tests. Returns a canned
// research bundle (provenance LLM_RESEARCH) so AnalyzeFixtureUseCase tests never hit Anthropic.
import type {
  FixtureResearchPort,
  FixtureResearchQuery,
  FixtureResearchBundle,
  IsoDateTime,
} from '@betvision/domain';
import { LLM_RESEARCH_PROVENANCE } from '@betvision/domain';

/** A canned "Portugal vs Spain"-style bundle with clear positive edges for value detection. */
export function aFixtureResearchBundle(
  over: Partial<FixtureResearchBundle> = {},
): FixtureResearchBundle {
  return {
    query: 'Portugal vs Spain',
    home: { name: 'Portugal', country: 'Portugal' },
    away: { name: 'Spain', country: 'Spain' },
    competition: 'International Friendly',
    kickoffUtc: '2026-08-01T19:00:00.000Z' as IsoDateTime,
    homeForm: {
      results: ['W', 'W', 'D', 'W', 'L'],
      goalsFor: [3, 2, 1, 2, 0],
      goalsAgainst: [0, 1, 1, 0, 2],
    },
    awayForm: {
      results: ['W', 'D', 'W', 'W', 'D'],
      goalsFor: [2, 1, 3, 2, 1],
      goalsAgainst: [1, 1, 0, 1, 1],
    },
    homeStats: {
      avgGoalsFor: 2.0,
      avgGoalsAgainst: 0.8,
      avgXgFor: 1.9,
      avgXgAgainst: 0.9,
      avgCornersFor: 6.0,
      avgCornersAgainst: 4.0,
      avgCardsFor: 1.8,
      avgCardsAgainst: 2.0,
      cleanSheets: 6,
    },
    awayStats: {
      avgGoalsFor: 1.5,
      avgGoalsAgainst: 1.2,
      avgXgFor: 1.4,
      avgXgAgainst: 1.3,
      avgCornersFor: 5.0,
      avgCornersAgainst: 4.5,
      avgCardsFor: 1.6,
      avgCardsAgainst: 1.9,
      cleanSheets: 3,
    },
    headToHead: {
      meetings: [
        { homeGoals: 2, awayGoals: 1 },
        { homeGoals: 1, awayGoals: 1 },
        { homeGoals: 3, awayGoals: 0 },
        { homeGoals: 2, awayGoals: 2 },
      ],
      summary: 'Portugal have edged recent meetings, with goals at both ends.',
    },
    // Prices tuned so the model finds a LARGE edge on 1X2 HOME (clears the strict conservative
    // gate) but only SMALL edges on OVER / YES (in the balanced/aggressive band). Lower appetites
    // therefore surface fewer selections AND stake less — a visible risk-appetite difference.
    odds: [
      { market: '1X2', selection: 'HOME', priceDecimal: 3.1 },
      { market: '1X2', selection: 'DRAW', priceDecimal: 3.3 },
      { market: '1X2', selection: 'AWAY', priceDecimal: 2.6 },
      { market: 'OU_2_5', selection: 'OVER', priceDecimal: 1.9 },
      { market: 'OU_2_5', selection: 'UNDER', priceDecimal: 1.9 },
      { market: 'BTTS', selection: 'YES', priceDecimal: 1.9 },
      { market: 'BTTS', selection: 'NO', priceDecimal: 1.9 },
    ],
    sources: [
      { label: 'Fixture preview (fixture wire)', provider: LLM_RESEARCH_PROVENANCE, url: 'https://example.com/portugal-spain-preview' },
      { label: 'Recent form & xG digest', provider: LLM_RESEARCH_PROVENANCE, url: 'https://example.com/form-xg' },
    ],
    notes: 'Estimated from public info; lower confidence on exact xG.',
    provenance: {
      provider: LLM_RESEARCH_PROVENANCE,
      fetchedAt: '2026-07-30T12:00:00.000Z' as IsoDateTime,
      payloadHash: 'canned',
      ageMinutes: 0,
    },
    ...over,
  };
}

/** Canned FixtureResearchPort. Echoes the incoming query into the bundle; ignores the language. */
export class FakeFixtureResearchProvider implements FixtureResearchPort {
  readonly queries: FixtureResearchQuery[] = [];

  constructor(private readonly bundle: FixtureResearchBundle = aFixtureResearchBundle()) {}

  async research(query: FixtureResearchQuery): Promise<FixtureResearchBundle> {
    this.queries.push(query);
    return { ...this.bundle, query: query.query };
  }
}

/** A FixtureResearchPort that always throws — for the research-failure path. */
export class ThrowingFixtureResearchProvider implements FixtureResearchPort {
  constructor(private readonly message = 'research provider unreachable') {}
  async research(): Promise<FixtureResearchBundle> {
    throw new Error(this.message);
  }
}
