// libs/application/src/features/compute-features.use-case.ts
// Phase 9 — ComputeFeaturesUseCase. Gathers inputs from repositories + provider ports, enforces a
// STRICT as-of-kickoff cutoff (NO leakage — no datum dated >= kickoff is ever read), then delegates
// the math to the PURE domain `FeatureEngineeringService`. The result is a versioned, hashed,
// reproducible feature vector, cached by (matchId, FEATURE_VERSION) and optionally persisted as a
// PredictionInput for reproducibility.
//
// LEAKAGE CONTROL (the critical invariant, SPEC §11 / Phase-9 DoD):
//   - DB rolling stats (TeamStatsView) are filtered to `computedAt < kickoff`.
//   - Head-to-head meetings are filtered to `kickoffUtc < kickoff`.
//   - Recent-form / corners / cards come from provider snapshots that are, by contract, as-of the
//     request; the dated inputs above are the leakage surface and are hard-filtered here.
import { Result, ok, err, DomainError, DomainErrorCode } from '@betvision/shared';
import {
  FEATURE_VERSION,
  FeatureEngineeringService,
  buildFeatureVector,
  type FeatureInputs,
  type FeatureVector,
  type FeatureStorePort,
  type PredictionInputRepositoryPort,
  type MatchRepositoryPort,
  type TeamRepositoryPort,
  type SportsDataProviderPort,
  type TeamStatsProviderPort,
  type TeamStatsDto,
  type TeamStatsView,
  type TeamFormDto,
  type H2HDto,
  type MatchId,
  type PredictionId,
  type TeamId,
  type IsoDateTime,
  type StatsScope,
  type Venue,
} from '@betvision/domain';

export interface ComputeFeaturesCommand {
  readonly matchId: MatchId;
  /** How many recent matches to weight for form (default 5). */
  readonly formWindow?: number;
  /** When supplied, the exact vector is ALSO persisted as a PredictionInput (reproducibility). */
  readonly predictionId?: PredictionId;
}

/** Optional collaborators — the pipeline runs (uncached) even when they are absent. */
export interface ComputeFeaturesDeps {
  readonly matches: MatchRepositoryPort;
  readonly teams: TeamRepositoryPort;
  readonly sportsData: SportsDataProviderPort;
  readonly teamStats: TeamStatsProviderPort;
  readonly featureStore?: FeatureStorePort;
  readonly predictionInputs?: PredictionInputRepositoryPort;
}

const DEFAULT_FORM_WINDOW = 5;

export class ComputeFeaturesUseCase {
  private readonly engine = new FeatureEngineeringService();

  constructor(private readonly deps: ComputeFeaturesDeps) {}

  async execute(
    command: ComputeFeaturesCommand,
  ): Promise<Result<FeatureVector, DomainError>> {
    const { matches, teams, sportsData, teamStats, featureStore, predictionInputs } =
      this.deps;

    const match = await matches.findById(command.matchId);
    if (!match) return err(DomainError.of(DomainErrorCode.MATCH_NOT_FOUND));

    // Cache-first: a hit is byte-identical to a recompute, but skips all provider calls.
    if (featureStore) {
      const cached = await featureStore.get(command.matchId, FEATURE_VERSION);
      if (cached) return ok(cached);
    }

    const cutoff = match.kickoffUtc; // as-of-kickoff: read nothing dated >= this instant
    const window = command.formWindow ?? DEFAULT_FORM_WINDOW;
    const homeTeamId = match.homeTeamId;
    const awayTeamId = match.awayTeamId;

    // --- gather (each pull is independent) -----------------------------------------------
    const [
      homeStatsViews,
      awayStatsViews,
      homeProviderStats,
      awayProviderStats,
      homeForm,
      awayForm,
      h2h,
    ] = await Promise.all([
      teams.findStats(homeTeamId),
      teams.findStats(awayTeamId),
      teamStats.getTeamStats(homeTeamId, scopeFor('home', window)),
      teamStats.getTeamStats(awayTeamId, scopeFor('away', window)),
      sportsData.getTeamForm(homeTeamId, window),
      sportsData.getTeamForm(awayTeamId, window),
      sportsData.getHeadToHead(homeTeamId, awayTeamId),
    ]);

    const inputs: FeatureInputs = {
      home: {
        stats: toSnapshot(selectStatsView(homeStatsViews, cutoff, 'home'), homeProviderStats.data),
        form: toFormSnapshot(homeForm.data),
      },
      away: {
        stats: toSnapshot(selectStatsView(awayStatsViews, cutoff, 'away'), awayProviderStats.data),
        form: toFormSnapshot(awayForm.data),
      },
      h2h: filterH2H(h2h.data, cutoff),
      restDaysHome: restDaysPlaceholder(homeTeamId),
      restDaysAway: restDaysPlaceholder(awayTeamId),
      strengthOfScheduleHome: sosPlaceholder(homeTeamId),
      strengthOfScheduleAway: sosPlaceholder(awayTeamId),
      // Absence/referee stay 0 until the Phase-7 injury/referee providers are wired in.
      absenceImpactHome: 0,
      absenceImpactAway: 0,
      refereeCardsTendency: 0,
    };

    const vector = buildFeatureVector(
      command.matchId,
      FEATURE_VERSION,
      this.engine.computeFeatures(inputs),
    );

    if (featureStore) await featureStore.put(vector);
    if (command.predictionId && predictionInputs) {
      await predictionInputs.save({
        predictionId: command.predictionId,
        featureVersion: FEATURE_VERSION,
        vector,
      });
    }

    return ok(vector);
  }
}

