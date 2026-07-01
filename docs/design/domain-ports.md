# BetVision AI — Domain Layer Ports, Value Objects & Service Contracts

> **Scope:** Implementation-ready TypeScript stubs for `libs/domain` and `libs/shared`.
> **Framework-free.** No NestJS, no Prisma, no vendor SDK imports anywhere in this document.
> Source: `BetVision-AI-SPEC.md` §7 (Hexagonal), §13 (Prediction Engine), §14 (Value Betting), §15 (Data Sources);
> `BetVision-AI-Implementation-Prompts.md` Feature Spec A (i18n), Feature Spec B (Risk Appetite), Phase 3 (Hexagonal Foundation).
>
> **Status:** Design stub — paste into the listed file paths and fill the `// TODO` bodies. Signatures and types are final.

---

## 0. Architectural guardrails (read first — these shape every type below)

The domain layer is deliberately structured so the following invariants are **type-enforced**, not merely documented:

1. **Probabilities flow OUT of models, never back IN.** `PredictionModelPort` is the *only* producer of `Probability`. Nothing downstream (value betting, risk, LLM) can mint or mutate a `Probability` — they can only read it.
2. **The LLM only explains.** `LlmExplanationPort` *receives* already-computed, read-only numbers and *returns narrative strings only*. Its return type contains **no** `Probability`, `Edge`, `ExpectedValue`, or `Stake` field, so it is structurally impossible for the explanation layer to alter a number.
3. **Risk Appetite shapes *selection*, not *truth*.** `RiskAppetite` → `RiskProfile` feeds **gating** (`edge ≥ minEdge`, `confidence ≥ minConfidence`, `volatility ≤ maxMarketVolatility`, market group allowed) and **staking** (fractional Kelly cap). It is never an input to `PredictionModelPort`. Same fixture at risk 10 vs risk 90 ⇒ different recommendations, byte-identical model probabilities.
4. **Domain returns codes, not localized prose.** Every failure is a `DomainError(code, params)`. Localization happens at the interface layer via `I18nPort`. The domain has zero hardcoded user-facing strings.
5. **Dependency direction is law:** `domain → shared` only. No `application`, `infrastructure`, NestJS, Prisma, or HTTP types cross into this layer.

Data-flow the types enforce:

```
providers ─▶ canonical DTOs ─▶ features ─▶ PredictionModelPort ─▶ Probability (immutable)
                                                                      │
                                                 ┌────────────────────┘
                                                 ▼
   Odds ─▶ ValueCalculator ─▶ Edge / EV ─▶ RiskProfile gate ─▶ KellyStakeService ─▶ Stake
                                                 │
                                                 ▼
                          read-only numbers ─▶ LlmExplanationPort ─▶ narrative (strings only)
```

---

## 1. Shared primitives — `libs/shared`

### 1.1 `Result<T, E>` — `libs/shared/src/result.ts`

```ts
// libs/shared/src/result.ts
// A total, allocation-cheap result type. Domain factories and use cases return this
// instead of throwing for *expected* failures (validation, not-found, gating).

export type Result<T, E = DomainError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export const isOk = <T, E>(r: Result<T, E>): r is { ok: true; value: T } => r.ok;
export const isErr = <T, E>(r: Result<T, E>): r is { ok: false; error: E } => !r.ok;

/** Map the success channel; pass errors through untouched. */
export const map = <T, U, E>(r: Result<T, E>, f: (t: T) => U): Result<U, E> =>
  r.ok ? ok(f(r.value)) : r;

/** Monadic chain for composing fallible steps without nested ifs. */
export const flatMap = <T, U, E>(r: Result<T, E>, f: (t: T) => Result<U, E>): Result<U, E> =>
  r.ok ? f(r.value) : r;

/** Collect a list of results into a result of a list (fails on the first error). */
export const all = <T, E>(rs: ReadonlyArray<Result<T, E>>): Result<T[], E> => {
  const out: T[] = [];
  for (const r of rs) {
    if (!r.ok) return r;
    out.push(r.value);
  }
  return ok(out);
};

/** Escape hatch for call sites that have already proven success. */
export const unwrap = <T, E>(r: Result<T, E>): T => {
  if (r.ok) return r.value;
  throw new InvariantViolationError(`unwrap() on Err: ${JSON.stringify((r as { error: unknown }).error)}`);
};
```

### 1.2 `DomainError` — `libs/shared/src/domain-error.ts`

```ts
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
```

### 1.3 Guard / assertion helper — `libs/shared/src/guard.ts`

```ts
// libs/shared/src/guard.ts
// Two complementary tools:
//  - `Guard.*` returns `DomainError | null` for EXPECTED validation (compose into Result factories).
//  - `invariant(...)` throws for IMPOSSIBLE states (defense in depth inside already-valid VOs).

import { DomainError, DomainErrorCode, ErrorParams, InvariantViolationError } from './domain-error';

export type GuardResult = DomainError | null;

export const Guard = {
  finiteNumber(value: number, field: string): GuardResult {
    return Number.isFinite(value)
      ? null
      : DomainError.of(DomainErrorCode.NOT_FINITE_NUMBER, { field });
  },

  inClosedRange(value: number, min: number, max: number, code: string, field: string): GuardResult {
    return value >= min && value <= max
      ? null
      : DomainError.of(code, { field, value, min, max });
  },

  greaterThan(value: number, bound: number, code: string, field: string): GuardResult {
    return value > bound ? null : DomainError.of(code, { field, value, bound });
  },

  isInteger(value: number, code: string, field: string): GuardResult {
    return Number.isInteger(value) ? null : DomainError.of(code, { field, value });
  },

  /** Returns the first non-null guard, or null if all pass. */
  firstError(...checks: GuardResult[]): GuardResult {
    for (const c of checks) if (c !== null) return c;
    return null;
  },
} as const;

/** Hard assertion for impossible states. Use sparingly; never for user input. */
export function invariant(condition: unknown, message: string, _params?: ErrorParams): asserts condition {
  if (!condition) throw new InvariantViolationError(message);
}
```

---

## 2. Value Objects — `libs/domain/src/value-objects`

All VOs are **immutable** (`readonly` fields, frozen), **validated at construction**, and exposed via a static `create()` factory returning `Result<VO, DomainError>`. Private constructors prevent bypassing invariants. Equality is by value.

### 2.1 Numeric VOs — probability, odds, edge, EV, stake

```ts
// libs/domain/src/value-objects/probability.ts
import { Result, ok, err } from '@betvision/shared';
import { DomainError, DomainErrorCode, Guard } from '@betvision/shared';

/** Calibrated model probability in the closed interval [0, 1]. */
export class Probability {
  private constructor(readonly value: number) {
    Object.freeze(this);
  }

  static create(value: number): Result<Probability, DomainError> {
    const error = Guard.firstError(
      Guard.finiteNumber(value, 'probability'),
      Guard.inClosedRange(value, 0, 1, DomainErrorCode.PROBABILITY_OUT_OF_RANGE, 'probability'),
    );
    return error ? err(error) : ok(new Probability(value));
  }

  complement(): Probability {
    return new Probability(1 - this.value);
  }

  equals(other: Probability): boolean {
    return Math.abs(this.value - other.value) < Number.EPSILON;
  }
}
```

