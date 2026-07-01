// libs/domain/src/features/feature-set.ts
// Phase 9 — Feature Engineering (domain core). PURE: no framework/vendor/node imports.
//
// This module owns the three things that MUST be identical everywhere the pipeline runs so
// that a feature vector is reproducible (SPEC NFR §4, Phase-9 DoD):
//   1. FEATURE_VERSION      — bump on ANY formula/shape change; it is part of the cache key.
//   2. canonicalisation      — stable key order + fixed numeric precision -> byte-identical JSON.
//   3. hashFeatures          — a deterministic content hash used as `inputSnapshotHash`.
//
// The `FeatureEngineeringService` is a pure function of already-gathered, already-cutoff-filtered
// inputs. Gathering the inputs (and enforcing the as-of-kickoff cutoff) is the use case's job in
// libs/application — the domain never touches ports, clocks, or providers.
import type { FeatureVector } from '../ports/feature-store.port';
import type { MatchId } from '../ports/shared.dto';

/** Feature-set version. Part of the cache key `(matchId, FEATURE_VERSION)`. Bump on formula change. */
export const FEATURE_VERSION = 'fv1';

/** Fixed decimal precision applied to every feature before hashing/storage (determinism). */
export const FEATURE_PRECISION = 6;

/**
 * Canonical, exhaustive list of feature keys in a STABLE order. The pipeline always emits
 * exactly these keys; adding/removing one is a formula change and REQUIRES a FEATURE_VERSION bump.
 */
export const FEATURE_KEYS = [
  // weighted recent form (recency-decayed), normalised to [0,1]
  'home_form_points',
  'away_form_points',
  // rolling goal rates derived from recent form
  'home_form_goals_for',
  'home_form_goals_against',
  'away_form_goals_for',
  'away_form_goals_against',
  // rolling season averages (home split = home team @home, away split = away team @away)
  'home_avg_goals_for',
  'home_avg_goals_against',
  'away_avg_goals_for',
  'away_avg_goals_against',
  'home_avg_xg_for',
  'home_avg_xg_against',
  'away_avg_xg_for',
  'away_avg_xg_against',
  'home_avg_corners_for',
  'home_avg_corners_against',
  'away_avg_corners_for',
  'away_avg_corners_against',
  'home_avg_cards_for',
  'home_avg_cards_against',
  'away_avg_cards_for',
  'away_avg_cards_against',
  'home_clean_sheets',
  'away_clean_sheets',
  // home/away split differentials (attack/defence edges)
  'attack_strength_diff',
  'defense_strength_diff',
  // head-to-head (cutoff-filtered upstream)
  'h2h_matches',
  'h2h_home_win_rate',
  'h2h_avg_total_goals',
  'h2h_home_goal_avg',
  'h2h_away_goal_avg',
  // strength of schedule (simplified placeholder — see notes on the service)
  'sos_home',
  'sos_away',
  // rest days since previous fixture
  'rest_days_home',
  'rest_days_away',
  // absence impact + referee tendency (Phase-9 placeholders pending Phase-7 real providers)
  'absence_impact_home',
  'absence_impact_away',
  'referee_cards_tendency',
] as const;

export type FeatureName = (typeof FEATURE_KEYS)[number];

/** A fully-populated feature map: every canonical key present, numbers only. */
export type FeatureMap = Record<FeatureName, number>;

// ---------------------------------------------------------------------------------------------
// Canonicalisation + deterministic hashing (pure).
// ---------------------------------------------------------------------------------------------

const roundFixed = (value: number): number =>
  Number.isFinite(value) ? Number(value.toFixed(FEATURE_PRECISION)) : 0;

/**
 * Produce a canonical copy of a feature map: keys sorted ascending, every value rounded to
 * FEATURE_PRECISION and non-finite values coerced to 0. Insertion order is the sorted order, so
 * `JSON.stringify` on the result is byte-stable across runs/machines.
 */
export function canonicalizeFeatures(
  features: Readonly<Record<string, number>>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of Object.keys(features).sort()) {
    out[key] = roundFixed(features[key]);
  }
  return out;
}

