// libs/domain/src/services/calibration-metrics.ts
// Phase 10: honesty metrics for calibrated probabilities (SPEC §12/§13). PURE + deterministic.
// These quantify how well predicted probabilities match observed binary outcomes:
//   - Brier score  = mean squared error of the probability vs the 0/1 outcome (lower = better).
//   - Log loss     = mean negative log-likelihood (lower = better; punishes confident misses).
// Phase-17 backtesting computes these over held-out seasons + reliability curves; Phase 10 uses
// them in tests to prove the model's probabilities are measurable, not merely asserted.

export interface ProbabilityOutcome {
  /** Predicted probability of the event in [0,1]. */
  readonly probability: number;
  /** Observed outcome: true if the event occurred. */
  readonly occurred: boolean;
}

const clampP = (p: number): number => Math.min(1 - 1e-12, Math.max(1e-12, p));

/** Mean Brier score over a sample. Empty sample ⇒ 0. */
export function brierScore(sample: ReadonlyArray<ProbabilityOutcome>): number {
  if (sample.length === 0) return 0;
  const sum = sample.reduce((acc, s) => {
    const outcome = s.occurred ? 1 : 0;
    const diff = s.probability - outcome;
    return acc + diff * diff;
  }, 0);
  return sum / sample.length;
}

/** Mean logarithmic loss over a sample (natural log). Empty sample ⇒ 0. */
export function logLoss(sample: ReadonlyArray<ProbabilityOutcome>): number {
  if (sample.length === 0) return 0;
  const sum = sample.reduce((acc, s) => {
    const p = clampP(s.probability);
    return acc + (s.occurred ? -Math.log(p) : -Math.log(1 - p));
  }, 0);
  return sum / sample.length;
}
