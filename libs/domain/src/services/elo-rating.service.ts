// libs/domain/src/services/elo-rating.service.ts
// Phase 3 scope: contract only. Full math (expectedScore + K-factor update) lands in Phase 10.

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

export interface EloRatingService {
  /** P(home "wins" in Elo terms) given ratings + home advantage. */
  expectedScore(homeRating: number, awayRating: number, homeAdvantage: number): number;
  /** Apply the K-factor update after an observed result. */
  update(outcome: EloMatchOutcome): EloRatingUpdate;
}
