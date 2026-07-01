// libs/infrastructure/src/persistence/repositories/prisma-match.repository.ts
// Adapter implementing the domain MatchRepositoryPort against Postgres via Prisma.
// Returns/accepts ONLY domain types (Match / MatchCandidate); Prisma stays internal.
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  MatchRepositoryPort,
  MatchSearchQuery,
  MatchCandidate,
  Match,
  MatchId,
  IsoDateTime,
} from '@betvision/domain';
import { PrismaService } from '../../prisma/prisma.service';
import { matchInclude, toDomainMatch } from '../mappers/match.mapper';

/** Row shape produced by the trigram-ranked search query. */
interface SearchRow {
  readonly matchId: string;
  readonly homeName: string;
  readonly awayName: string;
  readonly competition: string;
  readonly kickoffUtc: Date;
  readonly confidence: number;
}

@Injectable()
export class PrismaMatchRepository implements MatchRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: MatchId): Promise<Match | null> {
    const row = await this.prisma.match.findUnique({
      where: { id },
      include: matchInclude,
    });
    return row ? toDomainMatch(row) : null;
  }

  /**
   * Free-text fixture search ranked by pg_trgm similarity over the "home vs away"
   * label. Optional competition/date filters narrow the candidate set. Confidence
   * is the trigram similarity in [0,1].
   */
  async search(query: MatchSearchQuery): Promise<MatchCandidate[]> {
    const filters: Prisma.Sql[] = [];
    if (query.competitionId) {
      filters.push(Prisma.sql`m."competitionId" = ${query.competitionId}`);
    }
    if (query.dateFrom) {
      filters.push(Prisma.sql`m."kickoffUtc" >= ${new Date(query.dateFrom)}`);
    }
    if (query.dateTo) {
      filters.push(Prisma.sql`m."kickoffUtc" <= ${new Date(query.dateTo)}`);
    }
    const where =
      filters.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}`
        : Prisma.empty;
    const limit = query.limit ?? 10;

    const rows = await this.prisma.$queryRaw<SearchRow[]>(Prisma.sql`
      SELECT m.id                       AS "matchId",
             h.name                     AS "homeName",
             a.name                     AS "awayName",
             c.name                     AS "competition",
             m."kickoffUtc"             AS "kickoffUtc",
             GREATEST(
               similarity(h.name || ' ' || a.name, ${query.text}),
               similarity(h.name, ${query.text}),
               similarity(a.name, ${query.text})
             )::float8                  AS "confidence"
      FROM matches m
      JOIN teams h        ON h.id = m."homeTeamId"
      JOIN teams a        ON a.id = m."awayTeamId"
      JOIN competitions c ON c.id = m."competitionId"
      ${where}
      ORDER BY "confidence" DESC, m."kickoffUtc" ASC
      LIMIT ${limit}
    `);

    return rows.map((row) => ({
      matchId: row.matchId as MatchId,
      homeName: row.homeName,
      awayName: row.awayName,
      competition: row.competition,
      kickoffUtc: row.kickoffUtc.toISOString() as IsoDateTime,
      confidence: row.confidence,
    }));
  }

  /**
   * Upsert a match by id inside a transaction.
   *
   * NOTE (domain gap, Phase 4): the minimal `Match` aggregate (Phase 3) carries team
   * NAMES and a competition id, but not the home/away team ids, season id or status
   * that the persistence model requires. Until the aggregate is fleshed out (Phase 6),
   * this adapter resolves teams by name (create-if-missing) and attaches the match to
   * the LATEST season of its competition. The competition (and at least one season)
   * must already exist. Reported as a follow-up rather than editing the domain.
   */
  async save(match: Match): Promise<void> {
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const competitionId = match.competitionId as string;
      const competition = await tx.competition.findUnique({
        where: { id: competitionId },
      });
      if (!competition) {
        throw new Error(
          `Cannot persist match ${match.id}: competition ${competitionId} does not exist`,
        );
      }

      const season = await tx.season.findFirst({
        where: { competitionId },
        orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
      });
      if (!season) {
        throw new Error(
          `Cannot persist match ${match.id}: competition ${competitionId} has no season`,
        );
      }

      const homeTeamId = await this.resolveTeamId(tx, match.homeName);
      const awayTeamId = await this.resolveTeamId(tx, match.awayName);
      const kickoffUtc = new Date(match.kickoffUtc);

      await tx.match.upsert({
        where: { id: match.id as string },
        create: {
          id: match.id as string,
          competitionId,
          seasonId: season.id,
          homeTeamId,
          awayTeamId,
          kickoffUtc,
        },
        update: {
          competitionId,
          seasonId: season.id,
          homeTeamId,
          awayTeamId,
          kickoffUtc,
        },
      });
    });
  }

  private async resolveTeamId(
    tx: Prisma.TransactionClient,
    name: string,
  ): Promise<string> {
    const existing = await tx.team.findFirst({ where: { name } });
    if (existing) return existing.id;
    const created = await tx.team.create({ data: { name } });
    return created.id;
  }
}
