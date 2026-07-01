import {
  DefaultPoissonGoalModel,
  dixonColesTau,
  type ScoreMatrix,
} from './poisson-goal-model.service';
import { poissonPmf } from './prob-math';

describe('DefaultPoissonGoalModel', () => {
  const model = new DefaultPoissonGoalModel();

  describe('scoreMatrix (golden, plain Poisson)', () => {
    const matrix = model.scoreMatrix({ homeLambda: 1.5, awayLambda: 1.2, maxGoals: 10 });

    it('sums to 1 across the whole grid', () => {
      const total = matrix.grid.flat().reduce((s, c) => s + c, 0);
      expect(total).toBeCloseTo(1, 9);
    });

    it('P(0-0) matches the independent Poisson product e^-1.5·e^-1.2', () => {
      const expected = poissonPmf(0, 1.5) * poissonPmf(0, 1.2); // 0.0672055
      expect(matrix.grid[0][0]).toBeCloseTo(expected, 6);
    });

    it('P(2-1) matches the independent Poisson product', () => {
      const expected = poissonPmf(2, 1.5) * poissonPmf(1, 1.2);
      expect(matrix.grid[2][1]).toBeCloseTo(expected, 6);
    });
  });

  describe('1X2 (golden)', () => {
    it('sums to exactly 1', () => {
      const m = model.scoreMatrix({ homeLambda: 1.7, awayLambda: 1.1, maxGoals: 12 });
      const { home, draw, away } = model.oneXTwo(m);
      expect(home.value + draw.value + away.value).toBeCloseTo(1, 9);
    });

    it('is symmetric (home ≈ away) when the rates are equal', () => {
      const m = model.scoreMatrix({ homeLambda: 1.3, awayLambda: 1.3, maxGoals: 12 });
      const { home, away } = model.oneXTwo(m);
      expect(home.value).toBeCloseTo(away.value, 9);
    });

    it('favours the higher-rate side', () => {
      const m = model.scoreMatrix({ homeLambda: 2.2, awayLambda: 0.8, maxGoals: 12 });
      const { home, away } = model.oneXTwo(m);
      expect(home.value).toBeGreaterThan(away.value);
    });
  });

  describe('Over/Under (golden)', () => {
    // Sum of two independent Poissons is Poisson(λ1+λ2) ⇒ O/U is closed-form.
    const m = model.scoreMatrix({ homeLambda: 1.5, awayLambda: 1.2, maxGoals: 12 });

    it('P(Over 2.5) ≈ 0.506376 for total rate 2.7', () => {
      // 1 - e^-2.7(1 + 2.7 + 2.7²/2)
      expect(model.overProbability(m, 2.5).value).toBeCloseTo(0.506376, 3);
    });

    it('P(Over 0.5) = 1 − P(0-0) ≈ 0.932794', () => {
      expect(model.overProbability(m, 0.5).value).toBeCloseTo(1 - Math.exp(-2.7), 3);
    });

    it('is monotonically non-increasing in the line', () => {
      const lines = [0.5, 1.5, 2.5, 3.5, 4.5];
      const overs = lines.map((l) => model.overProbability(m, l).value);
      for (let i = 1; i < overs.length; i++) {
        expect(overs[i]).toBeLessThanOrEqual(overs[i - 1]);
      }
    });
  });

  describe('BTTS (golden)', () => {
    it('P(BTTS yes) ≈ (1−e^-1.5)(1−e^-1.2) = 0.542882 (independence)', () => {
      const m = model.scoreMatrix({ homeLambda: 1.5, awayLambda: 1.2, maxGoals: 12 });
      expect(model.bttsProbability(m).value).toBeCloseTo(0.542882, 3);
    });
  });

  describe('Dixon-Coles correction', () => {
    it('tau matches the published low-score factors for rho=-0.1', () => {
      const [l, mu, rho] = [1.5, 1.2, -0.1];
      expect(dixonColesTau(0, 0, l, mu, rho)).toBeCloseTo(1 - l * mu * rho, 9);
      expect(dixonColesTau(0, 1, l, mu, rho)).toBeCloseTo(1 + l * rho, 9);
      expect(dixonColesTau(1, 0, l, mu, rho)).toBeCloseTo(1 + mu * rho, 9);
      expect(dixonColesTau(1, 1, l, mu, rho)).toBeCloseTo(1 - rho, 9);
      expect(dixonColesTau(2, 3, l, mu, rho)).toBe(1); // untouched outside the corner
    });

    it('with negative rho, raises P(0-0), P(1-1) and the draw probability vs plain Poisson', () => {
      const plain = model.scoreMatrix({ homeLambda: 1.4, awayLambda: 1.4, maxGoals: 12 });
      const dc = model.scoreMatrix({ homeLambda: 1.4, awayLambda: 1.4, maxGoals: 12, dixonColesRho: -0.1 });
      expect(dc.grid[0][0]).toBeGreaterThan(plain.grid[0][0]);
      expect(dc.grid[1][1]).toBeGreaterThan(plain.grid[1][1]);
      expect(model.oneXTwo(dc).draw.value).toBeGreaterThan(model.oneXTwo(plain).draw.value);
    });

    it('still sums to 1 after the correction (renormalised)', () => {
      const dc: ScoreMatrix = model.scoreMatrix({ homeLambda: 1.6, awayLambda: 1.1, maxGoals: 12, dixonColesRho: -0.08 });
      const total = dc.grid.flat().reduce((s, c) => s + c, 0);
      expect(total).toBeCloseTo(1, 9);
    });
  });
});
