// libs/contracts/src/lib/teams.ts
// Team read contracts (zod). Shared by apps/api (validation) and apps/web (typed client).
// SPEC §16: GET /teams/:id, GET /teams?search=, GET /teams/:id/stats.
import { z } from 'zod';

/** Lightweight team projection embedded in match candidates/detail + search results. */
export const teamRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string().nullable(),
  crestUrl: z.string().nullable(),
});
export type TeamRef = z.infer<typeof teamRefSchema>;

/** GET /teams/:id — full team detail. */
export const teamDetailDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string().nullable(),
  country: z.string().nullable(),
  crestUrl: z.string().nullable(),
  eloRating: z.number().nullable(),
});
export type TeamDetailDto = z.infer<typeof teamDetailDtoSchema>;

/** GET /teams?search= — query params. */
export const teamSearchQuerySchema = z.object({
  search: z.string().trim().min(1, { message: 'search is required' }),
  limit: z.coerce.number().int().positive().max(50).optional(),
});
export type TeamSearchQuery = z.infer<typeof teamSearchQuerySchema>;

/** GET /teams?search= — ranked (fuzzy) team results. */
export const teamSearchResponseSchema = z.object({
  query: z.string(),
  teams: teamRefSchema.array(),
});
export type TeamSearchResponse = z.infer<typeof teamSearchResponseSchema>;

/** One rolling-stats row for a team scope (GET /teams/:id/stats). */
export const teamStatsRowDtoSchema = z.object({
  seasonId: z.string(),
  venue: z.enum(['home', 'away', 'all']),
  window: z.number().int(),
  avgGoalsFor: z.number().nullable(),
  avgGoalsAgainst: z.number().nullable(),
  avgXgFor: z.number().nullable(),
  avgXgAgainst: z.number().nullable(),
  cleanSheets: z.number().nullable(),
  form: z.string().nullable(),
  computedAt: z.string(),
});
export type TeamStatsRowDto = z.infer<typeof teamStatsRowDtoSchema>;

/**
 * GET /teams/:id/stats — the available rolling stats (may be an empty array until the
 * feature/ingestion jobs populate them; the endpoint is a typed stub until then).
 */
export const teamStatsDtoSchema = z.object({
  teamId: z.string(),
  stats: teamStatsRowDtoSchema.array(),
});
export type TeamStatsDto = z.infer<typeof teamStatsDtoSchema>;
