// libs/domain/src/value-objects/password-policy.ts
// Pure, framework-free password strength policy. Enforced HERE (domain, defense in depth)
// AND again in libs/contracts (zod, at the controller boundary) per SPEC §17/§19.
// Never receives a hash — only the raw candidate, which is validated and immediately
// discarded by the caller (hashed via PasswordHasherPort, never stored in plaintext).
import { DomainError, DomainErrorCode } from '@betvision/shared';

/** Minimum length (SPEC §19: passwords >= 12). */
export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128; // guard against DoS-via-huge-argon2-input.

const HAS_LOWER = /[a-z]/;
const HAS_UPPER = /[A-Z]/;
const HAS_DIGIT = /[0-9]/;
const HAS_SYMBOL = /[^A-Za-z0-9]/;

/**
 * Validate a raw password against the complexity policy.
 * Returns `null` when acceptable, or a `DomainError` (code + params) otherwise.
 * Shaped like a `Guard.*` check so it composes cleanly into VO/use-case validation.
 */
export const PasswordPolicy = {
  validate(raw: string): DomainError | null {
    if (typeof raw !== 'string' || raw.length < MIN_PASSWORD_LENGTH) {
      return DomainError.of(DomainErrorCode.PASSWORD_TOO_SHORT, {
        field: 'password',
        min: MIN_PASSWORD_LENGTH,
      });
    }
    if (raw.length > MAX_PASSWORD_LENGTH) {
      return DomainError.of(DomainErrorCode.PASSWORD_TOO_WEAK, {
        field: 'password',
      });
    }
    const classes =
      Number(HAS_LOWER.test(raw)) +
      Number(HAS_UPPER.test(raw)) +
      Number(HAS_DIGIT.test(raw)) +
      Number(HAS_SYMBOL.test(raw));
    // Require all four character classes for a strong-by-default policy.
    if (classes < 4) {
      return DomainError.of(DomainErrorCode.PASSWORD_TOO_WEAK, {
        field: 'password',
      });
    }
    return null;
  },
} as const;
