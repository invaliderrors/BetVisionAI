// libs/ui/src/lib/risk-bucket.ts
// Pure, framework-free risk-bucket helpers (Feature Spec B). Kept in their own module — NOT the
// interactive RiskSlider — so server components (and RiskMeter) can use them without pulling in a
// client boundary.

export type RiskBucket = 'conservative' | 'balanced' | 'aggressive';

/** Inclusive upper bounds that split the 0..100 dial into the three appetite buckets. */
export const RISK_BUCKET_BOUNDS = { conservative: 33, balanced: 66 } as const;

/** Map a slider value to its risk bucket (Feature Spec B: 0–33 / 34–66 / 67–100). */
export function riskBucketOf(value: number): RiskBucket {
  if (value <= RISK_BUCKET_BOUNDS.conservative) return 'conservative';
  if (value <= RISK_BUCKET_BOUNDS.balanced) return 'balanced';
  return 'aggressive';
}
