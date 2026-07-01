// libs/contracts/src/lib/common.ts
// Shared zod primitives reused across request/response schemas. Single source of truth for
// FE + BE so validation never drifts. Mirrors the domain policies (Email VO, PasswordPolicy)
// as defense in depth at the controller boundary (SPEC §17/§19).
import { z } from 'zod';

/** Supported UI/content locales (Feature Spec A). */
export const localeSchema = z.enum(['en', 'es']);
export type Locale = z.infer<typeof localeSchema>;

/** RFC-ish email; the domain Email VO re-validates + normalizes (trim/lowercase). */
export const emailSchema = z.email({ message: 'email must be a valid address' });

/** Minimum password length (kept in sync with domain MIN_PASSWORD_LENGTH). */
export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

/**
 * Password policy: >= 12 chars, <= 128, with all four character classes
 * (lower, upper, digit, symbol). Complexity messages stay generic (no value echoed).
 */
export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, {
    message: `password must be at least ${MIN_PASSWORD_LENGTH} characters`,
  })
  .max(MAX_PASSWORD_LENGTH, {
    message: `password must be at most ${MAX_PASSWORD_LENGTH} characters`,
  })
  .refine((value) => /[a-z]/.test(value), {
    message: 'password must contain a lowercase letter',
  })
  .refine((value) => /[A-Z]/.test(value), {
    message: 'password must contain an uppercase letter',
  })
  .refine((value) => /[0-9]/.test(value), {
    message: 'password must contain a digit',
  })
  .refine((value) => /[^A-Za-z0-9]/.test(value), {
    message: 'password must contain a symbol',
  });
