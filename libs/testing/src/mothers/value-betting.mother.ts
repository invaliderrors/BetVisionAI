// libs/testing/src/mothers/value-betting.mother.ts
// Object mothers for Phase-11 value-betting scenarios: odds snapshots + prediction results with
// tunable objective probabilities, plus the deterministic dev-demo odds set (mirrors seed-dev so
// unit tests exercise the same prices as the DB integration path).
import {
  ConfidenceLevel,
  RiskLevel,
  MARKET_VOLATILITY_BASELINE,
  type OddsSnapshotRecord,
  type PredictionResultRecord,
  type PredictionId,
  type MatchId,
  type MarketKey,
  type IsoDateTime,
} from '@betvision/domain';

const CAPTURED_AT = '2026-02-01T00:00:00.000Z' as IsoDateTime;

export const anOddsSnapshot = (over: Partial<OddsSnapshotRecord> = {}): OddsSnapshotRecord => ({
  matchId: 'match-1' as MatchId,
  bookmaker: 'synthetic-book',
  market: '1X2' as MarketKey,
  selection: 'HOME',
  priceDecimal: 2.0,
  capturedAt: CAPTURED_AT,
  ...over,
});

export const aPredictionResultRecord = (
  over: Partial<PredictionResultRecord> = {},
): PredictionResultRecord => {
  const market = (over.market ?? '1X2') as MarketKey;
  return {
    predictionId: 'pred-1' as PredictionId,
    market,
    selection: 'HOME',
    modelProbability: 0.6,
    confidence: ConfidenceLevel.High,
    risk: MARKET_VOLATILITY_BASELINE[market] ?? RiskLevel.Low,
    ...over,
  };
};

/** The synthetic dev-demo odds (mirrors `seed-dev.ts` DEMO_ODDS) for a given match id. */
export const demoMatchOdds = (matchId: string): OddsSnapshotRecord[] =>
  (
    [
      { market: '1X2', selection: 'HOME', priceDecimal: 1.95 },
      { market: '1X2', selection: 'DRAW', priceDecimal: 3.6 },
      { market: '1X2', selection: 'AWAY', priceDecimal: 4.2 },
      { market: 'OU_2_5', selection: 'OVER', priceDecimal: 1.85 },
      { market: 'OU_2_5', selection: 'UNDER', priceDecimal: 1.95 },
      { market: 'BTTS', selection: 'YES', priceDecimal: 1.8 },
      { market: 'BTTS', selection: 'NO', priceDecimal: 2.0 },
    ] as ReadonlyArray<{ market: MarketKey; selection: string; priceDecimal: number }>
  ).map((o) =>
    anOddsSnapshot({
      matchId: matchId as MatchId,
      market: o.market,
      selection: o.selection,
      priceDecimal: o.priceDecimal,
    }),
  );
