// libs/domain/src/services/risk-profile.service.ts
import type { RiskAppetite, RiskProfile } from '../value-objects/risk-appetite';
import { RiskBucket } from '../value-objects/risk-appetite';
import { ConfidenceLevel, RiskLevel } from '../value-objects/levels';
import { MarketGroup } from '../value-objects/market';

export interface RiskProfileService {
  /** Pure, total, deterministic mapping of the slider to gating + staking parameters. */
  resolve(appetite: RiskAppetite): RiskProfile;
}

/**
 * Reference implementation (the contract). Bucket-stepped per Feature Spec B; tune the
 * exact numbers via backtests but PRESERVE MONOTONICITY (conservative ⇒ stricter on every axis).
 *
 * | Bucket       | minEdge | minConfidence | maxMarketVolatility | kellyFraction | maxStakePctCap | allowedMarketGroups                          |
 * |--------------|---------|---------------|---------------------|---------------|----------------|----------------------------------------------|
 * | Conservative | 0.05    | high          | low                 | 0.10          | 0.01 (1%)      | Result, Goals                                |
 * | Balanced     | 0.03    | medium        | medium              | 0.25          | 0.02 (2%)      | + Corners, Cards, Handicap                   |
 * | Aggressive   | 0.015   | low           | high                | 0.50          | 0.03 (3%)      | all groups (incl. Specials)                  |
 */
export class DefaultRiskProfileService implements RiskProfileService {
  resolve(appetite: RiskAppetite): RiskProfile {
    switch (appetite.bucket) {
      case RiskBucket.Conservative:
        return {
          minEdge: 0.05,
          minConfidence: ConfidenceLevel.High,
          maxMarketVolatility: RiskLevel.Low,
          kellyFraction: 0.1,
          maxStakePctCap: 0.01,
          allowedMarketGroups: [MarketGroup.Result, MarketGroup.Goals],
          bucket: RiskBucket.Conservative,
        };
      case RiskBucket.Balanced:
        return {
          minEdge: 0.03,
          minConfidence: ConfidenceLevel.Medium,
          maxMarketVolatility: RiskLevel.Medium,
          kellyFraction: 0.25,
          maxStakePctCap: 0.02,
          allowedMarketGroups: [
            MarketGroup.Result,
            MarketGroup.Goals,
            MarketGroup.Corners,
            MarketGroup.Cards,
            MarketGroup.Handicap,
          ],
          bucket: RiskBucket.Balanced,
        };
      case RiskBucket.Aggressive:
        return {
          minEdge: 0.015,
          minConfidence: ConfidenceLevel.Low,
          maxMarketVolatility: RiskLevel.High,
          kellyFraction: 0.5,
          maxStakePctCap: 0.03,
          allowedMarketGroups: [
            MarketGroup.Result,
            MarketGroup.Goals,
            MarketGroup.Corners,
            MarketGroup.Cards,
            MarketGroup.Handicap,
            MarketGroup.Specials,
          ],
          bucket: RiskBucket.Aggressive,
        };
    }
  }
}
