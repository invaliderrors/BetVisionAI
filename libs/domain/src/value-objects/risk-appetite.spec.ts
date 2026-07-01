import { RiskAppetite, RiskBucket } from './risk-appetite';
import { DomainErrorCode, unwrap } from '@betvision/shared';

describe('RiskAppetite', () => {
  describe('validation', () => {
    it('accepts integers within [0, 100] including boundaries', () => {
      for (const v of [0, 1, 33, 50, 99, 100]) {
        expect(RiskAppetite.create(v).ok).toBe(true);
      }
    });

    it('rejects values below 0', () => {
      const r = RiskAppetite.create(-1);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe(DomainErrorCode.RISK_APPETITE_OUT_OF_RANGE);
    });

    it('rejects values above 100', () => {
      const r = RiskAppetite.create(101);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe(DomainErrorCode.RISK_APPETITE_OUT_OF_RANGE);
    });

    it('rejects non-integer values', () => {
      const r = RiskAppetite.create(33.5);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe(DomainErrorCode.RISK_APPETITE_NOT_INTEGER);
    });

    it('rejects non-finite values', () => {
      const r = RiskAppetite.create(Number.NaN);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe(DomainErrorCode.NOT_FINITE_NUMBER);
    });

    it('default() is 33 (Conservative)', () => {
      const d = RiskAppetite.default();
      expect(d.value).toBe(33);
      expect(d.bucket).toBe(RiskBucket.Conservative);
    });
  });

  describe('bucket boundaries (33/34/66/67)', () => {
    const bucketOf = (v: number): RiskBucket => unwrap(RiskAppetite.create(v)).bucket;

    it('0..33 is Conservative', () => {
      expect(bucketOf(0)).toBe(RiskBucket.Conservative);
      expect(bucketOf(33)).toBe(RiskBucket.Conservative);
    });

    it('34..66 is Balanced', () => {
      expect(bucketOf(34)).toBe(RiskBucket.Balanced);
      expect(bucketOf(66)).toBe(RiskBucket.Balanced);
    });

    it('67..100 is Aggressive', () => {
      expect(bucketOf(67)).toBe(RiskBucket.Aggressive);
      expect(bucketOf(100)).toBe(RiskBucket.Aggressive);
    });

    it('crosses exactly at 33→34 and 66→67', () => {
      expect(bucketOf(33)).toBe(RiskBucket.Conservative);
      expect(bucketOf(34)).toBe(RiskBucket.Balanced);
      expect(bucketOf(66)).toBe(RiskBucket.Balanced);
      expect(bucketOf(67)).toBe(RiskBucket.Aggressive);
    });
  });

  it('is frozen (immutable)', () => {
    expect(Object.isFrozen(unwrap(RiskAppetite.create(50)))).toBe(true);
  });
});
