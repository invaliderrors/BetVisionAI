// libs/testing/src/mothers/vo.mother.ts
// Object mothers: build VALID value objects with sensible defaults. They unwrap the
// Result (they only ever construct valid inputs) so tests stay terse.
import {
  Probability,
  Odds,
  Edge,
  ExpectedValue,
  Stake,
  Money,
  RiskAppetite,
  type CurrencyCode,
} from '@betvision/domain';
import { unwrap } from '@betvision/shared';

export const aProbability = (value = 0.55): Probability => unwrap(Probability.create(value));

export const anOdds = (decimal = 2.0): Odds => unwrap(Odds.create(decimal));

export const anEdge = (value = 0.05): Edge => unwrap(Edge.create(value));

export const anExpectedValue = (value = 0.1): ExpectedValue =>
  unwrap(ExpectedValue.create(value));

export const aStake = (bankrollFraction = 0.01): Stake =>
  unwrap(Stake.create(bankrollFraction));

export const aMoney = (major = 1000, currency: CurrencyCode = 'EUR'): Money =>
  unwrap(Money.fromMajor(major, currency));

/** Default 33 (Conservative) per Feature Spec B. */
export const aRiskAppetite = (value = 33): RiskAppetite => unwrap(RiskAppetite.create(value));
