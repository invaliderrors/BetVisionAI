// libs/infrastructure/src/persistence/repositories/prisma-team.repository.ts
// TeamRepositoryPort adapter over Prisma. Fuzzy name search uses pg_trgm's `%` operator +
// `similarity()` (backed by the trigram GIN index from the manual-SQL appendix). The query
// is PARAMETERIZED via Prisma.sql — the search term is a bound parameter, never concatenated
// into the SQL string (CLAUDE.md: no raw SQL injection surface).
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  TeamRepositoryPort,
  TeamSearchResult,
  TeamStatsView,
  Team,
  TeamId,
} from '@betvision/domain';
import { PrismaService } from '../../prisma/prisma.service';
import {
  toDomainTeam,
  toTeamStatsView,
  type TeamRow,
} from '../mappers/team.mapper';

/** Trigram search row: the team columns plus the computed similarity score. */
interface SearchTeamRow extends TeamRow {
  readonly score: number;
}

@Injectable()
export class PrismaTeamRepository implements TeamRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: TeamId): Promise<Team | null> {
    const row = await this.prisma.team.findUnique({ where: { id } });
    return row ? toDomainTeam(row) : null;
  }

  async searchByName(name: string, limit = 10): Promise<TeamSearchResult[]> {
    const term = name.trim();
    if (term.length === 0) return [];

    const rows = await this.prisma.$queryRaw<SearchTeamRow[]>(Prisma.sql`
      SELECT t.id,
             t.name,
             t."shortName",
             t.country,
             t."crestUrl",
             t."eloRating",
             similarity(t.name, ${term})::float8 AS score
      FROM teams t
      WHERE t.name % ${term}
      ORDER BY score DESC, t.name ASC
      LIMIT ${limit}
    `);

    return rows.map((row) => ({ team: toDomainTeam(row), score: row.score }));
  }

  async findStats(id: TeamId): Promise<TeamStatsView[]> {
    const rows = await this.prisma.teamStats.findMany({
      where: { teamId: id },
      orderBy: [{ seasonId: 'desc' }, { venue: 'asc' }, { window: 'asc' }],
    });
    return rows.map(toTeamStatsView);
  }
}
