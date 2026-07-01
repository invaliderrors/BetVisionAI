// libs/contracts/src/lib/users.ts
// User profile / responsible-gambling / GDPR contracts (zod). SPEC §16-§17.
import { z } from 'zod';
import { localeSchema } from './common';

export const userStatusSchema = z.enum([
  'pending_verification',
  'active',
  'suspended',
  'self_excluded',
  'deleted',
]);
export type UserStatus = z.infer<typeof userStatusSchema>;

/** GET /users/me. */
export const userProfileDtoSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.string(),
  locale: localeSchema,
  status: userStatusSchema,
  ageConfirmedAt: z.string().nullable(),
  selfLimits: z.record(z.string(), z.unknown()).nullable(),
  settings: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
});
export type UserProfileDto = z.infer<typeof userProfileDtoSchema>;

/** PATCH /users/me — change locale and/or free-form settings. At least one field. */
export const updateProfileRequestSchema = z
  .object({
    locale: localeSchema.optional(),
    settings: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((body) => body.locale !== undefined || body.settings !== undefined, {
    message: 'at least one of locale or settings must be provided',
  });
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;

/**
 * POST /users/me/self-limit — responsible-gambling self-limits (SPEC §8/§19).
 * At least one limit must be provided; `selfExcludeUntil` triggers self-exclusion.
 */
export const selfLimitRequestSchema = z
  .object({
    dailyDepositLimit: z.number().nonnegative().optional(),
    dailyLossLimit: z.number().nonnegative().optional(),
    dailyStakeLimit: z.number().nonnegative().optional(),
    sessionTimeLimitMinutes: z.number().int().nonnegative().optional(),
    selfExcludeUntil: z.iso.datetime().optional(),
  })
  .refine(
    (body) =>
      body.dailyDepositLimit !== undefined ||
      body.dailyLossLimit !== undefined ||
      body.dailyStakeLimit !== undefined ||
      body.sessionTimeLimitMinutes !== undefined ||
      body.selfExcludeUntil !== undefined,
    { message: 'at least one self-limit must be provided' },
  );
export type SelfLimitRequest = z.infer<typeof selfLimitRequestSchema>;

/** POST /users/me/export — GDPR data export payload (the subject's own data). */
export const userDataExportDtoSchema = z.object({
  profile: userProfileDtoSchema,
  exportedAt: z.string(),
});
export type UserDataExportDto = z.infer<typeof userDataExportDtoSchema>;
