// libs/domain/src/services/poisson-goal-model.service.ts
// Phase 10: full score-matrix math with the Dixon-Coles low-score correlation correction.
// PURE (no framework/vendor/node imports, deterministic).
//
// A match is modelled as two (near-)independent Poisson processes for home/away goals. Plain
// Poisson underestimates draws and very low scores, so Dixon-Coles applies a multiplicative
// correction `tau` to the four low-score cells (0-0, 0-1, 1-0, 1-1) controlled by `rho`
// (negative rho ⇒ more mass on 0-0/1-1). The truncated, corrected grid is renormalised to sum
// to 1 so every derived market (1X2, O/U, BTTS) is internally consistent.
import { Probability } from '../value-objects/probability';
import { unwrap } from '@betvision/shared';
import { clamp01, poissonPmf } from './prob-math';

/** Matrix truncation default — P(>10 goals) is negligible for realistic rates. */
export const DEFAULT_MAX_GOALS = 10;
/** Modest baseline Dixon-Coles rho. Real value comes from Phase-17 backtesting. */
export const DEFAULT_DIXON_COLES_RHO = -0.03;

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

/** Probability grid where cell[h][a] = P(home scores h, away scores a). Rows/cols sum to 1. */
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

/**
 * The Dixon-Coles dependency factor for a low-score cell. Returns 1 for every cell outside the
 * {0,1}×{0,1} corner, so only 0-0/0-1/1-0/1-1 are adjusted.
 */
export function dixonColesTau(
  homeGoals: number,
  awayGoals: number,
  homeLambda: number,
  awayLambda: number,
  rho: number,
): number {
  if (homeGoals === 0 && awayGoals === 0) return 1 - homeLambda * awayLambda * rho;
  if (homeGoals === 0 && awayGoals === 1) return 1 + homeLambda * rho;
  if (homeGoals === 1 && awayGoals === 0) return 1 + awayLambda * rho;
  if (homeGoals === 1 && awayGoals === 1) return 1 - rho;
  return 1;
}

const toProbability = (value: number): Probability => unwrap(Probability.create(clamp01(value)));

export class DefaultPoissonGoalModel implements PoissonGoalModel {
  scoreMatrix(input: GoalExpectancyInput): ScoreMatrix {
    const maxGoals = input.maxGoals ?? DEFAULT_MAX_GOALS;
    const lambda = Math.max(0, input.homeLambda);
    const mu = Math.max(0, input.awayLambda);
    const rho = input.dixonColesRho;

    const homePmf = Array.from({ length: maxGoals + 1 }, (_, k) => poissonPmf(k, lambda));
    const awayPmf = Array.from({ length: maxGoals + 1 }, (_, k) => poissonPmf(k, mu));

    const grid: number[][] = [];
    let total = 0;
    for (let h = 0; h <= maxGoals; h++) {
      const row: number[] = [];
      for (let a = 0; a <= maxGoals; a++) {
        let cell = homePmf[h] * awayPmf[a];
        if (rho !== undefined) cell *= dixonColesTau(h, a, lambda, mu, rho);
        if (cell < 0) cell = 0; // guard: an extreme rho can turn a corner cell negative
        row.push(cell);
        total += cell;
      }
      grid.push(row);
    }

    // Renormalise so the (truncated + corrected) grid is a proper distribution summing to 1.
    if (total > 0) {
      for (let h = 0; h <= maxGoals; h++) {
        for (let a = 0; a <= maxGoals; a++) grid[h][a] /= total;
      }
    }

    return { grid, maxGoals };
  }

  oneXTwo(matrix: ScoreMatrix): OneXTwoProbabilities {
    let home = 0;
    let draw = 0;
    let away = 0;
    for (let h = 0; h <= matrix.maxGoals; h++) {
      for (let a = 0; a <= matrix.maxGoals; a++) {
        const cell = matrix.grid[h][a];
        if (h > a) home += cell;
        else if (h === a) draw += cell;
        else away += cell;
      }
    }
    return { home: toProbability(home), draw: toProbability(draw), away: toProbability(away) };
  }

  overProbability(matrix: ScoreMatrix, line: number): Probability {
    let over = 0;
    for (let h = 0; h <= matrix.maxGoals; h++) {
      for (let a = 0; a <= matrix.maxGoals; a++) {
        if (h + a > line) over += matrix.grid[h][a];
      }
    }
    return toProbability(over);
  }

  bttsProbability(matrix: ScoreMatrix): Probability {
    let yes = 0;
    for (let h = 1; h <= matrix.maxGoals; h++) {
      for (let a = 1; a <= matrix.maxGoals; a++) {
        yes += matrix.grid[h][a];
      }
    }
    return toProbability(yes);
  }
}