/** Stable canonical JSON string for a feature map (sorted keys, fixed precision). */
export function canonicalFeatureJson(
  features: Readonly<Record<string, number>>,
): string {
  return JSON.stringify(canonicalizeFeatures(features));
}

/** FNV-1a (32-bit) over a string -> zero-padded 8-hex. Pure, portable, no node `crypto`. */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Deterministic content hash of a feature vector (used as `inputSnapshotHash`). Two folds with
 * different salts widen the digest to 16 hex chars, keeping accidental collisions negligible while
 * staying dependency-free. Same (matchId, version, features) -> identical hash, always.
 */
export function hashFeatures(
  matchId: string,
  version: string,
  features: Readonly<Record<string, number>>,
): string {
  const canonical = `${matchId}|${version}|${canonicalFeatureJson(features)}`;
  return `${fnv1a(canonical)}${fnv1a(`bv:${canonical}`)}`;
}

/**
 * Assemble a canonical, hashed {@link FeatureVector}. The stored `features` are canonicalised
 * (sorted keys + fixed precision) and `snapshotHash` is the deterministic content hash, so the
 * same `(matchId, version, features)` always produces a BYTE-IDENTICAL vector.
 */
export function buildFeatureVector(
  matchId: MatchId,
  version: string,
  features: Readonly<Record<string, number>>,
): FeatureVector {
  return {
    matchId,
    version,
    features: canonicalizeFeatures(features),
    snapshotHash: hashFeatures(matchId, version, features),
  };
}

// ---------------------------------------------------------------------------------------------
// Pure feature computation.
// ---------------------------------------------------------------------------------------------

/** Rolling team stats snapshot (already selected for the correct scope + cutoff). */
export interface TeamStatsSnapshot {
  readonly avgGoalsFor: number;
  readonly avgGoalsAgainst: number;
  readonly avgXgFor: number;
  readonly avgXgAgainst: number;
  readonly avgCornersFor: number;
  readonly avgCornersAgainst: number;
  readonly avgCardsFor: number;
  readonly avgCardsAgainst: number;
  readonly cleanSheets: number;
}

/** Recent-form snapshot; arrays are MOST-RECENT-FIRST and already cutoff-filtered. */
export interface FormSnapshot {
  readonly results: ReadonlyArray<'W' | 'D' | 'L'>;
  readonly goalsFor: ReadonlyArray<number>;
  readonly goalsAgainst: ReadonlyArray<number>;
}

/** A single prior meeting (already filtered to kickoff < target-kickoff by the use case). */
export interface H2HMeetingInput {
  readonly homeGoals: number;
  readonly awayGoals: number;
}

/**
 * All inputs the pure feature builder needs. The use case is responsible for gathering these from
 * repositories/providers AND for the leakage cutoff (no datum dated >= kickoff reaches here).
 */
export interface FeatureInputs {
  readonly home: { readonly stats: TeamStatsSnapshot; readonly form: FormSnapshot };
  readonly away: { readonly stats: TeamStatsSnapshot; readonly form: FormSnapshot };
  readonly h2h: ReadonlyArray<H2HMeetingInput>;
  readonly restDaysHome: number;
  readonly restDaysAway: number;
  readonly strengthOfScheduleHome: number;
  readonly strengthOfScheduleAway: number;
  // Placeholders — deterministic but not yet sourced from real providers (Phase 7/10).
  readonly absenceImpactHome: number;
  readonly absenceImpactAway: number;
  readonly refereeCardsTendency: number;
}

const RESULT_POINTS: Readonly<Record<'W' | 'D' | 'L', number>> = { W: 1, D: 0.5, L: 0 };
const FORM_DECAY = 0.8; // recency weight: most-recent match weighted highest

/** Recency-weighted mean of a numeric series (most-recent-first). Empty series -> 0. */
function weightedMean(values: ReadonlyArray<number>): number {
  let weightedSum = 0;
  let weightTotal = 0;
  for (let i = 0; i < values.length; i++) {
    const weight = FORM_DECAY ** i;
    weightedSum += weight * values[i];
    weightTotal += weight;
  }
  return weightTotal === 0 ? 0 : weightedSum / weightTotal;
}

