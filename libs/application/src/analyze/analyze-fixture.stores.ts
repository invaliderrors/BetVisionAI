// libs/application/src/analyze/analyze-fixture.stores.ts
// Request-scoped, in-memory port implementations seeded from a FixtureResearchBundle. They let the
// EXISTING feature/prediction/value/report use cases run UNCHANGED over AI-ESTIMATED inputs without
// touching the database — the research fixture is synthetic (it is not a licensed feed and has no
// row in Postgres), so persisting it through the real repos is a follow-up (see AnalyzeFixtureUseCase
// header + the reported domain-port gaps). PURE: only domain/shared types, no framework, no IO.
import { unwrap } from '@betvision/shared';
import {
  Match,
  canonicalSelection,
  LLM_RESEARCH_PROVENANCE,
  type FixtureResearchBundle,
  type MatchRepositoryPort,
  type MatchDetailView,
  type MatchCandidate,
  type TeamRepositoryPort,
  type TeamSearchResult,
  type TeamStatsView,
  type SportsDataProviderPort,
  type FixtureDto,
  type TeamFormDto,
  type H2HDto,
  type TeamStatsProviderPort,
  type TeamStatsDto,
  type OddsRepositoryPort,
  type OddsSnapshotRecord,
  type PredictionRepositoryPort,
  type PredictionRecord,
  type PredictionResultRepositoryPort,
  type PredictionResultRecord,
  type PredictionInputRepositoryPort,
  type PredictionInputRecord,
  type RecommendationRepositoryPort,
  type RecommendationRecord,
  type AnalysisReportRepositoryPort,
  type AnalysisReportRecord,
  type CachePort,
  type Provenanced,
  type DataProvenance,
  type MatchId,
  type TeamId,
  type CompetitionId,
  type SeasonId,
  type PredictionId,
  type ReportId,
  type Locale,
  type MarketKey,
  type IsoDateTime,
} from '@betvision/domain';

const DAY_MS = 86_400_000;
const RESEARCH_COMPETITION_ID = 'llm-research:competition' as CompetitionId;
const RESEARCH_SEASON_ID = 'llm-research:season' as SeasonId;

/** The identifiers the use case assigns to the research fixture (branded, deterministic per run). */
export interface FixtureIds {
  readonly homeTeamId: TeamId;
  readonly awayTeamId: TeamId;
  readonly matchId: MatchId;
}

function researchProvenance(bundle: FixtureResearchBundle): DataProvenance {
  return bundle.provenance;
}

function provenanced<T>(bundle: FixtureResearchBundle, data: T): Provenanced<T> {
  return { data, provenance: researchProvenance(bundle) };
}

/** Match repo seeded with the single research fixture (aggregate + detail view for the label). */
class BundleMatchRepository implements MatchRepositoryPort {
  private match: Match;
  private readonly detail: MatchDetailView;

  constructor(
    private readonly bundle: FixtureResearchBundle,
    private readonly ids: FixtureIds,
    private readonly kickoffUtc: IsoDateTime,
  ) {
    this.match = unwrap(
      Match.create({
        id: ids.matchId,
        competitionId: RESEARCH_COMPETITION_ID,
        seasonId: RESEARCH_SEASON_ID,
        homeTeamId: ids.homeTeamId,
        awayTeamId: ids.awayTeamId,
        kickoffUtc,
        status: 'scheduled',
        venue: null,
        round: null,
        importance: null,
      }),
    );
    this.detail = {
      matchId: ids.matchId,
      home: { id: ids.homeTeamId, name: bundle.home.name, shortName: null, crestUrl: null },
      away: { id: ids.awayTeamId, name: bundle.away.name, shortName: null, crestUrl: null },
      competition: {
        id: RESEARCH_COMPETITION_ID,
        name: bundle.competition ?? 'AI-estimated fixture',
        country: bundle.home.country,
      },
      seasonId: RESEARCH_SEASON_ID,
      seasonLabel: 'AI-estimated',
      kickoffUtc,
      status: 'scheduled',
      venue: null,
      round: null,
      importance: null,
      referee: null,
      stats: null,
    };
  }

  async findById(id: MatchId): Promise<Match | null> {
    return id === this.ids.matchId ? this.match : null;
  }

  async findDetailById(id: MatchId): Promise<MatchDetailView | null> {
    return id === this.ids.matchId ? this.detail : null;
  }

  async findByTeams(): Promise<MatchCandidate[]> {
    return [];
  }

  async save(match: Match): Promise<void> {
    this.match = match;
  }
}

/** Team repo returning NO stored rolling stats — forces the feature pipeline onto the research
 *  TeamStatsProvider snapshot (goals/xG/corners/cards all AI-estimated). */
class BundleTeamRepository implements TeamRepositoryPort {
  async findById(): Promise<null> {
    return null;
  }
  async searchByName(): Promise<TeamSearchResult[]> {
    return [];
  }
  async findStats(): Promise<TeamStatsView[]> {
    return [];
  }
}