```ts
// libs/domain/src/value-objects/odds.ts
import { Result, ok, err, DomainError, DomainErrorCode, Guard } from '@betvision/shared';
import { ImpliedProbability } from './implied-probability';

/** Decimal (European) odds, strictly greater than 1.0. */
export class Odds {
  private constructor(readonly decimal: number) {
    Object.freeze(this);
  }

  static create(decimal: number): Result<Odds, DomainError> {
    const error = Guard.firstError(
      Guard.finiteNumber(decimal, 'odds'),
      Guard.greaterThan(decimal, 1, DomainErrorCode.ODDS_NOT_GREATER_THAN_ONE, 'odds'),
    );
    return error ? err(error) : ok(new Odds(decimal));
  }

  /** Raw 1/odds implied probability — bookmaker margin still included (marginRemoved=false). */
  toImpliedProbability(): ImpliedProbability {
    // value is always within (0,1) because decimal > 1, so this cannot fail.
    return ImpliedProbability.fromOdds(this);
  }

  /** Net profit multiple on a 1-unit win (odds − 1). */
  get netReturn(): number {
    return this.decimal - 1;
  }
}
```

```ts
// libs/domain/src/value-objects/implied-probability.ts
import { Result, ok, err, DomainError, DomainErrorCode, Guard, invariant } from '@betvision/shared';
import type { Odds } from './odds';

/**
 * Probability implied by market odds. Distinct from Probability because it tracks
 * whether the bookmaker margin (overround) has been removed — a fair baseline for `Edge`.
 */
export class ImpliedProbability {
  private constructor(
    readonly value: number,
    readonly marginRemoved: boolean,
  ) {
    Object.freeze(this);
  }

  static create(value: number, marginRemoved: boolean): Result<ImpliedProbability, DomainError> {
    const error = Guard.firstError(
      Guard.finiteNumber(value, 'impliedProbability'),
      Guard.inClosedRange(value, 0, 1, DomainErrorCode.IMPLIED_PROBABILITY_OUT_OF_RANGE, 'impliedProbability'),
    );
    return error ? err(error) : ok(new ImpliedProbability(value, marginRemoved));
  }

  /** Internal: odds.decimal > 1 guarantees (0,1); construction is infallible here. */
  static fromOdds(odds: Odds): ImpliedProbability {
    const v = 1 / odds.decimal;
    invariant(v > 0 && v < 1, 'implied prob from odds must be in (0,1)');
    return new ImpliedProbability(v, false);
  }
}
```

```ts
// libs/domain/src/value-objects/edge.ts
import { Result, ok, err, DomainError, DomainErrorCode, Guard } from '@betvision/shared';
import type { Probability } from './probability';
import type { ImpliedProbability } from './implied-probability';

/** Signed edge in [-1, 1]: modelProb − impliedProb (margin-adjusted implied recommended). */
export class Edge {
  private constructor(readonly value: number) {
    Object.freeze(this);
  }

  static create(value: number): Result<Edge, DomainError> {
    const error = Guard.firstError(
      Guard.finiteNumber(value, 'edge'),
      Guard.inClosedRange(value, -1, 1, DomainErrorCode.EDGE_OUT_OF_RANGE, 'edge'),
    );
    return error ? err(error) : ok(new Edge(value));
  }

  static between(model: Probability, implied: ImpliedProbability): Result<Edge, DomainError> {
    return Edge.create(model.value - implied.value);
  }

  get isPositive(): boolean {
    return this.value > 0;
  }

  /** True when the edge clears the profile's minimum threshold. */
  meets(minEdge: number): boolean {
    return this.value >= minEdge;
  }
}
```

```ts
// libs/domain/src/value-objects/expected-value.ts
import { Result, ok, err, DomainError, Guard } from '@betvision/shared';
import type { Probability } from './probability';
import type { Odds } from './odds';

/** Expected value per 1 unit staked. Can be negative; not range-bounded beyond finiteness. */
export class ExpectedValue {
  private constructor(readonly value: number) {
    Object.freeze(this);
  }

  static create(value: number): Result<ExpectedValue, DomainError> {
    const error = Guard.finiteNumber(value, 'expectedValue');
    return error ? err(error) : ok(new ExpectedValue(value));
  }

  /** EV = p*(odds−1) − (1−p). Reference formula from SPEC §14. */
  static of(model: Probability, odds: Odds): Result<ExpectedValue, DomainError> {
    const p = model.value;
    return ExpectedValue.create(p * (odds.decimal - 1) - (1 - p));
  }

  get isPositive(): boolean {
    return this.value > 0;
  }
}
```

```ts
// libs/domain/src/value-objects/stake.ts
import { Result, ok, err, DomainError, DomainErrorCode, Guard } from '@betvision/shared';
import type { Money } from './money';

/**
 * Suggested stake expressed as a FRACTION OF BANKROLL in [0, 1].
 * Conservative-by-design: produced only via KellyStakeService (fractional Kelly + hard cap).
 * `0` is a valid, common value (gated out / below threshold).
 */
export class Stake {
  private constructor(readonly bankrollFraction: number) {
    Object.freeze(this);
  }

  static create(bankrollFraction: number): Result<Stake, DomainError> {
    const error = Guard.firstError(
      Guard.finiteNumber(bankrollFraction, 'stake'),
      Guard.inClosedRange(bankrollFraction, 0, 1, DomainErrorCode.STAKE_OUT_OF_RANGE, 'stake'),
    );
    return error ? err(error) : ok(new Stake(bankrollFraction));
  }

  /** Enforce the profile's hard cap. Returns an error if the raw size exceeds the cap. */
  static capped(rawFraction: number, maxStakePctCap: number): Result<Stake, DomainError> {
    if (rawFraction > maxStakePctCap) {
      return err(DomainError.of(DomainErrorCode.STAKE_EXCEEDS_CAP, { rawFraction, maxStakePctCap }));
    }
    return Stake.create(rawFraction);
  }

  static zero(): Stake {
    return new Stake(0);
  }

  get pct(): number {
    return this.bankrollFraction * 100;
  }

  /** Materialize against a concrete bankroll (purely derived; no side effects). */
  appliedTo(bankroll: Money): Money {
    return bankroll.scale(this.bankrollFraction);
  }
}
```

