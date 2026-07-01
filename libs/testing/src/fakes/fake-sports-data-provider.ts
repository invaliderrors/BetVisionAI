// libs/testing/src/fakes/fake-sports-data-provider.ts
import type {
  SportsDataProviderPort,
  FixtureDto,
  TeamFormDto,
  H2HDto,
  Provenanced,
  TeamId,
} from '@betvision/domain';
import { provenanced } from './provenance';

const PROVIDER = 'fake-sports-data';

const DEFAULT_FIXTURE: FixtureDto = {
  externalId: 'fx-1',
  home: { externalId: 't-home', name: 'Home FC' },
  away: { externalId: 't-away', name: 'Away FC' },
  competition: 'Test League',
  kickoffUtc: '2026-01-02T18:00:00.000Z',
};

/**
 * Deterministic fixtures/form/H2H; overridable via `seed*`.
 * Implementations intentionally omit unused parameters (allowed by TS).
 */
export class FakeSportsDataProvider implements SportsDataProviderPort {
  private fixture: FixtureDto = DEFAULT_FIXTURE;
  private form: TeamFormDto | null = null;
  private h2h: H2HDto = { meetings: [] };

  seedFixture(fixture: FixtureDto): this {
    this.fixture = fixture;
    return this;
  }
  seedForm(form: TeamFormDto): this {
    this.form = form;
    return this;
  }
  seedHeadToHead(h2h: H2HDto): this {
    this.h2h = h2h;
    return this;
  }

  async getFixture(): Promise<Provenanced<FixtureDto>> {
    return provenanced(PROVIDER, this.fixture);
  }

  async getTeamForm(teamId: TeamId, last: number): Promise<Provenanced<TeamFormDto>> {
    const form: TeamFormDto = this.form ?? {
      teamId,
      results: Array.from({ length: last }, () => 'W' as const),
      goalsFor: Array.from({ length: last }, () => 1),
      goalsAgainst: Array.from({ length: last }, () => 0),
    };
    return provenanced(PROVIDER, form);
  }

  async getHeadToHead(): Promise<Provenanced<H2HDto>> {
    return provenanced(PROVIDER, this.h2h);
  }
}
