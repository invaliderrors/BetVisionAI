// libs/domain/src/services/statistical-prediction.service.ts
// Phase 10: the pure "brain" of the first Statistical Prediction Engine. Composes Elo (strength
// prior) + Poisson/Dixon-Coles (score matrix) + market derivation + calibration into a single
// deterministic pass over a FeatureVector, producing per-market probabilities. PURE: no I/O, no
// clock, no vendor imports.
//
// THE ONLY PRODUCER OF PROBABILITIES for the statistical model (SPEC §12/§13). It consumes ONLY
// the feature vector — never odds, never risk appetite. The infrastructure adapter
// (StatisticalPredictionModel) is a thin DI wrapper around this service so a future Python
// model-service can slot in behind the same PredictionModelPort.
import type { FeatureVector } from '../ports/feature-store.port';
import type {
  ModelScoreResult,
  MarketProbabilityDto,
} from '../ports/prediction-model.port';
import type { MarketKey } from '../value-objects/market';
import { MARKET_VOLATILITY_BASELINE } from '../value-objects/market';
import { ConfidenceLevel } from '../value-objects/levels';
import { DefaultEloRatingService, type EloRatingService } from './elo-rating.service';
import {
  DefaultPoissonGoalModel,
  DEFAULT_DIXON_COLES_RHO,
  DEFAULT_MAX_GOALS,
  type PoissonGoalModel,
} from './poisson-goal-model.service';
import { expectedGoals } from './goal-expectancy';
import {
  deriveMarketProbabilities,
  STATISTICAL_MARKETS,
  isStatisticalMarket,
  type RawMarketProbability,
} from './market-derivation';
import {
  IdentityCalibrationMap,
  type CalibrationMap,
} from './calibration';
import { clamp01 } from './prob-math';

/** Statistical model version stamped on every Prediction (reproducibility, SPEC §13). */
export const STAT_MODEL_VERSION = 'stat-v1';

export interface StatisticalModelConfig {
  readonly maxGoals?: number;
  readonly dixonColesRho?: number;
  readonly homeAdvantageElo?: number;
}

/** Core feature keys whose presence signals a data-complete prediction (drives confidence). */
const CORE_FEATURE_KEYS: ReadonlyArray<string> = [
  'home_avg_goals_for',
  'home_avg_goals_against',
  'away_avg_goals_for',
  'away_avg_goals_against',
  'home_avg_xg_for',
  'away_avg_xg_for',
  'home_form_points',
  'away_form_points',
];

export class StatisticalPredictionService {
  readonly modelVersion = STAT_MODEL_VERSION;

  constructor(
    private readonly elo: EloRatingService = new DefaultEloRatingService(),
    private readonly poisson: PoissonGoalModel = new DefaultPoissonGoalModel(),
    private readonly calibration: CalibrationMap = new IdentityCalibrationMap(),
    private readonly config: StatisticalModelConfig = {},
  ) {}

  /** Markets this model can score. Callers validate requests against this set. */
  supportedMarkets(): ReadonlyArray<MarketKey> {
    return STATISTICAL_MARKETS;
  }

  /**
   * Score a feature vector into per-market probabilities. Deterministic: identical
   * `(features, markets)` ⇒ identical output, and `inputSnapshotHash` echoes the feature hash so
   * a stored prediction reproduces exactly.
   */
  score(features: FeatureVector, markets: ReadonlyArray<MarketKey>): ModelScoreResult {
    const f = features.features;

    // 1) Elo strength prior from features → 2) expected goal rates → 3) score matrix.
    const prior = this.elo.strengthPrior(f, this.config.homeAdvantageElo);
    const { homeLambda, awayLambda } = expectedGoals(f, prior.expectedHome);
    const matrix = this.poisson.scoreMatrix({
      homeLambda,
      awayLambda,
      maxGoals: this.config.maxGoals ?? DEFAULT_MAX_GOALS,
      dixonColesRho: this.config.dixonColesRho ?? DEFAULT_DIXON_COLES_RHO,
    });

    // Confidence: data completeness × agreement between the Elo prior and the Poisson matrix.
    const poissonHomeWin = this.poisson.oneXTwo(matrix).home.value;
    const confidence = deriveConfidence(f, prior.expectedHome, poissonHomeWin);

    // 4) Derive requested markets → 5) calibrate → 6) renormalise each market to sum to 1.
    const requested = markets.filter(isStatisticalMarket);
    const raw = deriveMarketProbabilities(this.poisson, matrix, requested);
    const calibrated = this.applyCalibrationAndNormalize(raw);

    const probabilities: MarketProbabilityDto[] = calibrated.map((r) => ({
      market: r.market,
      selection: r.selection,
      modelProbability: r.probability,
      confidence,
      marketVolatility: MARKET_VOLATILITY_BASELINE[r.market],
    }));

    return {
      modelVersion: this.modelVersion,
      inputSnapshotHash: features.snapshotHash,
      probabilities,
    };
  }

  /**
   * Apply the per-market calibrator to each selection, then renormalise every market's selections
   * to sum to 1. Renormalisation keeps the sum-to-1 invariant intact even if a fitted calibrator
   * distorts it (identity leaves it unchanged).
   */
  private applyCalibrationAndNormalize(
    raw: ReadonlyArray<RawMarketProbability>,
  ): RawMarketProbability[] {
    const byMarket = new Map<MarketKey, RawMarketProbability[]>();
    for (const item of raw) {
      const calibrator = this.calibration.for(item.market);
      const value = clamp01(calibrator.apply(item.probability));
      const group = byMarket.get(item.market) ?? [];
      group.push({ ...item, probability: value });
      byMarket.set(item.market, group);
    }

    const out: RawMarketProbability[] = [];
    for (const group of byMarket.values()) {
      const total = group.reduce((sum, g) => sum + g.probability, 0);
      for (const g of group) {
        out.push({ ...g, probability: total > 0 ? g.probability / total : g.probability });
      }
    }
    return out;
  }
}

/**
 * Confidence = 0.5·completeness + 0.5·agreement, bucketed to Low/Medium/High.
 *   - completeness: fraction of core features that are present + non-zero.
 *   - agreement: 1 − |Elo P(home) − Poisson P(home)|; the two independent strength signals
 *     agreeing is a genuine intra-model confidence signal (a stand-in for stat↔ML agreement
 *     until the ML component lands).
 */
function deriveConfidence(
  features: Readonly<Record<string, number>>,
  eloHomeWin: number,
  poissonHomeWin: number,
): ConfidenceLevel {
  const present = CORE_FEATURE_KEYS.filter((k) => {
    const v = features[k];
    return Number.isFinite(v) && v !== 0;
  }).length;
  const completeness = present / CORE_FEATURE_KEYS.length;
  const agreement = clamp01(1 - Math.abs(eloHomeWin - poissonHomeWin));
  const score = 0.5 * completeness + 0.5 * agreement;

  if (score >= 0.75) return ConfidenceLevel.High;
  if (score >= 0.45) return ConfidenceLevel.Medium;
  return ConfidenceLevel.Low;
}
