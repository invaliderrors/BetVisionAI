// libs/domain/src/value-objects/email.ts
// Email value object: RFC-ish validated + normalized (trim + lowercase). Immutable.
// The normalized form is what the repository unique-indexes on, so two casings of the
// same address can never create duplicate accounts.
import { Result, ok, err, DomainError, DomainErrorCode } from '@betvision/shared';

// Pragmatic, deliberately-strict-enough address check (single @, non-empty local part,
// dotted domain, no whitespace). Full RFC 5322 is intentionally NOT attempted — the
// real deliverability check is an out-of-band verification email (later phase).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254; // RFC 5321 upper bound for the forward path.

export class Email {
  private constructor(readonly value: string) {
    Object.freeze(this);
  }

  static create(raw: string): Result<Email, DomainError> {
    const normalized = raw.trim().toLowerCase();
    if (
      normalized.length === 0 ||
      normalized.length > MAX_EMAIL_LENGTH ||
      !EMAIL_REGEX.test(normalized)
    ) {
      return err(
        DomainError.of(DomainErrorCode.EMAIL_INVALID, { field: 'email' }),
      );
    }
    return ok(new Email(normalized));
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
