// libs/infrastructure/src/ai-analysis/dev-fixture-research.provider.ts
// DETERMINISTIC, no-network FixtureResearchPort used when DATA_SOURCE_MODE!=research (or no key). It
// lets POST /analyze boot and run offline in dev/test. Every value is SYNTHETIC placeholder data
// seeded by the query — clearly labelled provenance LLM_RESEARCH but NOT real research. Swapped for
// the AnthropicFixtureResearchProvider under DATA_SOURCE_MODE=research (see AnalyzeModule).
import { Injectable } from '@nestjs/common';
import type {
  FixtureResearchPort,
  FixtureResearchQuery,
  FixtureResearchBundle,
  ResearchFormEstimate,
  ResearchTeamStatsEstimate,
  ResearchOdds,
  SourceRef,
  MarketKey,
  IsoDateTime,
} from '@betvision/domain';
import { LLM_RESEARCH_PROVENANCE } from '@betvision/domain';
import { makeRng, between, intBetween } from '../providers/dev/dev-synthetic';

const RESULTS = ['W', 'D', 'L'] as const;

@Injectable()
export class DevFixtureResearchProvider implements FixtureResearchPort {
  async research(query: FixtureResearchQuery): Promise<FixtureResearchBundle> {
    const [homeName, awayName] = splitFixture(query.query);
    const homeSeed = makeRng(`research|home|${homeName}`);
    const awaySeed = makeRng(`research|away|${awayName}`);

    const bundle: FixtureResearchBundle = {
      query: query.query,
      home: { name: homeName, country: null },
      away: { name: awayName, country: null },
      competition: 'AI-estimated fixture (dev synthetic)',
      kickoffUtc: null,
      homeForm: form(homeSeed),
      awayForm: form(awaySeed),
      homeStats: stats(homeSeed),
      awayStats: stats(awaySeed),
      headToHead: {
        meetings: Array.from({ length: 4 }, () => ({
          homeGoals: intBetween(homeSeed, 0, 3),
          awayGoals: intBetween(awaySeed, 0, 3),
        })),
        summary:
          query.language === 'es'
            ? 'Historial sintético de desarrollo entre ambos equipos.'
            : 'Synthetic dev head-to-head summary between the two teams.',
      },
      odds: odds(makeRng(`research|odds|${query.query}`)),
      sources: SOURCES,
      notes:
        query.language === 'es'
          ? 'Datos sintéticos de desarrollo (sin red). No es investigación real.'
          : 'Deterministic dev-synthetic data (no network). Not real research.',
      provenance: {
        provider: LLM_RESEARCH_PROVENANCE,
        fetchedAt: '2026-01-01T00:00:00.000Z' as IsoDateTime,
        payloadHash: 'dev-synthetic',
        ageMinutes: 0,
      },
    };
    return bundle;
  }
}

const SOURCES: ReadonlyArray<SourceRef> = [
  { label: 'Dev synthetic research note', provider: LLM_RESEARCH_PROVENANCE, url: 'https://dev.local/research/stub' },
];

function form(rng: () => number): ResearchFormEstimate {
  const results: Array<'W' | 'D' | 'L'> = [];
  const goalsFor: number[] = [];
  const goalsAgainst: number[] = [];
  for (let i = 0; i < 5; i++) {
    results.push(RESULTS[intBetween(rng, 0, 2)]);
    goalsFor.push(intBetween(rng, 0, 3));
    goalsAgainst.push(intBetween(rng, 0, 3));
  }
  return { results, goalsFor, goalsAgainst };
}

function stats(rng: () => number): ResearchTeamStatsEstimate {
  return {
    avgGoalsFor: between(rng, 0.9, 2.4),
    avgGoalsAgainst: between(rng, 0.7, 2.0),
    avgXgFor: between(rng, 0.9, 2.2),
    avgXgAgainst: between(rng, 0.8, 1.9),
    avgCornersFor: between(rng, 3.5, 7.0),
    avgCornersAgainst: between(rng, 3.0, 6.0),
    avgCardsFor: between(rng, 1.0, 2.8),
    avgCardsAgainst: between(rng, 1.0, 2.8),
    cleanSheets: intBetween(rng, 0, 6),
  };
}

function odds(rng: () => number): ResearchOdds[] {
  const pairs: ReadonlyArray<{ market: MarketKey; selection: string }> = [
    { market: '1X2', selection: 'HOME' },
    { market: '1X2', selection: 'DRAW' },
    { market: '1X2', selection: 'AWAY' },
    { market: 'OU_2_5', selection: 'OVER' },
    { market: 'OU_2_5', selection: 'UNDER' },
    { market: 'BTTS', selection: 'YES' },
    { market: 'BTTS', selection: 'NO' },
  ];
  return pairs.map((p) => ({ ...p, priceDecimal: between(rng, 1.5, 4.5, 2) }));
}

function splitFixture(text: string): [string, string] {
  const parts = text.split(/\s+vs\.?\s+|\s+v\.?\s+|\s+-\s+/i).map((s) => s.trim());
  if (parts.length >= 2 && parts[0] && parts[1]) return [parts[0], parts[1]];
  return [text.trim() || 'Home', 'Away'];
}
