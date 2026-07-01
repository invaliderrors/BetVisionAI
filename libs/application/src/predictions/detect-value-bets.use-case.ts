// libs/application/src/predictions/detect-value-bets.use-case.ts
// Phase 11 — DetectValueBetsUseCase. Turns OBJECTIVE model probabilities (from Phase 10) into
// risk-shaped Recommendations for one prediction + RiskAppetite (Feature Spec B):
//
//   load PredictionResult[] (objective probs) + latest OddsSnapshots
//     → per selection: impliedProbability (DE-MARGINED) + edge + EV + fractional-Kelly stake
//     → GATE by the resolved RiskProfile (minEdge, minConfidence, maxMarketVolatility, allowed groups)
//     → rank survivors by risk-adjusted EV; best bet = top; alternatives below
//     → persist Recommendations (with riskAppetite/bucket) + write value fields back onto the
//       PredictionResults (transparency). Nothing passes ⇒ honest NO_VALUE_FOUND (empty set).
//
// GUARDRAIL: this use case reads odds + riskAppetite but NEVER re-scores the model — the
// `modelProbability` on every PredictionResult is passed through untouched, so the same prediction
// at any appetite keeps byte-identical probabilities. Risk shapes SELECTION, not TRUTH.
import { Result, ok, err, DomainError, DomainErrorCode } from '@betvision/shared';
import {
  RiskAppetite,
  Odds,
  Probability,
  Recommendation,
  RecommendationRationale,
  riskAdjustedExpectedValue,
  MARKET_GROUP,
  canonicalSelection,
  confidenceAtLeast,
  riskAtMost,
  type Edge,
  type ExpectedValue,
  type Stake,
  type ImpliedProbability,
  type RiskProfile,
  type RiskBucket,
  type RiskProfileService,
  type ValueCalculator,
  type KellyStakeService,
  type PredictionRepositoryPort,
  type PredictionResultRepositoryPort,
  type OddsRepositoryPort,
  type RecommendationRepositoryPort,
  type RecommendationRecord,
  type RecommendationView,
  type PredictionResultRecord,
  type OddsSnapshotRecord,
  type ConfidenceLevel,
  type RiskLevel,
  type MarketKey,
  type PredictionId,
  type MatchId,
} from '@betvision/domain';

export interface DetectValueBetsCommand {
  readonly predictionId: PredictionId;
  /** 0..100 slider value (validated here). Shapes selection + staking, never probabilities. */
  readonly riskAppetite: number;
}

/** Objective probability + (when odds exist) the value math, for one market/selection. */
export interface ValuedResultView {
  readonly market: MarketKey;
  readonly selection: string;
  readonly modelProbability: number;
  readonly impliedProbability: number | null;
  readonly edge: number | null;
  readonly expectedValue: number | null;
  readonly suggestedStakePct: number | null;
  readonly confidence: ConfidenceLevel;
  readonly risk: RiskLevel;
}

export interface DetectValueBetsResult {
  readonly predictionId: PredictionId;
  readonly matchId: MatchId;
  readonly riskAppetite: number;
  readonly riskBucket: RiskBucket;
  readonly results: ReadonlyArray<ValuedResultView>;
  readonly recommendations: ReadonlyArray<RecommendationView>;
  readonly bestBet: RecommendationView | null;
  /** True when NOTHING cleared the gates — an honest, framed outcome, not an error. */
  readonly noValueFound: boolean;
  /** i18n code hint for the UI when `noValueFound` (suggest a higher-risk setting, framed). */
  readonly hintCode: string | null;
}

export interface DetectValueBetsDeps {
  readonly predictions: PredictionRepositoryPort;
  readonly predictionResults: PredictionResultRepositoryPort;
  readonly odds: OddsRepositoryPort;
  readonly recommendations: RecommendationRepositoryPort;
  readonly riskProfiles: RiskProfileService;
  readonly valueCalculator: ValueCalculator;
  readonly kelly: KellyStakeService;
}

/** Internal: a result joined to its odds with the value math computed (all VOs). */
interface ValuedSelection {
  readonly result: PredictionResultRecord;
  readonly modelProbability: Probability;
  readonly odds: Odds;
  readonly impliedProbability: ImpliedProbability;
  readonly edge: Edge;
  readonly expectedValue: ExpectedValue;
  readonly stake: Stake;
  readonly riskAdjustedEv: number;
}

/** De-margined odds for one selection of one market. */
interface PricedSelection {
  readonly odds: Odds;
  readonly implied: ImpliedProbability;
}

export class DetectValueBetsUseCase {
  constructor(private readonly deps: DetectValueBetsDeps) {}

