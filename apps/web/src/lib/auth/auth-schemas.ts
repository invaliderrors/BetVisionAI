// apps/web/src/lib/auth/auth-schemas.ts
// Form-level zod schemas for the auth screens. They mirror the RULES of the shared contracts
// (libs/contracts: passwordSchema, registerRequestSchema) but carry i18n KEYS as messages, so
// every validation string the user sees is localized via t(key) — zero hardcoded copy. The
// inferred output types are structurally compatible with the contract request types, and the
// contract schema still validates defensively at the API boundary.
import { z } from 'zod';
import { MIN_PASSWORD_LENGTH } from '@betvision/contracts';

const emailField = z
  .string()
  .min(1, { message: 'validation.emailRequired' })
  .refine((v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), {
    message: 'validation.emailInvalid',
  });

export const loginFormSchema = z.object({
  email: emailField,
  password: z.string().min(1, { message: 'validation.passwordRequired' }),
});
export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const registerFormSchema = z.object({
  email: emailField,
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, { message: 'validation.passwordMin' })
    .refine((v) => /[a-z]/.test(v), { message: 'validation.passwordComplexity' })
    .refine((v) => /[A-Z]/.test(v), { message: 'validation.passwordComplexity' })
    .refine((v) => /[0-9]/.test(v), { message: 'validation.passwordComplexity' })
    .refine((v) => /[^A-Za-z0-9]/.test(v), {
      message: 'validation.passwordComplexity',
    }),
  locale: z.enum(['en', 'es']),
  // Mirrors the backend's required literal-true booleans (compliance gate, FR-12).
  ageConfirmed: z.literal(true, { message: 'validation.ageRequired' }),
  acceptedTerms: z.literal(true, { message: 'validation.termsRequired' }),
});
export type RegisterFormValues = z.infer<typeof registerFormSchema>;
