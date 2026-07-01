import { DefaultEloRatingService, ELO_DEFAULTS } from './elo-rating.service';

describe('DefaultEloRatingService', () => {
  const elo = new DefaultEloRatingService();

  describe('expectedScore (golden)', () => {
    it('is exactly 0.5 for equal ratings and no home advantage', () => {
      expect(elo.expectedScore(1500, 1500, 0)).toBeCloseTo(0.5, 12);
    });

    it('is 1/1.1 ≈ 0.909091 for a 400-point edge (classic Elo)', () => {
      // diff = 400 ⇒ 1 / (1 + 10^-1) = 1/1.1
      expect(elo.expectedScore(1900, 1500, 0)).toBeCloseTo(0.9090909, 6);
    });

    it('folds home advantage into the rating diff (100 pts ⇒ ≈0.640065)', () => {
      // 1 / (1 + 10^-0.25), 10^-0.25 = 0.5623413
      expect(elo.expectedScore(1500, 1500, 100)).toBeCloseTo(0.6400649, 6);
    });

    it('is symmetric: expected(home) + expected(away) = 1 (no HA)', () => {
      const eh = elo.expectedScore(1620, 1480, 0);
      const ea = elo.expectedScore(1480, 1620, 0);
      expect(eh + ea).toBeCloseTo(1, 12);
    });
  });

  describe('update (golden, zero-sum)', () => {
    it('moves ±K·(actual − expected) after a home win from parity', () => {
      const r = elo.update({
        homeRating: 1500,
        awayRating: 1500,
        homeScore: 1,
        kFactor: 20,
        homeAdvantage: 0,
      });
      // expected 0.5 ⇒ delta = 20*(1-0.5)=10
      expect(r.expectedHome).toBeCloseTo(0.5, 12);
      expect(r.newHomeRating).toBeCloseTo(1510, 9);
      expect(r.newAwayRating).toBeCloseTo(1490, 9);
    });

    it('conserves total rating (zero-sum) for any outcome', () => {
      const before = 1600 + 1450;
      const r = elo.update({
        homeRating: 1600,
        awayRating: 1450,
        homeScore: 0.5,
        kFactor: 32,
        homeAdvantage: 65,
      });
      expect(r.newHomeRating + r.newAwayRating).toBeCloseTo(before, 9);
    });
  });

  describe('strengthPrior (from features)', () => {
    const base = {
      home_form_points: 0.5,
      away_form_points: 0.5,
      home_avg_goals_for: 1.5,
      home_avg_goals_against: 1.5,
      away_avg_goals_for: 1.5,
      away_avg_goals_against: 1.5,
      sos_home: 0.5,
      sos_away: 0.5,
    };

    it('is neutral (≈0.5 + HA edge) when both sides are identical', () => {
      const prior = elo.strengthPrior(base, 0);
      expect(prior.homeRating).toBeCloseTo(ELO_DEFAULTS.baseRating, 9);
      expect(prior.awayRating).toBeCloseTo(ELO_DEFAULTS.baseRating, 9);
      expect(prior.expectedHome).toBeCloseTo(0.5, 9);
    });

    it('raises the home rating + expectedHome as home form/goal-diff improve (monotonic)', () => {
      const weak = elo.strengthPrior({ ...base, home_form_points: 0.2, home_avg_goals_for: 1.0 }, 0);
      const strong = elo.strengthPrior({ ...base, home_form_points: 0.9, home_avg_goals_for: 2.4 }, 0);
      expect(strong.homeRating).toBeGreaterThan(weak.homeRating);
      expect(strong.expectedHome).toBeGreaterThan(weak.expectedHome);
    });
  });
});
