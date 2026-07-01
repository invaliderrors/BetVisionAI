import { MARKET_GROUP, MarketGroup, MarketKey } from './market';

describe('market taxonomy', () => {
  it('maps every MarketKey to a MarketGroup', () => {
    const keys = Object.keys(MARKET_GROUP) as MarketKey[];
    expect(keys.length).toBe(16);
    for (const k of keys) {
      expect(Object.values(MarketGroup)).toContain(MARKET_GROUP[k]);
    }
  });

  it('classifies high-variance markets as Specials', () => {
    expect(MARKET_GROUP.CORRECT_SCORE).toBe(MarketGroup.Specials);
    expect(MARKET_GROUP.ANYTIME_SCORER).toBe(MarketGroup.Specials);
    expect(MARKET_GROUP.HTFT).toBe(MarketGroup.Specials);
  });

  it('classifies core markets into Result / Goals', () => {
    expect(MARKET_GROUP['1X2']).toBe(MarketGroup.Result);
    expect(MARKET_GROUP.OU_2_5).toBe(MarketGroup.Goals);
    expect(MARKET_GROUP.BTTS).toBe(MarketGroup.Goals);
  });
});
