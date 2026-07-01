// libs/infrastructure/src/persistence/repositories/prisma-competition.repository.ts
// CompetitionRepositoryPort adapter over Prisma. All queries are parameterized (Prisma
// query builder); returns/accepts ONLY domain entities.
import { Injectable } from '@nestjs/common';
import type {
  CompetitionRepositoryPort,
  Competition,
  Season,
  CompetitionId,
} from '@betvision/domain';
import { PrismaService } from '../../prisma/prisma.service';
import {
  toDomainCompetition,
  toDomainSeason,
} from '../mappers/competition.mapper';

@Injectable()
export class PrismaCompetitionRepository implements CompetitionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: CompetitionId): Promise<Competition | null> {
    const row = await this.prisma.competition.findUnique({ where: { id } });
    return row ? toDomainCompetition(row) : null;
  }

  async list(): Promise<Competition[]> {
    const rows = await this.prisma.competition.findMany({
      orderBy: [{ tier: 'asc' }, { name: 'asc' }],
    });
    return rows.map(toDomainCompetition);
  }

  async findSeasons(competitionId: CompetitionId): Promise<Season[]> {
    const rows = await this.prisma.season.findMany({
      where: { competitionId },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(toDomainSeason);
  }
}