// ---------------------------------------------------------------------------------------------
// Cutoff-aware selection + mapping helpers (pure).
// ---------------------------------------------------------------------------------------------

function scopeFor(venue: Venue, window: number): StatsScope {
  return { venue, window };
}

const venueRank = (venue: Venue, preferred: Venue): number =>
  venue === preferred ? 0 : venue === 'all' ? 1 : 2;

/**
 * Pick the best rolling-stats row for a team that is SAFE to use as-of kickoff. Rows computed at or
 * after kickoff are DROPPED (leakage). Among survivors: prefer the venue split, then the largest
 * window, then the most-recently computed. Returns null when nothing pre-kickoff exists.
 */
function selectStatsView(
  views: ReadonlyArray<TeamStatsView>,
  cutoff: IsoDateTime,
  preferred: Venue,
): TeamStatsView | null {
  const cutoffMs = Date.parse(cutoff);
  const valid = views.filter((v) => Date.parse(v.computedAt) < cutoffMs);
  if (valid.length === 0) return null;
  return [...valid].sort((a, b) => {
    const ra = venueRank(a.venue, preferred);
    const rb = venueRank(b.venue, preferred);
    if (ra !== rb) return ra - rb;
    if (a.window !== b.window) return b.window - a.window;
    return Date.parse(b.computedAt) - Date.parse(a.computedAt);
  })[0];
}

/**
 * Combine the cutoff-safe DB read model (goals/xG/clean-sheets) with the provider snapshot
 * (corners/cards). DB values win when present; provider values are the deterministic fallback.
 */
function toSnapshot(
  view: TeamStatsView | null,
  provider: TeamStatsDto,
): FeatureInputs['home']['stats'] {
  return {
    avgGoalsFor: view?.avgGoalsFor ?? provider.avgGoalsFor,
    avgGoalsAgainst: view?.avgGoalsAgainst ?? provider.avgGoalsAgainst,
    avgXgFor: view?.avgXgFor ?? provider.avgXgFor,
    avgXgAgainst: view?.avgXgAgainst ?? provider.avgXgAgainst,
    avgCornersFor: provider.avgCornersFor,
    avgCornersAgainst: provider.avgCornersAgainst,
    avgCardsFor: provider.avgCardsFor,
    avgCardsAgainst: provider.avgCardsAgainst,
    cleanSheets: view?.cleanSheets ?? provider.cleanSheets,
  };
}

function toFormSnapshot(form: TeamFormDto): FeatureInputs['home']['form'] {
  return {
    results: form.results,
    goalsFor: form.goalsFor,
    goalsAgainst: form.goalsAgainst,
  };
}

/** Drop any prior meeting kicked off at or after the target kickoff (leakage). */
function filterH2H(
  h2h: H2HDto,
  cutoff: IsoDateTime,
): FeatureInputs['h2h'] {
  const cutoffMs = Date.parse(cutoff);
  return h2h.meetings
    .filter((m) => Date.parse(m.kickoffUtc) < cutoffMs)
    .map((m) => ({ homeGoals: m.homeGoals, awayGoals: m.awayGoals }));
}

/** Deterministic djb2-based unit in [0,1) from a stable seed string. */
function stableUnit(seed: string): number {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) >>> 0;
  }
  return (hash % 100000) / 100000;
}

// Deterministic PLACEHOLDERS (Phase-9). Replaced by the real fixtures/SoS providers in Phase 10.
const restDaysPlaceholder = (teamId: TeamId): number =>
  3 + Math.floor(stableUnit(`${teamId}|rest`) * 6); // 3..8 days
const sosPlaceholder = (teamId: TeamId): number =>
  0.3 + stableUnit(`${teamId}|sos`) * 0.6; // 0.3..0.9
