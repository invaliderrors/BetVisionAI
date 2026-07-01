// libs/domain/src/value-objects/market.ts
// Market taxonomy. `MarketGroup` is what Risk Appetite filters on (conservative
// excludes high-variance groups like correct-score / anytime-scorer).

export enum MarketGroup {
  Result = 'result', // 1X2, Double Chance, Draw No Bet
  Goals = 'goals', // Over/Under, BTTS
  Corners = 'corners',
  Cards = 'cards',
  Handicap = 'handicap', // Asian Handicap
  Specials = 'specials', // Correct Score, Anytime Scorer, HT/FT — high variance
}

export type MarketKey =
  | '1X2'
  | 'DOUBLE_CHANCE'
  | 'DNB'
  | 'OU_0_5'
  | 'OU_1_5'
  | 'OU_2_5'
  | 'OU_3_5'
  | 'BTTS'
  | 'AH'
  | 'CORNERS_OU'
  | 'TEAM_CORNERS'
  | 'CARDS_OU'
  | 'TEAM_CARDS'
  | 'HTFT'
  | 'ANYTIME_SCORER'
  | 'CORRECT_SCORE';

/** Static map; mirrors the BettingMarket catalog `group` column (SPEC §9). */
export const MARKET_GROUP: Readonly<Record<MarketKey, MarketGroup>> = {
  '1X2': MarketGroup.Result,
  DOUBLE_CHANCE: MarketGroup.Result,
  DNB: MarketGroup.Result,
  OU_0_5: MarketGroup.Goals,
  OU_1_5: MarketGroup.Goals,
  OU_2_5: MarketGroup.Goals,
  OU_3_5: MarketGroup.Goals,
  BTTS: MarketGroup.Goals,
  AH: MarketGroup.Handicap,
  CORNERS_OU: MarketGroup.Corners,
  TEAM_CORNERS: MarketGroup.Corners,
  CARDS_OU: MarketGroup.Cards,
  TEAM_CARDS: MarketGroup.Cards,
  HTFT: MarketGroup.Specials,
  ANYTIME_SCORER: MarketGroup.Specials,
  CORRECT_SCORE: MarketGroup.Specials,
};
