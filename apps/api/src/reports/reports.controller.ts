// apps/api/src/reports/reports.controller.ts
// AI-report endpoints under /api/v1. Authenticated (JwtAuthGuard); reuses the shared {data,error}
// envelope. Numbers come ONLY from the persisted prediction/value records — the LLM explains them.
//
//   POST /predictions/:id/report?language=en|es  → (re)generate a report for a prediction in a
//        language WITHOUT recomputing the numbers (numbers identical across languages).
//   GET  /reports/:id                            → the assembled, immutable AnalysisReportDto.
import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GenerateReportUseCase, GetReportUseCase } from '@betvision/application';
import type { PredictionId, ReportId } from '@betvision/domain';
import {
  generateReportQuerySchema,
  type AnalysisReportDto,
} from '@betvision/contracts';
import { unwrap } from '../common/result/unwrap';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { toAnalysisReportDto } from './report-response.mapper';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ version: '1' })
export class ReportsController {
  constructor(
    private readonly generateReport: GenerateReportUseCase,
    private readonly getReport: GetReportUseCase,
  ) {}

  @Post('predictions/:id/report')
  async generate(
    @Param('id') predictionId: string,
    @Query('language') languageParam?: string,
  ): Promise<AnalysisReportDto> {
    // Lenient: an unknown/absent language falls back to the default locale ('en').
    const parsedQuery = generateReportQuerySchema.safeParse({ language: languageParam });
    const language = parsedQuery.success ? parsedQuery.data.language : 'en';
    const result = unwrap(
      await this.generateReport.execute({
        predictionId: predictionId as PredictionId,
        language,
      }),
    );
    return toAnalysisReportDto(result.report);
  }

  @Get('reports/:id')
  async detail(@Param('id') id: string): Promise<AnalysisReportDto> {
    return toAnalysisReportDto(
      unwrap(await this.getReport.execute({ reportId: id as ReportId })),
    );
  }
}
