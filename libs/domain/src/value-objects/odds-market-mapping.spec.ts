// libs/domain/src/value-objects/odds-market-mapping.spec.ts
// Proves the market-taxonomy reconciliation (BACKLOG "Market taxonomy divergence"): model and
// bookmaker selection spellings fold onto one canonical token, and the 6↔8 group collapse is
// documented as pure data so no layer re-hard-codes the divergence.
import {
  canonicalSelection,
  selectionsMatch,
  PERSISTENCE_MARKET_GROUP,
  DOMAIN_GROUP_TO_PERSISTENCE,
} from './odds-market-mapping';
import { MarketGroup, MARKET_GROUP, type MarketKey } from './market';

describe('OddsMarketMapping — canonicalSelection', () => {
  it('folds 1X2 spellings (1/X/2, H/D/A) onto HOME|DRAW|AWAY', () => {
    expect(canonicalSelection('1X2', '1')).toBe('HOME');
    expect(canonicalSelection('1X2', 'X')).toBe('DRAW');
    expect(canonicalSelection('1X2', '2')).toBe('AWAY');
    expect(canonicalSelection('1X2', 'home')).toBe('HOME');
    expect(canonicalSelection('1X2', 'A')).toBe('AWAY');
  });

  it('folds Over/Under line-suffixed selections onto OVER|UNDER', () => {
    expect(canonicalSelection('OU_2_5', 'OVER_2_5')).toBe('OVER');
    expect(canonicalSelection('OU_2_5', 'UNDER_2_5')).toBe('UNDER');
    expect(canonicalSelection('OU_2_5', 'O')).toBe('OVER');
    expect(canonicalSelection('OU_2_5', 'over')).toBe('OVER');
    expect(canonicalSelection('CARDS_OU', 'Under')).toBe('UNDER');
  });

  it('folds BTTS spellings (GG/NG) onto YES|NO', () => {
    expect(canonicalSelection('BTTS', 'GG')).toBe('YES');
    expect(canonicalSelection('BTTS', 'NG')).toBe('NO');
    expect(canonicalSelection('BTTS', 'yes')).toBe('YES');
  });

  it('normalizes unknown/exotic selections instead of throwing', () => {
    expect(canonicalSelection('CORRECT_SCORE', '2-1')).toBe('2-1');
    expect(canonicalSelection('ANYTIME_SCORER', 'player 7')).toBe('PLAYER_7');
  });

  it('joins a model selection to a differently-spelled odds selection', () => {
    expect(selectionsMatch('OU_2_5', 'OVER', 'OVER_2_5')).toBe(true);
    expect(selectionsMatch('1X2', 'HOME', '1')).toBe(true);
    expect(selectionsMatch('1X2', 'HOME', 'AWAY')).toBe(false);
  });
});

describe('OddsMarketMapping — group reconciliation (6 domain ↔ 8 persistence)', () => {
  it('maps every MarketKey to a persistence group', () => {
    for (const key of Object.keys(MARKET_GROUP) as MarketKey[]) {
      expect(PERSISTENCE_MARKET_GROUP[key]).toBeDefined();
    }
  });

  it('collapses the persistence groups back onto the domain groups consistently', () => {
    // Every MarketKey's persistence group must roll up to its domain group.
    for (const key of Object.keys(MARKET_GROUP) as MarketKey[]) {
      const domainGroup = MARKET_GROUP[key];
      const persistence = PERSISTENCE_MARKET_GROUP[key];
      expect(DOMAIN_GROUP_TO_PERSISTENCE[domainGroup]).toContain(persistence);
    }
  });

  it('documents domain Specials = persistence {HALVES, SCORERS, CORRECT_SCORE}', () => {
    expect(DOMAIN_GROUP_TO_PERSISTENCE[MarketGroup.Specials]).toEqual([
      'HALVES',
      'SCORERS',
      'CORRECT_SCORE',
    ]);
  });
});
