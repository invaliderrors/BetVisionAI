// libs/domain/src/features/feature-set.spec.ts
import {
  FEATURE_KEYS,
  FEATURE_VERSION,
  FeatureEngineeringService,
  canonicalizeFeatures,
  canonicalFeatureJson,
  hashFeatures,
  type FeatureInputs,
} from './feature-set';

const aStats = (over: Partial<FeatureInputs['home']['stats']> = {}) => ({
  avgGoalsFor: 1.8,
  avgGoalsAgainst: 1.0,
  avgXgFor: 1.7,
  avgXgAgainst: 1.1,
  avgCornersFor: 5.5,
  avgCornersAgainst: 4.2,
  avgCardsFor: 1.6,
  avgCardsAgainst: 2.1,
  cleanSheets: 6,
  ...over,
});

const aForm = (over: Partial<FeatureInputs['home']['form']> = {}) => ({
  results: ['W', 'W', 'D', 'L', 'W'] as Array<'W' | 'D' | 'L'>,
  goalsFor: [2, 3, 1, 0, 2],
  goalsAgainst: [0, 1, 1, 2, 1],
  ...over,
});

const anInputs = (over: Partial<FeatureInputs> = {}): FeatureInputs => ({
  home: { stats: aStats(), form: aForm() },
  away: {
    stats: aStats({ avgGoalsFor: 1.2, avgGoalsAgainst: 1.4, cleanSheets: 3 }),
    form: aForm({ results: ['L', 'D', 'W', 'L', 'D'] }),
  },
  h2h: [
    { homeGoals: 2, awayGoals: 1 },
    { homeGoals: 0, awayGoals: 0 },
    { homeGoals: 3, awayGoals: 2 },
  ],
  restDaysHome: 6,
  restDaysAway: 4,
  strengthOfScheduleHome: 0.6,
  strengthOfScheduleAway: 0.55,
  absenceImpactHome: 0,
  absenceImpactAway: 0,
  refereeCardsTendency: 0,
  ...over,
});

describe('canonicalizeFeatures', () => {
  it('sorts keys and rounds to fixed precision (byte-stable JSON)', () => {
    const a = canonicalFeatureJson({ b: 1.123456789, a: 2 });
    const b = canonicalFeatureJson({ a: 2.0, b: 1.123456789 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":2,"b":1.123457}');
  });

  it('coerces non-finite values to 0', () => {
    const c = canonicalizeFeatures({ x: Number.NaN, y: Number.POSITIVE_INFINITY });
    expect(c).toEqual({ x: 0, y: 0 });
  });
});

describe('hashFeatures', () => {
  it('is deterministic for identical inputs', () => {
    const f = { home_form_points: 0.75, away_form_points: 0.4 };
    expect(hashFeatures('m1', FEATURE_VERSION, f)).toBe(
      hashFeatures('m1', FEATURE_VERSION, f),
    );
  });

  it('is insensitive to key order but sensitive to values, matchId and version', () => {
    const base = hashFeatures('m1', 'fv1', { a: 1, b: 2 });
    expect(hashFeatures('m1', 'fv1', { b: 2, a: 1 })).toBe(base);
    expect(hashFeatures('m1', 'fv1', { a: 1, b: 3 })).not.toBe(base);
    expect(hashFeatures('m2', 'fv1', { a: 1, b: 2 })).not.toBe(base);
    expect(hashFeatures('m1', 'fv2', { a: 1, b: 2 })).not.toBe(base);
  });
});

describe('FeatureEngineeringService', () => {
  const service = new FeatureEngineeringService();

  it('emits exactly the canonical feature keys', () => {
    const features = service.computeFeatures(anInputs());
    expect(Object.keys(features).sort()).toEqual([...FEATURE_KEYS].sort());
  });

  it('is a pure function — identical inputs yield identical output', () => {
    const inputs = anInputs();
    expect(service.computeFeatures(inputs)).toEqual(service.computeFeatures(inputs));
  });

  it('weights recent form by recency (most-recent-first)', () => {
    const recentWins = service.computeFeatures(
      anInputs({ home: { stats: aStats(), form: aForm({ results: ['W', 'L', 'L', 'L', 'L'] }) } }),
    ).home_form_points;
    const recentLosses = service.computeFeatures(
      anInputs({ home: { stats: aStats(), form: aForm({ results: ['L', 'W', 'W', 'W', 'W'] }) } }),
    ).home_form_points;
    // Same tally (1W,4L vs 4W,1L differ) — assert the recent result dominates within equal tallies:
    const recentW = service.computeFeatures(
      anInputs({ home: { stats: aStats(), form: aForm({ results: ['W', 'D'] }) } }),
    ).home_form_points;
    const recentD = service.computeFeatures(
      anInputs({ home: { stats: aStats(), form: aForm({ results: ['D', 'W'] }) } }),
    ).home_form_points;
    expect(recentW).toBeGreaterThan(recentD); // W first outweighs D first
    expect(recentWins).toBeLessThan(recentLosses);
  });

  it('computes head-to-head aggregates', () => {
    const f = service.computeFeatures(anInputs());
    expect(f.h2h_matches).toBe(3);
    expect(f.h2h_home_win_rate).toBeCloseTo(2 / 3, 6);
    expect(f.h2h_avg_total_goals).toBeCloseTo(8 / 3, 6);
  });

  it('defaults head-to-head aggregates to 0 when there are no meetings', () => {
    const f = service.computeFeatures(anInputs({ h2h: [] }));
    expect(f.h2h_matches).toBe(0);
    expect(f.h2h_home_win_rate).toBe(0);
    expect(f.h2h_avg_total_goals).toBe(0);
  });
});
