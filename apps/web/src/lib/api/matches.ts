// apps/web/src/lib/api/matches.ts
// Typed match-resolution calls. Validated against the shared zod contracts so FE + BE never drift.
//   GET /matches/search?q= -> ranked candidates + suggestions (SPEC §16, Phase 6)
//   GET /matches/:id       -> canonical match detail
import {
  matchSearchResponseSchema,
  matchDetailDtoSchema,
  type MatchSearchResponse,
  type MatchDetailDto,
} from '@betvision/contracts';
import { apiRequest } from './client';

export interface SearchMatchesOptions {
  competitionId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  signal?: AbortSignal;
}

/** Typeahead fixture search. Ranked candidates with confidence; suggestions on NO_MATCH. */
export function searchMatches(
  query: string,
  locale?: string,
  options: SearchMatchesOptions = {},
): Promise<MatchSearchResponse> {
  const params = new URLSearchParams({ q: query });
  if (options.competitionId) params.set('competitionId', options.competitionId);
  if (options.dateFrom) params.set('dateFrom', options.dateFrom);
  if (options.dateTo) params.set('dateTo', options.dateTo);
  if (options.limit) params.set('limit', String(options.limit));

  return apiRequest(`/matches/search?${params.toString()}`, {
    method: 'GET',
    schema: matchSearchResponseSchema,
    locale,
    signal: options.signal,
  });
}

/** Canonical match detail (fixture header on the analysis page). */
export function getMatch(id: string, locale?: string): Promise<MatchDetailDto> {
  return apiRequest(`/matches/${encodeURIComponent(id)}`, {
    method: 'GET',
    schema: matchDetailDtoSchema,
    locale,
  });
}
