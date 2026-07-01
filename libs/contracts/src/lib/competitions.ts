// libs/contracts/src/lib/competitions.ts
// Competition + Season read contracts (zod). SPEC §16: GET /competitions,
// GET /competitions/:id/seasons.
import { z } from 'zod';

export const competitionTypeSchema = z.enum(['league', 'cup', 'ucl', 'friendly']);
export type CompetitionType = z.infer<typeof competitionTypeSchema>;

/** Lightweight competition projection embedded in match candidates/detail. */
export const competitionRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string().nullable(),
});
export type CompetitionRef = z.infer<typeof competitionRefSchema>;

/** GET /competitions — one row. */
export const competitionDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string().nullable(),
  type: competitionTypeSchema,
  tier: z.number().int().nullable(),
});
export type CompetitionDto = z.infer<typeof competitionDtoSchema>;

export const competitionListResponseSchema = z.object({
  competitions: competitionDtoSchema.array(),
});
export type CompetitionListResponse = z.infer<typeof competitionListResponseSchema>;

/** GET /competitions/:id/seasons — one row. */
export const seasonDtoSchema = z.object({
  id: z.string(),
  competitionId: z.string(),
  label: z.string(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
});
export type SeasonDto = z.infer<typeof seasonDtoSchema>;

export const seasonListResponseSchema = z.object({
  competitionId: z.string(),
  seasons: seasonDtoSchema.array(),
});
export type SeasonListResponse = z.infer<typeof seasonListResponseSchema>;
