// libs/domain/src/ports/shared.dto.ts
// Branded IDs: opaque strings that are not interchangeable at the type level.

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type MatchId = Brand<string, 'MatchId'>;
export type TeamId = Brand<string, 'TeamId'>;
export type PlayerId = Brand<string, 'PlayerId'>;
export type RefereeId = Brand<string, 'RefereeId'>;
export type CompetitionId = Brand<string, 'CompetitionId'>;
export type SeasonId = Brand<string, 'SeasonId'>;
export type PredictionId = Brand<string, 'PredictionId'>;
export type ReportId = Brand<string, 'ReportId'>;
export type UserId = Brand<string, 'UserId'>;

export type Locale = 'en' | 'es';
export type IsoDateTime = string; // ISO-8601 UTC

/** Every provider payload is stamped with where/when it came from (SPEC FR-2). */
export interface DataProvenance {
  readonly provider: string;
  readonly fetchedAt: IsoDateTime;
  readonly payloadHash: string;
  readonly ageMinutes?: number; // staleness signal for the UI
}

/** Generic wrapper attaching provenance to any provider DTO. */
export interface Provenanced<T> {
  readonly data: T;
  readonly provenance: DataProvenance;
}

export type Venue = 'home' | 'away' | 'all';
export interface StatsScope {
  readonly seasonId?: SeasonId;
  readonly venue?: Venue;
  readonly window?: number; // rolling N matches
}