/** SportsDataProvider backed by the research bundle (recent form + head-to-head estimates). */
class BundleSportsDataProvider implements SportsDataProviderPort {
  constructor(
    private readonly bundle: FixtureResearchBundle,
    private readonly ids: FixtureIds,
    private readonly kickoffUtc: IsoDateTime,
  ) {}

  async getFixture(): Promise<Provenanced<FixtureDto>> {
    const fixture: FixtureDto = {
      externalId: `${LLM_RESEARCH_PROVENANCE}:${this.ids.matchId}`,
      home: { externalId: this.ids.homeTeamId, name: this.bundle.home.name },
      away: { externalId: this.ids.awayTeamId, name: this.bundle.away.name },
      competition: this.bundle.competition ?? 'AI-estimated fixture',
      kickoffUtc: this.kickoffUtc,
    };
    return provenanced(this.bundle, fixture);
  }

  async getTeamForm(teamId: TeamId, last: number): Promise<Provenanced<TeamFormDto>> {
    const form = teamId === this.ids.homeTeamId ? this.bundle.homeForm : this.bundle.awayForm;
    const dto: TeamFormDto = {
      teamId,
      results: form.results.slice(0, last),
      goalsFor: form.goalsFor.slice(0, last),
      goalsAgainst: form.goalsAgainst.slice(0, last),
    };
    return provenanced(this.bundle, dto);
  }

  async getHeadToHead(home: TeamId): Promise<Provenanced<H2HDto>> {
    const base = Date.parse(this.kickoffUtc);
    // Synthesize deterministic PAST kickoff dates (well before the target) so the cutoff filter keeps
    // every researched meeting. Meetings are already from the current home team's perspective.
    const meetings = this.bundle.headToHead.meetings.map((m, i) => ({
      matchId: `${LLM_RESEARCH_PROVENANCE}:h2h:${home}:${i}` as MatchId,
      kickoffUtc: new Date(base - (i + 1) * 60 * DAY_MS).toISOString() as IsoDateTime,
      homeGoals: m.homeGoals,
      awayGoals: m.awayGoals,
    }));
    return provenanced(this.bundle, { meetings });
  }
}

/** TeamStatsProvider backed by the research bundle (rolling per-team averages, AI-estimated). */
class BundleTeamStatsProvider implements TeamStatsProviderPort {
  constructor(
    private readonly bundle: FixtureResearchBundle,
    private readonly ids: FixtureIds,
  ) {}

  async getTeamStats(teamId: TeamId): Promise<Provenanced<TeamStatsDto>> {
    const s = teamId === this.ids.homeTeamId ? this.bundle.homeStats : this.bundle.awayStats;
    const dto: TeamStatsDto = { teamId, ...s };
    return provenanced(this.bundle, dto);
  }
}

/** In-memory odds time-series seeded with the AI-estimated market prices. */
class InMemoryOddsRepository implements OddsRepositoryPort {
  private readonly snapshots: OddsSnapshotRecord[] = [];

  async findLatest(matchId: MatchId, markets?: MarketKey[]): Promise<OddsSnapshotRecord[]> {
    const rows = this.snapshots.filter(
      (s) => s.matchId === matchId && (!markets || markets.includes(s.market)),
    );
    const latest = new Map<string, OddsSnapshotRecord>();
    for (const row of rows) {
      const key = `${row.market}|${row.selection}`;
      const prev = latest.get(key);
      if (!prev || row.capturedAt > prev.capturedAt) latest.set(key, row);
    }
    return [...latest.values()];
  }

  async findMovement(
    matchId: MatchId,
    market: MarketKey,
    selection: string,
  ): Promise<OddsSnapshotRecord[]> {
    return this.snapshots.filter(
      (s) => s.matchId === matchId && s.market === market && s.selection === selection,
    );
  }

  async saveSnapshots(snapshots: ReadonlyArray<OddsSnapshotRecord>): Promise<void> {
    this.snapshots.push(...snapshots);
  }
}

class InMemoryPredictionRepository implements PredictionRepositoryPort {
  private readonly byId = new Map<string, PredictionRecord>();
  async save(record: PredictionRecord): Promise<void> {
    this.byId.set(record.id, record);
  }
  async findById(id: PredictionId): Promise<PredictionRecord | null> {
    return this.byId.get(id) ?? null;
  }
}

class InMemoryPredictionResultRepository implements PredictionResultRepositoryPort {
  private results: PredictionResultRecord[] = [];
  async saveMany(records: ReadonlyArray<PredictionResultRecord>): Promise<void> {
    // Idempotent upsert by (predictionId, market, selection): last write wins.
    const key = (r: PredictionResultRecord) => `${r.predictionId}|${r.market}|${r.selection}`;
    const merged = new Map(this.results.map((r) => [key(r), r]));
    for (const r of records) merged.set(key(r), r);
    this.results = [...merged.values()];
  }
  async findByPrediction(predictionId: PredictionId): Promise<PredictionResultRecord[]> {
    return this.results.filter((r) => r.predictionId === predictionId);
  }
}

