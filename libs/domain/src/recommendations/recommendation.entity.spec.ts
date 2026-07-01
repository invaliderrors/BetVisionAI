// libs/domain/src/recommendations/recommendation.entity.spec.ts
import { unwrap } from '@betvision/shared';
import { Recommendation, RecommendationRationale } from './recommendation.entity';
import { riskAdjustedExpectedValue } from './value-ranking';
import { Probability } from '../value-objects/probability';
import { Odds } from '../value-objects/odds';
import { ImpliedProbability } from '../value-objects/implied-probability';
import { Edge } from '../value-objects/edge';
import { ExpectedValue } from '../value-objects/expected-value';
import { Stake } from '../value-objects/stake';
import { RiskAppetite, RiskBucket } from '../value-objects/risk-appetite';
import { ConfidenceLevel, RiskLevel } from '../value-objects/levels';
import type { MarketKey } from '../value-objects/market';
import type { PredictionId } from '../ports/shared.dto';

const build = (isBestBet = false): Recommendation =>
  Recommendation.create({
    predictionId: 'pred-1' as PredictionId,
    market: '1X2' as MarketKey,
    selection: 'HOME',
    modelProbability: unwrap(Probability.create(0.6)),
    impliedProbability: unwrap(ImpliedProbability.create(0.5, true)),
    odds: unwrap(Odds.create(1.95)),
    edge: unwrap(Edge.create(0.1)),
    expectedValue: unwrap(ExpectedValue.create(0.17)),
    suggestedStake: unwrap(Stake.create(0.01)),
    confidence: ConfidenceLevel.High,
    risk: RiskLevel.Low,
    riskAppetite: unwrap(RiskAppetite.create(85)),
    riskBucket: RiskBucket.Aggressive,
    rationale: RecommendationRationale.PositiveEdgeAlternative,
    isBestBet,
  });

describe('Recommendation entity', () => {
  it('projects a plain view with the value math + risk provenance', () => {
    const view = build(true).view();
    expect(view.market).toBe('1X2');
    expect(view.selection).toBe('HOME');
    expect(view.modelProbability).toBe(0.6);
    expect(view.impliedProbability).toBe(0.5);
    expect(view.oddsDecimal).toBe(1.95);
    expect(view.edge).toBe(0.1);
    expect(view.suggestedStakePct).toBe(0.01);
    expect(view.riskAppetite).toBe(85);
    expect(view.riskBucket).toBe(RiskBucket.Aggressive);
  });

  it('riskAdjustedExpectedValue matches the pure ranking helper', () => {
    const rec = build();
    expect(rec.riskAdjustedExpectedValue).toBeCloseTo(
      riskAdjustedExpectedValue(0.17, ConfidenceLevel.High, RiskLevel.Low),
      10,
    );
  });

  it('withBestBet flips the flag and swaps the rationale code', () => {
    const best = build(false).withBestBet(true);
    expect(best.isBestBet).toBe(true);
    expect(best.view().rationale).toBe(RecommendationRationale.PositiveEdgeBestBet);

    const alt = build(true).withBestBet(false);
    expect(alt.isBestBet).toBe(false);
    expect(alt.view().rationale).toBe(RecommendationRationale.PositiveEdgeAlternative);
  });

  it('ranks higher confidence / lower volatility above the reverse for equal EV', () => {
    const strong = riskAdjustedExpectedValue(0.1, ConfidenceLevel.High, RiskLevel.Low);
    const weak = riskAdjustedExpectedValue(0.1, ConfidenceLevel.Low, RiskLevel.High);
    expect(strong).toBeGreaterThan(weak);
  });
});
