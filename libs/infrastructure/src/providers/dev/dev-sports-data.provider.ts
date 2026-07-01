// libs/infrastructure/src/providers/dev/dev-sports-data.provider.ts
// SYNTHETIC DEV adapter for SportsDataProviderPort. Deterministic fixtures / recent form / H2H
// seeded by team ids — NO network, NOT real data (provenance DEV_SYNTHETIC). Swapped for a real,
// licensed adapter when DATA_SOURCE_MODE=live (Phase 7).
import { Injectable } from '@nestjs/common';
import type {
  SportsDataProviderPort,
  FixtureQuery,
  FixtureDto,
  TeamFormDto,
  H2HDto,
  Provenanced,
  TeamId,
  MatchId,
  IsoDateTime,
} from '@betvision/domain';
import { DEV_SYNTHETIC, devProvenanced, makeRng, intBetween } from './dev-synthetic';

const RESULTS = ['W', 'D', 'L'] as const;

@Injectable()
export class DevSportsDataProvider implements SportsDataProviderPort {
  async getFixture(query: FixtureQuery): Promise<Provenanced<FixtureDto>> {
    const rng = makeRng(`fixture|${query.text}`);
    const [homeName, awayName] = splitFixtureText(query.text);
    const fixture: FixtureDto = {
      externalId: `${DEV_SYNTHETIC}:fx:${slug(query.text)}`,
      home: { externalId: `${DEV_SYNTHETIC}:${slug(homeName)}`, name: homeName },
      away: { externalId: `${DEV_SYNTHETIC}:${slug(awayName)}`, name: awayName },
      competition: 'Synthetic Dev League',
      kickoffUtc: `2026-0${1 + intBetween(rng, 0, 2)}-15T18:00:00.000Z` as IsoDateTime,
      venue: 'Synthetic Arena',
    };
    return devProvenanced(fixture);
  }

  async getTeamForm(teamId: TeamId, last: number): Promise<Provenanced<TeamFormDto>> {
    const rng = makeRng(`form|${teamId}|${last}`);
    const results: Array<'W' | 'D' | 'L'> = [];
    const goalsFor: number[] = [];
    const goalsAgainst: number[] = [];
    for (let i = 0; i < last; i++) {
      results.push(RESULTS[intBetween(rng, 0, 2)]);
      goalsFor.push(intBetween(rng, 0, 3));
      goalsAgainst.push(intBetween(rng, 0, 3));
    }
    return devProvenanced<TeamFormDto>({ teamId, results, goalsFor, goalsAgainst });
  }

  async getHeadToHead(home: TeamId, away: TeamId): Promise<Provenanced<H2HDto>> {
    const rng = makeRng(`h2h|${home}|${away}`);
    const count = intBetween(rng, 3, 6);
    const meetings = Array.from({ length: count }, (_, i) => ({
      matchId: `${DEV_SYNTHETIC}:h2h:${home}:${away}:${i}` as MatchId,
      // Deterministic PAST dates (2023-2025) — always before any 2026 target kickoff.
      kickoffUtc: `202${3 + (i % 3)}-0${1 + (i % 8)}-10T18:00:00.000Z` as IsoDateTime,
      homeGoals: intBetween(rng, 0, 3),
      awayGoals: intBetween(rng, 0, 3),
    }));
    return devProvenanced<H2HDto>({ meetings });
  }
}

function splitFixtureText(text: string): [string, string] {
  const parts = text.split(/\s+vs\.?\s+|\s+-\s+/i);
  if (parts.length >= 2) return [parts[0].trim(), parts[1].trim()];
  return ['Synthetic Home FC', 'Synthetic Away FC'];
}

const slug = (value: string): string =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
