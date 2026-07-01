// libs/domain/src/services/value-calculator.service.ts
import { Result, DomainError, unwrap } from '@betvision/shared';
import { Odds } from '../value-objects/odds';
import type { Probability } from '../value-objects/probability';
import { ImpliedProbability } from '../value-objects/implied-probability';
import { Edge } from '../value-objects/edge';
import { ExpectedValue } from '../value-objects/expected-value';

export interface ValueCalculator {
  /** Raw implied probability (margin included). */
  impliedProbability(odds: Odds): ImpliedProbability;
  /**
   * Remove the bookmaker overround across ALL outcomes of one market so the implied
   * set sums to 1 — a fair baseline for edge. Returns margin-removed implieds in order.
   */
  removeMargin(marketOdds: ReadonlyArray<Odds>): ImpliedProbability[];
  /** Edge = modelProb - impliedProb (use the margin-removed implied). */
  edge(model: Probability, implied: ImpliedProbability): Result<Edge, DomainError>;
  /** EV = p*(odds-1) - (1-p). */
  expectedValue(model: Probability, odds: Odds): Result<ExpectedValue, DomainError>;
}

/**
 * Reference implementation (pure, deterministic). Simple enough to ship in Phase 3;
 * the edge/EV formulas are final per SPEC §14.
 */
export class DefaultValueCalculator implements ValueCalculator {
  impliedProbability(odds: Odds): ImpliedProbability {
    return odds.toImpliedProbability();
  }

  removeMargin(marketOdds: ReadonlyArray<Odds>): ImpliedProbability[] {
    const rawImplied = marketOdds.map((o) => 1 / o.decimal);
    const overround = rawImplied.reduce((sum, p) => sum + p, 0);
    // overround > 0 because every decimal > 1 ⇒ each raw implied ∈ (0,1).
    return rawImplied.map((p) =>
      // normalized ∈ (0,1] since p <= overround ⇒ construction cannot fail.
      unwrap(ImpliedProbability.create(p / overround, true)),
    );
  }

  edge(model: Probability, implied: ImpliedProbability): Result<Edge, DomainError> {
    return Edge.between(model, implied);
  }

  expectedValue(model: Probability, odds: Odds): Result<ExpectedValue, DomainError> {
    return ExpectedValue.of(model, odds);
  }
}