```ts
// libs/domain/src/value-objects/money.ts
import { Result, ok, err, DomainError, DomainErrorCode, Guard, invariant } from '@betvision/shared';

export type CurrencyCode = 'EUR' | 'USD' | 'GBP'; // extend via config; ISO-4217.

/** Money stored as integer MINOR units (cents) to avoid float drift. */
export class Money {
  private constructor(
    readonly minorUnits: number,
    readonly currency: CurrencyCode,
  ) {
    Object.freeze(this);
  }

  static fromMinor(minorUnits: number, currency: CurrencyCode): Result<Money, DomainError> {
    const error = Guard.firstError(
      Guard.finiteNumber(minorUnits, 'money'),
      Guard.isInteger(minorUnits, DomainErrorCode.MONEY_INVALID_AMOUNT, 'money'),
    );
    return error ? err(error) : ok(new Money(minorUnits, currency));
  }

  static fromMajor(amount: number, currency: CurrencyCode): Result<Money, DomainError> {
    return Money.fromMinor(Math.round(amount * 100), currency);
  }

  /** Scale by a unit-less fraction (e.g. a Stake). Rounds to nearest minor unit. */
  scale(fraction: number): Money {
    return new Money(Math.round(this.minorUnits * fraction), this.currency);
  }

  add(other: Money): Money {
    invariant(other.currency === this.currency, 'currency mismatch in Money.add');
    return new Money(this.minorUnits + other.minorUnits, this.currency);
  }

  get major(): number {
    return this.minorUnits / 100;
  }
}
```

### 2.2 Categorical VOs — confidence, risk, market grouping

```ts
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

const ORDINAL: Readonly<Record<'low' | 'medium' | 'high', number>> = { low: 0, medium: 1, high: 2 };

/** confidence ≥ threshold  (e.g. result confidence atLeast profile.minConfidence). */
export const confidenceAtLeast = (value: ConfidenceLevel, min: ConfidenceLevel): boolean =>
  ORDINAL[value] >= ORDINAL[min];

/** volatility ≤ ceiling  (e.g. market volatility atMost profile.maxMarketVolatility). */
export const riskAtMost = (value: RiskLevel, max: RiskLevel): boolean =>
  ORDINAL[value] <= ORDINAL[max];
```

```ts
// libs/domain/src/value-objects/market.ts
// Market taxonomy. `MarketGroup` is what Risk Appetite filters on (conservative
// excludes high-variance groups like correct-score / anytime-scorer).

export enum MarketGroup {
  Result = 'result',       // 1X2, Double Chance, Draw No Bet
  Goals = 'goals',         // Over/Under, BTTS
  Corners = 'corners',
  Cards = 'cards',
  Handicap = 'handicap',   // Asian Handicap
  Specials = 'specials',   // Correct Score, Anytime Scorer, HT/FT — high variance
}

export type MarketKey =
  | '1X2' | 'DOUBLE_CHANCE' | 'DNB'
  | 'OU_0_5' | 'OU_1_5' | 'OU_2_5' | 'OU_3_5'
  | 'BTTS'
  | 'AH'
  | 'CORNERS_OU' | 'TEAM_CORNERS'
  | 'CARDS_OU' | 'TEAM_CARDS'
  | 'HTFT' | 'ANYTIME_SCORER' | 'CORRECT_SCORE';

/** Static map; mirrors the BettingMarket catalog `group` column (SPEC §9). */
export const MARKET_GROUP: Readonly<Record<MarketKey, MarketGroup>> = {
  '1X2': MarketGroup.Result,
  DOUBLE_CHANCE: MarketGroup.Result,
  DNB: MarketGroup.Result,
  OU_0_5: MarketGroup.Goals,
  OU_1_5: MarketGroup.Goals,
  OU_2_5: MarketGroup.Goals,
  OU_3_5: MarketGroup.Goals,
  BTTS: MarketGroup.Goals,
  AH: MarketGroup.Handicap,
  CORNERS_OU: MarketGroup.Corners,
  TEAM_CORNERS: MarketGroup.Corners,
  CARDS_OU: MarketGroup.Cards,
  TEAM_CARDS: MarketGroup.Cards,
  HTFT: MarketGroup.Specials,
  ANYTIME_SCORER: MarketGroup.Specials,
  CORRECT_SCORE: MarketGroup.Specials,
};
```

### 2.3 ⭐ Risk Appetite + Risk Profile — `libs/domain/src/value-objects/risk-appetite.ts`

```ts
// libs/domain/src/value-objects/risk-appetite.ts
import { Result, ok, err, DomainError, DomainErrorCode, Guard } from '@betvision/shared';
import { ConfidenceLevel, RiskLevel } from './levels';
import { MarketGroup } from './market';

export enum RiskBucket {
  Conservative = 'conservative', // 0–33
  Balanced = 'balanced',         // 34–66
  Aggressive = 'aggressive',     // 67–100
}

/**
 * RiskAppetite — integer 0..100. 0 = most conservative, 100 = most aggressive.
 * GUARDRAIL: this NEVER feeds PredictionModelPort. It only shapes selection & staking.
 * Immutable, validated. The same fixture at any appetite yields identical model probabilities.
 */
export class RiskAppetite {
  private constructor(readonly value: number) {
    Object.freeze(this);
  }

  static create(value: number): Result<RiskAppetite, DomainError> {
    const error = Guard.firstError(
      Guard.finiteNumber(value, 'riskAppetite'),
      Guard.isInteger(value, DomainErrorCode.RISK_APPETITE_NOT_INTEGER, 'riskAppetite'),
      Guard.inClosedRange(value, 0, 100, DomainErrorCode.RISK_APPETITE_OUT_OF_RANGE, 'riskAppetite'),
    );
    return error ? err(error) : ok(new RiskAppetite(value));
  }

  /** Product default per Feature Spec B (slider default 33). */
  static default(): RiskAppetite {
    return new RiskAppetite(33);
  }

  get bucket(): RiskBucket {
    if (this.value <= 33) return RiskBucket.Conservative;
    if (this.value <= 66) return RiskBucket.Balanced;
    return RiskBucket.Aggressive;
  }
}

/**
 * RiskProfile — the resolved, concrete gating + staking parameters.
 * Produced by RiskProfileService.resolve(riskAppetite). Pure data; no behavior.
 */
export interface RiskProfile {
  /** Minimum edge a selection must clear to be surfaced (higher when conservative). */
  readonly minEdge: number;
  /** Minimum model confidence required. */
  readonly minConfidence: ConfidenceLevel;
  /** Highest market volatility allowed (conservative excludes high-variance markets). */
  readonly maxMarketVolatility: RiskLevel;
  /** Fraction of full Kelly applied to staking. (0,1) — NEVER 1.0. */
  readonly kellyFraction: number;
  /** Hard cap on stake as a fraction of bankroll (e.g. 0.01 = 1%). */
  readonly maxStakePctCap: number;
  /** Market groups permitted at this appetite (conservative drops `Specials`). */
  readonly allowedMarketGroups: ReadonlyArray<MarketGroup>;
  /** Echoed for reproducibility / UI ("analyzed at risk 45/100 (balanced)"). */
  readonly bucket: RiskBucket;
}
```

---

## 3. Domain services — `libs/domain/src/services`

Stateless, pure calculations. Interfaces define the contract; reference implementations are given where the prompt calls for an explicit "contract" (Risk mapping, EV/edge, Kelly, Dixon-Coles note).

### 3.1 EloRatingService

