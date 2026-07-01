// libs/infrastructure/src/persistence/repositories/prisma-analysis-report.repository.ts
// AnalysisReportRepositoryPort adapter over Prisma (`analysis_reports` table). Reports are IMMUTABLE
// and append-only: `save` inserts a new row (never updates). Prisma stays internal — only domain
// records cross the boundary.
import { Injectable } from '@nestjs/common';
import type {
  AnalysisReportRepositoryPort,
  AnalysisReportRecord,
  Locale,
  PredictionId,
  ReportId,
} from '@betvision/domain';
import { PrismaService } from '../../prisma/prisma.service';
import {
  toDomainAnalysisReport,
  toPersistenceAnalysisReport,
} from '../mappers/analysis-report.mapper';

const LANG_TO_PRISMA = { en: 'EN', es: 'ES' } as const;

@Injectable()
export class PrismaAnalysisReportRepository implements AnalysisReportRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(record: AnalysisReportRecord): Promise<void> {
    await this.prisma.analysisReport.create({
      data: toPersistenceAnalysisReport(record),
    });
  }

  async findById(id: ReportId): Promise<AnalysisReportRecord | null> {
    const row = await this.prisma.analysisReport.findUnique({ where: { id: id as string } });
    return row ? toDomainAnalysisReport(row) : null;
  }

  async findLatest(
    predictionId: PredictionId,
    language: Locale,
  ): Promise<AnalysisReportRecord | null> {
    const row = await this.prisma.analysisReport.findFirst({
      where: { predictionId: predictionId as string, language: LANG_TO_PRISMA[language] },
      orderBy: { createdAt: 'desc' },
    });
    return row ? toDomainAnalysisReport(row) : null;
  }
}
