import {
  IdentityCalibrator,
  PlattCalibrator,
  IsotonicCalibrator,
  IdentityCalibrationMap,
  LookupCalibrationMap,
  type CalibrationMap,
} from './calibration';

describe('calibration', () => {
  describe('IdentityCalibrator', () => {
    const c = new IdentityCalibrator();
    it('returns the input unchanged in [0,1]', () => {
      expect(c.apply(0.42)).toBeCloseTo(0.42, 12);
    });
    it('clamps out-of-range values', () => {
      expect(c.apply(1.4)).toBe(1);
      expect(c.apply(-0.2)).toBe(0);
    });
  });

  describe('PlattCalibrator', () => {
    it('is the identity when (a=1, b=0)', () => {
      const c = new PlattCalibrator(1, 0);
      for (const p of [0.1, 0.35, 0.5, 0.73, 0.9]) {
        expect(c.apply(p)).toBeCloseTo(p, 6);
      }
    });
    it('shifts probabilities up for b > 0', () => {
      const c = new PlattCalibrator(1, 0.5);
      expect(c.apply(0.5)).toBeGreaterThan(0.5);
    });
    it('stays within [0,1]', () => {
      const c = new PlattCalibrator(2, -1);
      expect(c.apply(0.999)).toBeLessThanOrEqual(1);
      expect(c.apply(0.001)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('IsotonicCalibrator', () => {
    const c = new IsotonicCalibrator([
      [0, 0],
      [0.5, 0.4],
      [1, 1],
    ]);
    it('linearly interpolates between knots', () => {
      expect(c.apply(0.25)).toBeCloseTo(0.2, 6); // halfway from (0,0) to (0.5,0.4)
      expect(c.apply(0.75)).toBeCloseTo(0.7, 6); // halfway from (0.5,0.4) to (1,1)
    });
    it('clamps outside the fitted range', () => {
      expect(c.apply(-1)).toBe(0);
      expect(c.apply(2)).toBe(1);
    });
  });

  describe('CalibrationMap', () => {
    it('IdentityCalibrationMap returns an identity calibrator for any market', () => {
      const map: CalibrationMap = new IdentityCalibrationMap();
      expect(map.for('1X2').apply(0.6)).toBeCloseTo(0.6, 12);
    });
    it('LookupCalibrationMap uses the per-market calibrator, else identity', () => {
      const map = new LookupCalibrationMap({ '1X2': new PlattCalibrator(1, 0.5) });
      expect(map.for('1X2').apply(0.5)).toBeGreaterThan(0.5); // fitted
      expect(map.for('BTTS').apply(0.5)).toBeCloseTo(0.5, 12); // fallback identity
    });
  });
});
