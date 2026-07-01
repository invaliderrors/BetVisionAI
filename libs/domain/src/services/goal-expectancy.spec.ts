import { expectedGoals, GOAL_EXPECTANCY_DEFAULTS } from './goal-expectancy';

const baseFeatures = {
  home_avg_goals_for: 1.5,
  home_avg_goals_against: 1.2,
  home_avg_xg_for: 1.4,
  home_avg_xg_against: 1.2,
  home_form_goals_for: 1.5,
  home_form_goals_against: 1.2,
  away_avg_goals_for: 1.3,
  away_avg_goals_against: 1.4,
  away_avg_xg_for: 1.3,
  away_avg_xg_against: 1.4,
  away_form_goals_for: 1.3,
  away_form_goals_against: 1.4,
};

describe('expectedGoals', () => {
  it('produces positive, finite rates within the configured clamp', () => {
    const { homeLambda, awayLambda } = expectedGoals(baseFeatures, 0.5);
    expect(homeLambda).toBeGreaterThan(GOAL_EXPECTANCY_DEFAULTS.minLambda);
    expect(homeLambda).toBeLessThanOrEqual(GOAL_EXPECTANCY_DEFAULTS.maxLambda);
    expect(awayLambda).toBeGreaterThan(GOAL_EXPECTANCY_DEFAULTS.minLambda);
  });

  it('applies the home-advantage multiplier (home > away for a mirrored matchup)', () => {
    const mirrored = {
      home_avg_goals_for: 1.4, home_avg_goals_against: 1.4,
      home_avg_xg_for: 1.4, home_avg_xg_against: 1.4,
      home_form_goals_for: 1.4, home_form_goals_against: 1.4,
      away_avg_goals_for: 1.4, away_avg_goals_against: 1.4,
      away_avg_xg_for: 1.4, away_avg_xg_against: 1.4,
      away_form_goals_for: 1.4, away_form_goals_against: 1.4,
    };
    const { homeLambda, awayLambda } = expectedGoals(mirrored, 0.5);
    expect(homeLambda).toBeGreaterThan(awayLambda);
  });

  it('is monotonic: raising home attack features raises home λ (property)', () => {
    const low = expectedGoals(baseFeatures, 0.5).homeLambda;
    const high = expectedGoals(
      { ...baseFeatures, home_avg_goals_for: 2.6, home_avg_xg_for: 2.5, home_form_goals_for: 2.6 },
      0.5,
    ).homeLambda;
    expect(high).toBeGreaterThan(low);
  });

  it('is monotonic: raising both attacks raises total expected goals (property)', () => {
    const lowTotal = ((): number => {
      const g = expectedGoals(baseFeatures, 0.5);
      return g.homeLambda + g.awayLambda;
    })();
    const highTotal = ((): number => {
      const g = expectedGoals(
        {
          ...baseFeatures,
          home_avg_goals_for: 2.4, home_avg_xg_for: 2.3, home_form_goals_for: 2.4,
          away_avg_goals_for: 2.2, away_avg_xg_for: 2.1, away_form_goals_for: 2.2,
        },
        0.5,
      );
      return g.homeLambda + g.awayLambda;
    })();
    expect(highTotal).toBeGreaterThan(lowTotal);
  });

  it('tilts rates toward the Elo-favoured side (expectedHome > 0.5 ⇒ home λ up, away λ down)', () => {
    const neutral = expectedGoals(baseFeatures, 0.5);
    const homeFav = expectedGoals(baseFeatures, 0.8);
    expect(homeFav.homeLambda).toBeGreaterThan(neutral.homeLambda);
    expect(homeFav.awayLambda).toBeLessThan(neutral.awayLambda);
  });
});