```ts
// libs/domain/src/services/elo-rating.service.ts

export interface EloMatchOutcome {
  readonly homeRating: number;
  readonly awayRating: number;
  /** Actual result for the home side: 1 win, 0.5 draw, 0 loss. */
  readonly homeScore: 0 | 0.5 | 1;
  readonly kFactor: number;        // sensitivity, e.g. 20–40
  readonly homeAdvantage: number;  // rating points added to home, e.g. 60–100
}

export interface EloRatingUpdate {
  readonly newHomeRating: number;
  readonly newAwayRating: number;
  readonly expectedHome: number;   // pre-match expected score in (0,1)
}

export interface EloRatingService {
  /** P(home "wins" in Elo terms) given ratings + home advantage. */
  expectedScore(homeRating: number, awayRating: number, homeAdvantage: number): number;
  /** Apply the K-factor update after an observed result. */
  update(outcome: EloMatchOutcome): EloRatingUpdate;
}
```

### 3.2 PoissonGoalModel (with Dixon-Coles correction)

```ts
// libs/domain/src/services/poisson-goal-model.service.ts
import type { Probability } from '../value-objects/probability';

export interface GoalExpectancyInput {
  readonly homeLambda: number;   // expected home goals (Elo + form + xG derived)
  readonly awayLambda: number;   // expected away goals
  readonly maxGoals?: number;    // matrix truncation, default 10
  /**
   * Dixon-Coles low-score dependency parameter (rho). When provided, the model applies
   * the Dixon-Coles correction to the 0-0/1-0/0-1/1-1 cells to fix the independence
   * assumption Poisson makes about low scores. When omitted, plain Poisson is used.
   */
  readonly dixonColesRho?: number;
}

/** Probability grid where cell[h][a] = P(home scores h, away scores a). */
export interface ScoreMatrix {
  readonly grid: ReadonlyArray<ReadonlyArray<number>>;
  readonly maxGoals: number;
}

export interface OneXTwoProbabilities {
  readonly home: Probability;
  readonly draw: Probability;
  readonly away: Probability;
}

export interface PoissonGoalModel {
  /** Build the (Dixon-Coles-corrected) score matrix from expected goals. */
  scoreMatrix(input: GoalExpectancyInput): ScoreMatrix;
  /** Collapse the matrix into 1X2 by summing home-win / draw / away-win cells. */
  oneXTwo(matrix: ScoreMatrix): OneXTwoProbabilities;
  /** P(total goals over `line`) — Over/Under derivation. */
  overProbability(matrix: ScoreMatrix, line: number): Probability;
  /** P(both teams score ≥ 1). */
  bttsProbability(matrix: ScoreMatrix): Probability;
}
```

### 3.3 ValueCalculator (edge / EV / de-margin)

```ts
// libs/domain/src/services/value-calculator.service.ts
import type { Result, DomainError } from '@betvision/shared';
import type { Odds } from '../value-objects/odds';
import type { Probability } from '../value-objects/probability';
import type { ImpliedProbability } from '../value-objects/implied-probability';
import type { Edge } from '../value-objects/edge';
import type { ExpectedValue } from '../value-objects/expected-value';

export interface ValueCalculator {
  /** Raw implied probability (margin included). */
  impliedProbability(odds: Odds): ImpliedProbability;
  /**
   * Remove the bookmaker overround across ALL outcomes of one market so the implied
   * set sums to 1 — a fair baseline for edge. Returns margin-removed implieds in order.
   */
  removeMargin(marketOdds: ReadonlyArray<Odds>): ImpliedProbability[];
  /** Edge = modelProb − impliedProb (use the margin-removed implied). */
  edge(model: Probability, implied: ImpliedProbability): Result<Edge, DomainError>;
  /** EV = p*(odds−1) − (1−p). */
  expectedValue(model: Probability, odds: Odds): Result<ExpectedValue, DomainError>;
}
```

### 3.4 KellyStakeService (fractional only)

```ts
// libs/domain/src/services/kelly-stake.service.ts
import type { Result, DomainError } from '@betvision/shared';
import type { Probability } from '../value-objects/probability';
import type { Odds } from '../value-objects/odds';
import type { Stake } from '../value-objects/stake';

export interface KellyStakeInput {
  readonly model: Probability;
  readonly odds: Odds;
  /** From RiskProfile.kellyFraction. (0,1) — full Kelly (1.0) is rejected by contract. */
  readonly kellyFraction: number;
  /** From RiskProfile.maxStakePctCap. Hard ceiling on the returned Stake. */
  readonly maxStakePctCap: number;
}

export interface KellyStakeService {
  /**
   * Conservative staking (SPEC §14):
   *   fullKelly = (p*(odds−1) − (1−p)) / (odds−1)
   *   stake     = clamp( max(0, fullKelly) * kellyFraction , 0 , maxStakePctCap )
   * Negative/zero edge ⇒ Stake.zero(). NEVER returns more than the cap; NEVER full Kelly.
   */
  fractionalKelly(input: KellyStakeInput): Result<Stake, DomainError>;
}
```

### 3.5 ⭐ RiskProfileService.resolve — with the reference mapping table

`RiskProfileService` is the binding between the slider and concrete gating. The monotonic table from **Feature Spec B** is the **reference implementation contract**: as appetite rises, `minEdge` falls, allowed volatility/confidence loosen, `kellyFraction` and `maxStakePctCap` rise, and more market groups unlock. `kellyFraction` is **never** 1.0.

| Bucket | Appetite range | minEdge | minConfidence | maxMarketVolatility | kellyFraction | maxStakePctCap | allowedMarketGroups |
|---|---|---|---|---|---|---|---|
| Conservative | 0–33 | 0.05 | `high` | `low` | 0.10 | 0.01 (1%) | Result, Goals |
| Balanced | 34–66 | 0.03 | `medium` | `medium` | 0.25 | 0.02 (2%) | Result, Goals, Corners, Cards, Handicap |
| Aggressive | 67–100 | 0.015 | `low` | `high` | 0.50 | 0.03 (3%) | all groups (incl. Specials) |

