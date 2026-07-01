// libs/testing/src/use-cases/detect-value-bets.use-case.spec.ts
// Phase-11 DetectValueBetsUseCase wired against the SHARED libs/testing fakes + the REAL pure
// domain services (RiskProfile / ValueCalculator / KellyStake). This is the HEADLINE Feature-Spec-B
// proof: the SAME prediction at risk=10 vs risk=90 yields DIFFERENT recommendations while the
// model probabilities stay BYTE-IDENTICAL. Also proves gating (conservative excludes high-variance
// markets), the stake cap (property test), de-margin/edge/EV math, and the NO_VALUE_FOUND path.
import { DetectValueBetsUseCase } from '@betvision/application';
import { DomainErrorCode } from '@betvision/shared';
import {
  DefaultRiskProfileService,
  DefaultValueCalculator,
  DefaultKellyStakeService,
  RiskAppetite,
  RiskBucket,
  ConfidenceLevel,
  RiskLevel,
  type PredictionResultRecord,
  type OddsSnapshotRecord,
  type PredictionId,
  type MatchId,
} from '@betvision/domain';
import { FakePredictionRepository } from '../fakes/fake-prediction-repository';
import { FakePredictionResultRepository } from '../fakes/fake-prediction-result-repository';
import { FakeOddsRepository } from '../fakes/fake-odds-repository';
import { FakeRecommendationRepository } from '../fakes/fake-recommendation-repository';
import { anOddsSnapshot, aPredictionResultRecord } from '../mothers/value-betting.mother';

const PRED = 'pred-1' as PredictionId;
const MATCH = 'match-1' as MatchId;

// A fixed set of OBJECTIVE probabilities + market odds engineered so the gates bite differently by
// bucket: 1X2 HOME clears everywhere; OU_2_5 OVER clears only on edge (aggressive minEdge); BTTS YES
// only on confidence (Medium < conservative's High); CARDS_OU OVER only on group+volatility.
const RESULTS: ReadonlyArray<PredictionResultRecord> = [
  aPredictionResultRecord({ market: '1X2', selection: 'HOME', modelProbability: 0.6, confidence: ConfidenceLevel.High, risk: RiskLevel.Low }),
  aPredictionResultRecord({ market: '1X2', selection: 'DRAW', modelProbability: 0.25, confidence: ConfidenceLevel.High, risk: RiskLevel.Low }),
  aPredictionResultRecord({ market: '1X2', selection: 'AWAY', modelProbability: 0.15, confidence: ConfidenceLevel.High, risk: RiskLevel.Low }),
  aPredictionResultRecord({ market: 'OU_2_5', selection: 'OVER', modelProbability: 0.56, confidence: ConfidenceLevel.High, risk: RiskLevel.Low }),
  aPredictionResultRecord({ market: 'OU_2_5', selection: 'UNDER', modelProbability: 0.44, confidence: ConfidenceLevel.High, risk: RiskLevel.Low }),
  aPredictionResultRecord({ market: 'BTTS', selection: 'YES', modelProbability: 0.62, confidence: ConfidenceLevel.Medium, risk: RiskLevel.Low }),
  aPredictionResultRecord({ market: 'BTTS', selection: 'NO', modelProbability: 0.38, confidence: ConfidenceLevel.Medium, risk: RiskLevel.Low }),
  aPredictionResultRecord({ market: 'CARDS_OU', selection: 'OVER', modelProbability: 0.62, confidence: ConfidenceLevel.High, risk: RiskLevel.Medium }),
  aPredictionResultRecord({ market: 'CARDS_OU', selection: 'UNDER', modelProbability: 0.38, confidence: ConfidenceLevel.High, risk: RiskLevel.Medium }),
];

const ODDS: ReadonlyArray<OddsSnapshotRecord> = [
  anOddsSnapshot({ matchId: MATCH, market: '1X2', selection: 'HOME', priceDecimal: 1.95 }),
  anOddsSnapshot({ matchId: MATCH, market: '1X2', selection: 'DRAW', priceDecimal: 3.6 }),
  anOddsSnapshot({ matchId: MATCH, market: '1X2', selection: 'AWAY', priceDecimal: 4.2 }),
  anOddsSnapshot({ matchId: MATCH, market: 'OU_2_5', selection: 'OVER', priceDecimal: 1.85 }),
  anOddsSnapshot({ matchId: MATCH, market: 'OU_2_5', selection: 'UNDER', priceDecimal: 1.95 }),
  anOddsSnapshot({ matchId: MATCH, market: 'BTTS', selection: 'YES', priceDecimal: 1.8 }),
  anOddsSnapshot({ matchId: MATCH, market: 'BTTS', selection: 'NO', priceDecimal: 2.0 }),
  anOddsSnapshot({ matchId: MATCH, market: 'CARDS_OU', selection: 'OVER', priceDecimal: 1.9 }),
  anOddsSnapshot({ matchId: MATCH, market: 'CARDS_OU', selection: 'UNDER', priceDecimal: 1.9 }),
];

