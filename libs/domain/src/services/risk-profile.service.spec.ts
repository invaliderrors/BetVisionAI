import { DefaultRiskProfileService } from './risk-profile.service';
import { RiskAppetite, RiskBucket } from '../value-objects/risk-appetite';
import { MarketGroup } from '../value-objects/market';
import { ConfidenceLevel, RiskLevel, confidenceAtLeast, riskAtMost } from '../value-objects/levels';
import { unwrap } from '@betvision/shared';

describe('DefaultRiskProfileService', () => {
  const svc = new DefaultRiskProfileService();
  const resolve = (v: number) => svc.resolve(unwrap(RiskAppetite.create(v)));

  const conservative = () => resolve(10);
  const balanced = () => resolve(50);
  const aggressive = () => resolve(90);

  it('resolves the correct bucket for each band', () => {
    expect(conservative().bucket).toBe(RiskBucket.Conservative);
    expect(balanced().bucket).toBe(RiskBucket.Balanced);
    expect(aggressive().bucket).toBe(RiskBucket.Aggressive);
  });

  it('conservative demands a HIGHER minEdge than balanced and aggressive', () => {
    expect(conservative().minEdge).toBeGreaterThan(balanced().minEdge);
    expect(balanced().minEdge).toBeGreaterThan(aggressive().minEdge);
  });

  it('minEdge is monotonically NON-INCREASING as appetite rises', () => {
    let prev = Number.POSITIVE_INFINITY;
    for (let v = 0; v <= 100; v++) {
      const cur = resolve(v).minEdge;
      expect(cur).toBeLessThanOrEqual(prev);
      prev = cur;
    }
  });

  it('kellyFraction and maxStakePctCap rise with appetite, and are NEVER 1.0', () => {
    const c = conservative();
    const b = balanced();
    const a = aggressive();

    expect(c.kellyFraction).toBeLessThan(b.kellyFraction);
    expect(b.kellyFraction).toBeLessThan(a.kellyFraction);
    expect(c.maxStakePctCap).toBeLessThan(b.maxStakePctCap);
    expect(b.maxStakePctCap).toBeLessThan(a.maxStakePctCap);

    for (let v = 0; v <= 100; v++) {
      const kf = resolve(v).kellyFraction;
      expect(kf).toBeGreaterThan(0);
      expect(kf).toBeLessThan(1); // NEVER full Kelly
    }
  });

  it('conservative EXCLUDES high-volatility Specials; aggressive includes them', () => {
    expect(conservative().allowedMarketGroups).not.toContain(MarketGroup.Specials);
    expect(balanced().allowedMarketGroups).not.toContain(MarketGroup.Specials);
    expect(aggressive().allowedMarketGroups).toContain(MarketGroup.Specials);
  });

  it('allowed market groups only widen as appetite rises (superset relation)', () => {
    const c = new Set(conservative().allowedMarketGroups);
    const b = new Set(balanced().allowedMarketGroups);
    const a = new Set(aggressive().allowedMarketGroups);
    for (const g of c) expect(b.has(g)).toBe(true);
    for (const g of b) expect(a.has(g)).toBe(true);
    expect(a.size).toBeGreaterThan(b.size);
    expect(b.size).toBeGreaterThan(c.size);
  });

  it('confidence requirement loosens and volatility ceiling rises with appetite', () => {
    // conservative requires HIGH confidence; balanced medium is NOT enough for conservative.
    expect(confidenceAtLeast(ConfidenceLevel.Medium, conservative().minConfidence)).toBe(false);
    expect(confidenceAtLeast(ConfidenceLevel.Medium, balanced().minConfidence)).toBe(true);
    expect(confidenceAtLeast(ConfidenceLevel.Low, aggressive().minConfidence)).toBe(true);

    // conservative only allows LOW volatility; aggressive tolerates HIGH.
    expect(riskAtMost(RiskLevel.Medium, conservative().maxMarketVolatility)).toBe(false);
    expect(riskAtMost(RiskLevel.Medium, balanced().maxMarketVolatility)).toBe(true);
    expect(riskAtMost(RiskLevel.High, aggressive().maxMarketVolatility)).toBe(true);
  });

  it('is deterministic — same appetite yields an equal profile', () => {
    expect(resolve(45)).toEqual(resolve(45));
  });
});
