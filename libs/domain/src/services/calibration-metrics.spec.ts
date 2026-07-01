import { brierScore, logLoss, type ProbabilityOutcome } from './calibration-metrics';

describe('calibration metrics', () => {
  describe('brierScore (golden)', () => {
    it('computes the mean squared error vs the 0/1 outcome', () => {
      const sample: ProbabilityOutcome[] = [
        { probability: 0.9, occurred: true }, // (0.9-1)² = 0.01
        { probability: 0.2, occurred: false }, // (0.2-0)² = 0.04
      ];
      expect(brierScore(sample)).toBeCloseTo(0.025, 9);
    });
    it('is 0 for perfect predictions', () => {
      expect(
        brierScore([
          { probability: 1, occurred: true },
          { probability: 0, occurred: false },
        ]),
      ).toBeCloseTo(0, 12);
    });
    it('is 0 for an empty sample', () => {
      expect(brierScore([])).toBe(0);
    });
  });

  describe('logLoss (golden)', () => {
    it('computes the mean negative log-likelihood', () => {
      // -ln(0.9) = 0.1053605
      expect(logLoss([{ probability: 0.9, occurred: true }])).toBeCloseTo(0.1053605, 6);
    });
    it('penalises confident misses heavily', () => {
      const good = logLoss([{ probability: 0.9, occurred: true }]);
      const bad = logLoss([{ probability: 0.05, occurred: true }]);
      expect(bad).toBeGreaterThan(good);
    });
    it('never returns Infinity for p∈{0,1} (epsilon guard)', () => {
      expect(Number.isFinite(logLoss([{ probability: 0, occurred: true }]))).toBe(true);
      expect(Number.isFinite(logLoss([{ probability: 1, occurred: false }]))).toBe(true);
    });
  });
});
