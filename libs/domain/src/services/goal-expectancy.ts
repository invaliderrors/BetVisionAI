// libs/domain/src/services/goal-expectancy.ts
// Phase 10: derive expected goal rates (lambda_home, lambda_away) from the engineered feature
// vector, ready to feed the Poisson/Dixon-Coles score matrix. PURE + deterministic.
//
// Approach (SPEC §13 "expected goal rates from Elo + form + xG"):
//   1. Blend each side's ATTACK and DEFENCE from average goals, xG and recent-form goal rates.
//   2. Expected home goals ≈ (home attack + away defence)/2; symmetric for away.
//   3. Apply a home-advantage multiplier.
//   4. Nudge toward the Elo-favoured side via an `expectedHome` (0.5 = neutral) adjustment.
//   5. Clamp to a sane [min,max] so degenerate features never produce a pathological matrix.

/** Tunable goal-expectancy weights. Exposed so Phase-17 backtesting can refit them. */
export const GOAL_EXPECTANCY_DEFAULTS = {
  /** Blend weights for attack/defence signals; must sum to 1. */
  avgGoalsWeight: 0.5,
  xgWeight: 0.3,
  formGoalsWeight: 0.2,
  /** Home teams score slightly more, concede slightly less. */
  homeAdvantageMult: 1.1,
  awayMult: 0.95,
  /** How strongly the Elo prior tilts the two rates (0 = ignore Elo). */
  eloSensitivity: 0.5,
  /** Hard floor/ceiling on a single-team rate. */
  minLambda: 0.15,
  maxLambda: 5,
} as const;

export type GoalExpectancyConfig = typeof GOAL_EXPECTANCY_DEFAULTS;

export interface ExpectedGoals {
  readonly homeLambda: number;
  readonly awayLambda: number;
}

const feat = (features: Readonly<Record<string, number>>, key: string): number => {
  const value = features[key];
  return Number.isFinite(value) ? value : 0;
};

/**
 * Blend three goal-rate signals (season average, xG, recent form) into one rate.
 * xG smooths noisy scorelines; recent form captures momentum (SPEC §13 modeling toolbox).
 */
function blend(
  features: Readonly<Record<string, number>>,
  avgKey: string,
  xgKey: string,
  formKey: string,
  cfg: GoalExpectancyConfig,
): number {
  return (
    cfg.avgGoalsWeight * feat(features, avgKey) +
    cfg.xgWeight * feat(features, xgKey) +
    cfg.formGoalsWeight * feat(features, formKey)
  );
}

/**
 * Compute (lambda_home, lambda_away) from the feature vector and the Elo strength prior.
 * `expectedHome` is P(home) from Elo in (0,1); 0.5 leaves the rates untouched.
 */
export function expectedGoals(
  features: Readonly<Record<string, number>>,
  expectedHome: number,
  cfg: GoalExpectancyConfig = GOAL_EXPECTANCY_DEFAULTS,
): ExpectedGoals {
  const homeAttack = blend(features, 'home_avg_goals_for', 'home_avg_xg_for', 'home_form_goals_for', cfg);
  const homeDefence = blend(features, 'home_avg_goals_against', 'home_avg_xg_against', 'home_form_goals_against', cfg);
  const awayAttack = blend(features, 'away_avg_goals_for', 'away_avg_xg_for', 'away_form_goals_for', cfg);
  const awayDefence = blend(features, 'away_avg_goals_against', 'away_avg_xg_against', 'away_form_goals_against', cfg);

  const homeBase = ((homeAttack + awayDefence) / 2) * cfg.homeAdvantageMult;
  const awayBase = ((awayAttack + homeDefence) / 2) * cfg.awayMult;

  // Elo tilt: symmetric factor around 1. expectedHome > 0.5 raises home, lowers away.
  const tilt = cfg.eloSensitivity * (clampExpected(expectedHome) - 0.5);
  const homeFactor = 1 + tilt;
  const awayFactor = 1 - tilt;

  return {
    homeLambda: clampLambda(homeBase * homeFactor, cfg),
    awayLambda: clampLambda(awayBase * awayFactor, cfg),
  };
}

const clampExpected = (p: number): number =>
  !Number.isFinite(p) ? 0.5 : p < 0 ? 0 : p > 1 ? 1 : p;

const clampLambda = (value: number, cfg: GoalExpectancyConfig): number =>
  !Number.isFinite(value)
    ? cfg.minLambda
    : Math.min(cfg.maxLambda, Math.max(cfg.minLambda, value));
