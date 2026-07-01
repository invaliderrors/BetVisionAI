// libs/contracts/src/lib/matches.ts
// Match read + fixture-resolution contracts (zod). SPEC §16: GET /matches/search?q=,
// GET /matches/:id. Shared by apps/api (validation) and apps/web (typed client).
import { z } from 'zod';
import { teamRefSchema } from './teams';
import { competitionRefSchema } from './competitions';

export const matchStatusSchema = z.enum([
  'scheduled',
  'live',
  'finished',
  'postponed',
  'cancelled',
  'abandoned',
]);
export type MatchStatus = z.infer<typeof matchStatusSchema>;

export const refereeRefSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type RefereeRef = z.infer<typeof refereeRefSchema>;

/** GET /matches/search?q= — query params. */
export const matchSearchQuerySchema = z.object({
  q: z.string().trim().min(1, { message: 'q is required' }),
  competitionId: z.string().optional(),
  dateFrom: z.iso.datetime().optional(),
  dateTo: z.iso.datetime().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});
export type MatchSearchQuery = z.infer<typeof matchSearchQuerySchema>;

/** A ranked fixture candidate for a free-text query. `confidence` is 0..1 (resolver score). */
export const matchCandidateSchema = z.object({
  matchId: z.string(),
  home: teamRefSchema,
  away: teamRefSchema,
  competition: competitionRefSchema,
  kickoffUtc: z.string(),
  status: matchStatusSchema,
  confidence: z.number().min(0).max(1),
});
export type MatchCandidate = z.infer<typeof matchCandidateSchema>;

/**
 * GET /matches/search?q= — resolved candidates ranked by confidence. When `candidates` is
 * empty (NO_MATCH) `suggestions` carries the closest team names to hint the user.
 */
export const matchSearchResponseSchema = z.object({
  query: z.string(),
  candidates: matchCandidateSchema.array(),
  suggestions: z.string().array(),
});
export type MatchSearchResponse = z.infer<typeof matchSearchResponseSchema>;

/** Per-match historical facts (populated only once a match is finished; else null fields). */
export const matchStatsDtoSchema = z.object({
  homeGoals: z.number().nullable(),
  awayGoals: z.number().nullable(),
  homeXg: z.number().nullable(),
  awayXg: z.number().nullable(),
  homeCorners: z.number().nullable(),
  awayCorners: z.number().nullable(),
  homeYellow: z.number().nullable(),
  awayYellow: z.number().nullable(),
  homeRed: z.number().nullable(),
  awayRed: z.number().nullable(),
  homePossession: z.number().nullable(),
  awayPossession: z.number().nullable(),
});
export type MatchStatsDto = z.infer<typeof matchStatsDtoSchema>;

/** Odds summary placeholder — populated by the odds/value phase (Phase 11). */
export const oddsSummaryDtoSchema = z.object({
  available: z.boolean(),
});
export type OddsSummaryDto = z.infer<typeof oddsSummaryDtoSchema>;

/** GET /matches/:id — canonical match + stats + assigned referee + odds-summary placeholder. */
export const matchDetailDtoSchema = z.object({
  id: z.string(),
  home: teamRefSchema,
  away: teamRefSchema,
  competition: competitionRefSchema,
  seasonId: z.string(),
  seasonLabel: z.string(),
  kickoffUtc: z.string(),
  status: matchStatusSchema,
  venue: z.string().nullable(),
  round: z.string().nullable(),
  importance: z.number().nullable(),
  referee: refereeRefSchema.nullable(),
  stats: matchStatsDtoSchema.nullable(),
  oddsSummary: oddsSummaryDtoSchema,
});
export type MatchDetailDto = z.infer<typeof matchDetailDtoSchema>;
