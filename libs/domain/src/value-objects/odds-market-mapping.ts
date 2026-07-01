// libs/domain/src/value-objects/odds-market-mapping.ts
// =============================================================================================
//  MARKET-TAXONOMY RESOLUTION (BACKLOG "Market taxonomy divergence") — Phase 11.
// =============================================================================================
// Three taxonomies historically disagreed:
//   1. the domain `MarketKey` union (e.g. `1X2`, `OU_2_5`, `BTTS`, `CORRECT_SCORE`)
//   2. the persistence `MarketGroup` enum (8 values: MATCH_RESULT/HANDICAP/GOALS/HALVES/
//      CORNERS/CARDS/SCORERS/CORRECT_SCORE) vs the domain `MarketGroup` (6 values)
//   3. free-form odds `selection` strings ("OVER_2_5", "1", "GG", ...) vs the model's canonical
//      selection tokens ("OVER", "HOME", "YES", ...)
//
// This value object is the single, explicit reconciliation:
//   - `MarketKey` is the FK both `OddsSnapshot.marketKey` and `PredictionResult.marketKey` point
//     at (Phase 4 aligned `BettingMarket.key` to the domain union), so MARKET keys already match
//     1:1 — no market-key translation is needed, only selection canonicalization.
//   - `canonicalSelection()` folds bookmaker/model selection spellings onto ONE canonical token so
//     a model probability can be joined to its odds regardless of how each side spelled the pick.
//   - `PERSISTENCE_MARKET_GROUP` / `DOMAIN_GROUP_TO_PERSISTENCE` document the 6↔8 group collapse
//     (domain `Specials` = persistence {HALVES, SCORERS, CORRECT_SCORE}) as pure string data, so
//     no layer has to hard-code the divergence again. PURE: no Prisma / vendor imports.
import type { MarketKey } from './market';
import { MarketGroup, MARKET_GROUP } from './market';

/** The persistence-side (Prisma) market-group names, as string literals (no Prisma import). */
export type PersistenceMarketGroup =
  | 'MATCH_RESULT'
  | 'HANDICAP'
  | 'GOALS'
  | 'HALVES'
  | 'CORNERS'
  | 'CARDS'
  | 'SCORERS'
  | 'CORRECT_SCORE';

/** Each model market → its persistence `MarketGroup` enum value. Mirrors the seed catalog. */
export const PERSISTENCE_MARKET_GROUP: Readonly<Record<MarketKey, PersistenceMarketGroup>> = {
  '1X2': 'MATCH_RESULT',
  DOUBLE_CHANCE: 'MATCH_RESULT',
  DNB: 'MATCH_RESULT',
  OU_0_5: 'GOALS',
  OU_1_5: 'GOALS',
  OU_2_5: 'GOALS',
  OU_3_5: 'GOALS',
  BTTS: 'GOALS',
  AH: 'HANDICAP',
  CORNERS_OU: 'CORNERS',
  TEAM_CORNERS: 'CORNERS',
  CARDS_OU: 'CARDS',
  TEAM_CARDS: 'CARDS',
  HTFT: 'HALVES',
  ANYTIME_SCORER: 'SCORERS',
  CORRECT_SCORE: 'CORRECT_SCORE',
};

/**
 * The 6→8 collapse: the domain's coarse `Specials` group fans out to three persistence groups.
 * Risk Appetite gates on the DOMAIN group (6 values); this table is the audit trail of how the
 * finer persistence catalog rolls up into it.
 */
export const DOMAIN_GROUP_TO_PERSISTENCE: Readonly<
  Record<MarketGroup, ReadonlyArray<PersistenceMarketGroup>>
> = {
  [MarketGroup.Result]: ['MATCH_RESULT'],
  [MarketGroup.Goals]: ['GOALS'],
  [MarketGroup.Corners]: ['CORNERS'],
  [MarketGroup.Cards]: ['CARDS'],
  [MarketGroup.Handicap]: ['HANDICAP'],
  [MarketGroup.Specials]: ['HALVES', 'SCORERS', 'CORRECT_SCORE'],
};

/** 1X2 / Double Chance / DNB selection spellings → canonical HOME|DRAW|AWAY. */
const RESULT_ALIASES: Readonly<Record<string, string>> = {
  '1': 'HOME',
  X: 'DRAW',
  '2': 'AWAY',
  H: 'HOME',
  D: 'DRAW',
  A: 'AWAY',
  HOME: 'HOME',
  DRAW: 'DRAW',
  AWAY: 'AWAY',
};

/** BTTS selection spellings → canonical YES|NO. */
const BTTS_ALIASES: Readonly<Record<string, string>> = {
  YES: 'YES',
  NO: 'NO',
  GG: 'YES',
  NG: 'NO',
  BTTS_YES: 'YES',
  BTTS_NO: 'NO',
};

/** Markets whose selections are an OVER/UNDER pair (line encoded in the market key, not selection). */
const OVER_UNDER_MARKETS: ReadonlySet<MarketKey> = new Set<MarketKey>([
  'OU_0_5',
  'OU_1_5',
  'OU_2_5',
  'OU_3_5',
  'CORNERS_OU',
  'CARDS_OU',
]);

/**
 * Fold a raw selection string (model- or bookmaker-authored) onto ONE canonical token for its
 * market, so `PredictionResult.selection` and `OddsSnapshot.selection` join deterministically.
 * Unknown spellings pass through normalized (trim + upper + spaces→underscore) rather than throw —
 * exotic markets (correct score "2-1", handicap "HOME_-1") keep their meaningful token.
 */
export function canonicalSelection(market: MarketKey, rawSelection: string): string {
  const s = rawSelection.trim().toUpperCase().replace(/\s+/g, '_');
  const group = MARKET_GROUP[market];

  if (group === MarketGroup.Result) return RESULT_ALIASES[s] ?? s;
  if (market === 'BTTS') return BTTS_ALIASES[s] ?? s;
  if (OVER_UNDER_MARKETS.has(market)) {
    if (s === 'O' || s.startsWith('OVER')) return 'OVER';
    if (s === 'U' || s.startsWith('UNDER')) return 'UNDER';
    return s;
  }
  return s;
}

/** True when a model selection and an odds selection denote the same outcome of the same market. */
export function selectionsMatch(
  market: MarketKey,
  modelSelection: string,
  oddsSelection: string,
): boolean {
  return canonicalSelection(market, modelSelection) === canonicalSelection(market, oddsSelection);
}