function makeUseCase(
  results: ReadonlyArray<PredictionResultRecord> = RESULTS,
  odds: ReadonlyArray<OddsSnapshotRecord> = ODDS,
) {
  const predictions = new FakePredictionRepository();
  const predictionResults = new FakePredictionResultRepository();
  const oddsRepo = new FakeOddsRepository();
  const recommendations = new FakeRecommendationRepository();
  return {
    predictions,
    predictionResults,
    oddsRepo,
    recommendations,
    seed: async () => {
      await predictions.save({
        id: PRED,
        matchId: MATCH,
        modelVersion: 'stat-v1',
        inputSnapshotHash: 'hash-1',
      });
      await predictionResults.saveMany(results);
      await oddsRepo.saveSnapshots(odds);
    },
    useCase: new DetectValueBetsUseCase({
      predictions,
      predictionResults,
      odds: oddsRepo,
      recommendations,
      riskProfiles: new DefaultRiskProfileService(),
      valueCalculator: new DefaultValueCalculator(),
      kelly: new DefaultKellyStakeService(),
    }),
  };
}

const selections = (recs: ReadonlyArray<{ market: string; selection: string }>): string[] =>
  recs.map((r) => `${r.market}:${r.selection}`).sort();

describe('DetectValueBetsUseCase — Feature Spec B (risk shapes selection, not truth)', () => {
  it('HEADLINE: risk=10 vs risk=90 → DIFFERENT recommendations, BYTE-IDENTICAL model probabilities', async () => {
    const conservativeCtx = makeUseCase();
    await conservativeCtx.seed();
    const aggressiveCtx = makeUseCase();
    await aggressiveCtx.seed();

    const cons = await conservativeCtx.useCase.execute({ predictionId: PRED, riskAppetite: 10 });
    const aggr = await aggressiveCtx.useCase.execute({ predictionId: PRED, riskAppetite: 90 });
    if (!cons.ok || !aggr.ok) throw new Error('expected both ok');

    // (1) Recommendations DIFFER: conservative surfaces only the strongest, aggressive far more.
    expect(cons.value.riskBucket).toBe(RiskBucket.Conservative);
    expect(aggr.value.riskBucket).toBe(RiskBucket.Aggressive);
    expect(selections(cons.value.recommendations)).toEqual(['1X2:HOME']);
    expect(selections(aggr.value.recommendations)).toEqual([
      '1X2:HOME',
      'BTTS:YES',
      'CARDS_OU:OVER',
      'OU_2_5:OVER',
    ]);
    expect(aggr.value.recommendations.length).toBeGreaterThan(cons.value.recommendations.length);

    // (2) Model probabilities are BYTE-IDENTICAL regardless of the risk setting.
    const probs = (r: typeof cons.value): string =>
      JSON.stringify(
        [...r.results]
          .sort((a, b) => `${a.market}${a.selection}`.localeCompare(`${b.market}${b.selection}`))
          .map((x) => `${x.market}:${x.selection}=${x.modelProbability}`),
      );
    expect(probs(aggr.value)).toBe(probs(cons.value));

    // (3) The echoed appetite/bucket makes the run reproducible + UI-labelable.
    expect(cons.value.riskAppetite).toBe(10);
    expect(aggr.value.riskAppetite).toBe(90);

    console.log(
      '\n[RISK 10 vs 90 PROOF]',
      '\n  risk=10 (conservative) recs:',
      selections(cons.value.recommendations),
      '\n  risk=90 (aggressive)  recs:',
      selections(aggr.value.recommendations),
      '\n  model probs identical:',
      probs(aggr.value) === probs(cons.value),
    );
  });

  it('conservative EXCLUDES high-variance market groups; aggressive allows them', async () => {
    const ctx = makeUseCase();
    await ctx.seed();
    const cons = await ctx.useCase.execute({ predictionId: PRED, riskAppetite: 10 });
    const ctx2 = makeUseCase();
    await ctx2.seed();
    const aggr = await ctx2.useCase.execute({ predictionId: PRED, riskAppetite: 90 });
    if (!cons.ok || !aggr.ok) throw new Error('expected both ok');

    // CARDS_OU (Cards group, Medium volatility) is excluded at conservative, allowed at aggressive.
    expect(selections(cons.value.recommendations)).not.toContain('CARDS_OU:OVER');
    expect(selections(aggr.value.recommendations)).toContain('CARDS_OU:OVER');
  });

  it('best bet = top risk-adjusted EV; alternatives ranked below', async () => {
    const ctx = makeUseCase();
    await ctx.seed();
    const res = await ctx.useCase.execute({ predictionId: PRED, riskAppetite: 90 });
    if (!res.ok) throw new Error('expected ok');

    expect(res.value.bestBet?.isBestBet).toBe(true);
    expect(res.value.recommendations.filter((r) => r.isBestBet)).toHaveLength(1);
    // Ranked by risk-adjusted EV descending.
    const radj = res.value.recommendations.map((r) => r.riskAdjustedExpectedValue);
    expect([...radj].sort((a, b) => b - a)).toEqual(radj);
    expect(res.value.recommendations[0].isBestBet).toBe(true);
  });

  it('computes de-margined implied + edge + EV correctly (SPEC §14)', async () => {
    const ctx = makeUseCase();
    await ctx.seed();
    const res = await ctx.useCase.execute({ predictionId: PRED, riskAppetite: 90 });
    if (!res.ok) throw new Error('expected ok');

    const oneXTwo = res.value.results.filter((r) => r.market === '1X2');
    // De-margining removes the overround → the market's implied set sums to ~1.
    const impliedSum = oneXTwo.reduce((s, r) => s + (r.impliedProbability ?? 0), 0);
    expect(impliedSum).toBeCloseTo(1, 6);

    const home = oneXTwo.find((r) => r.selection === 'HOME');
    // raw implied 1/1.95=0.5128 (overround); de-margined ≈ 0.49852 (< raw).
    expect(home?.impliedProbability).toBeCloseTo(0.49852, 4);
    expect(home?.impliedProbability ?? 1).toBeLessThan(1 / 1.95);
    // edge = modelProb − demarginedImplied = 0.6 − 0.49852.
    expect(home?.edge).toBeCloseTo(0.10148, 4);
    // EV = p*(odds-1) - (1-p) = 0.6*0.95 - 0.4 = 0.17.
    expect(home?.expectedValue).toBeCloseTo(0.17, 6);
  });

  it('persists Recommendations (with riskAppetite/bucket) + updates PredictionResult value fields', async () => {
    const ctx = makeUseCase();
    await ctx.seed();
    await ctx.useCase.execute({ predictionId: PRED, riskAppetite: 90 });

    // Recommendation rows carry the appetite provenance (Feature Spec B reproducibility).
    expect(ctx.recommendations.saved.length).toBe(4);
    for (const rec of ctx.recommendations.saved) {
      expect(rec.riskAppetite).toBe(90);
      expect(rec.riskBucket).toBe(RiskBucket.Aggressive);
    }
    // No duplicate result rows (upsert), and value fields written back for transparency.
    const stored = await ctx.predictionResults.findByPrediction(PRED);
    expect(stored).toHaveLength(RESULTS.length);
    const home = stored.find((r) => r.market === '1X2' && r.selection === 'HOME');
    expect(home?.edge).toBeCloseTo(0.10148, 4);
    expect(home?.suggestedStakePct).toBeGreaterThan(0);
  });

  it('is idempotent per appetite: re-running replaces the set, not appends', async () => {
    const ctx = makeUseCase();
    await ctx.seed();
    await ctx.useCase.execute({ predictionId: PRED, riskAppetite: 90 });
    await ctx.useCase.execute({ predictionId: PRED, riskAppetite: 90 });
    expect(ctx.recommendations.saved.length).toBe(4); // not 8
  });

  it('NO_VALUE_FOUND: nothing clears the gates → empty set + honest hint (not an error)', async () => {
    // Model ≈ de-margined market on both outcomes → every edge below even the aggressive minEdge.
    const flat: PredictionResultRecord[] = [
      aPredictionResultRecord({ market: 'BTTS', selection: 'YES', modelProbability: 0.52, confidence: ConfidenceLevel.High, risk: RiskLevel.Low }),
      aPredictionResultRecord({ market: 'BTTS', selection: 'NO', modelProbability: 0.48, confidence: ConfidenceLevel.High, risk: RiskLevel.Low }),
    ];
    const flatOdds: OddsSnapshotRecord[] = [
      anOddsSnapshot({ matchId: MATCH, market: 'BTTS', selection: 'YES', priceDecimal: 1.8 }),
      anOddsSnapshot({ matchId: MATCH, market: 'BTTS', selection: 'NO', priceDecimal: 2.0 }),
    ];
    const ctx = makeUseCase(flat, flatOdds);
    await ctx.seed();
    const res = await ctx.useCase.execute({ predictionId: PRED, riskAppetite: 90 });
    if (!res.ok) throw new Error('expected ok (no-value is a feature, not an error)');

    expect(res.value.noValueFound).toBe(true);
    expect(res.value.recommendations).toEqual([]);
    expect(res.value.bestBet).toBeNull();
    expect(res.value.hintCode).toBe(DomainErrorCode.NO_VALUE_FOUND);
    // Objective probabilities are still returned untouched.
    expect(res.value.results.find((r) => r.selection === 'YES')?.modelProbability).toBe(0.52);
  });

  it('PREDICTION_NOT_FOUND for an unknown prediction id', async () => {
    const ctx = makeUseCase();
    await ctx.seed();
    const res = await ctx.useCase.execute({ predictionId: 'nope' as PredictionId, riskAppetite: 50 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe(DomainErrorCode.PREDICTION_NOT_FOUND);
  });

  it('rejects an out-of-range risk appetite', async () => {
    const ctx = makeUseCase();
    await ctx.seed();
    const res = await ctx.useCase.execute({ predictionId: PRED, riskAppetite: 150 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe(DomainErrorCode.RISK_APPETITE_OUT_OF_RANGE);
  });

  it('PROPERTY: suggested stake NEVER exceeds the bucket maxStakePctCap (many iterations)', async () => {
    const profiles = new DefaultRiskProfileService();
    let checks = 0;
    for (let i = 0; i < 300; i++) {
      const appetite = Math.floor(pseudoRandom(i * 7 + 1) * 101); // 0..100
      const pHome = 0.2 + pseudoRandom(i * 13 + 3) * 0.6; // 0.2..0.8
      const oddsHome = 1.2 + pseudoRandom(i * 17 + 5) * 4.8; // 1.2..6.0
      const results: PredictionResultRecord[] = [
        aPredictionResultRecord({ market: '1X2', selection: 'HOME', modelProbability: pHome }),
        aPredictionResultRecord({ market: '1X2', selection: 'DRAW', modelProbability: (1 - pHome) / 2 }),
        aPredictionResultRecord({ market: '1X2', selection: 'AWAY', modelProbability: (1 - pHome) / 2 }),
      ];
      const odds: OddsSnapshotRecord[] = [
        anOddsSnapshot({ matchId: MATCH, market: '1X2', selection: 'HOME', priceDecimal: round2(oddsHome) }),
        anOddsSnapshot({ matchId: MATCH, market: '1X2', selection: 'DRAW', priceDecimal: 3.5 }),
        anOddsSnapshot({ matchId: MATCH, market: '1X2', selection: 'AWAY', priceDecimal: 4.0 }),
      ];
      const ctx = makeUseCase(results, odds);
      await ctx.seed();
      const res = await ctx.useCase.execute({ predictionId: PRED, riskAppetite: appetite });
      if (!res.ok) throw new Error(`iteration ${i} failed: ${res.error.code}`);

      const cap = profiles.resolve(unwrapAppetite(appetite)).maxStakePctCap;
      for (const r of res.value.results) {
        if (r.suggestedStakePct !== null) {
          expect(r.suggestedStakePct).toBeLessThanOrEqual(cap);
          expect(r.suggestedStakePct).toBeGreaterThanOrEqual(0);
          checks++;
        }
      }
      for (const rec of res.value.recommendations) {
        expect(rec.suggestedStakePct).toBeLessThanOrEqual(cap);
      }
    }
    expect(checks).toBeGreaterThan(0);
  });
});

// Deterministic PRNG so the property test is reproducible (no flaky randomness).
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}
const round2 = (n: number): number => Math.round(n * 100) / 100;
function unwrapAppetite(value: number): RiskAppetite {
  const r = RiskAppetite.create(value);
  if (!r.ok) throw new Error('bad appetite in test');
  return r.value;
}