```ts
// libs/domain/src/services/risk-profile.service.ts
import type { RiskAppetite, RiskProfile } from '../value-objects/risk-appetite';
import { RiskBucket } from '../value-objects/risk-appetite';
import { ConfidenceLevel, RiskLevel } from '../value-objects/levels';
import { MarketGroup } from '../value-objects/market';

export interface RiskProfileService {
  /** Pure, total, deterministic mapping of the slider to gating + staking parameters. */
  resolve(appetite: RiskAppetite): RiskProfile;
}

/**
 * Reference implementation (the contract). Bucket-stepped per Feature Spec B; tune the
 * exact numbers via backtests but PRESERVE MONOTONICITY (conservative ⇒ stricter on every axis).
 */
export class DefaultRiskProfileService implements RiskProfileService {
  resolve(appetite: RiskAppetite): RiskProfile {
    switch (appetite.bucket) {
      case RiskBucket.Conservative:
        return {
          minEdge: 0.05,
          minConfidence: ConfidenceLevel.High,
          maxMarketVolatility: RiskLevel.Low,
          kellyFraction: 0.1,
          maxStakePctCap: 0.01,
          allowedMarketGroups: [MarketGroup.Result, MarketGroup.Goals],
          bucket: RiskBucket.Conservative,
        };
      case RiskBucket.Balanced:
        return {
          minEdge: 0.03,
          minConfidence: ConfidenceLevel.Medium,
          maxMarketVolatility: RiskLevel.Medium,
          kellyFraction: 0.25,
          maxStakePctCap: 0.02,
          allowedMarketGroups: [
            MarketGroup.Result, MarketGroup.Goals,
            MarketGroup.Corners, MarketGroup.Cards, MarketGroup.Handicap,
          ],
          bucket: RiskBucket.Balanced,
        };
      case RiskBucket.Aggressive:
        return {
          minEdge: 0.015,
          minConfidence: ConfidenceLevel.Low,
          maxMarketVolatility: RiskLevel.High,
          kellyFraction: 0.5,
          maxStakePctCap: 0.03,
          allowedMarketGroups: [
            MarketGroup.Result, MarketGroup.Goals, MarketGroup.Corners,
            MarketGroup.Cards, MarketGroup.Handicap, MarketGroup.Specials,
          ],
          bucket: RiskBucket.Aggressive,
        };
    }
  }
}
```

---

## 4. Outbound ports & their DTOs — `libs/domain/src/ports`

