// libs/domain/src/services/elo-rating.service.ts
// Phase 10: full Elo math. PURE (no framework/vendor/node imports, deterministic).
//   - expectedScore: logistic expectation from rating diff + home advantage.
//   - update: zero-sum K-factor update after an observed result.
//   - strengthPrior: derive a pre-match team-strength prior for BOTH sides FROM FEATURES
//     (recency-weighted form, average goal difference, strength-of-schedule) so the goal model
//     can nudge expected goals toward the stronger side (SPEC §13 "Elo prior").

/** Tunable Elo constants. Exposed so Phase-17 backtesting can refit them. */
export const ELO_DEFAULTS = {
  /** Neutral baseline rating a team regresses toward with no signal. */
  baseRating: 1500,
  /** Rating points added to the home side (SPEC §13; typical 60–100). */
  homeAdvantage: 65,
  /** Update sensitivity (typical 20–40). */
  kFactor: 20,
  /** Span (in rating points) contributed by form points across its [0,1] range. */
  formWeight: 400,
  /** Rating points per goal of average goal difference (attack − defence). */
  goalDiffWeight: 55,
  /** Span contributed by strength-of-schedule across its [0,1] range. */
  sosWeight: 120,
} as const;

export interface EloMatchOutcome {
  readonly homeRating: number;
  readonly awayRating: number;
  /** Actual result for the home side: 1 win, 0.5 draw, 0 loss. */
  readonly homeScore: 0 | 0.5 | 1;
  readonly kFactor: number; // sensitivity, e.g. 20-40
  readonly homeAdvantage: number; // rating points added to home, e.g. 60-100
}

export interface EloRatingUpdate {
  readonly newHomeRating: number;
  readonly newAwayRating: number;
  readonly expectedHome: number; // pre-match expected score in (0,1)
}

/** A pre-match strength prior derived from features (feeds the goal model's Elo adjustment). */
export interface EloStrengthPrior {
  readonly homeRating: number;
  readonly awayRating: number;
  /** P(home "wins" in Elo terms) in (0,1); 0.5 = evenly matched. */
  readonly expectedHome: number;
}

export interface EloRatingService {
  /** P(home "wins" in Elo terms) given ratings + home advantage. */
  expectedScore(homeRating: number, awayRating: number, homeAdvantage: number): number;
  /** Apply the K-factor update after an observed result. */
  update(outcome: EloMatchOutcome): EloRatingUpdate;
  /** Derive a pre-match strength prior for both sides from the engineered feature vector. */
  strengthPrior(
    features: Readonly<Record<string, number>>,
    homeAdvantage?: number,
  ): EloStrengthPrior;
}

const feat = (features: Readonly<Record<string, number>>, key: string): number => {
  const value = features[key];
  return Number.isFinite(value) ? value : 0;
};

/**
 * Reference Elo implementation. The expected-score curve is the classic logistic on a 400-point
 * scale; a 400-point edge ⇒ ~0.909 expectation. The update is strictly zero-sum: whatever the
 * home side gains, the away side loses.
 */
export class DefaultEloRatingService implements EloRatingService {
  expectedScore(homeRating: number, awayRating: number, homeAdvantage: number): number {
    const diff = homeRating + homeAdvantage - awayRating;
    return 1 / (1 + Math.pow(10, -diff / 400));
  }

  update(outcome: EloMatchOutcome): EloRatingUpdate {
    const expectedHome = this.expectedScore(
      outcome.homeRating,
      outcome.awayRating,
      outcome.homeAdvantage,
    );
    const delta = outcome.kFactor * (outcome.homeScore - expectedHome);
    return {
      newHomeRating: outcome.homeRating + delta,
      newAwayRating: outcome.awayRating - delta, // zero-sum: away loses exactly what home gains
      expectedHome,
    };
  }

  strengthPrior(
    features: Readonly<Record<string, number>>,
    homeAdvantage: number = ELO_DEFAULTS.homeAdvantage,
  ): EloStrengthPrior {
    const homeRating = this.ratingFromFeatures(features, 'home');
    const awayRating = this.ratingFromFeatures(features, 'away');
    return {
      homeRating,
      awayRating,
      expectedHome: this.expectedScore(homeRating, awayRating, homeAdvantage),
    };
  }

  /** Map a side's features to a rating around the baseline. Interpretable + monotonic. */
  private ratingFromFeatures(
    features: Readonly<Record<string, number>>,
    side: 'home' | 'away',
  ): number {
    const formPoints = feat(features, `${side}_form_points`); // [0,1]
    const goalDiff = feat(features, `${side}_avg_goals_for`) - feat(features, `${side}_avg_goals_against`);
    const sos = feat(features, `sos_${side}`); // [0,1]
    return (
      ELO_DEFAULTS.baseRating +
      ELO_DEFAULTS.formWeight * (formPoints - 0.5) +
      ELO_DEFAULTS.goalDiffWeight * goalDiff +
      ELO_DEFAULTS.sosWeight * (sos - 0.5)
    );
  }
}
