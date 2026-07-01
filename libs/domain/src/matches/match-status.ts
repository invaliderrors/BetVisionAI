// libs/domain/src/matches/match-status.ts
// Lifecycle of a fixture. Domain uses a lowercase string union (framework-free); the
// persistence layer maps it to the Prisma `MatchStatus` enum (uppercase) at the boundary.

export const MATCH_STATUSES = [
  'scheduled',
  'live',
  'finished',
  'postponed',
  'cancelled',
  'abandoned',
] as const;

export type MatchStatus = (typeof MATCH_STATUSES)[number];

export function isMatchStatus(value: string): value is MatchStatus {
  return (MATCH_STATUSES as readonly string[]).includes(value);
}
