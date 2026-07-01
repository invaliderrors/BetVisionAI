// apps/web/src/lib/api/endpoints.ts
// Typed clients for endpoints that the BACKEND HAS NOT SHIPPED YET (predictions, watchlist,
// match search — Phases 11/14/15). We define the call surface + LOCAL web types now so the
// dashboard can render graceful loading/empty states and wire up instantly once the endpoints
// land. Types intentionally live here (NOT in libs/contracts) until the backend publishes the
// real schemas; replace these with contract imports when available.
//
// TODO(backend Phase 11/14): swap local types for `@betvision/contracts` schemas + validate.
// TODO(backend Phase 14): GET /predictions?mine
// TODO(backend Phase 6):  GET /matches/search?q=
// TODO(backend Phase 13): GET/POST/DELETE /watchlist
import { apiRequest } from './client';

/** LOCAL placeholder — mirrors the intended PredictionResultDto shape (SPEC §9). */
export interface RecentPredictionSummary {
  id: string;
  matchLabel: string;
  market: string;
  selection: string;
  /** Calibrated model probability, 0..1. */
  modelProbability: number;
  confidence: 'low' | 'medium' | 'high';
  risk: 'low' | 'medium' | 'high';
  createdAt: string;
}

/** LOCAL placeholder — an upcoming fixture card. */
export interface UpcomingFixture {
  id: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  kickoffUtc: string;
}

/** LOCAL placeholder — a watchlist entry. */
export interface WatchlistItem {
  id: string;
  label: string;
  kind: 'team' | 'match' | 'competition';
}

/**
 * Fetch the current user's recent predictions.
 * NOT YET IMPLEMENTED server-side — returns [] so the UI shows its empty state.
 */
export async function getRecentPredictions(
  locale?: string,
): Promise<RecentPredictionSummary[]> {
  // TODO(backend Phase 14): replace with real GET /predictions?mine call + contract schema.
  void apiRequest; // keep the typed client imported for the imminent wiring
  void locale;
  return [];
}

/** NOT YET IMPLEMENTED — returns [] so the UI shows its empty state. */
export async function getUpcomingFixtures(
  locale?: string,
): Promise<UpcomingFixture[]> {
  // TODO(backend Phase 6/8): replace with real GET /matches/upcoming call.
  void locale;
  return [];
}

/** NOT YET IMPLEMENTED — returns [] so the UI shows its empty state. */
export async function getWatchlist(locale?: string): Promise<WatchlistItem[]> {
  // TODO(backend Phase 13): replace with real GET /watchlist call.
  void locale;
  return [];
}
