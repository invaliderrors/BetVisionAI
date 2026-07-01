import { Edge } from './edge';
import { Probability } from './probability';
import { ImpliedProbability } from './implied-probability';
import { DomainErrorCode, unwrap } from '@betvision/shared';

describe('Edge', () => {
  it('accepts values within [-1, 1]', () => {
    for (const v of [-1, 0, 0.5, 1]) {
      expect(Edge.create(v).ok).toBe(true);
    }
  });

  it('rejects values outside [-1, 1]', () => {
    const r = Edge.create(1.5);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe(DomainErrorCode.EDGE_OUT_OF_RANGE);
  });

  it('between() = modelProb - impliedProb', () => {
    const model = unwrap(Probability.create(0.6));
    const implied = unwrap(ImpliedProbability.create(0.5, true));
    const r = Edge.between(model, implied);
    if (r.ok) expect(r.value.value).toBeCloseTo(0.1, 12);
  });

  it('isPositive reflects sign', () => {
    expect(unwrap(Edge.create(0.05)).isPositive).toBe(true);
    expect(unwrap(Edge.create(-0.05)).isPositive).toBe(false);
    expect(unwrap(Edge.create(0)).isPositive).toBe(false);
  });

  it('meets(minEdge) uses >= comparison', () => {
    const edge = unwrap(Edge.create(0.05));
    expect(edge.meets(0.05)).toBe(true);
    expect(edge.meets(0.03)).toBe(true);
    expect(edge.meets(0.06)).toBe(false);
  });
});
