// libs/domain/src/value-objects/levels.ts
// Ordinal enums with comparison helpers used by Risk Appetite gating.

export enum ConfidenceLevel {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}

export enum RiskLevel {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}

const ORDINAL: Readonly<Record<'low' | 'medium' | 'high', number>> = {
  low: 0,
  medium: 1,
  high: 2,
};

/** confidence >= threshold (e.g. result confidence atLeast profile.minConfidence). */
export const confidenceAtLeast = (value: ConfidenceLevel, min: ConfidenceLevel): boolean =>
  ORDINAL[value] >= ORDINAL[min];

/** volatility <= ceiling (e.g. market volatility atMost profile.maxMarketVolatility). */
export const riskAtMost = (value: RiskLevel, max: RiskLevel): boolean =>
  ORDINAL[value] <= ORDINAL[max];
