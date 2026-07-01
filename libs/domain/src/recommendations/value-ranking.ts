// libs/domain/src/recommendations/value-ranking.ts
// Pure risk-adjusted EV used to rank gated selections and pick the "best bet" (SPEC §14:
// "the best bet is the highest risk-adjusted EV passing all gates"). Deterministic weights that
// down-weight lower confidence and higher market volatility, so between two similar raw EVs the
// steadier selection ranks first. NEVER touches probabilities — pure ordering over already-gated,
// objective numbers.
import { ConfidenceLevel, RiskLevel } from '../value-objects/levels';

/** Higher confidence keeps more of the raw EV. */
const CONFIDENCE_WEIGHT: Readonly<Record<ConfidenceLevel, number>> = {
  [ConfidenceLevel.Low]: 0.6,
  [ConfidenceLevel.Medium]: 0.8,
  [ConfidenceLevel.High]: 1.0,
};

/** Higher volatility discounts the raw EV (variance drag). */
const VOLATILITY_WEIGHT: Readonly<Record<RiskLevel, number>> = {
  [RiskLevel.Low]: 1.0,
  [RiskLevel.Medium]: 0.85,
  [RiskLevel.High]: 0.7,
};

/** riskAdjustedEV = EV · confidenceWeight · volatilityWeight. */
export function riskAdjustedExpectedValue(
  expectedValue: number,
  confidence: ConfidenceLevel,
  volatility: RiskLevel,
): number {
  return expectedValue * CONFIDENCE_WEIGHT[confidence] * VOLATILITY_WEIGHT[volatility];
}
