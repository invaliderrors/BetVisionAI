// libs/testing/src/mothers/mothers.spec.ts
import { aProbability, anOdds, aRiskAppetite, aMoney, aStake } from './vo.mother';
import { aModelScoreResult, aMarketProbability } from './model-score.mother';
import { aMatch } from './match.mother';
import { RiskBucket } from '@betvision/domain';

describe('object mothers build valid defaults with overrides', () => {
  it('VO mothers build valid value objects', () => {
    expect(aProbability().value).toBe(0.55);
    expect(aProbability(0.9).value).toBe(0.9);
    expect(anOdds().decimal).toBe(2.0);
    expect(aStake().bankrollFraction).toBe(0.01);
    expect(aMoney().minorUnits).toBe(100000);
  });

  it('aRiskAppetite defaults to the product default (33, conservative)', () => {
    expect(aRiskAppetite().value).toBe(33);
    expect(aRiskAppetite().bucket).toBe(RiskBucket.Conservative);
    expect(aRiskAppetite(90).bucket).toBe(RiskBucket.Aggressive);
  });

  it('model-score mothers support partial overrides', () => {
    expect(aMarketProbability({ selection: 'AWAY' }).selection).toBe('AWAY');
    expect(aModelScoreResult().probabilities).toHaveLength(1);
    expect(aModelScoreResult({ modelVersion: 'v2' }).modelVersion).toBe('v2');
  });

  it('aMatch builds a valid Match aggregate with a canonical label', () => {
    expect(aMatch().label).toBe('Real Madrid vs Barcelona');
    expect(aMatch({ homeName: 'Sevilla' }).label).toBe('Sevilla vs Barcelona');
  });
});
