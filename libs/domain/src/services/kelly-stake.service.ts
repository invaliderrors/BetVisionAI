// libs/domain/src/services/kelly-stake.service.ts
import { Result, ok, DomainError } from '@betvision/shared';
import type { Probability } from '../value-objects/probability';
import type { Odds } from '../value-objects/odds';
import { Stake } from '../value-objects/stake';

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
   *   fullKelly = (p*(odds-1) - (1-p)) / (odds-1)
   *   stake     = clamp( max(0, fullKelly) * kellyFraction , 0 , maxStakePctCap )
   * Negative/zero edge ⇒ Stake.zero(). NEVER returns more than the cap; NEVER full Kelly.
   */
  fractionalKelly(input: KellyStakeInput): Result<Stake, DomainError>;
}

/**
 * Reference implementation (pure). Clamps to the profile cap so the returned Stake
 * can never exceed `maxStakePctCap`, and applies only a FRACTION of full Kelly.
 */
export class DefaultKellyStakeService implements KellyStakeService {
  fractionalKelly(input: KellyStakeInput): Result<Stake, DomainError> {
    const { model, odds, kellyFraction, maxStakePctCap } = input;
    const p = model.value;
    const b = odds.decimal - 1; // net return per unit; b > 0 because decimal > 1.
    const fullKelly = (p * b - (1 - p)) / b;

    if (fullKelly <= 0) {
      return ok(Stake.zero());
    }

    const scaled = fullKelly * kellyFraction;
    const clamped = Math.min(scaled, maxStakePctCap);
    // clamped ∈ [0, maxStakePctCap] ⇒ within [0,1] and within the cap; construction succeeds.
    return Stake.capped(clamped, maxStakePctCap);
  }
}