/** Recency-weighted form points in [0,1] (W=1, D=0.5, L=0). Empty form -> 0. */
function weightedFormPoints(results: ReadonlyArray<'W' | 'D' | 'L'>): number {
  return weightedMean(results.map((r) => RESULT_POINTS[r]));
}

/**
 * Pure, deterministic feature builder. Given identical `FeatureInputs`, returns an identical
 * `FeatureMap`. Contains NO I/O, NO clock, NO randomness — every value is a function of the inputs.
 *
 * NOTE on placeholders: `strengthOfSchedule*`, `absenceImpact*` and `refereeCardsTendency` are
 * accepted as inputs and passed straight through. They are wired as deterministic placeholders in
 * the use case today; when the Phase-7 injury/referee/fixture providers land, only the use case
 * (the gatherer) changes — this contract and FEATURE_VERSION stay stable if the shape is unchanged.
 */
export class FeatureEngineeringService {
  computeFeatures(inputs: FeatureInputs): FeatureMap {
    const { home, away, h2h } = inputs;

    const h2hCount = h2h.length;
    const h2hHomeWins = h2h.filter((m) => m.homeGoals > m.awayGoals).length;
    const h2hHomeGoals = h2h.reduce((sum, m) => sum + m.homeGoals, 0);
    const h2hAwayGoals = h2h.reduce((sum, m) => sum + m.awayGoals, 0);

    return {
      home_form_points: weightedFormPoints(home.form.results),
      away_form_points: weightedFormPoints(away.form.results),

      home_form_goals_for: weightedMean(home.form.goalsFor),
      home_form_goals_against: weightedMean(home.form.goalsAgainst),
      away_form_goals_for: weightedMean(away.form.goalsFor),
      away_form_goals_against: weightedMean(away.form.goalsAgainst),

      home_avg_goals_for: home.stats.avgGoalsFor,
      home_avg_goals_against: home.stats.avgGoalsAgainst,
      away_avg_goals_for: away.stats.avgGoalsFor,
      away_avg_goals_against: away.stats.avgGoalsAgainst,
      home_avg_xg_for: home.stats.avgXgFor,
      home_avg_xg_against: home.stats.avgXgAgainst,
      away_avg_xg_for: away.stats.avgXgFor,
      away_avg_xg_against: away.stats.avgXgAgainst,
      home_avg_corners_for: home.stats.avgCornersFor,
      home_avg_corners_against: home.stats.avgCornersAgainst,
      away_avg_corners_for: away.stats.avgCornersFor,
      away_avg_corners_against: away.stats.avgCornersAgainst,
      home_avg_cards_for: home.stats.avgCardsFor,
      home_avg_cards_against: home.stats.avgCardsAgainst,
      away_avg_cards_for: away.stats.avgCardsFor,
      away_avg_cards_against: away.stats.avgCardsAgainst,
      home_clean_sheets: home.stats.cleanSheets,
      away_clean_sheets: away.stats.cleanSheets,

      attack_strength_diff: home.stats.avgGoalsFor - away.stats.avgGoalsFor,
      defense_strength_diff: away.stats.avgGoalsAgainst - home.stats.avgGoalsAgainst,

      h2h_matches: h2hCount,
      h2h_home_win_rate: h2hCount === 0 ? 0 : h2hHomeWins / h2hCount,
      h2h_avg_total_goals: h2hCount === 0 ? 0 : (h2hHomeGoals + h2hAwayGoals) / h2hCount,
      h2h_home_goal_avg: h2hCount === 0 ? 0 : h2hHomeGoals / h2hCount,
      h2h_away_goal_avg: h2hCount === 0 ? 0 : h2hAwayGoals / h2hCount,

      sos_home: inputs.strengthOfScheduleHome,
      sos_away: inputs.strengthOfScheduleAway,

      rest_days_home: inputs.restDaysHome,
      rest_days_away: inputs.restDaysAway,

      absence_impact_home: inputs.absenceImpactHome,
      absence_impact_away: inputs.absenceImpactAway,
      referee_cards_tendency: inputs.refereeCardsTendency,
    };
  }
}
