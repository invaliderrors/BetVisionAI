// libs/domain/src/services/calibration.ts
// Phase 10: calibration seam. Raw model probabilities are honest ONLY if they match observed
// frequencies, so calibration is a FIRST-CLASS step between raw derivation and market output
// (SPEC §12/§13 "calibrated probabilities"). Phase 10 ships the IDENTITY calibrator (a no-op);
// Phase-17 backtesting fits real Platt/isotonic parameters and swaps them in per market WITHOUT
// touching the model or the pipeline shape. PURE + deterministic.
import type { MarketKey } from '../value-objects/market';
import { clamp01, sigmoid, logit } from './prob-math';

/** Maps a single raw probability to a calibrated one in [0,1]. */
export interface Calibrator {
  apply(raw: number): number;
}

/** No-op calibrator (Phase 10 default until fitted params exist). Clamps to [0,1]. */
export class IdentityCalibrator implements Calibrator {
  apply(raw: number): number {
    return clamp01(raw);
  }
}

/**
 * Platt scaling: calibrated = sigmoid(a * logit(raw) + b). With (a=1, b=0) it reduces to
 * identity. `a`/`b` are fitted on held-out outcomes in Phase 17. Provided now so the seam is
 * REAL and unit-testable, not merely declared.
 */
export class PlattCalibrator implements Calibrator {
  constructor(
    private readonly a: number,
    private readonly b: number,
  ) {}

  apply(raw: number): number {
    return clamp01(sigmoid(this.a * logit(raw) + this.b));
  }
}

/**
 * Isotonic (monotonic step) calibrator from a fitted, sorted mapping of raw→calibrated knots.
 * Linear-interpolates between knots; clamps outside the fitted range. Fitting is Phase 17.
 */
export class IsotonicCalibrator implements Calibrator {
  private readonly knots: ReadonlyArray<readonly [number, number]>;

  constructor(knots: ReadonlyArray<readonly [number, number]>) {
    this.knots = [...knots].sort((x, y) => x[0] - y[0]);
  }

  apply(raw: number): number {
    if (this.knots.length === 0) return clamp01(raw);
    const p = clamp01(raw);
    if (p <= this.knots[0][0]) return clamp01(this.knots[0][1]);
    const last = this.knots[this.knots.length - 1];
    if (p >= last[0]) return clamp01(last[1]);
    for (let i = 1; i < this.knots.length; i++) {
      const [x0, y0] = this.knots[i - 1];
      const [x1, y1] = this.knots[i];
      if (p <= x1) {
        const t = x1 === x0 ? 0 : (p - x0) / (x1 - x0);
        return clamp01(y0 + t * (y1 - y0));
      }
    }
    return clamp01(last[1]);
  }
}

/** Resolves the calibrator to use for a given market. */
export interface CalibrationMap {
  for(market: MarketKey): Calibrator;
}

/** Default map: identity for every market (Phase 10). */
export class IdentityCalibrationMap implements CalibrationMap {
  private readonly identity = new IdentityCalibrator();
  for(): Calibrator {
    return this.identity;
  }
}

/** A per-market calibration map backed by a lookup, falling back to identity. */
export class LookupCalibrationMap implements CalibrationMap {
  private readonly identity = new IdentityCalibrator();
  constructor(private readonly byMarket: Partial<Record<MarketKey, Calibrator>>) {}
  for(market: MarketKey): Calibrator {
    return this.byMarket[market] ?? this.identity;
  }
}
