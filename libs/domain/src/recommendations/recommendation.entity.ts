// libs/domain/src/recommendations/recommendation.entity.ts
// A Recommendation is a single PredictionResult (objective probability) that PASSED a resolved
// RiskProfile's gates, carrying the value math (edge/EV/stake) computed against market odds plus
// the RiskAppetite provenance so it reproduces exactly (Feature Spec B). Immutable aggregate built
// only from already-valid value objects, so construction is total (no Result). It holds VOs for
// invariants and exposes `view()` for a plain, serialisable projection used by the DTO layer.
import type { MarketKey } from '../value-objects/market';
import type { Probability } from '../value-objects/probability';
import type { ImpliedProbability } from '../value-objects/implied-probability';
import type { Odds } from '../value-objects/odds';
import type { Edge } from '../value-objects/edge';
import type { ExpectedValue } from '../value-objects/expected-value';
import type { Stake } from '../value-objects/stake';
import type { RiskAppetite, RiskBucket } from '../value-objects/risk-appetite';
import type { ConfidenceLevel, RiskLevel } from '../value-objects/levels';
import type { PredictionId } from '../ports/shared.dto';
import { riskAdjustedExpectedValue } from './value-ranking';

/** i18n-keyed rationale codes (localized at the interface layer — domain stays string-free). */
export enum RecommendationRationale {
  PositiveEdgeBestBet = 'domain.value.rationale.positive_edge_best_bet',
  PositiveEdgeAlternative = 'domain.value.rationale.positive_edge_alternative',
}

export interface RecommendationProps {
  readonly predictionId: PredictionId;
  readonly market: MarketKey;
  readonly selection: string;
  readonly modelProbability: Probability;
  readonly impliedProbability: ImpliedProbability;
  readonly odds: Odds;
  readonly edge: Edge;
  readonly expectedValue: ExpectedValue;
  readonly suggestedStake: Stake;
  readonly confidence: ConfidenceLevel;
  readonly risk: RiskLevel;
  readonly riskAppetite: RiskAppetite;
  readonly riskBucket: RiskBucket;
  readonly rationale: RecommendationRationale;
  readonly isBestBet: boolean;
}

/** Plain, serialisable projection (numbers/strings only) for contracts/persistence layers. */
export interface RecommendationView {
  readonly predictionId: string;
  readonly market: MarketKey;
  readonly selection: string;
  readonly modelProbability: number;
  readonly impliedProbability: number;
  readonly oddsDecimal: number;
  readonly edge: number;
  readonly expectedValue: number;
  readonly riskAdjustedExpectedValue: number;
  readonly suggestedStakePct: number;
  readonly confidence: ConfidenceLevel;
  readonly risk: RiskLevel;
  readonly rationale: RecommendationRationale;
  readonly isBestBet: boolean;
  readonly riskAppetite: number;
  readonly riskBucket: RiskBucket;
}

export class Recommendation {
  private constructor(private readonly props: RecommendationProps) {
    Object.freeze(this);
  }

  static create(props: RecommendationProps): Recommendation {
    return new Recommendation(props);
  }

  /** Same aggregate flagged as (not) the best bet — used after ranking. */
  withBestBet(isBestBet: boolean): Recommendation {
    const rationale = isBestBet
      ? RecommendationRationale.PositiveEdgeBestBet
      : RecommendationRationale.PositiveEdgeAlternative;
    return new Recommendation({ ...this.props, isBestBet, rationale });
  }

  get market(): MarketKey {
    return this.props.market;
  }

  get selection(): string {
    return this.props.selection;
  }

  get isBestBet(): boolean {
    return this.props.isBestBet;
  }

  /** Deterministic ranking key: risk-adjusted EV (confidence × volatility weighted). */
  get riskAdjustedExpectedValue(): number {
    return riskAdjustedExpectedValue(
      this.props.expectedValue.value,
      this.props.confidence,
      this.props.risk,
    );
  }

  view(): RecommendationView {
    const p = this.props;
    return {
      predictionId: p.predictionId as string,
      market: p.market,
      selection: p.selection,
      modelProbability: p.modelProbability.value,
      impliedProbability: p.impliedProbability.value,
      oddsDecimal: p.odds.decimal,
      edge: p.edge.value,
      expectedValue: p.expectedValue.value,
      riskAdjustedExpectedValue: this.riskAdjustedExpectedValue,
      suggestedStakePct: p.suggestedStake.bankrollFraction,
      confidence: p.confidence,
      risk: p.risk,
      rationale: p.rationale,
      isBestBet: p.isBestBet,
      riskAppetite: p.riskAppetite.value,
      riskBucket: p.riskBucket,
    };
  }
}
