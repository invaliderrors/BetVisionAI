// libs/infrastructure/src/persistence/mappers/match.mapper.ts
// Persistence <-> domain translation for the Match aggregate. Pure functions, no IO.
// Prisma types stay INSIDE this layer; the output is the domain `Match` entity.
import { Prisma } from '@prisma/client';
import { InvariantViolationError } from '@betvision/shared';
import {
  Match,
  type MatchId,
  type CompetitionId,
  type IsoDateTime,
} from '@betvision/domain';

/** Relations the mapper needs to rebuild the domain Match (names live on the teams). */
export const matchInclude = {
  homeTeam: true,
  awayTeam: true,
  competition: true,
} satisfies Prisma.MatchInclude;

/** Internal persistence shape: a Match row joined with the refs above. */
export type PersistedMatch = Prisma.MatchGetPayload<{
  include: typeof matchInclude;
}>;

/** Prisma Match row (+ joined refs) -> domain Match entity. */
export function toDomainMatch(row: PersistedMatch): Match {
  const result = Match.create({
    id: row.id as MatchId,
    homeName: row.homeTeam.name,
    awayName: row.awayTeam.name,
    competitionId: row.competitionId as CompetitionId,
    competition: row.competition.name,
    kickoffUtc: row.kickoffUtc.toISOString() as IsoDateTime,
  });
  // A persisted match always satisfies domain invariants (non-empty names); a
  // failure here signals corrupt data, i.e. a programmer/invariant error.
  if (!result.ok) {
    throw new InvariantViolationError(
      `Corrupt persisted match ${row.id}: ${result.error.code}`,
    );
  }
  return result.value;
}
