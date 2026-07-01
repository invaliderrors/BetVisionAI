// libs/domain/src/services/market-derivation.ts
// Phase 10: turn a score matrix into per-market/selection probabilities. PURE + deterministic.
// The statistical model derives 1X2, Over/Under (0.5/1.5/2.5/3.5) and BTTS directly from the
// Poisson/Dixon-Coles grid (SPEC §13 per-market approach). Every derived market's selections
// sum to 1 by construction (they partition the grid).
import type { MarketKey } from '../value-objects/market';
import type { PoissonGoalModel, ScoreMatrix } from './poisson-goal-model.service';
import { clamp01 } from './prob-math';

/** A single raw (pre-calibration) probability for one market selection. */
export interface RawMarketProbability {
  readonly market: MarketKey;
  readonly selection: string;
  readonly probability: number;
}

/** Markets the statistical (Poisson/Dixon-Coles) model produces in Phase 10. */
export const STATISTICAL_MARKETS: ReadonlyArray<MarketKey> = [
  '1X2',
  'OU_0_5',
  'OU_1_5',
  'OU_2_5',
  'OU_3_5',
  'BTTS',
];

/** Over/Under market key → goal line. */
export const OVER_UNDER_LINES: Readonly<Partial<Record<MarketKey, number>>> = {
  OU_0_5: 0.5,
  OU_1_5: 1.5,
  OU_2_5: 2.5,
  OU_3_5: 3.5,
};

export const isStatisticalMarket = (market: MarketKey): boolean =>
  STATISTICAL_MARKETS.includes(market);

/**
 * Derive raw probabilities for the requested markets from the score matrix. Markets the
 * statistical model does not cover are skipped (the caller validates supported markets).
 */
export function deriveMarketProbabilities(
  model: PoissonGoalModel,
  matrix: ScoreMatrix,
  markets: ReadonlyArray<MarketKey>,
): RawMarketProbability[] {
  const out: RawMarketProbability[] = [];
  for (const market of markets) {
    if (market === '1X2') {
      const p = model.oneXTwo(matrix);
      out.push({ market, selection: 'HOME', probability: p.home.value });
      out.push({ market, selection: 'DRAW', probability: p.draw.value });
      out.push({ market, selection: 'AWAY', probability: p.away.value });
      continue;
    }
    const line = OVER_UNDER_LINES[market];
    if (line !== undefined) {
      const over = model.overProbability(matrix, line).value;
      out.push({ market, selection: 'OVER', probability: over });
      out.push({ market, selection: 'UNDER', probability: clamp01(1 - over) });
      continue;
    }
    if (market === 'BTTS') {
      const yes = model.bttsProbability(matrix).value;
      out.push({ market, selection: 'YES', probability: yes });
      out.push({ market, selection: 'NO', probability: clamp01(1 - yes) });
      continue;
    }
    // Unsupported market: skipped intentionally.
  }
  return out;
}