class InMemoryPredictionInputRepository implements PredictionInputRepositoryPort {
  private readonly byId = new Map<string, PredictionInputRecord>();
  async save(record: PredictionInputRecord): Promise<void> {
    this.byId.set(record.predictionId, record);
  }
}

class InMemoryRecommendationRepository implements RecommendationRepositoryPort {
  private byAppetite = new Map<string, RecommendationRecord[]>();
  private readonly key = (predictionId: string, appetite: number) => `${predictionId}|${appetite}`;

  async replaceForPrediction(
    predictionId: PredictionId,
    riskAppetite: number,
    records: ReadonlyArray<RecommendationRecord>,
  ): Promise<void> {
    this.byAppetite.set(this.key(predictionId, riskAppetite), [...records]);
  }

  async findByPrediction(predictionId: PredictionId): Promise<RecommendationRecord[]> {
    const out: RecommendationRecord[] = [];
    for (const [k, recs] of this.byAppetite) {
      if (k.startsWith(`${predictionId}|`)) out.push(...recs);
    }
    return out;
  }
}

class InMemoryAnalysisReportRepository implements AnalysisReportRepositoryPort {
  readonly saved: AnalysisReportRecord[] = [];
  async save(record: AnalysisReportRecord): Promise<void> {
    this.saved.push(record);
  }
  async findById(id: ReportId): Promise<AnalysisReportRecord | null> {
    return this.saved.find((r) => r.id === id) ?? null;
  }
  async findLatest(predictionId: PredictionId, language: Locale): Promise<AnalysisReportRecord | null> {
    for (let i = this.saved.length - 1; i >= 0; i--) {
      const r = this.saved[i];
      if (r.predictionId === predictionId && r.language === language) return r;
    }
    return null;
  }
}

class NoopCache implements CachePort {
  async get<T>(): Promise<T | null> {
    return null;
  }
  async set(): Promise<void> {
    /* request-scoped analysis is not cached across requests */
  }
  async delete(): Promise<void> {
    /* no-op */
  }
}

/** The full set of request-scoped stores/providers the pipeline reads and writes. */
export interface AnalysisWorkspace {
  readonly matches: MatchRepositoryPort;
  readonly teams: TeamRepositoryPort;
  readonly sportsData: SportsDataProviderPort;
  readonly teamStats: TeamStatsProviderPort;
  readonly odds: OddsRepositoryPort;
  readonly predictions: PredictionRepositoryPort;
  readonly predictionResults: PredictionResultRepositoryPort;
  readonly predictionInputs: PredictionInputRepositoryPort;
  readonly recommendations: RecommendationRepositoryPort;
  readonly reports: AnalysisReportRepositoryPort;
  readonly cache: CachePort;
}

/** Deterministic pre-kickoff capture instant for the seeded odds (before the target kickoff). */
function oddsCapturedAt(kickoffUtc: IsoDateTime): IsoDateTime {
  return new Date(Date.parse(kickoffUtc) - DAY_MS).toISOString() as IsoDateTime;
}

/**
 * Build the request-scoped {@link AnalysisWorkspace} for a research bundle. Seeds the read side
 * (match/team/form/H2H/stats/odds) from the AI-estimated inputs and provides empty accumulators for
 * the prediction/value/report write side.
 */
export function buildAnalysisWorkspace(
  bundle: FixtureResearchBundle,
  ids: FixtureIds,
  kickoffUtc: IsoDateTime,
): AnalysisWorkspace {
  const odds = new InMemoryOddsRepository();
  const capturedAt = oddsCapturedAt(kickoffUtc);
  void odds.saveSnapshots(
    bundle.odds.map((o) => ({
      matchId: ids.matchId,
      bookmaker: `${LLM_RESEARCH_PROVENANCE}:market-consensus`,
      market: o.market,
      selection: canonicalSelection(o.market, o.selection),
      priceDecimal: o.priceDecimal,
      capturedAt,
    })),
  );

  return {
    matches: new BundleMatchRepository(bundle, ids, kickoffUtc),
    teams: new BundleTeamRepository(),
    sportsData: new BundleSportsDataProvider(bundle, ids, kickoffUtc),
    teamStats: new BundleTeamStatsProvider(bundle, ids),
    odds,
    predictions: new InMemoryPredictionRepository(),
    predictionResults: new InMemoryPredictionResultRepository(),
    predictionInputs: new InMemoryPredictionInputRepository(),
    recommendations: new InMemoryRecommendationRepository(),
    reports: new InMemoryAnalysisReportRepository(),
    cache: new NoopCache(),
  };
}
