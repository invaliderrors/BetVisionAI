// libs/infrastructure/src/persistence/repositories/prisma-match.repository.ts
// Adapter implementing the domain MatchRepositoryPort against Postgres via Prisma.
// Returns/accepts ONLY domain types (Match aggregate + read-model projections); Prisma stays
// internal. The Phase-4 name-resolution stopgap is GONE: `save()` persists the real FK ids
// carried by the fleshed-out aggregate, and candidate search runs on resolved team ids.
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  MatchRepositoryPort,
  MatchByTeamsQuery,
  MatchCandidate,
  MatchDetailView,
  Match,
  MatchId,
} from '@betvision/domain';
import { PrismaService } from '../../prisma/prisma.service';
import {
  matchDetailInclude,
  matchCandidateInclude,
  toDomainMatch,
  toMatchDetailView,
  toMatchCandidate,
  STATUS_TO_PRISMA,
} from '../mappers/match.mapper';

@Injectable()
export class PrismaMatchRepository implements MatchRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  /** Write-model aggregate (ids only). */
  async findById(id: MatchId): Promise<Match | null> {
    const row = await this.prisma.match.findUnique({ where: { id } });
    return row ? toDomainMatch(row) : null;
  }

  /** Read-model detail: teams + competition + season + referee + stats. */
  async findDetailById(id: MatchId): Promise<MatchDetailView | null> {
    const row = await this.prisma.match.findUnique({
      where: { id },
      include: matchDetailInclude,
    });
    return row ? toMatchDetailView(row) : null;
  }

  /**
   * Candidate fixtures for a resolved team set. A home/away pair is matched in BOTH
   * orientations; a single `anyTeamIds` set matches fixtures where either side is one of
   * the teams. Confidence/ranking is the resolver use case's job — this only filters.
   */
  async findByTeams(query: MatchByTeamsQuery): Promise<MatchCandidate[]> {
    const teamCondition = buildTeamCondition(query);
    if (!teamCondition) return [];

    const filters: Prisma.MatchWhereInput[] = [teamCondition];
    if (query.competitionId) {
      filters.push({ competitionId: query.competitionId });
    }
    if (query.dateFrom || query.dateTo) {
      filters.push({
        kickoffUtc: {
          ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
          ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
        },
      });
    }

    const rows = await this.prisma.match.findMany({
      where: { AND: filters },
      include: matchCandidateInclude,
      orderBy: { kickoffUtc: 'asc' },
      take: query.limit ?? 20,
    });

    return rows.map(toMatchCandidate);
  }

  /** Upsert by id using the aggregate's real FK ids — no name resolution, no season guessing. */
  async save(match: Match): Promise<void> {
    const data = {
      competitionId: match.competitionId as string,
      seasonId: match.seasonId as string,
      homeTeamId: match.homeTeamId as string,
      awayTeamId: match.awayTeamId as string,
      kickoffUtc: new Date(match.kickoffUtc),
      status: STATUS_TO_PRISMA[match.status],
      venue: match.venue,
      round: match.round,
      importance: match.importance,
    };
    await this.prisma.match.upsert({
      where: { id: match.id as string },
      create: { id: match.id as string, ...data },
      update: data,
    });
  }
}

/** Build the team-pairing WHERE clause, or null when there are no team ids to match. */
function buildTeamCondition(
  query: MatchByTeamsQuery,
): Prisma.MatchWhereInput | null {
  const homeIds: string[] = query.homeTeamIds ? [...query.homeTeamIds] : [];
  const awayIds: string[] = query.awayTeamIds ? [...query.awayTeamIds] : [];
  if (homeIds.length > 0 && awayIds.length > 0) {
    return {
      OR: [
        { homeTeamId: { in: homeIds }, awayTeamId: { in: awayIds } },
        { homeTeamId: { in: awayIds }, awayTeamId: { in: homeIds } },
      ],
    };
  }

  const anyIds: string[] = query.anyTeamIds ? [...query.anyTeamIds] : [];
  if (anyIds.length > 0) {
    return {
      OR: [{ homeTeamId: { in: anyIds } }, { awayTeamId: { in: anyIds } }],
    };
  }

  return null;
}
