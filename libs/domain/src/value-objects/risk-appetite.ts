// libs/domain/src/value-objects/risk-appetite.ts
import { Result, ok, err, DomainError, DomainErrorCode, Guard } from '@betvision/shared';
import { ConfidenceLevel, RiskLevel } from './levels';
import { MarketGroup } from './market';

export enum RiskBucket {
  Conservative = 'conservative', // 0-33
  Balanced = 'balanced', // 34-66
  Aggressive = 'aggressive', // 67-100
}

/**
 * RiskAppetite — integer 0..100. 0 = most conservative, 100 = most aggressive.
 * GUARDRAIL: this NEVER feeds PredictionModelPort. It only shapes selection & staking.
 * Immutable, validated. The same fixture at any appetite yields identical model probabilities.
 */
export class RiskAppetite {
  private constructor(readonly value: number) {
    Object.freeze(this);
  }

  static create(value: number): Result<RiskAppetite, DomainError> {
    const error = Guard.firstError(
      Guard.finiteNumber(value, 'riskAppetite'),
      Guard.isInteger(value, DomainErrorCode.RISK_APPETITE_NOT_INTEGER, 'riskAppetite'),
      Guard.inClosedRange(value, 0, 100, DomainErrorCode.RISK_APPETITE_OUT_OF_RANGE, 'riskAppetite'),
    );
    return error ? err(error) : ok(new RiskAppetite(value));
  }

  /** Product default per Feature Spec B (slider default 33). */
  static default(): RiskAppetite {
    return new RiskAppetite(33);
  }

  get bucket(): RiskBucket {
    if (this.value <= 33) return RiskBucket.Conservative;
    if (this.value <= 66) return RiskBucket.Balanced;
    return RiskBucket.Aggressive;
  }
}

/**
 * RiskProfile — the resolved, concrete gating + staking parameters.
 * Produced by RiskProfileService.resolve(riskAppetite). Pure data; no behavior.
 */
export interface RiskProfile {
  /** Minimum edge a selection must clear to be surfaced (higher when conservative). */
  readonly minEdge: number;
  /** Minimum model confidence required. */
  readonly minConfidence: ConfidenceLevel;
  /** Highest market volatility allowed (conservative excludes high-variance markets). */
  readonly maxMarketVolatility: RiskLevel;
  /** Fraction of full Kelly applied to staking. (0,1) — NEVER 1.0. */
  readonly kellyFraction: number;
  /** Hard cap on stake as a fraction of bankroll (e.g. 0.01 = 1%). */
  readonly maxStakePctCap: number;
  /** Market groups permitted at this appetite (conservative drops `Specials`). */
  readonly allowedMarketGroups: ReadonlyArray<MarketGroup>;
  /** Echoed for reproducibility / UI ("analyzed at risk 45/100 (balanced)"). */
  readonly bucket: RiskBucket;
}
