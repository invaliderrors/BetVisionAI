// libs/testing/src/mothers/feature.mother.ts
// Object mothers for the Phase-9 feature pipeline: pure feature inputs, the TeamStats read-model
// projection (used to prove the leakage cutoff), and a canonical FeatureVector.
import {
  FEATURE_VERSION,
  FeatureEngineeringService,
  buildFeatureVector,
  type FeatureInputs,
  type FeatureVector,
  type FeatureMap,
  type TeamStatsSnapshot,
  type FormSnapshot,
  type TeamStatsView,
  type MatchId,
  type SeasonId,
  type IsoDateTime,
  type Venue,
} from '@betvision/domain';

export const aTeamStatsSnapshot = (
  over: Partial<TeamStatsSnapshot> = {},
): TeamStatsSnapshot => ({
  avgGoalsFor: 1.6,
  avgGoalsAgainst: 1.0,
  avgXgFor: 1.5,
  avgXgAgainst: 1.1,
  avgCornersFor: 5.4,
  avgCornersAgainst: 4.6,
  avgCardsFor: 1.7,
  avgCardsAgainst: 2.0,
  cleanSheets: 5,
  ...over,
});

export const aFormSnapshot = (over: Partial<FormSnapshot> = {}): FormSnapshot => ({
  results: ['W', 'W', 'D', 'L', 'W'],
  goalsFor: [2, 1, 1, 0, 3],
  goalsAgainst: [0, 0, 1, 2, 1],
  ...over,
});

export const aFeatureInputs = (over: Partial<FeatureInputs> = {}): FeatureInputs => ({
  home: { stats: aTeamStatsSnapshot(), form: aFormSnapshot() },
  away: {
    stats: aTeamStatsSnapshot({ avgGoalsFor: 1.1, avgGoalsAgainst: 1.5, cleanSheets: 2 }),
    form: aFormSnapshot({ results: ['L', 'D', 'W', 'D', 'L'] }),
  },
  h2h: [
    { homeGoals: 2, awayGoals: 1 },
    { homeGoals: 1, awayGoals: 1 },
  ],
  restDaysHome: 6,
  restDaysAway: 5,
  strengthOfScheduleHome: 0.6,
  strengthOfScheduleAway: 0.5,
  absenceImpactHome: 0,
  absenceImpactAway: 0,
  refereeCardsTendency: 0,
  ...over,
});

/** A fully-populated feature map computed from the canonical inputs. */
export const aFeatureMap = (over: Partial<FeatureInputs> = {}): FeatureMap =>
  new FeatureEngineeringService().computeFeatures(aFeatureInputs(over));

/** A canonical, hashed FeatureVector for the default synthetic match. */
export const aComputedFeatureVector = (
  matchId: MatchId = 'match-1' as MatchId,
): FeatureVector => buildFeatureVector(matchId, FEATURE_VERSION, aFeatureMap());

/** A TeamStats read-model row. `computedAt` is what the cutoff filter checks against kickoff. */
export const aTeamStatsView = (over: Partial<TeamStatsView> = {}): TeamStatsView => ({
  seasonId: 'season-2526' as SeasonId,
  venue: 'all' as Venue,
  window: 5,
  avgGoalsFor: 1.6,
  avgGoalsAgainst: 1.0,
  avgXgFor: 1.5,
  avgXgAgainst: 1.1,
  cleanSheets: 5,
  form: 'WWDLW',
  computedAt: '2025-12-20T00:00:00.000Z' as IsoDateTime,
  ...over,
});