  async execute(
    command: DetectValueBetsCommand,
  ): Promise<Result<DetectValueBetsResult, DomainError>> {
    // 1) Validate the slider → resolve the gating + staking profile (pure domain service).
    const appetiteResult = RiskAppetite.create(command.riskAppetite);
    if (!appetiteResult.ok) return appetiteResult;
    const appetite = appetiteResult.value;
    const profile = this.deps.riskProfiles.resolve(appetite);

    // 2) Anchor to a real prediction (its matchId locates the odds).
    const prediction = await this.deps.predictions.findById(command.predictionId);
    if (!prediction) {
      return err(
        DomainError.of(DomainErrorCode.PREDICTION_NOT_FOUND, { predictionId: command.predictionId }),
      );
    }
    const { matchId } = prediction;

    // 3) Load OBJECTIVE probabilities + the latest odds for the markets we scored.
    const results = await this.deps.predictionResults.findByPrediction(command.predictionId);
    const markets = [...new Set(results.map((r) => r.market))];
    const oddsSnapshots = await this.deps.odds.findLatest(matchId, markets);

    // 4) Compute value math per selection (de-margined implied + edge + EV + stake).
    const valued = this.computeValued(results, oddsSnapshots, profile);

    // 5) Gate → rank → flag best bet.
    const gated = valued.filter((v) => this.passesGates(v, profile));
    const ranked = this.rank(gated);
    const recommendations = ranked.map((v, i) => this.toRecommendation(v, appetite, profile, i === 0));

    // 6) Persist: recommendations (idempotent per appetite) + value fields onto the results.
    await this.deps.recommendations.replaceForPrediction(
      command.predictionId,
      appetite.value,
      recommendations.map((r) => this.toRecord(r)),
    );
    await this.deps.predictionResults.saveMany(this.mergeValueFields(results, valued));

    const views = recommendations.map((r) => r.view());
    const noValueFound = views.length === 0;
    return ok({
      predictionId: command.predictionId,
      matchId,
      riskAppetite: appetite.value,
      riskBucket: profile.bucket,
      results: this.toResultViews(results, valued),
      recommendations: views,
      bestBet: views.find((v) => v.isBestBet) ?? null,
      noValueFound,
      hintCode: noValueFound ? DomainErrorCode.NO_VALUE_FOUND : null,
    });
  }

  /** Join every scored selection to its odds and compute the value math (de-margined). */
  private computeValued(
    results: ReadonlyArray<PredictionResultRecord>,
    oddsSnapshots: ReadonlyArray<OddsSnapshotRecord>,
    profile: RiskProfile,
  ): ValuedSelection[] {
    const oddsByMarket = this.groupAndDemargin(oddsSnapshots);
    const out: ValuedSelection[] = [];

    for (const result of results) {
      const marketOdds = oddsByMarket.get(result.market);
      if (!marketOdds) continue; // no odds for this market → no value computation
      const priced = marketOdds.get(canonicalSelection(result.market, result.selection));
      if (!priced) continue;

      const modelResult = Probability.create(result.modelProbability);
      if (!modelResult.ok) continue;
      const model = modelResult.value;

      const edgeResult = this.deps.valueCalculator.edge(model, priced.implied);
      const evResult = this.deps.valueCalculator.expectedValue(model, priced.odds);
      const stakeResult = this.deps.kelly.fractionalKelly({
        model,
        odds: priced.odds,
        kellyFraction: profile.kellyFraction,
        maxStakePctCap: profile.maxStakePctCap,
      });
      if (!edgeResult.ok || !evResult.ok || !stakeResult.ok) continue;

      out.push({
        result,
        modelProbability: model,
        odds: priced.odds,
        impliedProbability: priced.implied,
        edge: edgeResult.value,
        expectedValue: evResult.value,
        stake: stakeResult.value,
        riskAdjustedEv: riskAdjustedExpectedValue(
          evResult.value.value,
          result.confidence,
          result.risk,
        ),
      });
    }
    return out;
  }