**Convention:** ports return `Promise<...>` for IO. Repository ports exchange **domain entities** (defined in each bounded context's `entities/` folder — referenced here as named types). Provider, cache, infra, and cross-cutting ports exchange the **DTOs defined below** so adapters map vendor payloads → canonical shapes without leaking SDK types into the domain.

### 4.1 Shared identifiers & provenance — `libs/domain/src/ports/shared.dto.ts`

```ts
// libs/domain/src/ports/shared.dto.ts
// Branded IDs: opaque strings that are not interchangeable at the type level.

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type MatchId = Brand<string, 'MatchId'>;
export type TeamId = Brand<string, 'TeamId'>;
export type PlayerId = Brand<string, 'PlayerId'>;
export type RefereeId = Brand<string, 'RefereeId'>;
export type CompetitionId = Brand<string, 'CompetitionId'>;
export type SeasonId = Brand<string, 'SeasonId'>;
export type PredictionId = Brand<string, 'PredictionId'>;
export type ReportId = Brand<string, 'ReportId'>;
export type UserId = Brand<string, 'UserId'>;

export type Locale = 'en' | 'es';
export type IsoDateTime = string; // ISO-8601 UTC

/** Every provider payload is stamped with where/when it came from (SPEC FR-2). */
export interface DataProvenance {
  readonly provider: string;
  readonly fetchedAt: IsoDateTime;
  readonly payloadHash: string;
  readonly ageMinutes?: number; // staleness signal for the UI
}

/** Generic wrapper attaching provenance to any provider DTO. */
export interface Provenanced<T> {
  readonly data: T;
  readonly provenance: DataProvenance;
}

export type Venue = 'home' | 'away' | 'all';
export interface StatsScope {
  readonly seasonId?: SeasonId;
  readonly venue?: Venue;
  readonly window?: number; // rolling N matches
}
```

### 4.2 Repository ports

```ts
// libs/domain/src/ports/match-repository.port.ts
import type { MatchId, CompetitionId, IsoDateTime } from './shared.dto';
// Match / OddsSnapshot / Prediction / AnalysisReport are domain ENTITIES defined in
// libs/domain/src/<context>/entities. Referenced here as their entity types.
import type { Match } from '../matches/entities/match.entity';

export interface MatchSearchQuery {
  readonly text: string;           // free-text fixture, e.g. "Real Madrid vs Barcelona"
  readonly competitionId?: CompetitionId;
  readonly dateFrom?: IsoDateTime;
  readonly dateTo?: IsoDateTime;
  readonly limit?: number;
}

export interface MatchCandidate {
  readonly matchId: MatchId;
  readonly homeName: string;
  readonly awayName: string;
  readonly competition: string;
  readonly kickoffUtc: IsoDateTime;
  readonly confidence: number; // resolver confidence 0..1
}

export interface MatchRepositoryPort {
  findById(id: MatchId): Promise<Match | null>;
  search(query: MatchSearchQuery): Promise<MatchCandidate[]>;
  save(match: Match): Promise<void>;
}
```

```ts
// libs/domain/src/ports/odds-repository.port.ts
import type { MatchId, IsoDateTime } from './shared.dto';
import type { MarketKey } from '../value-objects/market';

export interface OddsSnapshotRecord {
  readonly matchId: MatchId;
  readonly bookmaker: string;
  readonly market: MarketKey;
  readonly selection: string;
  readonly priceDecimal: number;
  readonly capturedAt: IsoDateTime;
}

export interface OddsRepositoryPort {
  /** Latest price per (market, selection) for a fixture. */
  findLatest(matchId: MatchId, markets?: MarketKey[]): Promise<OddsSnapshotRecord[]>;
  /** Full movement history (backbone of CLV) for one market/selection. */
  findMovement(matchId: MatchId, market: MarketKey, selection: string): Promise<OddsSnapshotRecord[]>;
  /** Append-only persistence (time-series). */
  saveSnapshots(snapshots: ReadonlyArray<OddsSnapshotRecord>): Promise<void>;
}
```

### 4.3 Sports-data provider ports (SPEC §15)

```ts
// libs/domain/src/ports/sports-data-provider.port.ts
import type { Provenanced, TeamId, MatchId, IsoDateTime, StatsScope } from './shared.dto';

export interface FixtureQuery {
  readonly text: string;
  readonly dateHint?: IsoDateTime;
}
export interface TeamRefDto {
  readonly externalId: string;
  readonly name: string;
  readonly country?: string;
  readonly crestUrl?: string;
}
export interface FixtureDto {
  readonly externalId: string;
  readonly home: TeamRefDto;
  readonly away: TeamRefDto;
  readonly competition: string;
  readonly kickoffUtc: IsoDateTime;
  readonly venue?: string;
}
export interface TeamFormDto {
  readonly teamId: TeamId;
  readonly results: ReadonlyArray<'W' | 'D' | 'L'>; // most-recent first
  readonly goalsFor: number[];
  readonly goalsAgainst: number[];
}
export interface H2HDto {
  readonly meetings: ReadonlyArray<{
    readonly matchId: MatchId;
    readonly kickoffUtc: IsoDateTime;
    readonly homeGoals: number;
    readonly awayGoals: number;
  }>;
}

export interface SportsDataProviderPort {
  getFixture(query: FixtureQuery): Promise<Provenanced<FixtureDto>>;
  getTeamForm(teamId: TeamId, last: number): Promise<Provenanced<TeamFormDto>>;
  getHeadToHead(home: TeamId, away: TeamId): Promise<Provenanced<H2HDto>>;
}
```

```ts
// libs/domain/src/ports/team-stats-provider.port.ts
import type { Provenanced, TeamId, StatsScope } from './shared.dto';

export interface TeamStatsDto {
  readonly teamId: TeamId;
  readonly avgGoalsFor: number;
  readonly avgGoalsAgainst: number;
  readonly avgXgFor: number;
  readonly avgXgAgainst: number;
  readonly avgCornersFor: number;
  readonly avgCornersAgainst: number;
  readonly avgCardsFor: number;
  readonly avgCardsAgainst: number;
  readonly cleanSheets: number;
}

export interface TeamStatsProviderPort {
  getTeamStats(teamId: TeamId, scope: StatsScope): Promise<Provenanced<TeamStatsDto>>;
}
```

```ts
// libs/domain/src/ports/player-stats-provider.port.ts
import type { Provenanced, PlayerId, SeasonId } from './shared.dto';

export interface PlayerStatsDto {
  readonly playerId: PlayerId;
  readonly apps: number;
  readonly minutes: number;
  readonly goals: number;
  readonly assists: number;
  readonly xg: number;
  readonly xa: number;
  readonly yellow: number;
  readonly red: number;
}

export interface PlayerStatsProviderPort {
  getPlayerStats(playerId: PlayerId, season: SeasonId): Promise<Provenanced<PlayerStatsDto>>;
}
```

```ts
// libs/domain/src/ports/referee-stats-provider.port.ts
import type { Provenanced, RefereeId, SeasonId } from './shared.dto';

export interface RefereeStatsDto {
  readonly refereeId: RefereeId;
  readonly avgYellow: number;
  readonly avgRed: number;
  readonly avgFouls: number;
  readonly avgPenalties: number;
  readonly matches: number;
  readonly homeBias?: number;
}

export interface RefereeStatsProviderPort {
  getRefereeStats(refereeId: RefereeId, season: SeasonId): Promise<Provenanced<RefereeStatsDto>>;
}
```

```ts
// libs/domain/src/ports/weather-provider.port.ts
import type { Provenanced, IsoDateTime } from './shared.dto';

export interface WeatherDto {
  readonly venue: string;
  readonly kickoffUtc: IsoDateTime;
  readonly tempC: number;
  readonly windKph: number;
  readonly precipitationMm: number;
  readonly condition: string;
}

export interface WeatherProviderPort {
  getForecast(venue: string, kickoffUtc: IsoDateTime): Promise<Provenanced<WeatherDto>>;
}
```

```ts
// libs/domain/src/ports/injury-provider.port.ts
import type { Provenanced, TeamId, PlayerId } from './shared.dto';

export interface InjuryDto {
  readonly playerId: PlayerId;
  readonly playerName: string;
  readonly status: 'injured' | 'doubtful' | 'suspended';
  readonly expectedReturn?: string; // ISO date when known
}

export interface InjuryProviderPort {
  getInjuries(teamId: TeamId): Promise<Provenanced<InjuryDto[]>>;
}
```

```ts
// libs/domain/src/ports/lineup-provider.port.ts
import type { Provenanced, MatchId, TeamId, PlayerId } from './shared.dto';

export interface LineupDto {
  readonly matchId: MatchId;
  readonly teamId: TeamId;
  readonly formation?: string;
  readonly probableXi: ReadonlyArray<{ readonly playerId: PlayerId; readonly name: string; readonly position: string }>;
  readonly confirmed: boolean;
}

export interface LineupProviderPort {
  getProbableLineup(matchId: MatchId): Promise<Provenanced<LineupDto>>;
}
```

```ts
// libs/domain/src/ports/odds-provider.port.ts
import type { Provenanced, MatchId, IsoDateTime } from './shared.dto';
import type { MarketKey } from '../value-objects/market';

export interface OddsQuery {
  readonly matchId: MatchId;
  readonly markets?: MarketKey[];
}
export interface OddsSnapshotDto {
  readonly bookmaker: string;
  readonly market: MarketKey;
  readonly selection: string;
  readonly priceDecimal: number;
  readonly capturedAt: IsoDateTime;
}

export interface OddsProviderPort {
  getOdds(query: OddsQuery): Promise<Provenanced<OddsSnapshotDto[]>>;
}
```

### 4.4 Prediction & feature ports

```ts
// libs/domain/src/ports/feature-store.port.ts
import type { MatchId } from './shared.dto';

/** Opaque, reproducible feature vector keyed by fixture + feature-set version. */
export interface FeatureVector {
  readonly matchId: MatchId;
  readonly version: string;
  readonly features: Readonly<Record<string, number>>;
  readonly snapshotHash: string;
}

export interface FeatureStorePort {
  get(matchId: MatchId, version: string): Promise<FeatureVector | null>;
  put(vector: FeatureVector): Promise<void>;
}
```

```ts
// libs/domain/src/ports/prediction-model.port.ts
import type { MatchId } from './shared.dto';
import type { MarketKey } from '../value-objects/market';
import type { FeatureVector } from './feature-store.port';
import type { ConfidenceLevel, RiskLevel } from '../value-objects/levels';

/**
 * THE ONLY PRODUCER OF PROBABILITIES. Input is a feature vector — NOT odds, NOT riskAppetite.
 * Output probabilities are plain numbers in [0,1] (wrapped into Probability VOs by the caller).
 * `marketVolatility` is the model's intrinsic variance for the market (drives risk gating).
 */
export interface ModelScoreRequest {
  readonly matchId: MatchId;
  readonly features: FeatureVector;
  readonly markets: ReadonlyArray<MarketKey>;
}

export interface MarketProbabilityDto {
  readonly market: MarketKey;
  readonly selection: string;
  readonly modelProbability: number; // [0,1]
  readonly confidence: ConfidenceLevel;
  readonly marketVolatility: RiskLevel;
}

export interface ModelScoreResult {
  readonly modelVersion: string;
  readonly inputSnapshotHash: string;
  readonly probabilities: ReadonlyArray<MarketProbabilityDto>;
}

export interface PredictionModelPort {
  score(request: ModelScoreRequest): Promise<ModelScoreResult>;
}
```

### 4.5 AI / explanation ports (guardrailed)

```ts
// libs/domain/src/ports/llm-explanation.port.ts
import type { Locale } from './shared.dto';

/**
 * Read-only snapshot of ALREADY-COMPUTED numbers passed to the LLM purely for narration.
 * The LLM receives these to explain them; it cannot feed anything back that changes them.
 */
export interface ComputedSelectionFact {
  readonly market: string;
  readonly selection: string;
  readonly modelProbabilityPct: number;   // display only
  readonly impliedProbabilityPct: number; // display only
  readonly edgePct: number;               // display only
  readonly expectedValue: number;         // display only
  readonly suggestedStakePct: number;     // display only
  readonly confidence: string;
  readonly risk: string;
}

export interface SourceRef {
  readonly label: string;
  readonly provider: string;
  readonly url?: string;
}

export interface ExplanationRequest {
  readonly language: Locale; // 'en' | 'es'
  readonly fixtureLabel: string;
  /** Frozen, pre-computed facts. Numbers are inputs to PROSE, never re-derived. */
  readonly facts: ReadonlyArray<ComputedSelectionFact>;
  readonly bestBet?: ComputedSelectionFact;
  readonly riskAppetite: number;  // echoed for "analyzed at risk N/100"
  readonly riskBucket: string;
  readonly sources: ReadonlyArray<SourceRef>;
}

/**
 * RETURN TYPE CONTAINS STRINGS ONLY. No Probability / Edge / EV / Stake fields exist here,
 * so the explanation layer is STRUCTURALLY incapable of producing or altering a number.
 */
export interface ExplanationNarrative {
  readonly language: Locale;
  readonly summary: string;
  readonly recentForm: string;
  readonly risks: string;
  readonly keyVariables: string;
  readonly reasoning: string;
  readonly marketRationale: string;
  readonly responsibleGamblingWarning: string;
  readonly citations: ReadonlyArray<SourceRef>;
}

export interface LlmExplanationPort {
  explain(request: ExplanationRequest): Promise<ExplanationNarrative>;
}
```

```ts
// libs/domain/src/ports/rag-retriever.port.ts
import type { Locale } from './shared.dto';
import type { SourceRef } from './llm-explanation.port';

export interface RagQuery {
  readonly query: string;
  readonly language: Locale;
  readonly topK?: number;
}
export interface RetrievedSnippet {
  readonly text: string;
  readonly score: number;
  readonly source: SourceRef;
}

export interface RagRetrieverPort {
  retrieve(query: RagQuery): Promise<ReadonlyArray<RetrievedSnippet>>;
}
```

### 4.6 Cross-cutting infrastructure ports

```ts
// libs/domain/src/ports/cache.port.ts
export interface CachePort {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
}
```

```ts
// libs/domain/src/ports/audit-log.port.ts
import type { UserId, IsoDateTime } from './shared.dto';

export interface AuditEntry {
  readonly actorId: UserId | null;
  readonly action: string;
  readonly entity: string;
  readonly entityId: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly occurredAt: IsoDateTime;
}

export interface AuditLogPort {
  record(entry: AuditEntry): Promise<void>;
}
```

```ts
// libs/domain/src/ports/notification.port.ts
import type { UserId, Locale } from './shared.dto';

export interface NotificationMessage {
  readonly to: UserId;
  readonly channel: 'email' | 'push';
  /** i18n key + params — localized at delivery, NOT in the domain. */
  readonly templateCode: string;
  readonly params: Readonly<Record<string, string | number>>;
  readonly locale: Locale;
}

export interface NotificationPort {
  send(message: NotificationMessage): Promise<void>;
}
```

```ts
// libs/domain/src/ports/i18n.port.ts
import type { Locale } from './shared.dto';
import type { ErrorParams } from '@betvision/shared';

/**
 * The ONLY bridge from domain error/message codes to human strings.
 * The domain depends on this interface; the concrete catalog lives in libs/infrastructure.
 */
export interface I18nPort {
  resolve(code: string, params: ErrorParams, locale: Locale): string;
}
```

```ts
// libs/domain/src/ports/clock.port.ts
import type { IsoDateTime } from './shared.dto';

/** Injectable clock — keeps domain/use-cases deterministic and testable (no `new Date()`). */
export interface ClockPort {
  now(): IsoDateTime;
  epochMillis(): number;
}
```

```ts
// libs/domain/src/ports/id-generator.port.ts
/** Injectable ID source — deterministic in tests, UUID/ULID in production. */
export interface IdGeneratorPort {
  newId(): string;
}
```

```ts
// libs/domain/src/ports/event-bus.port.ts
import type { IsoDateTime } from './shared.dto';

/** Pipeline events (SPEC §7): MatchDataIngested, FeaturesComputed, PredictionReady, ReportGenerated. */
export interface DomainEvent<TPayload = Readonly<Record<string, unknown>>> {
  readonly name: string;
  readonly occurredAt: IsoDateTime;
  readonly payload: TPayload;
}

export interface EventBusPort {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: ReadonlyArray<DomainEvent>): Promise<void>;
}
```

---

## 5. DI token convention — one `Symbol` per port

Domain declares the interface **and** its injection token together. Apps (the composition root) bind a concrete adapter to each token. Domain/application code depends only on the interface + token, never the adapter.

```ts
// libs/domain/src/ports/tokens.ts
// One Symbol per port. Co-located with the interfaces; framework-agnostic (works with
// NestJS @Inject(TOKEN), but is just a Symbol — no NestJS import here).

export const MATCH_REPOSITORY = Symbol('MatchRepositoryPort');
export const ODDS_REPOSITORY = Symbol('OddsRepositoryPort');
export const SPORTS_DATA_PROVIDER = Symbol('SportsDataProviderPort');
export const ODDS_PROVIDER = Symbol('OddsProviderPort');
export const REFEREE_STATS_PROVIDER = Symbol('RefereeStatsProviderPort');
export const WEATHER_PROVIDER = Symbol('WeatherProviderPort');
export const INJURY_PROVIDER = Symbol('InjuryProviderPort');
export const LINEUP_PROVIDER = Symbol('LineupProviderPort');
export const TEAM_STATS_PROVIDER = Symbol('TeamStatsProviderPort');
export const PLAYER_STATS_PROVIDER = Symbol('PlayerStatsProviderPort');
export const LLM_EXPLANATION = Symbol('LlmExplanationPort');
export const RAG_RETRIEVER = Symbol('RagRetrieverPort');
export const CACHE = Symbol('CachePort');
export const FEATURE_STORE = Symbol('FeatureStorePort');
export const PREDICTION_MODEL = Symbol('PredictionModelPort');
export const AUDIT_LOG = Symbol('AuditLogPort');
export const NOTIFICATION = Symbol('NotificationPort');
export const I18N = Symbol('I18nPort');
export const CLOCK = Symbol('ClockPort');
export const ID_GENERATOR = Symbol('IdGeneratorPort');
export const EVENT_BUS = Symbol('EventBusPort');

// Domain services that are injected as collaborators also get tokens:
export const ELO_RATING_SERVICE = Symbol('EloRatingService');
export const POISSON_GOAL_MODEL = Symbol('PoissonGoalModel');
export const VALUE_CALCULATOR = Symbol('ValueCalculator');
export const KELLY_STAKE_SERVICE = Symbol('KellyStakeService');
export const RISK_PROFILE_SERVICE = Symbol('RiskProfileService');
```

**Wiring (composition root, `apps/api` — illustrative, lives outside the domain):**

```ts
// apps/api/src/matches/matches.module.ts  (NestJS — composition root only)
@Module({
  providers: [
    GenerateReportUseCase,
    { provide: SPORTS_DATA_PROVIDER, useClass: ApiFootballAdapter }, // swap here ⇄ OptaAdapter
    { provide: MATCH_REPOSITORY, useClass: PrismaMatchRepository },
    { provide: LLM_EXPLANATION, useClass: ClaudeExplanationAdapter },
    { provide: RISK_PROFILE_SERVICE, useClass: DefaultRiskProfileService },
  ],
  controllers: [MatchesController],
})
export class MatchesModule {}
```

Swapping a provider is a one-line change; the domain and use cases never know which adapter is bound.

---

## 6. Fakes in `libs/testing` — one per port

Every port gets a deterministic in-memory **fake** (not a mock library) plus an **object-mother** builder, so application use cases and domain flows test with **zero IO**. Fakes implement the exact interface, are seedable, and record interactions for assertions.

Pattern (repeated per port):

```ts
// libs/testing/src/fakes/fake-prediction-model.port.ts
import type {
  PredictionModelPort, ModelScoreRequest, ModelScoreResult,
} from '@betvision/domain';

/** Returns canned, deterministic probabilities; records every request for assertions. */
export class FakePredictionModelPort implements PredictionModelPort {
  readonly calls: ModelScoreRequest[] = [];
  private canned: ModelScoreResult | null = null;

  seed(result: ModelScoreResult): this {
    this.canned = result;
    return this;
  }

  async score(request: ModelScoreRequest): Promise<ModelScoreResult> {
    this.calls.push(request);
    if (!this.canned) throw new Error('FakePredictionModelPort not seeded');
    return this.canned;
  }
}
```

```ts
// libs/testing/src/fakes/fake-clock.port.ts
import type { ClockPort } from '@betvision/domain';

export class FakeClockPort implements ClockPort {
  constructor(private fixed: number = Date.parse('2026-01-01T00:00:00Z')) {}
  advance(ms: number): void { this.fixed += ms; }
  now() { return new Date(this.fixed).toISOString(); }
  epochMillis() { return this.fixed; }
}
```

```ts
// libs/testing/src/fakes/fake-id-generator.port.ts
import type { IdGeneratorPort } from '@betvision/domain';

export class FakeIdGeneratorPort implements IdGeneratorPort {
  private n = 0;
  newId() { return `id-${++this.n}`; }
}
```

**Coverage checklist (one fake each):** `FakeMatchRepository`, `FakeOddsRepository`, `FakeSportsDataProvider`, `FakeOddsProvider`, `FakeRefereeStatsProvider`, `FakeWeatherProvider`, `FakeInjuryProvider`, `FakeLineupProvider`, `FakeTeamStatsProvider`, `FakePlayerStatsProvider`, `FakeLlmExplanationPort` (echoes facts as templated prose — proves it never invents numbers), `FakeRagRetriever`, `FakeCache` (in-memory `Map`), `FakeFeatureStore`, `FakePredictionModelPort`, `FakeAuditLog` (records entries), `FakeNotificationPort` (captures outbox), `FakeI18nPort` (`code` → `code` passthrough), `FakeClockPort`, `FakeIdGeneratorPort`, `FakeEventBus` (captures published events).

Object mothers (e.g. `aProbability()`, `anOdds()`, `aRiskAppetite()`, `aModelScoreResult()`) build valid VOs/DTOs with sensible defaults and `.with(...)` overrides, keeping tests DRY across layers.

---

## 7. Barrel export — `libs/domain/src/index.ts`

```ts
// value objects
export * from './value-objects/probability';
export * from './value-objects/odds';
export * from './value-objects/implied-probability';
export * from './value-objects/edge';
export * from './value-objects/expected-value';
export * from './value-objects/stake';
export * from './value-objects/money';
export * from './value-objects/levels';
export * from './value-objects/market';
export * from './value-objects/risk-appetite';
// services
export * from './services/elo-rating.service';
export * from './services/poisson-goal-model.service';
export * from './services/value-calculator.service';
export * from './services/kelly-stake.service';
export * from './services/risk-profile.service';
// ports + tokens
export * from './ports/shared.dto';
export * from './ports/match-repository.port';
export * from './ports/odds-repository.port';
export * from './ports/sports-data-provider.port';
export * from './ports/team-stats-provider.port';
export * from './ports/player-stats-provider.port';
export * from './ports/referee-stats-provider.port';
export * from './ports/weather-provider.port';
export * from './ports/injury-provider.port';
export * from './ports/lineup-provider.port';
export * from './ports/odds-provider.port';
export * from './ports/feature-store.port';
export * from './ports/prediction-model.port';
export * from './ports/llm-explanation.port';
export * from './ports/rag-retriever.port';
export * from './ports/cache.port';
export * from './ports/audit-log.port';
export * from './ports/notification.port';
export * from './ports/i18n.port';
export * from './ports/clock.port';
export * from './ports/id-generator.port';
export * from './ports/event-bus.port';
export * from './ports/tokens';
```

---

## 8. Design decisions (rationale log)

- **`Result<T,E>` over exceptions for expected failures.** VO factories and gating return `Result`; exceptions (`InvariantViolationError`) are reserved for impossible states. Keeps control flow explicit and the happy path branch-free.
- **Codes, not strings, in `DomainError`.** Satisfies Feature Spec A: the domain stays framework- and language-free; `I18nPort` localizes at the edge. A single `DomainErrorCode` catalog keeps i18n keys from drifting.
- **`ImpliedProbability` is its own VO (not reused `Probability`).** It carries `marginRemoved`, forcing callers to de-margin before computing `Edge` — a fair baseline per SPEC §14.
- **`Stake` is a bankroll *fraction*, capped at construction.** `Stake.capped()` makes "never exceed `maxStakePctCap`" a type-level guarantee (Phase 11 property test). Produced only by `KellyStakeService` (fractional, never full Kelly).
- **`RiskAppetite` → `RiskProfile` is the only risk pathway; it never touches `PredictionModelPort`.** `PredictionModelPort.score()` takes a `FeatureVector` and markets — no odds, no appetite. This makes "identical probabilities across risk settings" structurally true (Phase 11 DoD).
- **`LlmExplanationPort` input is read-only display facts; output is strings only.** No numeric VO appears in `ExplanationNarrative`, so the explanation layer cannot mint or mutate a number (SPEC §1 guardrail; Phase 12 DoD).
- **`PredictionModelPort` is the sole probability producer**, isolated to the `predictions`/`ai-analysis` split of §10 so the LLM is structurally confined to `ai-analysis`.
- **`Provenanced<T>` wraps every provider DTO.** Satisfies FR-2 (provenance: provider, fetchedAt, payloadHash) and feeds the UI staleness badges without polluting canonical entities.
- **Branded ID types.** Prevent passing a `TeamId` where a `MatchId` is expected — cheap correctness with zero runtime cost.
- **One `Symbol` token per port, co-located with the interface.** Framework-agnostic DI; swapping adapters is a one-line composition-root change (SPEC §7).
- **Dixon-Coles modeled as an *optional* parameter (`dixonColesRho?`) on `PoissonGoalModel`.** Plain Poisson when absent; low-score correction when present — keeps the interface stable as modeling matures (SPEC §13).
- **`ConfidenceLevel`/`RiskLevel` are ordinal with `confidenceAtLeast`/`riskAtMost` helpers**, so gating reads declaratively and `RiskProfile` thresholds compare cleanly.
```

