// libs/contracts/src/lib/auth.ts
// Auth request/response contracts (zod). Shared by apps/api (validation) and apps/web
// (typed client + forms). SPEC §17.
import { z } from 'zod';
import { emailSchema, passwordSchema, localeSchema } from './common';

/** POST /auth/register — age + terms MUST be literal `true` (compliance gate, FR-12). */
export const registerRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  locale: localeSchema.default('en'),
  ageConfirmed: z.literal(true, {
    message: 'ageConfirmed must be accepted',
  }),
  acceptedTerms: z.literal(true, {
    message: 'acceptedTerms must be accepted',
  }),
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

/** POST /auth/login. */
export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: 'password is required' }),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

/** Public user summary embedded in auth responses. */
export const authUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.string(),
  locale: localeSchema,
});
export type AuthUser = z.infer<typeof authUserSchema>;

/** Login response — access token in body; refresh token is set as an httpOnly cookie. */
export const authResponseSchema = z.object({
  accessToken: z.string(),
  expiresInSeconds: z.number().int().positive(),
  user: authUserSchema,
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

/** Refresh response — a freshly rotated access token (refresh cookie rotated server-side). */
export const refreshResponseSchema = z.object({
  accessToken: z.string(),
  expiresInSeconds: z.number().int().positive(),
});
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;

/** POST /auth/forgot-password — always answered generically (no account enumeration). */
export const forgotPasswordRequestSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;

/** POST /auth/reset-password. */
export const resetPasswordRequestSchema = z.object({
  token: z.string().min(1, { message: 'token is required' }),
  password: passwordSchema,
});
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;