  /**
   * Group latest odds by market and DE-MARGIN each market's outcomes (remove the bookmaker
   * overround) so implied probabilities are a fair edge baseline. Keyed by canonical selection.
   */
  private groupAndDemargin(
    oddsSnapshots: ReadonlyArray<OddsSnapshotRecord>,
  ): Map<MarketKey, Map<string, PricedSelection>> {
    const byMarket = new Map<MarketKey, OddsSnapshotRecord[]>();
    for (const snap of oddsSnapshots) {
      const group = byMarket.get(snap.market) ?? [];
      group.push(snap);
      byMarket.set(snap.market, group);
    }

    const out = new Map<MarketKey, Map<string, PricedSelection>>();
    for (const [market, snaps] of byMarket) {
      // Stable selection order → deterministic de-margin.
      const sorted = [...snaps].sort((a, b) => a.selection.localeCompare(b.selection));
      const oddsVos: Odds[] = [];
      const kept: OddsSnapshotRecord[] = [];
      for (const snap of sorted) {
        const oddsResult = Odds.create(snap.priceDecimal);
        if (!oddsResult.ok) continue; // guard against bad prices
        oddsVos.push(oddsResult.value);
        kept.push(snap);
      }
      if (oddsVos.length === 0) continue;
      const deMargined = this.deps.valueCalculator.removeMargin(oddsVos);

      const selMap = new Map<string, PricedSelection>();
      kept.forEach((snap, i) => {
        selMap.set(canonicalSelection(market, snap.selection), {
          odds: oddsVos[i],
          implied: deMargined[i],
        });
      });
      out.set(market, selMap);
    }
    return out;
  }

  private passesGates(v: ValuedSelection, profile: RiskProfile): boolean {
    return (
      v.edge.meets(profile.minEdge) &&
      confidenceAtLeast(v.result.confidence, profile.minConfidence) &&
      riskAtMost(v.result.risk, profile.maxMarketVolatility) &&
      profile.allowedMarketGroups.includes(MARKET_GROUP[v.result.market])
    );
  }

  /** Highest risk-adjusted EV first; deterministic tie-breaks keep ordering reproducible. */
  private rank(gated: ReadonlyArray<ValuedSelection>): ValuedSelection[] {
    return [...gated].sort((a, b) => {
      if (b.riskAdjustedEv !== a.riskAdjustedEv) return b.riskAdjustedEv - a.riskAdjustedEv;
      if (b.edge.value !== a.edge.value) return b.edge.value - a.edge.value;
      if (a.result.market !== b.result.market) {
        return a.result.market.localeCompare(b.result.market);
      }
      return a.result.selection.localeCompare(b.result.selection);
    });
  }

  private toRecommendation(
    v: ValuedSelection,
    appetite: RiskAppetite,
    profile: RiskProfile,
    isBestBet: boolean,
  ): Recommendation {
    return Recommendation.create({
      predictionId: v.result.predictionId,
      market: v.result.market,
      selection: v.result.selection,
      modelProbability: v.modelProbability,
      impliedProbability: v.impliedProbability,
      odds: v.odds,
      edge: v.edge,
      expectedValue: v.expectedValue,
      suggestedStake: v.stake,
      confidence: v.result.confidence,
      risk: v.result.risk,
      riskAppetite: appetite,
      riskBucket: profile.bucket,
      rationale: isBestBet
        ? RecommendationRationale.PositiveEdgeBestBet
        : RecommendationRationale.PositiveEdgeAlternative,
      isBestBet,
    });
  }

  private toRecord(rec: Recommendation): RecommendationRecord {
    const view = rec.view();
    return {
      predictionId: view.predictionId as PredictionId,
      market: view.market,
      selection: view.selection,
      rationale: view.rationale,
      confidence: view.confidence,
      risk: view.risk,
      isBestBet: view.isBestBet,
      riskAppetite: view.riskAppetite,
      riskBucket: view.riskBucket,
    };
  }

  /** Attach computed value fields to each result (unset when no odds matched). */
  private mergeValueFields(
    results: ReadonlyArray<PredictionResultRecord>,
    valued: ReadonlyArray<ValuedSelection>,
  ): PredictionResultRecord[] {
    const byKey = this.indexValued(valued);
    return results.map((r) => {
      const v = byKey.get(`${r.market}|${r.selection}`);
      if (!v) return r;
      return {
        ...r,
        impliedProbability: v.impliedProbability.value,
        edge: v.edge.value,
        expectedValue: v.expectedValue.value,
        suggestedStakePct: v.stake.bankrollFraction,
      };
    });
  }

  private toResultViews(
    results: ReadonlyArray<PredictionResultRecord>,
    valued: ReadonlyArray<ValuedSelection>,
  ): ValuedResultView[] {
    const byKey = this.indexValued(valued);
    return results.map((r) => {
      const v = byKey.get(`${r.market}|${r.selection}`);
      return {
        market: r.market,
        selection: r.selection,
        modelProbability: r.modelProbability,
        impliedProbability: v ? v.impliedProbability.value : null,
        edge: v ? v.edge.value : null,
        expectedValue: v ? v.expectedValue.value : null,
        suggestedStakePct: v ? v.stake.bankrollFraction : null,
        confidence: r.confidence,
        risk: r.risk,
      };
    });
  }

  private indexValued(valued: ReadonlyArray<ValuedSelection>): Map<string, ValuedSelection> {
    return new Map(valued.map((v) => [`${v.result.market}|${v.result.selection}`, v]));
  }
}
