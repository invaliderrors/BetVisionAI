// libs/shared/src/domain-error.ts
// Errors carry a STABLE machine code + structured params. They NEVER carry a
// localized human string — the interface layer resolves `code`+`params` via I18nPort.

export type ErrorParam = string | number | boolean | null;
export type ErrorParams = Readonly<Record<string, ErrorParam>>;

/** Catalog of domain error codes. One source of truth; mirrored by i18n message keys. */
export const DomainErrorCode = {
  // value-object validation
  PROBABILITY_OUT_OF_RANGE: 'domain.vo.probability_out_of_range',
  ODDS_NOT_GREATER_THAN_ONE: 'domain.vo.odds_not_greater_than_one',
  IMPLIED_PROBABILITY_OUT_OF_RANGE: 'domain.vo.implied_probability_out_of_range',
  EDGE_OUT_OF_RANGE: 'domain.vo.edge_out_of_range',
  STAKE_OUT_OF_RANGE: 'domain.vo.stake_out_of_range',
  STAKE_EXCEEDS_CAP: 'domain.vo.stake_exceeds_cap',
  MONEY_INVALID_AMOUNT: 'domain.vo.money_invalid_amount',
  MONEY_CURRENCY_MISMATCH: 'domain.vo.money_currency_mismatch',
  RISK_APPETITE_OUT_OF_RANGE: 'domain.vo.risk_appetite_out_of_range',
  RISK_APPETITE_NOT_INTEGER: 'domain.vo.risk_appetite_not_integer',
  NOT_FINITE_NUMBER: 'domain.vo.not_finite_number',
  // domain gating / pipeline
  NO_VALUE_FOUND: 'domain.value.no_value_found',
  MARKET_NOT_SUPPORTED: 'domain.prediction.market_not_supported',
} as const;

export type DomainErrorCode = (typeof DomainErrorCode)[keyof typeof DomainErrorCode];

export class DomainError {
  readonly _tag = 'DomainError' as const;
  constructor(
    readonly code: DomainErrorCode | string,
    readonly params: ErrorParams = {},
  ) {}

  static of(code: DomainErrorCode | string, params: ErrorParams = {}): DomainError {
    return new DomainError(code, params);
  }
}

/**
 * Thrown ONLY for "this should be impossible" internal invariants (programmer error),
 * never for user-facing/expected failures. Surfaces as 500, not a localized message.
 */
export class InvariantViolationError extends Error {
  readonly _tag = 'InvariantViolationError' as const;
  constructor(message: string) {
    super(message);
    this.name = 'InvariantViolationError';
  }
}
