// libs/domain/src/services/poisson-goal-model.service.ts
// Phase 3 scope: contract only. Full (Dixon-Coles-corrected) matrix math lands in Phase 10.
import type { Probability } from '../value-objects/probability';

export interface GoalExpectancyInput {
  readonly homeLambda: number; // expected home goals (Elo + form + xG derived)
  readonly awayLambda: number; // expected away goals
  readonly maxGoals?: number; // matrix truncation, default 10
  /**
   * Dixon-Coles low-score dependency parameter (rho). When provided, the model applies
   * the Dixon-Coles correction to the 0-0/1-0/0-1/1-1 cells to fix the independence
   * assumption Poisson makes about low scores. When omitted, plain Poisson is used.
   */
  readonly dixonColesRho?: number;
}

/** Probability grid where cell[h][a] = P(home scores h, away scores a). */
export interface ScoreMatrix {
  readonly grid: ReadonlyArray<ReadonlyArray<number>>;
  readonly maxGoals: number;
}

export interface OneXTwoProbabilities {
  readonly home: Probability;
  readonly draw: Probability;
  readonly away: Probability;
}

export interface PoissonGoalModel {
  /** Build the (Dixon-Coles-corrected) score matrix from expected goals. */
  scoreMatrix(input: GoalExpectancyInput): ScoreMatrix;
  /** Collapse the matrix into 1X2 by summing home-win / draw / away-win cells. */
  oneXTwo(matrix: ScoreMatrix): OneXTwoProbabilities;
  /** P(total goals over `line`) — Over/Under derivation. */
  overProbability(matrix: ScoreMatrix, line: number): Probability;
  /** P(both teams score >= 1). */
  bttsProbability(matrix: ScoreMatrix): Probability;
}
