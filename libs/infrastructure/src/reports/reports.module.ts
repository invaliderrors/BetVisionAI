// libs/infrastructure/src/reports/reports.module.ts
// Phase-12 composition. Binds the AI-report ports and provides the use cases:
//   - LLM_EXPLANATION  -> TemplateLlmAdapter (LLM_MODE=dev, default) | AnthropicLlmAdapter (live)
//   - RAG_RETRIEVER    -> DevRagRetriever (curated dev snippets; pgvector deferred)
//   - ANALYSIS_REPORT_REPOSITORY -> PrismaAnalysisReportRepository
//   - GenerateReportUseCase / GetReportUseCase (wired to the Prisma repos + @Global adapters)
//
// Imports the infra PredictionsModule for the PREDICTION/RESULT/RECOMMENDATION repositories, and
// relies on the @Global PrismaModule (PrismaService, MATCH_REPOSITORY) + AuthInfraModule (CACHE,
// CLOCK, ID_GENERATOR) + ConfigModule (APP_CONFIG).
import { Module } from '@nestjs/common';
import {
  LLM_EXPLANATION,
  RAG_RETRIEVER,
  ANALYSIS_REPORT_REPOSITORY,
  PREDICTION_REPOSITORY,
  PREDICTION_RESULT_REPOSITORY,
  RECOMMENDATION_REPOSITORY,
  MATCH_REPOSITORY,
  CACHE,
  CLOCK,
  ID_GENERATOR,
  type LlmExplanationPort,
  type RagRetrieverPort,
  type AnalysisReportRepositoryPort,
  type PredictionRepositoryPort,
  type PredictionResultRepositoryPort,
  type RecommendationRepositoryPort,
  type MatchRepositoryPort,
  type CachePort,
  type ClockPort,
  type IdGeneratorPort,
} from '@betvision/domain';
import { APP_CONFIG, type AppConfig } from '@betvision/config';
import { GenerateReportUseCase, GetReportUseCase } from '@betvision/application';
import { PrismaService } from '../prisma/prisma.service';
import { PredictionsModule } from '../prediction/predictions.module';
import { PrismaAnalysisReportRepository } from '../persistence/repositories/prisma-analysis-report.repository';
import { TemplateLlmAdapter } from '../ai-analysis/template-llm.adapter';
import { AnthropicLlmAdapter } from '../ai-analysis/anthropic-llm.adapter';
import { DevRagRetriever } from '../ai-analysis/dev-rag-retriever';

@Module({
  imports: [PredictionsModule],
  providers: [
    // LLM_MODE binding: dev = deterministic template (no key), live = Anthropic (needs a key).
    {
      provide: LLM_EXPLANATION,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): LlmExplanationPort =>
        config.llmMode === 'live' && config.anthropicApiKey
          ? new AnthropicLlmAdapter(config.anthropicApiKey)
          : new TemplateLlmAdapter(),
    },
    { provide: RAG_RETRIEVER, useClass: DevRagRetriever },
    {
      provide: ANALYSIS_REPORT_REPOSITORY,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => new PrismaAnalysisReportRepository(prisma),
    },
    {
      provide: GenerateReportUseCase,
      inject: [
        PREDICTION_REPOSITORY,
        PREDICTION_RESULT_REPOSITORY,
        RECOMMENDATION_REPOSITORY,
        MATCH_REPOSITORY,
        RAG_RETRIEVER,
        LLM_EXPLANATION,
        ANALYSIS_REPORT_REPOSITORY,
        CACHE,
        CLOCK,
        ID_GENERATOR,
      ],
      useFactory: (
        predictions: PredictionRepositoryPort,
        predictionResults: PredictionResultRepositoryPort,
        recommendations: RecommendationRepositoryPort,
        matches: MatchRepositoryPort,
        rag: RagRetrieverPort,
        narrator: LlmExplanationPort,
        reports: AnalysisReportRepositoryPort,
        cache: CachePort,
        clock: ClockPort,
        ids: IdGeneratorPort,
      ) =>
        new GenerateReportUseCase({
          predictions,
          predictionResults,
          recommendations,
          matches,
          rag,
          narrator,
          reports,
          cache,
          clock,
          ids,
        }),
    },
    {
      provide: GetReportUseCase,
      inject: [ANALYSIS_REPORT_REPOSITORY, CACHE],
      useFactory: (reports: AnalysisReportRepositoryPort, cache: CachePort) =>
        new GetReportUseCase({ reports, cache }),
    },
  ],
  exports: [
    LLM_EXPLANATION,
    RAG_RETRIEVER,
    ANALYSIS_REPORT_REPOSITORY,
    GenerateReportUseCase,
    GetReportUseCase,
  ],
})
export class ReportsModule {}
