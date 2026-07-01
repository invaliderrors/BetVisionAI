import {
  StatisticalPredictionService,
  STAT_MODEL_VERSION,
} from './statistical-prediction.service';
import { buildFeatureVector, FEATURE_VERSION } from '../features/feature-set';
import type { FeatureVector } from '../ports/feature-store.port';
import type { MatchId } from '../ports/shared.dto';
import type { MarketKey } from '../value-objects/market';
import { ConfidenceLevel } from '../value-objects/levels';
import type { MarketProbabilityDto } from '../ports/prediction-model.port';

/** Pick a selection's probability, failing loudly if the model omitted it. */
const pick = (
  probs: ReadonlyArray<MarketProbabilityDto>,
  selection: string,
): number => {
  const found = probs.find((p) => p.selection === selection);
  if (!found) throw new Error(`missing selection ${selection}`);
  return found.modelProbability;
};

// A complete-enough feature map for the keys the statistical model reads.
const BASE_FEATURES: Record<string, number> = {
  home_form_points: 0.6,
  away_form_points: 0.45,
  home_form_goals_for: 1.6,
  home_form_goals_against: 1.0,
  away_form_goals_for: 1.2,
  away_form_goals_against: 1.4,
  home_avg_goals_for: 1.7,
  home_avg_goals_against: 0.9,
  away_avg_goals_for: 1.3,
  away_avg_goals_against: 1.4,
  home_avg_xg_for: 1.6,
  home_avg_xg_against: 1.0,
  away_avg_xg_for: 1.3,
  away_avg_xg_against: 1.35,
  sos_home: 0.55,
  sos_away: 0.5,
};

const vector = (over: Record<string, number> = {}, id = 'match-1'): FeatureVector =>
  buildFeatureVector(id as MatchId, FEATURE_VERSION, { ...BASE_FEATURES, ...over });

const ALL_MARKETS: MarketKey[] = ['1X2', 'OU_0_5', 'OU_1_5', 'OU_2_5', 'OU_3_5', 'BTTS'];

describe('StatisticalPredictionService', () => {
  const svc = new StatisticalPredictionService();

  it('stamps the model version and echoes the feature snapshot hash', () => {
    const fv = vector();
    const result = svc.score(fv, ALL_MARKETS);
    expect(result.modelVersion).toBe(STAT_MODEL_VERSION);
    expect(result.inputSnapshotHash).toBe(fv.snapshotHash);
  });

  it('produces every probability in [0,1] (property)', () => {
    const result = svc.score(vector(), ALL_MARKETS);
    for (const p of result.probabilities) {
      expect(p.modelProbability).toBeGreaterThanOrEqual(0);
      expect(p.modelProbability).toBeLessThanOrEqual(1);
    }
  });

  it('1X2 sums to ~1 across many feature variations (property)', () => {
    const variations: Record<string, number>[] = [
      {},
      { home_avg_goals_for: 2.5, away_avg_goals_for: 0.8 },
      { home_avg_goals_for: 0.7, away_avg_goals_for: 2.4 },
      { home_form_points: 0.95, away_form_points: 0.1 },
      { home_avg_goals_against: 2.0, away_avg_goals_against: 2.0 },
      { sos_home: 0.9, sos_away: 0.2 },
    ];
    for (const over of variations) {
      const result = svc.score(vector(over), ['1X2']);
      const sum = result.probabilities.reduce((s, p) => s + p.modelProbability, 0);
      expect(sum).toBeCloseTo(1, 6);
    }
  });

  it('Over/Under and BTTS each sum to ~1', () => {
    const result = svc.score(vector(), ['OU_2_5', 'BTTS']);
    const ou = result.probabilities.filter((p) => p.market === 'OU_2_5');
    const btts = result.probabilities.filter((p) => p.market === 'BTTS');
    expect(ou.reduce((s, p) => s + p.modelProbability, 0)).toBeCloseTo(1, 9);
    expect(btts.reduce((s, p) => s + p.modelProbability, 0)).toBeCloseTo(1, 9);
  });

  it('is reproducible: identical features ⇒ identical probabilities + hash', () => {
    const fv = vector();
    const a = svc.score(fv, ALL_MARKETS);
    const b = svc.score(fv, ALL_MARKETS);
    expect(b.inputSnapshotHash).toBe(a.inputSnapshotHash);
    expect(JSON.stringify(b.probabilities)).toBe(JSON.stringify(a.probabilities));
  });

  it('is monotonic: stronger attacking features ⇒ higher P(Over 2.5) (property)', () => {
    const overOf = (fv: FeatureVector): number =>
      pick(svc.score(fv, ['OU_2_5']).probabilities, 'OVER');

    const lowScoring = vector({
      home_avg_goals_for: 0.8, home_avg_xg_for: 0.8, home_form_goals_for: 0.8,
      away_avg_goals_for: 0.7, away_avg_xg_for: 0.7, away_form_goals_for: 0.7,
    });
    const highScoring = vector({
      home_avg_goals_for: 2.6, home_avg_xg_for: 2.5, home_form_goals_for: 2.6,
      away_avg_goals_for: 2.4, away_avg_xg_for: 2.3, away_form_goals_for: 2.4,
    });
    expect(overOf(highScoring)).toBeGreaterThan(overOf(lowScoring));
  });

  it('favours the home side when it is clearly stronger', () => {
    const fv = vector({
      home_avg_goals_for: 2.4, home_avg_goals_against: 0.7,
      away_avg_goals_for: 0.9, away_avg_goals_against: 1.9,
      home_form_points: 0.9, away_form_points: 0.2,
    });
    const oneXTwo = svc.score(fv, ['1X2']).probabilities;
    expect(pick(oneXTwo, 'HOME')).toBeGreaterThan(pick(oneXTwo, 'AWAY'));
  });

  it('reports HIGH confidence when the core features are complete + signals agree', () => {
    const result = svc.score(vector(), ['1X2']);
    expect(result.probabilities[0].confidence).toBe(ConfidenceLevel.High);
  });

  it('ignores markets it does not support (e.g. CORRECT_SCORE)', () => {
    const result = svc.score(vector(), ['1X2', 'CORRECT_SCORE'] as MarketKey[]);
    const markets = new Set(result.probabilities.map((p) => p.market));
    expect(markets.has('1X2')).toBe(true);
    expect(markets.has('CORRECT_SCORE')).toBe(false);
  });

  it('attaches the intrinsic market volatility baseline', () => {
    const result = svc.score(vector(), ['1X2']);
    expect(result.probabilities[0].marketVolatility).toBe('low');
  });
});
